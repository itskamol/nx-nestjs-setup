import { useCallback, useState } from 'react';
import { z } from 'zod';
import { FormField, FormState } from '../types/forms';

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  onSubmit?: (values: T, event?: React.BaseSyntheticEvent) => void | Promise<void>;
}

export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>) {
  const { initialValues, validationSchema, onSubmit } = options;

  const createInitialFieldState = useCallback(
    (value: T[keyof T], key: keyof T): FormField<T[keyof T]> => {
      return {
        value,
        error: undefined,
        touched: false,
        required: false,
        dirty: false,
        validating: false,
        disabled: false,
      };
    },
    []
  );

  const createInitialFormState = useCallback(
    (values: T): FormState<T> => {
      if (!values) {
        return {
          fields: {} as FormState<T>['fields'],
          isValid: true,
          isSubmitting: false,
          submitCount: 0,
          isDirty: false,
          errors: {},
          touched: {},
        };
      }
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

  const setFieldValue = (field: keyof T, value: T[keyof T]) => {
    setFormState(prevState => ({
      ...prevState,
      fields: {
        ...prevState.fields,
        [field]: {
          ...prevState.fields[field],
          value,
          dirty: true,
        },
      },
    }));
  };

  const setFieldError = (field: keyof T, error: string) => {
    setFormState(prevState => ({
      ...prevState,
      errors: {
        ...prevState.errors,
        [field]: error,
      },
    }));
  };

  const validateForm = async () => {
    if (!validationSchema) return true;

    const values = Object.keys(formState.fields).reduce((acc, key) => {
      acc[key as keyof T] = formState.fields[key as keyof T].value;
      return acc;
    }, {} as T);

    const result = await validationSchema.safeParseAsync(values);

    if (!result.success) {
      const newErrors = result.error.issues.reduce(
        (acc, issue) => {
          acc[issue.path[0] as keyof T] = issue.message;
          return acc;
        },
        {} as Record<keyof T, string>
      );
      setFormState(prevState => ({
        ...prevState,
        errors: newErrors,
        isValid: false,
      }));
      return false;
    }

    setFormState(prevState => ({
      ...prevState,
      errors: {},
      isValid: true,
    }));
    return true;
  };

  const handleSubmit = async (event?: React.BaseSyntheticEvent) => {
    if (event) {
      event.preventDefault();
    }

    setFormState(prevState => ({ ...prevState, isSubmitting: true }));

    const isValid = await validateForm();
    if (isValid && onSubmit) {
      const values = Object.keys(formState.fields).reduce((acc, key) => {
        acc[key as keyof T] = formState.fields[key as keyof T].value;
        return acc;
      }, {} as T);
      await onSubmit(values, event);
    }

    setFormState(prevState => ({
      ...prevState,
      isSubmitting: false,
      submitCount: prevState.submitCount + 1,
    }));
  };

  const getFieldProps = (name: keyof T) => {
    return {
      name,
      value: formState.fields[name]?.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue(name, e.target.value as T[keyof T]);
      },
    };
  };

  const resetForm = () => {
    setFormState(createInitialFormState(initialValues));
  };

  const setErrors = (errors: Record<keyof T, string>) => {
    setFormState(prevState => ({
      ...prevState,
      errors,
    }));
  };

  const clearErrors = () => {
    setFormState(prevState => ({
      ...prevState,
      errors: {},
    }));
  };

  const values = Object.keys(formState.fields).reduce((acc, key) => {
    acc[key as keyof T] = formState.fields[key as keyof T].value;
    return acc;
  }, {} as T);

  return {
    ...formState,
    values,
    getFieldProps,
    handleSubmit,
    setFieldValue,
    setFieldError,
    validateForm,
    resetForm,
    clearErrors,
  };
}
