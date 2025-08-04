import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should throw error for empty password', async () => {
      await expect(service.hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      await expect(service.hashPassword(null as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for password too short', async () => {
      await expect(service.hashPassword('123')).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should throw error for password too long', async () => {
      const longPassword = 'a'.repeat(200);
      await expect(service.hashPassword(longPassword)).rejects.toThrow('Password must not exceed 128 characters');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await service.hashPassword(password);
      const result = await service.comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await service.hashPassword(password);
      const result = await service.comparePassword(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hashedPassword = await service.hashPassword('TestPassword123!');
      const result = await service.comparePassword('', hashedPassword);

      expect(result).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const result = await service.comparePassword('TestPassword123!', '');

      expect(result).toBe(false);
    });

    it('should return false for non-string inputs', async () => {
      const result = await service.comparePassword(null as any, null as any);

      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const password = 'StrongPassword123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(2);
    });

    it('should reject a weak password', () => {
      const password = 'weak';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(2);
    });

    it('should reject password without uppercase', () => {
      const password = 'lowercase123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const password = 'UPPERCASE123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'NoNumbers!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'NoSpecialChars123';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password with common patterns', () => {
      const password = 'Password123456!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common patterns');
    });

    it('should handle empty password', () => {
      const result = service.validatePasswordStrength('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
      expect(result.score).toBe(0);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password with default length', () => {
      const password = service.generateRandomPassword();

      expect(password).toBeDefined();
      expect(password.length).toBe(16);
    });

    it('should generate password with custom length', () => {
      const length = 20;
      const password = service.generateRandomPassword(length);

      expect(password.length).toBe(length);
    });

    it('should generate password with special characters by default', () => {
      const password = service.generateRandomPassword();
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

      expect(hasSpecialChar).toBe(true);
    });

    it('should generate password without special characters when disabled', () => {
      const password = service.generateRandomPassword(16, false);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

      expect(hasSpecialChar).toBe(false);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = service.generateRandomPassword();
      const password2 = service.generateRandomPassword();

      expect(password1).not.toBe(password2);
    });

    it('should generate password that passes strength validation', () => {
      const password = service.generateRandomPassword();
      const validation = service.validatePasswordStrength(password);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(2);
    });
  });

  describe('needsRehash', () => {
    it('should return false for password hashed with current salt rounds', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await service.hashPassword(password);
      const needsRehash = service.needsRehash(hashedPassword);

      expect(needsRehash).toBe(false);
    });

    it('should return true for invalid hash format', () => {
      const invalidHash = 'invalid-hash-format';
      const needsRehash = service.needsRehash(invalidHash);

      expect(needsRehash).toBe(true);
    });
  });
});