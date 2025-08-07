import {
  createUserSchema,
  faceEnrollmentSchema,
  loginSchema,
  registerSchema,
} from '@/types/schemas';

describe('Zod Schemas', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        remember: true,
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('allows optional remember field', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('validates correct registration data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
        role: 'USER',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects weak password', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects password mismatch', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'DifferentPass123!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires all fields', () => {
      const invalidData = {
        firstName: 'John',
        email: 'john@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('faceEnrollmentSchema', () => {
    it('validates correct face enrollment data', () => {
      const validData = {
        userId: 'user123',
        imageData: 'base64-image-data',
        faceData: 'face-data',
        confidence: 0.85,
        metadata: {
          quality: 0.9,
          brightness: 0.8,
          blur: 0.1,
        },
      };

      const result = faceEnrollmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects missing userId', () => {
      const invalidData = {
        imageData: 'base64-image-data',
        confidence: 0.85,
      };

      const result = faceEnrollmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects missing imageData', () => {
      const invalidData = {
        userId: 'user123',
        confidence: 0.85,
      };

      const result = faceEnrollmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects confidence below minimum', () => {
      const invalidData = {
        userId: 'user123',
        imageData: 'base64-image-data',
        confidence: 0.4,
      };

      const result = faceEnrollmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects confidence above maximum', () => {
      const invalidData = {
        userId: 'user123',
        imageData: 'base64-image-data',
        confidence: 1.0,
      };

      const result = faceEnrollmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('validates correct user creation data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'StrongPass123!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'weak',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires all mandatory fields', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'USER',
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('allows optional fields', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        role: 'USER',
        isActive: true,
        phone: '+1234567890',
        department: 'IT',
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('password validation', () => {
    it('enforces minimum length', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Short1!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires uppercase letter', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'lowercase123!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires lowercase letter', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'UPPERCASE123!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires number', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'NoNumbers!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires special character', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'NoSpecialChars123',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects passwords with spaces', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'With Spaces123!',
        role: 'USER',
        isActive: true,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
