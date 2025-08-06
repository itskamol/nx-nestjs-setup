import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../database';
import { CacheService, PasswordService } from '../common';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { PaginatedResponse } from '@shared/types';
import { APP_CONSTANTS } from '@shared/constants';

export interface FindUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly cachePrefix = 'user';

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PasswordService))
    private readonly passwordService: PasswordService,
    @Inject(forwardRef(() => CacheService))
    private readonly cacheService: CacheService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(
        createUserDto.password
      );

      if (!passwordValidation.isValid) {
        throw new BadRequestException({
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
        });
      }

      // Hash password
      const hashedPassword = await this.passwordService.hashPassword(createUserDto.password);

      // Create user
      const user = await this.prismaService.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
      });

      this.logger.log(`User created successfully: ${user.email}`);

      // Cache the user
      await this.cacheUser(user);

      return new UserResponseDto(user);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create user', error);
      throw new Error('User creation failed');
    }
  }

  async findAll(options: FindUsersOptions = {}): Promise<PaginatedResponse<UserResponseDto>> {
    try {
      const {
        page = APP_CONSTANTS.PAGINATION.DEFAULT_PAGE,
        limit = APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
        search,
        role,
        isActive,
      } = options;

      // Validate pagination parameters
      const validatedLimit = Math.min(limit, APP_CONSTANTS.PAGINATION.MAX_LIMIT);
      const skip = (page - 1) * validatedLimit;

      // Build where clause
      const where: Prisma.UserWhereInput = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role as Role;
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }

      // Get users and total count
      const [users, total] = await Promise.all([
        this.prismaService.user.findMany({
          where,
          skip,
          take: validatedLimit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.user.count({ where }),
      ]);

      const userDtos = users.map(user => new UserResponseDto(user));
      const totalPages = Math.ceil(total / validatedLimit);

      return {
        success: true,
        data: userDtos,
        pagination: {
          page,
          limit: validatedLimit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch users', error);
      throw new Error('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    try {
      // Try to get from cache first
      const cachedUser = await this.getCachedUser(id);
      if (cachedUser) {
        return new UserResponseDto(cachedUser);
      }

      // Get from database
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Cache the user
      await this.cacheUser(user);
      user.password = undefined; // Exclude password from response
      return new UserResponseDto(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch user: ${id}`, error);
      throw new Error('Failed to fetch user');
    }
  }

  async findOneWithPassword(id: string): Promise<User> {
    try {
      // Get from database with password
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch user with password: ${id}`, error);
      throw new Error('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prismaService.user.findUnique({
        where: { email },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch user by email: ${email}`, error);
      return null;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Check for email conflicts if email is being updated
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const emailExists = await this.prismaService.user.findUnique({
          where: { email: updateUserDto.email },
        });

        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Update user
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: updateUserDto,
      });

      this.logger.log(`User updated successfully: ${updatedUser.email}`);

      // Update cache
      await this.cacheUser(updatedUser);

      return new UserResponseDto(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to update user: ${id}`, error);
      throw new Error('User update failed');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Check if user exists
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete user
      await this.prismaService.user.delete({
        where: { id },
      });

      this.logger.log(`User deleted successfully: ${user.email}`);

      // Remove from cache
      await this.removeCachedUser(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete user: ${id}`, error);
      throw new Error('User deletion failed');
    }
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    try {
      // Validate password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);

      if (!passwordValidation.isValid) {
        throw new BadRequestException({
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
        });
      }

      // Hash new password
      const hashedPassword = await this.passwordService.hashPassword(newPassword);

      // Update password
      await this.prismaService.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      this.logger.log(`Password updated for user: ${id}`);

      // Remove user from cache to force refresh
      await this.removeCachedUser(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update password for user: ${id}`, error);
      throw new Error('Password update failed');
    }
  }

  async deactivateUser(id: string): Promise<UserResponseDto> {
    return this.update(id, { isActive: false });
  }

  async activateUser(id: string): Promise<UserResponseDto> {
    return this.update(id, { isActive: true });
  }

  // Cache helper methods
  private async cacheUser(user: User): Promise<void> {
    const cacheKey = `${this.cachePrefix}:${user.id}`;
    await this.cacheService.set(cacheKey, user, {
      ttl: APP_CONSTANTS.CACHE.USER_CACHE_TTL,
    });
  }

  private async getCachedUser(id: string): Promise<User | null> {
    const cacheKey = `${this.cachePrefix}:${id}`;
    const result = await this.cacheService.get<User>(cacheKey);
    return result.success ? result.data || null : null;
  }

  private async removeCachedUser(id: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}:${id}`;
    await this.cacheService.del(cacheKey);
  }
}
