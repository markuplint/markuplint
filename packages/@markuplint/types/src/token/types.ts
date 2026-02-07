/**
 * A single token value: a literal string, a regular expression pattern, or a token type number.
 */
export type TokenValueScalar = string | Readonly<RegExp> | number;
/**
 * An array of token values for matching against multiple patterns.
 */
export type TokenValueArray = readonly TokenValue[];
/**
 * A token value used for matching: either a scalar or an array of token values.
 */
export type TokenValue = TokenValueScalar | TokenValueArray;
