import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ERROR_CODES } from '@shared/constants';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  constraints?: Record<string, string>;
}

export class ValidationException extends HttpException {
  constructor(
    errors: ValidationError[] | ValidationErrorDetail[] | string,
    message: string = 'Validation failed'
  ) {
    const response = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message,
        details: {
          errors: [],
          count: 0,
        },
        timestamp: new Date().toISOString(),
      },
    };

    super(response, HttpStatus.BAD_REQUEST);

    let formattedErrors: ValidationErrorDetail[];

    if (typeof errors === 'string') {
      formattedErrors = [
        {
          field: 'general',
          message: errors,
        },
      ];
    } else if (Array.isArray(errors) && errors.length > 0) {
      if ('property' in errors[0]) {
        // Handle class-validator ValidationError[]
        formattedErrors = this.formatClassValidatorErrors(errors as ValidationError[]);
      } else {
        // Handle ValidationErrorDetail[]
        formattedErrors = errors as ValidationErrorDetail[];
      }
    } else {
      formattedErrors = [
        {
          field: 'general',
          message: 'Unknown validation error',
        },
      ];
    }

    // Update the response with formatted errors
    (this.getResponse() as any).error.details.errors = formattedErrors;
    (this.getResponse() as any).error.details.count = formattedErrors.length;
  }

  private formatClassValidatorErrors(errors: ValidationError[]): ValidationErrorDetail[] {
    const formattedErrors: ValidationErrorDetail[] = [];

    const processError = (error: ValidationError, parentPath: string = '') => {
      const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        // Add constraint violations
        Object.entries(error.constraints).forEach(([constraint, message]) => {
          formattedErrors.push({
            field: fieldPath,
            message,
            value: error.value,
            constraints: { [constraint]: message },
          });
        });
      }

      // Process nested errors
      if (error.children && error.children.length > 0) {
        error.children.forEach(childError => {
          processError(childError, fieldPath);
        });
      }
    };

    errors.forEach(error => processError(error));
    return formattedErrors;
  }

  static fromClassValidator(errors: ValidationError[], message?: string): ValidationException {
    return new ValidationException(errors, message);
  }

  static fromFieldErrors(
    fieldErrors: Record<string, string>,
    message?: string
  ): ValidationException {
    const errors: ValidationErrorDetail[] = Object.entries(fieldErrors).map(([field, msg]) => ({
      field,
      message: msg,
    }));

    return new ValidationException(errors, message);
  }

  static single(field: string, message: string, value?: any): ValidationException {
    const error: ValidationErrorDetail = {
      field,
      message,
      value,
    };

    return new ValidationException([error]);
  }
}

export class FileValidationException extends ValidationException {
  constructor(
    field: string,
    message: string,
    details?: {
      filename?: string;
      size?: number;
      mimetype?: string;
      maxSize?: number;
      allowedTypes?: string[];
    }
  ) {
    const error: ValidationErrorDetail = {
      field,
      message,
      value: details?.filename,
      constraints: {
        fileValidation: message,
      },
    };

    super([error], 'File validation failed');
  }
}

export class SchemaValidationException extends ValidationException {
  constructor(schemaName: string, errors: ValidationError[]) {
    super(errors, `Schema validation failed for ${schemaName}`);
  }
}
