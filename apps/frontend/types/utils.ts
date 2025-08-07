// Utility types for common TypeScript operations

// Primitive types
export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Deep partial type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep required type
export type DeepRequired<T> = {
  [P in keyof T]: T[P] extends object ? DeepRequired<T[P]> : Required<T[P]>;
};

// Deep readonly type
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Pick multiple properties
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;

// Omit multiple properties
export type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

// Make all properties writable
export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Make all properties readonly
export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

// Extract promise type
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

// Extract array element type
export type ArrayElement<T> = T extends (infer U)[] ? U : T;

// Extract function parameters
export type FunctionParams<T> = T extends (...args: infer P) => any ? P : never;

// Extract function return type
export type FunctionReturn<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract async function return type
export type AsyncFunctionReturn<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

// Merge two types
export type Merge<T, U> = T & Omit<U, keyof T>;

// Union to intersection
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// Extract keys of type T
export type KeysOf<T> = keyof T;

// Extract values of type T
export type ValuesOf<T> = T[keyof T];

// Extract keys by value type
export type KeysByValue<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Extract keys by value type including optional
export type KeysByValueIncludingOptional<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Make properties required or optional based on condition
export type ConditionalRequired<T, C extends boolean> = C extends true ? Required<T> : T;
export type ConditionalOptional<T, C extends boolean> = C extends true ? Partial<T> : T;

// Extract nullable and optional properties
export type NullableFields<T> = {
  [K in keyof T]: T[K] | null;
};

// Extract undefined properties
export type UndefinedFields<T> = {
  [K in keyof T]: T[K] | undefined;
};

// Remove null and undefined from type
export type NonNullable<T> = T extends null | undefined ? never : T;

// Remove null from type
export type NonNull<T> = T extends null ? never : T;

// Remove undefined from type
export type NonUndefined<T> = T extends undefined ? never : T;

// Extract non-nullable properties
export type NonNullableFields<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

// Extract optional properties
export type OptionalProperties<T> = {
  [K in keyof T]?: T[K];
};

// Extract required properties
export type RequiredProperties<T> = {
  [K in keyof T]: T[K];
};

// String literal types
export type StringLiteral<T> = T extends string ? T : never;

// Number literal types
export type NumberLiteral<T> = T extends number ? T : never;

// Boolean literal types
export type BooleanLiteral<T> = T extends boolean ? T : never;

// Extract literal types
export type LiteralTypes<T> = StringLiteral<T> | NumberLiteral<T> | BooleanLiteral<T>;

// Extract exact type
export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

// Brand type for nominal typing
export type Brand<T, B> = T & { __brand: B };

// Opaque type
export type Opaque<T, B> = T & { readonly __opaque__: B };

// Create branded type
export type Branded<T, B> = T & { __brand__: B };

// Create opaque type
export type OpaqueType<T, B> = T & { readonly __opaque_type__: B };

// Extract branded type
export type Unbrand<T> = T extends { __brand__: any } ? Omit<T, '__brand__'> : T;

// Extract opaque type
export type Unopaque<T> = T extends { __opaque_type__: any } ? Omit<T, '__opaque_type__'> : T;

// Type guards
export type TypeGuard<T> = (value: unknown) => value is T;

// Validation function type
export type ValidationFunction<T> = (value: T) => boolean | string | Promise<boolean | string>;

// Error handling types
export type ErrorType = Error | string | { message: string };

// Result type for operations
export type Result<T, E = ErrorType> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Async result type
export type AsyncResult<T, E = ErrorType> = Promise<Result<T, E>>;

// Either type for error handling
export type Either<L, R> = { left: L; right?: never } | { left?: never; right: R };

// Maybe type for optional values
export type Maybe<T> = T | null | undefined;

// Try type for operations that might fail
export type Try<T, E = Error> = { success: true; value: T } | { success: false; error: E };

// Extract success type from result
export type SuccessType<T> = T extends { success: true; data: infer U } ? U : never;

// Extract error type from result

// Extract left type from either
export type LeftType<T> = T extends { left: infer L } ? L : never;

// Extract right type from either
export type RightType<T> = T extends { right: infer R } ? R : never;

// Extract value type from maybe
export type JustType<T> = T extends NonNullable<infer U> ? U : never;

// Extract success value from try
export type TrySuccess<T> = T extends { success: true; value: infer U } ? U : never;

// Extract error from try
export type TryError<T> = T extends { success: false; error: infer E } ? E : never;

// Event types
export type EventHandler<T = unknown> = (event: T) => void;
export type AsyncEventHandler<T = unknown> = (event: T) => Promise<void>;

// Callback types
export type Callback<T = unknown> = (data: T) => void;
export type AsyncCallback<T = unknown> = (data: T) => Promise<void>;

// Predicate types
export type Predicate<T = unknown> = (value: T) => boolean;
export type AsyncPredicate<T = unknown> = (value: T) => Promise<boolean>;

// Comparator types
export type Comparator<T = unknown> = (a: T, b: T) => number;
export type AsyncComparator<T = unknown> = (a: T, b: T) => Promise<number>;

// Mapper types
export type Mapper<T = unknown, U = unknown> = (value: T) => U;
export type AsyncMapper<T = unknown, U = unknown> = (value: T) => Promise<U>;

// Reducer types
export type Reducer<T = unknown, A = unknown> = (state: T, action: A) => T;
export type AsyncReducer<T = unknown, A = unknown> = (state: T, action: A) => Promise<T>;

// Filter types
export type Filter<T = unknown> = (value: T) => boolean;
export type AsyncFilter<T = unknown> = (value: T) => Promise<boolean>;

// Transformer types
export type Transformer<T = unknown, U = unknown> = (value: T) => U;
export type AsyncTransformer<T = unknown, U = unknown> = (value: T) => Promise<U>;

// Factory types
export type Factory<T = unknown> = () => T;
export type AsyncFactory<T = unknown> = () => Promise<T>;

// Builder types
export type Builder<T = unknown> = (config: Partial<T>) => T;
export type AsyncBuilder<T = unknown> = (config: Partial<T>) => Promise<T>;

// Config types
export type Config<T = unknown> = Partial<T> & { required?: (keyof T)[] };

// State types
export type State<T = unknown> = T & { loading?: boolean; error?: ErrorType };
export type AsyncState<T = unknown> = {
  data: T | null;
  loading: boolean;
  error: ErrorType | null;
};

// Note: Types are exported through the main index.ts file
