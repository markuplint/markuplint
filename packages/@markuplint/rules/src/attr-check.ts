import type { Translator } from '@markuplint/i18n';
import type { Attribute as AttrSpec, AttributeType } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { check } from '@markuplint/types';

import { createMessageValueExpected } from './create-message';
import { log } from './debug';

type Invalid = {
	invalidType: 'non-existent' | 'invalid-value' | 'disallowed-attr';
	message: string;
	loc?: Loc;
};

type Loc = {
	raw: string;
	line: number;
	col: number;
};

/**
 * Use in rules `invalid-attr` and `wai-aria`
 *
 * @param name
 * @param value
 * @param isCustomRule
 * @param spec
 */
export function attrCheck(
	t: Translator,
	name: string,
	value: string,
	isCustomRule: boolean,
	spec?: ReadonlyDeep<AttrSpec>,
): Invalid | false {
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
		return {
			invalidType: 'non-existent',
			message: t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed'),
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

	const types = Array.isArray(spec.type) ? spec.type : [spec.type];
	const invalidList = types.map(type => {
		if (!type) {
			log('attrCheck: %o', arguments);
			throw new Error('type is empty in spec');
		}
		const invalid = valueCheck(t, name, value, type);
		if (invalid) {
			if (typeof invalid === 'string') {
				return {
					invalidType: 'invalid-value' as const,
					message: invalid,
				};
			} else {
				return {
					invalidType: 'invalid-value' as const,
					message: invalid[0],
					loc: invalid[1],
				};
			}
		}
		return false;
	});

	if (invalidList.some(i => !i)) {
		return false;
	}

	const invalid = invalidList.find(i => i);

	return invalid || false;
}

export function valueCheck(
	t: Translator,
	name: string,
	value: string,
	type: AttributeType,
): string | [string, Loc] | false {
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
