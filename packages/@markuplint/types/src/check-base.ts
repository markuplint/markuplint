import type {
	Type,
	Result,
	List,
	CustomSyntax,
	CustomCssSyntax,
	Enum,
	KeywordDefinedType,
	Number,
	Directive,
	Defs,
} from './types.js';
import type { ReadonlyDeep } from 'type-fest';

import { log } from './debug.js';
import { checkDirective } from './directive.js';
import { checkEnum } from './enum.js';
import { checkKeywordType } from './keyword-type.js';
import { checkList } from './list.js';
import { checkNumber } from './number.js';

/**
 * Validates a string value against a specified type definition using the provided
 * set of custom type definitions. This is the core type-checking dispatcher that
 * routes validation to the appropriate checker based on the type's structure
 * (keyword, list, enum, number, or directive).
 *
 * @param value - The string value to validate
 * @param type - The type definition to validate against
 * @param defs - A map of custom type definitions (both CSS syntax and custom syntax) used for resolving keyword types
 * @param ref - An optional reference identifier used for error reporting context
 * @param cache - Whether to use cached results for repeated checks with the same inputs
 * @returns A result indicating whether the value matches the type, or details about the mismatch
 * @throws Error if the type does not match any known type structure
 */
export function checkBase(value: string, type: ReadonlyDeep<Type>, defs: Defs, ref?: string, cache = true): Result {
	if (isKeyword(type)) {
		log('Check keyword: %s', type);
		return checkKeywordType(value, type, defs, cache);
	}
	if (isList(type)) {
		log('Check list: %O', type);
		return checkList(value, type, defs, ref, cache);
	}
	if (isEnum(type)) {
		log('Check enum: %O', type);
		return checkEnum(value, type, ref);
	}
	if (isNumber(type)) {
		log('Check number: %O', type);
		return checkNumber(value, type, ref);
	}
	if (isDirective(type)) {
		log('Check directive: %O', type);
		return checkDirective(value, type, defs, ref, cache);
	}
	throw new Error('Unknown type');
}

/**
 * Determines whether a type definition is a keyword-based type.
 * Keyword types are represented as plain strings (e.g., CSS syntax names
 * like `"<color>"` or extended types like `"URL"`).
 *
 * @param type - The type definition to test
 * @returns True if the type is a keyword-defined type string
 */
export function isKeyword(type: ReadonlyDeep<Type>): type is ReadonlyDeep<KeywordDefinedType> {
	return typeof type === 'string';
}

/**
 * Determines whether a type definition represents a list type.
 * List types define space-separated or comma-separated token sequences
 * and are identified by having a `separator` property.
 *
 * @param type - The type definition to test
 * @returns True if the type is a list definition
 */
export function isList(type: ReadonlyDeep<Type>): type is ReadonlyDeep<List> {
	return typeof type !== 'string' && 'separator' in type;
}

/**
 * Determines whether a type definition represents an enumerated type.
 * Enum types define a fixed set of allowed string values and are
 * identified by having an `enum` property.
 *
 * @param type - The type definition to test
 * @returns True if the type is an enum definition
 */
export function isEnum(type: ReadonlyDeep<Type>): type is ReadonlyDeep<Enum> {
	return typeof type !== 'string' && 'enum' in type;
}

/**
 * Determines whether a type definition represents a numeric type.
 * Number types specify either `float` or `integer` validation with
 * optional range constraints, and are identified by having a `type`
 * property set to one of those values.
 *
 * @param type - The type definition to test
 * @returns True if the type is a number definition
 */
export function isNumber(type: ReadonlyDeep<Type>): type is ReadonlyDeep<Number> {
	return typeof type !== 'string' && 'type' in type && (type.type === 'float' || type.type === 'integer');
}

/**
 * Determines whether a type definition represents a directive type.
 * Directive types allow separating and individually validating parts of
 * an attribute value, and are identified by having a `directive` property.
 *
 * @param type - The type definition to test
 * @returns True if the type is a directive definition
 */
export function isDirective(type: ReadonlyDeep<Type>): type is ReadonlyDeep<Directive> {
	return typeof type !== 'string' && 'directive' in type;
}

/**
 * Determines whether a custom type definition uses CSS syntax matching.
 * CSS syntax definitions are either plain strings or objects with a `syntax`
 * property that specifies CSS value definition syntax for matching.
 *
 * @param type - The custom type definition to test
 * @returns True if the definition uses CSS syntax matching
 */
export function isCSSSyntax(type: CustomSyntax | CustomCssSyntax): type is CustomCssSyntax {
	return typeof type === 'string' || 'syntax' in type;
}

/**
 * Determines whether a custom type definition uses a programmatic custom
 * syntax checker rather than CSS syntax matching. This is the inverse
 * of {@link isCSSSyntax}.
 *
 * @param type - The custom type definition to test
 * @returns True if the definition uses a custom programmatic checker function
 */
export function isCustomSyntax(type: CustomSyntax | CustomCssSyntax): type is CustomSyntax {
	return !isCSSSyntax(type);
}
