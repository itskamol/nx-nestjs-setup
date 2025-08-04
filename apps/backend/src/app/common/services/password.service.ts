import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { APP_CONSTANTS } from '@shared/constants';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly saltRounds = APP_CONSTANTS.BCRYPT.SALT_ROUNDS;

  /**
   * Hash a plain text password
   * @param password Plain text password
   * @returns Promise<string> Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (password.length < APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH} characters long`);
      }

      if (password.length > APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH) {
        throw new Error(`Password must not exceed ${APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH} characters`);
      }

      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      this.logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      this.logger.error('Failed to hash password', error);
      throw error;
    }
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password Plain text password
   * @param hashedPassword Hashed password from database
   * @returns Promise<boolean> True if passwords match
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      if (!password || !hashedPassword) {
        this.logger.warn('Password comparison attempted with empty values');
        return false;
      }

      if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
        this.logger.warn('Password comparison attempted with non-string values');
        return false;
      }

      const isMatch = await bcrypt.compare(password, hashedPassword);
      this.logger.debug(`Password comparison result: ${isMatch ? 'match' : 'no match'}`);
      return isMatch;
    } catch (error) {
      this.logger.error('Failed to compare password', error);
      return false;
    }
  }

  /**
   * Validate password strength
   * @param password Plain text password
   * @returns Object with validation result and messages
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number; // 0-4 (weak to strong)
  } {
    const errors: string[] = [];
    let score = 0;

    if (!password) {
      return {
        isValid: false,
        errors: ['Password is required'],
        score: 0,
      };
    }

    // Length check
    if (password.length < APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH} characters long`);
    } else {
      score += 1;
    }

    if (password.length > APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH) {
      errors.push(`Password must not exceed ${APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH} characters`);
    }

    // Complexity checks
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 0.5;
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 0.5;
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Additional strength checks
    if (password.length >= 12) {
      score += 0.5;
    }

    if (password.length >= 16) {
      score += 0.5;
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123456|654321|abcdef|qwerty/i, // Common sequences
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common patterns');
        score -= 0.5;
        break;
      }
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(4, score));

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.round(score),
    };
  }

  /**
   * Generate a random password
   * @param length Password length (default: 16)
   * @param includeSpecialChars Include special characters (default: true)
   * @returns string Generated password
   */
  generateRandomPassword(length: number = 16, includeSpecialChars: boolean = true): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = lowercase + uppercase + numbers;
    if (includeSpecialChars) {
      charset += specialChars;
    }

    let password = '';
    
    // Ensure at least one character from each required set
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    
    if (includeSpecialChars) {
      password += specialChars[Math.floor(Math.random() * specialChars.length)];
    }

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if a password needs to be rehashed (e.g., if salt rounds changed)
   * @param hashedPassword Hashed password from database
   * @returns boolean True if password needs rehashing
   */
  needsRehash(hashedPassword: string): boolean {
    try {
      const rounds = bcrypt.getRounds(hashedPassword);
      return rounds !== this.saltRounds;
    } catch (error) {
      this.logger.error('Failed to check if password needs rehash', error);
      return true; // Assume it needs rehashing if we can't determine
    }
  }
}