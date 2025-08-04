import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import { ValidationError, validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ERROR_CODES } from '@shared/constants';

export interface ValidationErrorResponse {
  field: string;
  message: string;
  value?: any;
  children?: ValidationErrorResponse[];
}

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  async transform(value: any, { metatype, type, data }: ArgumentMetadata) {
    // Skip validation for primitive types and non-class types
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Log validation attempt for debugging
    this.logger.debug(`Validating ${type} parameter: ${data || 'body'}`);

    // Transform plain object to class instance
    const object = plainToClass(metatype, value, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });

    // Validate the object
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
      stopAtFirstError: false,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatValidationErrors(errors);

      this.logger.warn(`Validation failed for ${type} parameter: ${data || 'body'}`, {
        errors: formattedErrors,
        originalValue: value,
      });

      throw new BadRequestException({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: {
            errors: formattedErrors,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatValidationErrors(errors: ValidationError[]): ValidationErrorResponse[] {
    return errors.map(error => this.mapChildrenToValidationErrors(error));
  }

  private mapChildrenToValidationErrors(error: ValidationError): ValidationErrorResponse {
    const validationError: ValidationErrorResponse = {
      field: error.property,
      message: this.getErrorMessage(error),
      value: error.value,
    };

    // Handle nested validation errors
    if (error.children && error.children.length > 0) {
      validationError.children = error.children.map(child =>
        this.mapChildrenToValidationErrors(child)
      );
    }

    return validationError;
  }

  private getErrorMessage(error: ValidationError): string {
    if (error.constraints) {
      // Return the first constraint message, or a custom priority order
      const constraintKeys = Object.keys(error.constraints);

      // Priority order for constraint messages
      const priorityOrder = [
        'isNotEmpty',
        'isString',
        'isEmail',
        'minLength',
        'maxLength',
        'isStrongPassword',
        'noSqlInjection',
        'noXss',
        'isValidName',
        'isSanitizedString',
      ];

      for (const priority of priorityOrder) {
        if (constraintKeys.includes(priority)) {
          return error.constraints[priority];
        }
      }

      // If no priority match, return the first constraint
      return Object.values(error.constraints)[0];
    }

    return `Validation failed for field: ${error.property}`;
  }
}
