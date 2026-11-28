import { ariaSpecs, createTestDocument } from '@markuplint/ml-core';
import { describe, test, expect } from 'vitest';

/**
 * `checkingContradictoryAriaProp` reports `aria-*="true"` without the native attribute only for
 * the attributes of `IMPLICIT_STATE_ATTRS`; every other equivalent is allowed by ARIA in HTML §4.2.
 * That list is knowledge of the specification that the data cannot give, so a native attribute that
 * the data newly pairs with an ARIA property, or an `aria-hidden` that stops being flagged as not
 * strictly equivalent to `hidden`, fails here until §4.2 has been read for it and the checking has
 * been updated or left as it is.
 *
 * @see https://www.w3.org/TR/html-aria/#docconformance-attr
 */
describe('equivalent HTML attributes of the ARIA properties', () => {
	const { specs } = createTestDocument('<div></div>');

	test.each(['1.1', '1.2', '1.3'] as const)('ARIA %s pairs the reviewed native attributes only', version => {
		const pairs = ariaSpecs(specs, version).props.flatMap(prop =>
			(prop.equivalentHtmlAttrs ?? []).map(
				equivalent =>
					`${prop.name}:${equivalent.htmlAttrName}=${equivalent.value}${equivalent.isNotStrictEquivalent ? ' (not strict)' : ''}`,
			),
		);
		expect(pairs.toSorted()).toStrictEqual([
			'aria-checked:checked=true',
			'aria-colspan:colspan=null',
			'aria-disabled:disabled=true',
			'aria-hidden:hidden=true (not strict)',
			'aria-placeholder:placeholder=null',
			'aria-readonly:contenteditable=false',
			'aria-readonly:readonly=true',
			'aria-required:required=true',
			'aria-rowspan:rowspan=null',
			'aria-valuemax:max=null',
			'aria-valuemin:min=null',
		]);
	});

	/**
	 * An entry with a `condition` stands for a state of the element, not for the presence of the attribute, and
	 * every reader of `equivalentHtmlAttrs` has to skip it (`EquivalentHtmlAttr#condition`). The generator marks
	 * the row of `contenteditable` and no other (`readAriaInHtml`), so a row of §4.2 with another condition would
	 * enter the data unmarked: the pairs above change, and this list is read again with them.
	 */
	test.each(['1.1', '1.2', '1.3'] as const)('ARIA %s has one entry that stands for a state', version => {
		const conditional = ariaSpecs(specs, version).props.flatMap(prop =>
			(prop.equivalentHtmlAttrs ?? [])
				.filter(equivalent => equivalent.condition)
				.map(equivalent => `${prop.name}:${equivalent.htmlAttrName}=${equivalent.condition}`),
		);
		expect(conditional).toStrictEqual(['aria-readonly:contenteditable=editable']);
	});
});
