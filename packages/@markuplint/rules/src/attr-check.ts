import type { Translator } from '@markuplint/i18n';
import type { Attribute as AttrSpec, AttributeType } from '@markuplint/ml-spec';
import type { Type } from '@markuplint/types';
import type { ReadonlyDeep } from 'type-fest';

import { isConditionalAttributeTypeArray } from '@markuplint/ml-spec';
import { toNonNullableArrayFromItemOrArray } from '@markuplint/shared';
import { check, getCandidate } from '@markuplint/types';

import { createMessageValueExpected } from './create-message.js';
import { log } from './debug.js';

type InvalidTYpe = 'non-existent' | 'invalid-value' | 'disallowed-attr';

type Invalid<T extends InvalidTYpe = InvalidTYpe> = {
	invalidType: T;
	message: string;
	loc?: Loc;
};

type Loc = {
	raw: string;
	line: number;
	col: number;
};

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

	// Safety net: In normal flow, `isValidAttr()` resolves ConditionalAttributeType[]
	// before calling this function (#3598). This guard handles direct calls.
	if (isConditionalAttributeTypeArray(spec.type)) {
		log('The "%s" attribute uses ConditionalAttributeType[] — unresolved, treating as valid', name);
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
