import type { ConditionalAttributeType } from '../types/attributes.js';
import type { Attribute } from '../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

/**
 * Narrows an `Attribute['type']` value to `readonly ConditionalAttributeType[]` (#3685).
 *
 * `Attribute['type']` is the union `AttributeType | readonly AttributeType[] | readonly ConditionalAttributeType[]`.
 * The three variants are mutually exclusive at the spec author level: an attribute
 * either declares a single/tuple of `AttributeType` values, or it declares conditional
 * types that depend on another attribute's value — never a mix.
 *
 * Discrimination: every non-conditional `AttributeType` object variant (`List`, `Enum`,
 * `Number`, `Directive`) lacks a `condition` key, whereas `ConditionalAttributeType`
 * requires it. Checking the first array element is sufficient because the schema
 * forbids mixing the two shapes within a single `type` value.
 *
 * @example
 * ```ts
 * isConditionalAttributeTypeArray('URL') // false — single AttributeType
 * isConditionalAttributeTypeArray(['URL', 'Any']) // false — AttributeType tuple
 * isConditionalAttributeTypeArray([{ enum: ['on', 'off'] }]) // false — Enum
 * isConditionalAttributeTypeArray([{ condition: "[type='color' i]", type: "<'color'>" }]) // true
 * ```
 *
 * @param type - The `Attribute['type']` value to test; may be a scalar `AttributeType`,
 *   an array of `AttributeType`, or an array of `ConditionalAttributeType`
 * @returns `true` if `type` is a non-empty array whose first entry is a
 *   `ConditionalAttributeType` (has a `condition` key); `false` otherwise
 */
export function isConditionalAttributeTypeArray(
	type: Attribute['type'],
): type is readonly ReadonlyDeep<ConditionalAttributeType>[] {
	return Array.isArray(type) && type.length > 0 && typeof type[0] === 'object' && 'condition' in type[0];
}
