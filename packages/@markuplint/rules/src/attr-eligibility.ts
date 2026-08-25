import type { Translator } from '@markuplint/i18n';
import type { PlainData } from '@markuplint/ml-config';
import type { Element, RuleConfigValue } from '@markuplint/ml-core';
import type { Attribute } from '@markuplint/ml-spec';

import { isConditionalAttributeTypeArray } from '@markuplint/ml-spec';
import { getCandidate } from '@markuplint/types';

import { attrMatches, conditionDependsOnDynamicAttr } from './helpers.js';

/**
 * Attribute namespaces that are exempt from spec-based name/eligibility
 * checking regardless of what `attrSpecs` says: `data-*` and `adapt-*` are
 * any-type by definition, and ARIA (`aria-*` / `role`) is validated by the
 * dedicated ARIA rules, not here.
 */
const EXEMPT_NAME_PATTERN = /^(?:data-.+|adapt-.+|aria-.+|role)$/;

/**
 * Result of resolving whether an attribute name is known to the spec and,
 * if so, whether it currently applies. Shared by `no-unknown-attr` (acts on
 * `unknown`/`case-mismatch`), `no-disallowed-attr` (acts on `no-use`/
 * `condition-not-met`), and `no-invalid-attr-value` (acts on `ok`, using the
 * resolved `spec.type` for value-checking). Splitting this into one function
 * keeps the three rules' notion of "what the spec says about this name" in
 * sync without re-deriving it three times.
 */
export type AttrEligibility =
	| { readonly status: 'exempt' }
	| { readonly status: 'unknown'; readonly candidate: string | undefined }
	| { readonly status: 'case-mismatch'; readonly expectedName: string }
	| { readonly status: 'no-use' }
	| { readonly status: 'condition-not-met' }
	| { readonly status: 'ok'; readonly spec: Attribute };

/**
 * Resolves an attribute name against the element's `attrSpecs`, following
 * the same order the pre-split `invalid-attr` rule used: existence, then
 * case-sensitivity, then `noUse`, then `condition` (with
 * `ConditionalAttributeType[]` resolved to a concrete type first, per #3598).
 */
export function resolveAttrEligibility<T extends RuleConfigValue, O extends PlainData>(
	name: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	attrSpecs: readonly Attribute[],
): AttrEligibility {
	if (EXEMPT_NAME_PATTERN.test(name)) {
		return { status: 'exempt' };
	}

	let spec = attrSpecs.find(s => s.name.toLowerCase() === name.toLowerCase());

	if (!spec) {
		const candidate = getCandidate(
			name,
			attrSpecs.map(s => s.name),
		);
		return { status: 'unknown', candidate };
	}

	const nameCaseSensitive = /[A-Z]/.test(spec.name);
	if (nameCaseSensitive && name !== spec.name) {
		return { status: 'case-mismatch', expectedName: spec.name };
	}

	if (spec.noUse) {
		return { status: 'no-use' };
	}

	// Resolve ConditionalAttributeType[] to a concrete type based on element matching (#3598).
	if (isConditionalAttributeTypeArray(spec.type)) {
		const matched = spec.type.find(entry => {
			const cond = typeof entry.condition === 'string' ? entry.condition : entry.condition.join(',');
			return node.matches(cond);
		});
		// Fallback to 'Any' when no condition matches: input types without an explicit
		// entry (text, search, tel, password, hidden, checkbox, radio, file, submit,
		// image, reset, button) have no value constraints per the HTML spec.
		spec = { ...spec, type: matched ? matched.type : 'Any' };
	}

	if (
		spec.condition != null &&
		!node.hasSpreadAttr &&
		!conditionDependsOnDynamicAttr(node, spec.condition) &&
		!attrMatches(node, spec.condition)
	) {
		return { status: 'condition-not-met' };
	}

	return { status: 'ok', spec };
}

/**
 * Formats the "did you mean" suffix shared by `no-unknown-attr`'s two typo
 * paths (spec-driven candidate, case-sensitivity mismatch).
 */
export function suggestionSuffix(t: Translator, candidate: string | undefined): string {
	return candidate ? t('. ') + t('Did you mean "{0*}"?', candidate) : '';
}
