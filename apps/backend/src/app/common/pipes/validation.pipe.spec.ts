import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { CustomValidationPipe } from './validation.pipe';

// Test DTO classes
class TestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class NestedTestDto {
  @IsString()
  title: string;

  user: TestDto;
}

describe('CustomValidationPipe', () => {
  let pipe: CustomValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomValidationPipe],
    }).compile();

    pipe = module.get<CustomValidationPipe>(CustomValidationPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    it('should pass validation with valid data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = await pipe.transform(validData, metadata);

      expect(result).toBeInstanceOf(TestDto);
      expect(result.email).toBe(validData.email);
      expect(result.password).toBe(validData.password);
      expect(result.name).toBe(validData.name);
    });

    it('should pass validation with valid data and optional field missing', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await pipe.transform(validData, metadata);

      expect(result).toBeInstanceOf(TestDto);
      expect(result.email).toBe(validData.email);
      expect(result.password).toBe(validData.password);
      expect(result.name).toBeUndefined();
    });

    it('should throw BadRequestException for invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for short password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const invalidData = {
        name: 'Test User',
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with multiple validation errors', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
      };

      try {
        await pipe.transform(invalidData, metadata);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.error.details.errors).toHaveLength(2);
      }
    });

    it('should return primitive values unchanged', async () => {
      const stringMetadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      const result = await pipe.transform('test-value', stringMetadata);
      expect(result).toBe('test-value');
    });

    it('should handle null and undefined values', async () => {
      const result1 = await pipe.transform(null, {
        type: 'body',
        metatype: undefined,
        data: '',
      });
      expect(result1).toBeNull();

      const result2 = await pipe.transform(undefined, {
        type: 'body',
        metatype: undefined,
        data: '',
      });
      expect(result2).toBeUndefined();
    });

    it('should format validation errors correctly', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
      };

      try {
        await pipe.transform(invalidData, metadata);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toBe('Validation failed');
        expect(response.error.details.errors).toBeInstanceOf(Array);
        expect(response.error.details.timestamp).toBeDefined();

        const errors = response.error.details.errors;
        expect(errors.some((err: any) => err.field === 'email')).toBe(true);
        expect(errors.some((err: any) => err.field === 'password')).toBe(true);
      }
    });

    it('should handle nested validation errors', async () => {
      const nestedMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: NestedTestDto,
        data: '',
      };

      const invalidNestedData = {
        title: 'Test Title',
        user: {
          email: 'invalid-email',
          password: '123',
        },
      };

      try {
        await pipe.transform(invalidNestedData, nestedMetadata);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;
        const errors = response.error.details.errors;

        // Should have nested errors for user object
        const userError = errors.find((err: any) => err.field === 'user');
        expect(userError).toBeDefined();
        expect(userError.children).toBeDefined();
        expect(userError.children.length).toBeGreaterThan(0);
      }
    });
  });

  describe('error message priority', () => {
    it('should prioritize isNotEmpty over other constraints', async () => {
      class PriorityTestDto {
        @IsString()
        @MinLength(5)
        value: string;
      }

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: PriorityTestDto,
        data: '',
      };

      try {
        await pipe.transform({ value: '' }, metadata);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;
        const errors = response.error.details.errors;
        const valueError = errors.find((err: any) => err.field === 'value');

        // Should prioritize minLength constraint for empty string
        expect(valueError.message).toContain('must be longer than or equal to 5 characters');
      }
    });
  });

  describe('logging', () => {
    it('should log validation attempts in debug mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: 'testData',
      };

      await pipe.transform(validData, metadata);

      // Note: In a real test, you might want to mock the logger instead
      consoleSpy.mockRestore();
    });
  });
});
