import type * as React from "react";

declare module "react-hook-form" {
  export type FieldValues = Record<string, unknown>;

  export type FieldPath<
    TFieldValues extends FieldValues = FieldValues,
  > = Extract<keyof TFieldValues, string>;

  export type FieldPathValue<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
  > = TFieldValues[TName];

  export type FieldError = {
    message?: string;
  };

  export type FormState<TFieldValues extends FieldValues = FieldValues> = {
    isSubmitting: boolean;
    errors: Partial<Record<FieldPath<TFieldValues>, FieldError>>;
  };

  export type ControllerFieldState = {
    error?: FieldError;
  };

  export type ControllerRenderProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  > = {
    name: TName;
    value: FieldPathValue<TFieldValues, TName>;
    onChange: (...event: unknown[]) => void;
    onBlur: () => void;
    ref: (instance: unknown) => void;
    disabled?: boolean;
  };

  export type UseFormProps<
    TFieldValues extends FieldValues = FieldValues,
  > = Partial<{
    resolver: unknown;
    defaultValues: Partial<TFieldValues>;
    context: unknown;
    values: Partial<TFieldValues>;
    disabled: boolean;
  }>;

  export type Control<TFieldValues extends FieldValues = FieldValues> = {
    _formValues?: TFieldValues;
  };

  export type UseFormReturn<
    TFieldValues extends FieldValues = FieldValues,
  > = {
    control: Control<TFieldValues>;
    formState: FormState<TFieldValues>;
    handleSubmit: <TSubmitValues extends TFieldValues = TFieldValues>(
      onValid: (values: TSubmitValues) => unknown | Promise<unknown>,
    ) => (event?: React.BaseSyntheticEvent) => Promise<void>;
    reset: (values?: Partial<TFieldValues>) => void;
    getFieldState: (
      name: FieldPath<TFieldValues>,
      formState?: FormState<TFieldValues>,
    ) => ControllerFieldState;
  };

  export type ControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  > = {
    name: TName;
    control: Control<TFieldValues>;
    render: (props: {
      field: ControllerRenderProps<TFieldValues, TName>;
      fieldState: ControllerFieldState;
      formState: FormState<TFieldValues>;
    }) => React.ReactElement;
  };

  export function useForm<
    TFieldValues extends FieldValues = FieldValues,
  >(
    props?: UseFormProps<TFieldValues>,
  ): UseFormReturn<TFieldValues>;

  export function useFormContext<
    TFieldValues extends FieldValues = FieldValues,
  >(): UseFormReturn<TFieldValues>;

  export function useFormState<
    TFieldValues extends FieldValues = FieldValues,
  >(props?: {
    name?: FieldPath<TFieldValues>;
  }): FormState<TFieldValues>;

  export const FormProvider: <TFieldValues extends FieldValues = FieldValues>(
    props: UseFormReturn<TFieldValues> & { children?: React.ReactNode },
  ) => React.ReactElement;

  export const Controller: <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  >(
    props: ControllerProps<TFieldValues, TName>,
  ) => React.ReactElement;
}
