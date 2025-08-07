import { FormSchemaBuilder } from '@/utils/formValidation';
import { z } from 'zod';

describe('FormSchemaBuilder', () => {
  let builder: FormSchemaBuilder<any>;

  beforeEach(() => {
    builder = new FormSchemaBuilder();
  });

  it('creates an empty schema by default', () => {
    const schema = builder.build();
    expect(schema).toBeDefined();
  });

  it('adds a required string field', () => {
    const schema = builder.addStringField('name', { required: true }).build();

    const validResult = schema.safeParse({ name: 'John Doe' });
    const invalidResult = schema.safeParse({ name: '' });

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });

  it('adds an optional string field', () => {
    const schema = builder.addStringField('name', { required: false }).build();

    const validResult = schema.safeParse({ name: 'John Doe' });
    const emptyResult = schema.safeParse({ name: '' });
    const undefinedResult = schema.safeParse({});

    expect(validResult.success).toBe(true);
    expect(emptyResult.success).toBe(true);
    expect(undefinedResult.success).toBe(true);
  });

  it('adds string field with min and max length', () => {
    const schema = builder.addStringField('name', { required: true, min: 2, max: 50 }).build();

    const validResult = schema.safeParse({ name: 'John' });
    const tooShortResult = schema.safeParse({ name: 'J' });
    const tooLongResult = schema.safeParse({ name: 'A'.repeat(51) });

    expect(validResult.success).toBe(true);
    expect(tooShortResult.success).toBe(false);
    expect(tooLongResult.success).toBe(false);
  });

  it('adds email field', () => {
    const schema = builder.addStringField('email', { required: true, email: true }).build();

    const validResult = schema.safeParse({ email: 'test@example.com' });
    const invalidResult = schema.safeParse({ email: 'invalid-email' });

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });

  it('adds number field with min and max values', () => {
    const schema = builder.addNumberField('age', { required: true, min: 18, max: 100 }).build();

    const validResult = schema.safeParse({ age: 25 });
    const tooSmallResult = schema.safeParse({ age: 17 });
    const tooLargeResult = schema.safeParse({ age: 101 });

    expect(validResult.success).toBe(true);
    expect(tooSmallResult.success).toBe(false);
    expect(tooLargeResult.success).toBe(false);
  });

  it('adds boolean field', () => {
    const schema = builder.addBooleanField('isActive', { required: true }).build();

    const trueResult = schema.safeParse({ isActive: true });
    const falseResult = schema.safeParse({ isActive: false });
    const missingResult = schema.safeParse({});

    expect(trueResult.success).toBe(true);
    expect(falseResult.success).toBe(true);
    expect(missingResult.success).toBe(false);
  });

  it('adds password field with requirements', () => {
    const schema = builder
      .addPasswordField('password', {
        required: true,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: true,
        noSpaces: true,
      })
      .build();

    const validResult = schema.safeParse({ password: 'StrongPass123!' });
    const weakResult = schema.safeParse({ password: 'weak' });
    const spacesResult = schema.safeParse({ password: 'weak pass' });

    expect(validResult.success).toBe(true);
    expect(weakResult.success).toBe(false);
    expect(spacesResult.success).toBe(false);
  });

  it('adds date field', () => {
    const schema = builder.addDateField('birthDate', { required: true }).build();

    const validResult = schema.safeParse({ birthDate: '1990-01-01' });
    const invalidResult = schema.safeParse({ birthDate: 'invalid-date' });

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });

  it('adds array field with min and max items', () => {
    const schema = builder
      .addArrayField('tags', z.string(), { required: true, min: 1, max: 5 })
      .build();

    const validResult = schema.safeParse({ tags: ['tag1', 'tag2'] });
    const emptyResult = schema.safeParse({ tags: [] });
    const tooManyResult = schema.safeParse({
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
    });

    expect(validResult.success).toBe(true);
    expect(emptyResult.success).toBe(false);
    expect(tooManyResult.success).toBe(false);
  });

  it('builds complex form schema with multiple fields', () => {
    const schema = builder
      .addStringField('name', { required: true, min: 2, max: 50 })
      .addStringField('email', { required: true, email: true })
      .addNumberField('age', { required: true, min: 18, max: 100 })
      .addBooleanField('isActive', { required: false })
      .addPasswordField('password', {
        required: true,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
      })
      .build();

    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      isActive: true,
      password: 'StrongPass123',
    };

    const invalidData = {
      name: 'J',
      email: 'invalid-email',
      age: 17,
      isActive: true,
      password: 'weak',
    };

    const validResult = schema.safeParse(validData);
    const invalidResult = schema.safeParse(invalidData);

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });
});
