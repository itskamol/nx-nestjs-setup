import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@shared/types';
import { User } from '@prisma/client';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    // Get user from request (should be set by AuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      this.logger.warn('RolesGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const hasRole = this.matchRoles(requiredRoles, [user.role as Role]);

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.email}. Required roles: [${requiredRoles.join(', ')}], User role: ${user.role}`
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.debug(
      `Access granted for user ${user.email} with role ${user.role}`
    );

    return true;
  }

  /**
   * Check if user roles match any of the required roles
   * @param requiredRoles Array of required roles
   * @param userRoles Array of user roles
   * @returns boolean indicating if user has required role
   */
  matchRoles(requiredRoles: Role[], userRoles: Role[]): boolean {
    return requiredRoles.some(role => userRoles.includes(role));
  }
}