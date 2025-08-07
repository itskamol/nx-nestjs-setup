import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { FormField, FormHelpers, FormState, ValidationRule } from '../types/forms';
import { getValidationErrors } from '../types/schemas';

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  validationRules?: Partial<{
    [K in keyof T]: ValidationRule<T[K]> | ValidationRule<T[K]>[];
  }>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  enableReinitialize?: boolean;
  onSubmit?: (values: T, helpers: FormHelpers<T>) => Promise<void> | void;
  onReset?: () => void;
  onChange?: (values: T, changedField: keyof T) => void;
}

export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>) {
  const {
    initialValues,
    validationSchema,
    validationRules,
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    enableReinitialize = false,
    onSubmit,
    onReset,
    onChange,
  } = options;

  const createInitialFieldState = useCallback(
    (value: T[keyof T], key: keyof T): FormField<T[keyof T]> => {
      const rules = validationRules?.[key];
      const isRequired = Array.isArray(rules) ? rules.some(rule => rule.required) : rules?.required;

      return {
        value,
        error: undefined,
        touched: false,
        required: isRequired || false,
        dirty: false,
        validating: false,
        disabled: false,
      };
    },
    [validationRules]
  );

  const createInitialFormState = useCallback(
    (values: T): FormState<T> => {
      const fields = Object.keys(values).reduce(
        (acc, key) => {
          acc[key as keyof T] = createInitialFieldState(values[key as keyof T], key as keyof T);
          return acc;
        },
        {} as FormState<T>['fields']
      );

      return {
        fields,
        isValid: true,
        isSubmitting: false,
        submitCount: 0,
        isDirty: false,
        errors: {},
        touched: {},
      };
    },
    [createInitialFieldState]
  );

  const [formState, setFormState] = useState<FormState<T>>(() =>
    createInitialFormState(initialValues)
  );

  // Reinitialize form when initialValues change (if enabled)
  useEffect(() => {
    if (enableReinitialize) {
      setFormState(createInitialFormState(initialValues));
    }
  }, [initialValues, enableReinitialize, createInitialFormState]);

  const validateField = useCallback(
    async (fieldName: keyof T, value: T[keyof T]): Promise<string | undefined> => {
      if (!validationSchema) {
        return undefined;
      }

      try {
        const fieldData = { ...formState.values, [fieldName]: value };
        await validationSchema.parseAsync(fieldData);
        return undefined;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find(err => err.path.includes(fieldName as string));
          return fieldError?.message;
        }
        return 'Validation failed';
      }
    },
    [validationSchema, formState.values]
  );

  const validateForm = useCallback(async (): Promise<boolean> => {
    if (!validationSchema) {
      return true;
    }

    try {
      await validationSchema.parseAsync(formState.values);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { fieldErrors } = getValidationErrors(validationSchema, formState.values);
        setFormState(prev => ({
          ...prev,
          isValid: false,
          errors: fieldErrors,
        }));
      }
      return false;
    }
  }, [validationSchema, formState.values]);

  const setFieldValue = useCallback(
    async (fieldName: keyof T, value: T[keyof T]) => {
      setFormState(prev => {
        const newFields = {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            value,
            dirty: true,
            touched: true,
          },
        };

        const newValues = {
          ...prev.values,
          [fieldName]: value,
        };

        const isDirty = Object.values(newFields).some(field => field.dirty);
        const touched = {
          ...prev.touched,
          [fieldName]: true,
        };

        return {
          ...prev,
          fields: newFields,
          values: newValues,
          isDirty,
          touched,
        };
      });

      // Trigger onChange callback
      if (onChange) {
        const newValues = { ...formState.values, [fieldName]: value };
        onChange(newValues, fieldName);
      }

      // Validate field if validateOnChange is enabled
      if (validateOnChange) {
        const error = await validateField(fieldName, value);
        if (error) {
          setFormState(prev => ({
            ...prev,
            fields: {
              ...prev.fields,
              [fieldName]: {
                ...prev.fields[fieldName],
                error,
              },
            },
            errors: {
              ...prev.errors,
              [fieldName]: error,
            },
          }));
        } else {
          setFormState(prev => {
            const newErrors = { ...prev.errors };
            delete newErrors[fieldName];

            return {
              ...prev,
              fields: {
                ...prev.fields,
                [fieldName]: {
                  ...prev.fields[fieldName],
                  error: undefined,
                },
              },
              errors: newErrors,
            };
          });
        }
      }
    },
    [onChange, validateOnChange, validateField, formState.values]
  );

  const setFieldError = useCallback((fieldName: keyof T, error: string) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          ...prev.fields[fieldName],
          error,
        },
      },
      errors: {
        ...prev.errors,
        [fieldName]: error,
      },
    }));
  }, []);

  const setFieldTouched = useCallback(
    (fieldName: keyof T, touched: boolean) => {
      setFormState(prev => {
        const newFields = {
          ...prev.fields,
          [fieldName]: {
            ...prev.fields[fieldName],
            touched,
          },
        };

        const newTouched = {
          ...prev.touched,
          [fieldName]: touched,
        };

        return {
          ...prev,
          fields: newFields,
          touched: newTouched,
        };
      });

      // Validate field if validateOnBlur is enabled
      if (validateOnBlur && touched) {
        const value = formState.values[fieldName];
        validateField(fieldName, value).then(error => {
          if (error) {
            setFieldError(fieldName, error);
          } else {
            setFormState(prev => {
              const newErrors = { ...prev.errors };
              delete newErrors[fieldName];

              return {
                ...prev,
                fields: {
                  ...prev.fields,
                  [fieldName]: {
                    ...prev.fields[fieldName],
                    error: undefined,
                  },
                },
                errors: newErrors,
              };
            });
          }
        });
      }
    },
    [validateOnBlur, validateField, formState.values, setFieldError]
  );

  const setValues = useCallback(
    (values: Partial<T>) => {
      setFormState(prev => {
        const newFields = { ...prev.fields };
        const newValues = { ...prev.values, ...values };

        Object.entries(values).forEach(([key, value]) => {
          const fieldKey = key as keyof T;
          newFields[fieldKey] = {
            ...newFields[fieldKey],
            value: value as T[keyof T],
            dirty: true,
            touched: true,
          };
        });

        const isDirty = Object.values(newFields).some(field => field.dirty);
        const touched = {
          ...prev.touched,
          ...Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        };

        return {
          ...prev,
          fields: newFields,
          values: newValues,
          isDirty,
          touched,
        };
      });

      // Trigger onChange callback for the entire form
      if (onChange) {
        const newValues = { ...formState.values, ...values };
        onChange(newValues, Object.keys(values)[0] as keyof T);
      }
    },
    [onChange, formState.values]
  );

  const setErrors = useCallback((errors: Partial<Record<keyof T, string>>) => {
    setFormState(prev => {
      const newFields = { ...prev.fields };
      const newErrors = { ...prev.errors };

      Object.entries(errors).forEach(([key, error]) => {
        const fieldKey = key as keyof T;
        if (error) {
          newFields[fieldKey] = {
            ...newFields[fieldKey],
            error,
          };
          newErrors[fieldKey] = error;
        } else {
          delete newErrors[fieldKey];
        }
      });

      return {
        ...prev,
        fields: newFields,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState(prev => ({
      ...prev,
      isSubmitting,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(createInitialFormState(initialValues));
    onReset?.();
  }, [createInitialFormState, initialValues, onReset]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      setFormState(prev => ({
        ...prev,
        submitCount: prev.submitCount + 1,
        isSubmitting: true,
      }));

      let isValid = true;
      if (validateOnSubmit && validationSchema) {
        isValid = await validateForm();
      }

      if (isValid && onSubmit) {
        try {
          await onSubmit(formState.values, {
            setFieldValue,
            setFieldError,
            setFieldTouched,
            setValues,
            setErrors,
            setSubmitting,
            resetForm,
            validateForm,
            validateField: async (field: keyof T) => {
              const error = await validateField(field, formState.values[field]);
              if (error) {
                setFieldError(field, error);
              }
              return !error;
            },
            setFieldDisabled: (field: keyof T, disabled: boolean) => {
              setFormState(prev => ({
                ...prev,
                fields: {
                  ...prev.fields,
                  [field]: {
                    ...prev.fields[field],
                    disabled,
                  },
                },
              }));
            },
          });
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }

      setSubmitting(false);
    },
    [
      validateOnSubmit,
      validationSchema,
      validateForm,
      onSubmit,
      formState.values,
      setFieldValue,
      setFieldError,
      setFieldTouched,
      setValues,
      setErrors,
      setSubmitting,
      resetForm,
      validateField,
    ]
  );

  const getFieldProps = useCallback(
    (fieldName: keyof T) => {
      const field = formState.fields[fieldName];
      return {
        value: field.value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const value =
            e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
          setFieldValue(fieldName, value as T[keyof T]);
        },
        onBlur: () => setFieldTouched(fieldName, true),
        error: field.error,
        touched: field.touched,
        required: field.required,
        disabled: field.disabled,
      };
    },
    [formState.fields, setFieldValue, setFieldTouched]
  );

  const formHelpers: FormHelpers<T> = {
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    setErrors,
    setSubmitting,
    resetForm,
    validateForm,
    validateField,
    setFieldDisabled: (field: keyof T, disabled: boolean) => {
      setFormState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [field]: {
            ...prev.fields[field],
            disabled,
          },
        },
      }));
    },
  };

  // Extract values from form state for easier access
  const values = Object.keys(formState.fields).reduce((acc, key) => {
    acc[key as keyof T] = formState.fields[key as keyof T].value;
    return acc;
  }, {} as T);

  return {
    values,
    errors: formState.errors,
    touched: formState.touched,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    isDirty: formState.isDirty,
    submitCount: formState.submitCount,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    setErrors,
    setSubmitting,
    resetForm,
    validateForm,
    validateField,
    handleSubmit,
    getFieldProps,
    ...formHelpers,
  };
}

export type UseFormReturn<T extends Record<string, unknown>> = ReturnType<typeof useForm<T>>;
