/**
 * Utility type that widens `T` to also accept `null` or `undefined`.
 *
 * @template T - The base type to make nullable
 */
export type Nullable<T> = T | null | undefined;
