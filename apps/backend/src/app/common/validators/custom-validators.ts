import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

// Strong Password Validator
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, _args: ValidationArguments) {
    if (!password) return false;

    // At least 8 characters
    if (password.length < 8) return false;

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) return false;

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;

    // At least one number
    if (!/\d/.test(password)) return false;

    // At least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

    // No common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123456|654321|abcdef|qwerty/i, // Common sequences
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) return false;
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// No HTML Tags Validator
@ValidatorConstraint({ name: 'noHtmlTags', async: false })
export class NoHtmlTagsConstraint implements ValidatorConstraintInterface {
  validate(text: string, _args: ValidationArguments) {
    if (!text) return true; // Allow empty strings
    return !/<[^>]*>/.test(text);
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Text cannot contain HTML tags';
  }
}

export function NoHtmlTags(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoHtmlTagsConstraint,
    });
  };
}

// No SQL Injection Validator
@ValidatorConstraint({ name: 'noSqlInjection', async: false })
export class NoSqlInjectionConstraint implements ValidatorConstraintInterface {
  validate(text: string, _args: ValidationArguments) {
    if (!text) return true; // Allow empty strings

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|"|`)/,
      /(\bOR\b|\bAND\b).*(\b=\b|\b<\b|\b>\b)/i,
    ];

    return !sqlPatterns.some(pattern => pattern.test(text));
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Text contains potentially dangerous SQL patterns';
  }
}

export function NoSqlInjection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoSqlInjectionConstraint,
    });
  };
}

// Valid Name Validator (only letters, spaces, hyphens, apostrophes)
@ValidatorConstraint({ name: 'isValidName', async: false })
export class IsValidNameConstraint implements ValidatorConstraintInterface {
  validate(name: string, _args: ValidationArguments) {
    if (!name) return true; // Allow empty strings for optional fields
    return /^[a-zA-Z\s\-']+$/.test(name);
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }
}

export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidNameConstraint,
    });
  };
}

// Phone Number Validator
@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string, _args: ValidationArguments) {
    if (!phone) return true; // Allow empty strings for optional fields

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a valid length (10-15 digits)
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Phone number must be between 10 and 15 digits';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

// URL Validator with specific protocols
@ValidatorConstraint({ name: 'isSecureUrl', async: false })
export class IsSecureUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, _args: ValidationArguments) {
    if (!url) return true; // Allow empty strings for optional fields

    try {
      const urlObj = new URL(url);
      return ['https:', 'http:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  defaultMessage(_args: ValidationArguments) {
    return 'URL must be a valid HTTP or HTTPS URL';
  }
}

export function IsSecureUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecureUrlConstraint,
    });
  };
}

// Date Range Validator
export function IsDateRange(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRange',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          if (!value || !relatedValue) return true; // Skip if either is empty

          const startDate = new Date(value);
          const endDate = new Date(relatedValue);

          return startDate <= endDate;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be before or equal to ${relatedPropertyName}`;
        },
      },
    });
  };
}
