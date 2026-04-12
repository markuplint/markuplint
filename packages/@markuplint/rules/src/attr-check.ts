import type { Translator } from '@markuplint/i18n';
import type { Attribute as AttrSpec, AttributeType } from '@markuplint/ml-spec';
import type { Type } from '@markuplint/types';
import type { ReadonlyDeep } from 'type-fest';

import { isConditionalAttributeTypeArray } from '@markuplint/ml-spec';
import { toNonNullableArrayFromItemOrArray } from '@markuplint/shared';
import { check, getCandidate } from '@markuplint/types';

import { createMessageValueExpected } from './create-message.js';
import { log } from './debug.js';

/**
 * Discriminated union tag representing the kind of attribute invalidity.
 */
type InvalidTYpe = 'non-existent' | 'invalid-value' | 'disallowed-attr';

/**
 * Describes a single attribute validation failure, including the kind
 * of invalidity, a human-readable message, and an optional source location.
 *
 * @template T - The specific invalidity tag (defaults to any `InvalidTYpe`)
 */
type Invalid<T extends InvalidTYpe = InvalidTYpe> = {
	invalidType: T;
	message: string;
	loc?: Loc;
};

/**
 * Source location information pointing to the invalid portion of an attribute value.
 */
type Loc = {
	raw: string;
	line: number;
	col: number;
};

/**
 * Validates an attribute against its specification. Used by the `invalid-attr`
 * and `wai-aria` rules.
 *
 * Performs the following checks in order:
 * 1. Skips `data-*`, `aria-*`/`role`, and `adapt-*` attributes (unless `isCustomRule` is `true`)
 * 2. Verifies the attribute exists in the spec
 * 3. Checks case-sensitive name matching
 * 4. Checks whether the attribute is marked as `noUse` (disallowed)
 * 5. Short-circuits to valid when the spec declares a `ConditionalAttributeType[]`
 *    (#3685); conditional value validation is deferred to follow-up issues #3598 and #3189
 * 6. Validates the attribute value against all declared types
 *
 * @param t - The i18n translator for generating localized error messages
 * @param name - The attribute name to check
 * @param value - The attribute value to validate
 * @param isCustomRule - When `true`, skips the built-in bypass for `data-*`, `aria-*`, and `adapt-*` attributes
 * @param spec - The attribute specification to validate against; if absent, the attribute is considered non-existent
 * @param allAttrNames - Optional list of all valid attribute names for the element;
 *   used to suggest a similar attribute name via Levenshtein distance when the attribute is non-existent
 * @returns `false` if the attribute is valid, a single `Invalid` object for existence/disallowed errors,
 *   or an array of `Invalid<'invalid-value'>` objects for value validation failures
 */
export function attrCheck(
	t: Translator,
	name: string,
	value: string,
	isCustomRule: boolean,
	spec?: AttrSpec,
	allAttrNames?: readonly string[],
): Invalid | Invalid<'invalid-value'>[] | false {
	if (!isCustomRule) {
		if (/^data-.+$/.test(name)) {
			// Ignore checking because "data-*" attribute is any type
			return false;
		}

		if (/^aria-.+$|^role$/.test(name)) {
			// Ignore checking because ARIA attributes are check on another rule
			return false;
		}

		// @see https://www.w3.org/TR/adapt/
		// It is an experimental
		if (/^adapt-.+$/.test(name)) {
			// Ignore checking because "adapt-*" attribute is any type
			return false;
		}
	}

	// Existence
	if (!spec) {
		log('The "%s" attribute DOES\'NT EXIST in the spec', name);
		const baseMessage = t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed');
		const candidate = allAttrNames ? getCandidate(name, allAttrNames) : undefined;
		if (candidate) {
			return {
				invalidType: 'non-existent',
				message: baseMessage + t('. ') + t('Did you mean "{0*}"?', candidate),
			};
		}
		return {
			invalidType: 'non-existent',
			message: baseMessage,
		};
	}

	const nameCaseSensitive = /[A-Z]/.test(spec.name);
	if (nameCaseSensitive && name !== spec.name) {
		log('The "%s" attribute name is unmatched in case-sensitive', name);
		return {
			invalidType: 'non-existent',
			message:
				t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed') +
				t('. ') +
				t('Did you mean "{0*}"?', spec.name),
		};
	}

	if (spec.noUse) {
		return {
			invalidType: 'disallowed-attr',
			message: t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed'),
		};
	}

	// TODO(#3598, #3189): `ConditionalAttributeType[]` ships as a type-only extension
	// in v5.0 (#3685). Value-conditional validation (`input[type=color]` value, etc.)
	// will be implemented in follow-up issues. Until then, short-circuit to "valid".
	if (isConditionalAttributeTypeArray(spec.type)) {
		log('The "%s" attribute uses ConditionalAttributeType[] — skipping (v5.0 type-only, #3685)', name);
		return false;
	}

	const types = toNonNullableArrayFromItemOrArray(spec.type);

	const invalidMap = new Map<string, Invalid<'invalid-value'>>();

	for (const type of types) {
		const invalid = valueCheck(t, name, value, type);
		if (invalid === false) {
			return false;
		}

		const key = `${invalid[1].line}:${invalid[1].col}`;

		const current = invalidMap.get(key);

		invalidMap.set(key, {
			invalidType: 'invalid-value',
			message: current?.message ? [current.message, invalid[0]].join(t('. ') + t('Or, ')) : invalid[0],
			loc: invalid[1],
		});
	}

	return [...invalidMap.values()];
}

/**
 * Validates an attribute value against a single attribute type definition.
 * Returns `false` if the value is valid, or a tuple of `[message, location]`
 * describing the mismatch.
 *
 * Boolean attributes are always considered valid (their mere presence is sufficient).
 *
 * @param t - The i18n translator for generating localized error messages
 * @param name - The attribute name (used in error messages)
 * @param value - The attribute value to validate
 * @param type - The attribute type definition to validate against
 * @returns `false` if the value is valid, or a `[message, location]` tuple on failure
 */
export function valueCheck(
	t: Translator,
	name: string,
	value: string,
	type: ReadonlyDeep<AttributeType | Type>,
): [string, Loc] | false {
	if (type === 'Boolean') {
		// Valid because an attribute is exist
		return false;
	}

	const matches = check(value, type);

	if (log.enabled) {
		log(`Result ([${name}="${value}"]): %O`, { ...matches, type });
	}

	if (!matches.matched) {
		const location = {
			raw: matches.raw,
			line: matches.line - 1,
			col: matches.column - 1,
		};

		const base = t('the "{0*}" {1}', name, 'attribute');

		const message = createMessageValueExpected(t, base, type, matches);

		return [message, location];
	}

	return false;
}
