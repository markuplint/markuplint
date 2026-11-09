import type { Translator } from '@markuplint/i18n';
import type { PlainData } from '@markuplint/ml-config';
import type { Attr, Element, RuleConfigValue } from '@markuplint/ml-core';
import type { Attribute } from '@markuplint/ml-spec';

import { isConditionalAttributeTypeArray } from '@markuplint/ml-spec';
import { check, getCandidate } from '@markuplint/types';

import { attrMatches, conditionDependsOnDynamicAttr, findAttrSpec, namespaceKeyOf } from './helpers.js';

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
 * `unknown`), `no-disallowed-attr` (acts on `no-use`/
 * `condition-not-met`), and `no-invalid-attr-value` (acts on `ok`, using the
 * resolved `spec.type` for value-checking). Splitting this into one function
 * keeps the three rules' notion of "what the spec says about this name" in
 * sync without re-deriving it three times.
 */
export type AttrEligibility =
	| { readonly status: 'exempt' }
	| { readonly status: 'unknown'; readonly candidate: string | undefined }
	| { readonly status: 'no-use' }
	| { readonly status: 'condition-not-met' }
	| { readonly status: 'ok'; readonly spec: Attribute };

/**
 * Resolves an attribute name against the element's `attrSpecs`, following
 * the same order the pre-split `invalid-attr` rule used: existence, then
 * `noUse`, then `condition` (with `ConditionalAttributeType[]` resolved to a
 * concrete type first).
 *
 * Whether a spelling is the name of a spec is up to the attribute, and the DOM decides it
 * (`MLAttr#isNamedBy`): `viewbox` is `viewBox` where the HTML parser reads it, and is not where
 * code sets the name. Ask with the attribute (`attr`); without it, `name` is a name of the spec
 * and is looked up as written, which is what a rule does for the native attribute of an ARIA one.
 *
 * @param name - The attribute name (a name of the spec when `attr` is not given)
 * @param node - The element
 * @param attrSpecs - The specs of the attributes of the element
 * @param attr - The attribute that is being resolved
 */
export function resolveAttrEligibility<T extends RuleConfigValue, O extends PlainData>(
	name: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	attrSpecs: readonly Attribute[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr?: Attr<T, O>,
): AttrEligibility {
	// The name that the DOM gives the attribute is what a pattern of a namespace is tested against
	if (EXEMPT_NAME_PATTERN.test(attr ? namespaceKeyOf(attr) : name)) {
		return { status: 'exempt' };
	}

	let spec = attr ? findAttrSpec(attrSpecs, attr) : attrSpecs.find(s => s.name === name);

	if (!spec) {
		const candidate = getCandidate(
			name,
			attrSpecs.map(s => s.name),
		);
		return { status: 'unknown', candidate };
	}

	if (spec.noUse) {
		return { status: 'no-use' };
	}

	// Resolve ConditionalAttributeType[] to a concrete type based on element matching (#3598).
	if (isConditionalAttributeTypeArray(spec.type)) {
		const matched = spec.type.filter(entry => {
			const cond = typeof entry.condition === 'string' ? entry.condition : entry.condition.join(',');
			return node.matches(cond);
		});
		spec = { ...spec, type: combineMatchedConditionalTypes(matched) };
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
 * Enum entries that match together are simultaneous constraints: `link[as]`
 * has to be a preload destination and a module preload destination when `rel`
 * contains both keywords. The message names that intersection and does not
 * offer a keyword another entry forbids. Token order follows the entries:
 * a spelling is kept from the earliest entry whose own token satisfies every
 * entry, which is the first entry's order when that spelling is valid there.
 *
 * A non-enum overlap stays on the first match. Those entries are ordered
 * alternatives: an empty `input[value]` other than `type=range` is
 * unconstrained even though a later type-specific entry also matches, and
 * `email` with `multiple` matches both the address-list type and the
 * single-address type, of which the list is the requirement.
 */
function combineMatchedConditionalTypes(matched: readonly { readonly type: Attribute['type'] }[]): Attribute['type'] {
	const first = matched[0];
	// No condition matched. Input types without an explicit entry (text, search,
	// tel, password, hidden, checkbox, radio, file, submit, image, reset, button)
	// have no value constraints per the HTML spec.
	if (!first) {
		return 'Any';
	}
	const enums: PlainEnum[] = [];
	for (const entry of matched) {
		if (!isPlainEnum(entry.type)) {
			return first.type;
		}
		enums.push(entry.type);
	}
	if (enums.length === 1) {
		return first.type;
	}
	return intersectEnums(enums);
}

type PlainEnum = {
	readonly enum: readonly [string, ...string[]];
	readonly caseInsensitive?: boolean;
	readonly disallowToSurroundBySpaces?: boolean;
	readonly invalidValueDefault?: string;
};

function isPlainEnum(type: Attribute['type']): type is PlainEnum {
	if (typeof type === 'string' || Array.isArray(type)) {
		return false;
	}
	return 'enum' in type && Array.isArray(type.enum) && type.enum.length > 0;
}

/**
 * `invalidValueDefault` is not carried over: a fallback of one set may be a
 * value another set forbids. A case-sensitive spelling is kept when an earlier
 * entry only has another case. Case and surrounding spaces follow the stricter
 * side, because the value has to satisfy every entry.
 *
 * An empty intersection cannot be an enum (`enum` has at least one token).
 * A pattern that matches nothing keeps every value invalid. That pattern is
 * not a keyword list an author is meant to satisfy.
 *
 * @param enums - The enum entries that matched, in spec order. At least two
 * @returns The intersection, or a pattern that matches nothing when the sets are disjoint
 */
export function intersectEnums(enums: readonly PlainEnum[]): Attribute['type'] {
	const caseInsensitive = enums.every(item => item.caseInsensitive !== false);
	const tokens: string[] = [];
	for (const item of enums) {
		for (const token of item.enum) {
			if (!enums.every(other => check(token, other).matched)) {
				continue;
			}
			if (tokens.some(existing => sameToken(existing, token, caseInsensitive))) {
				continue;
			}
			tokens.push(token);
		}
	}
	const [head, ...rest] = tokens;
	if (head === undefined) {
		return { pattern: '/(?!)/' };
	}
	const result: PlainEnum = {
		enum: [head, ...rest],
		...(caseInsensitive ? {} : { caseInsensitive: false }),
		...(enums.every(item => item.disallowToSurroundBySpaces === false)
			? { disallowToSurroundBySpaces: false }
			: {}),
	};
	return result;
}

function sameToken(a: string, b: string, caseInsensitive: boolean): boolean {
	return caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/**
 * Formats the "did you mean" suffix shared by `no-unknown-attr`'s two typo
 * paths (spec-driven candidate, case-sensitivity mismatch).
 */
export function suggestionSuffix(t: Translator, candidate: string | undefined): string {
	return candidate ? t('. ') + t('Did you mean "{0*}"?', candidate) : '';
}
