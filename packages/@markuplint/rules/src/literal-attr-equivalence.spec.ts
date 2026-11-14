import path from 'node:path';

import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import ariaPropRequiresRole from './aria-prop-requires-role/index.js';
import attrOrder from './attr-order/index.js';
import classNaming from './class-naming/index.js';
import elementSupportsAriaProp from './element-supports-aria-prop/index.js';
import formAttrReferencesForm from './form-attr-references-form/index.js';
import inputListReferencesDatalist from './input-list-references-datalist/index.js';
import labelForReferencesLabelable from './label-for-references-labelable/index.js';
import labelNoMultipleControls from './label-no-multiple-controls/index.js';
import linkTypes from './link-types/index.js';
import mapIdNameMatch from './map-id-name-match/index.js';
import meterValueBounds from './meter-value-bounds/index.js';
import noAlwaysMatchingSource from './no-always-matching-source/index.js';
import noAmbiguousNavigableTargetNames from './no-ambiguous-navigable-target-names/index.js';
import noAriaHiddenOnHiddenUntilFound from './no-aria-hidden-on-hidden-until-found/index.js';
import noAriaOnPresentationalChildren from './no-aria-on-presentational-children/index.js';
import noAriaOnUnsupportedElement from './no-aria-on-unsupported-element/index.js';
import noBrokenFragmentLink from './no-broken-fragment-link/index.js';
import noContradictoryAriaProp from './no-contradictory-aria-prop/index.js';
import noDefaultAriaValue from './no-default-aria-value/index.js';
import noDefaultValue from './no-default-value/index.js';
import noDeprecatedAriaProp from './no-deprecated-aria-prop/index.js';
import noDeprecatedAttr from './no-deprecated-attr/index.js';
import noDisallowedAttr from './no-disallowed-attr/index.js';
import noCircularAriaOwns from './no-circular-aria-owns/index.js';
import noDuplicateAriaOwns from './no-duplicate-aria-owns/index.js';
import noDuplicateAttr from './no-duplicate-attr/index.js';
import noDuplicateId from './no-duplicate-id/index.js';
import noEventHandlerAttr from './no-event-handler-attr/index.js';
import noFocusableInAriaHidden from './no-focusable-in-aria-hidden/index.js';
import noHardcodedId from './no-hardcoded-id/index.js';
import noInputFileValue from './no-input-file-value/index.js';
import noInvalidAriaPropValue from './no-invalid-aria-prop-value/index.js';
import noInvalidAttrValue from './no-invalid-attr-value/index.js';
import noMismatchedAspectRatio from './no-mismatched-aspect-ratio/index.js';
import noMixedSrcsetDescriptors from './no-mixed-srcset-descriptors/index.js';
import noObsoleteAttr from './no-obsolete-attr/index.js';
import noProhibitedNaming from './no-prohibited-naming/index.js';
import noRedundantAriaProp from './no-redundant-aria-prop/index.js';
import noReferToNonExistentId from './no-refer-to-non-existent-id/index.js';
import noRestrictedAttr from './no-restricted-attr/index.js';
import noUnknownAttr from './no-unknown-attr/index.js';
import noUnpairedSrcsetSizes from './no-unpaired-srcset-sizes/index.js';
import placeholderLabelOption from './placeholder-label-option/index.js';
import progressValueBounds from './progress-value-bounds/index.js';
import requireAccessibleName from './require-accessible-name/index.js';
import requireAriaProp from './require-aria-prop/index.js';
import requireOwnedElements from './require-owned-elements/index.js';
import roleSupportsAriaProp from './role-supports-aria-prop/index.js';
import sizesAutoRequiresLazyLoading from './sizes-auto-requires-lazy-loading/index.js';
import tabRequiresTabpanel from './tab-requires-tabpanel/index.js';
import usemapReferencesMap from './usemap-references-map/index.js';

const RULES: Readonly<Record<string, unknown>> = {
	'aria-prop-requires-role': ariaPropRequiresRole,
	'attr-order': attrOrder,
	'class-naming': classNaming,
	'element-supports-aria-prop': elementSupportsAriaProp,
	'form-attr-references-form': formAttrReferencesForm,
	'input-list-references-datalist': inputListReferencesDatalist,
	'label-for-references-labelable': labelForReferencesLabelable,
	'label-no-multiple-controls': labelNoMultipleControls,
	'link-types': linkTypes,
	'map-id-name-match': mapIdNameMatch,
	'meter-value-bounds': meterValueBounds,
	'no-always-matching-source': noAlwaysMatchingSource,
	'no-ambiguous-navigable-target-names': noAmbiguousNavigableTargetNames,
	'no-aria-hidden-on-hidden-until-found': noAriaHiddenOnHiddenUntilFound,
	'no-aria-on-presentational-children': noAriaOnPresentationalChildren,
	'no-aria-on-unsupported-element': noAriaOnUnsupportedElement,
	'no-broken-fragment-link': noBrokenFragmentLink,
	'no-contradictory-aria-prop': noContradictoryAriaProp,
	'no-default-aria-value': noDefaultAriaValue,
	'no-default-value': noDefaultValue,
	'no-deprecated-aria-prop': noDeprecatedAriaProp,
	'no-deprecated-attr': noDeprecatedAttr,
	'no-disallowed-attr': noDisallowedAttr,
	'no-duplicate-attr': noDuplicateAttr,
	'no-circular-aria-owns': noCircularAriaOwns,
	'no-duplicate-aria-owns': noDuplicateAriaOwns,
	'no-duplicate-id': noDuplicateId,
	'no-event-handler-attr': noEventHandlerAttr,
	'no-focusable-in-aria-hidden': noFocusableInAriaHidden,
	'no-hardcoded-id': noHardcodedId,
	'no-input-file-value': noInputFileValue,
	'no-invalid-aria-prop-value': noInvalidAriaPropValue,
	'no-invalid-attr-value': noInvalidAttrValue,
	'no-mismatched-aspect-ratio': noMismatchedAspectRatio,
	'no-mixed-srcset-descriptors': noMixedSrcsetDescriptors,
	'no-obsolete-attr': noObsoleteAttr,
	'no-prohibited-naming': noProhibitedNaming,
	'no-redundant-aria-prop': noRedundantAriaProp,
	'no-refer-to-non-existent-id': noReferToNonExistentId,
	'no-restricted-attr': noRestrictedAttr,
	'no-unknown-attr': noUnknownAttr,
	'no-unpaired-srcset-sizes': noUnpairedSrcsetSizes,
	'placeholder-label-option': placeholderLabelOption,
	'progress-value-bounds': progressValueBounds,
	'require-accessible-name': requireAccessibleName,
	'require-aria-prop': requireAriaProp,
	'require-owned-elements': requireOwnedElements,
	'role-supports-aria-prop': roleSupportsAriaProp,
	'sizes-auto-requires-lazy-loading': sizesAutoRequiresLazyLoading,
	'tab-requires-tabpanel': tabRequiresTabpanel,
	'usemap-references-map': usemapReferencesMap,
};

/**
 * An attribute that is written as a literal in `{…}` is the attribute that the literal renders as,
 * which is what the same value written as a string is, and an attribute that the framework does not output
 * (`{null}`, `{false}` on a boolean attribute) is as if it were not written. A rule reads the rendered
 * attribute and does not tell how it was written, so each pair below is evaluated to the same violations
 * (the messages, as the positions in the two sources differ).
 */

async function messagesOf(ruleName: string, code: string, jsx: boolean, ruleConfig?: unknown) {
	const rule = RULES[ruleName];
	if (!rule) {
		throw new TypeError(`No rule ${ruleName}`);
	}
	const config = {
		...(jsx ? { parser: { '.*': '@markuplint/jsx-parser' } } : {}),
		...(ruleConfig === undefined ? {} : { rule: ruleConfig }),
	};
	const { violations } = await mlRuleTest(rule as Parameters<typeof mlRuleTest>[0], code, config as never);
	return violations.map(violation => violation.message);
}

const ASPECT_RATIO_FIXTURES = path.resolve(import.meta.dirname, 'no-mismatched-aspect-ratio', 'fixtures');

/**
 * A rule that has an option, the source that a string makes it report, the source in JSX that has the literal
 * in `{…}`, and the configuration of the rule.
 */
const WITH_OPTIONS: readonly (readonly [string, string, string, unknown])[] = [
	[
		'no-mismatched-aspect-ratio',
		'<img src="/100x50.png" width="100" height="100">',
		'<img src={"/100x50.png"} width={100} height={100} />',
		{ severity: 'error', value: true, options: { documentRoot: ASPECT_RATIO_FIXTURES } },
	],
	[
		'class-naming',
		'<div class="bad"></div>',
		'<div class={"bad"}></div>',
		{ severity: 'error', value: '/^c-[a-z]+/' },
	],
	[
		'no-restricted-attr',
		'<div x-attr="b"></div>',
		'<div x-attr={"b"}></div>',
		{ severity: 'error', options: { disallowAttrs: [{ name: 'x-attr', value: { enum: ['b'] } }] } },
	],
	[
		'placeholder-label-option',
		'<select required><option value="placeholder">P</option><option value="1">1</option></select>',
		'<select required><option value={"placeholder"}>P</option><option value={"1"}>1</option></select>',
		undefined,
	],
];

/** A rule, the source that a string makes it report, and the source in JSX that has the literal in `{…}`. */
const LITERALS: readonly (readonly [string, string, string])[] = [
	['no-duplicate-id', '<div id="a"></div><div id="a"></div>', '<><div id={"a"}></div><div id={"a"}></div></>'],
	['link-types', '<a href="x" rel="bogus"></a>', '<a href={"x"} rel={"bogus"}></a>'],
	['no-input-file-value', '<input type="file" value="x">', '<input type={"file"} value={"x"} />'],
	['no-hardcoded-id', '<div id="a"></div>', '<div id={"a"}></div>'],
	[
		'no-always-matching-source',
		'<picture><source srcset="x"><source srcset="y"><img src="z" alt=""></picture>',
		'<picture><source srcSet={"x"} /><source srcSet={"y"} /><img src={"z"} alt={""} /></picture>',
	],
	[
		'sizes-auto-requires-lazy-loading',
		'<img sizes="auto" srcset="a.png 1w" alt="">',
		'<img sizes={"auto"} srcset={"a.png 1w"} alt={""} />',
	],
	['no-invalid-attr-value', '<input type="bogus">', '<input type={"bogus"} />'],
	[
		'no-mixed-srcset-descriptors',
		'<img srcset="a.png 1x, b.png 2w" alt="">',
		'<img srcset={"a.png 1x, b.png 2w"} alt={""} />',
	],
	['usemap-references-map', '<img usemap="#none" alt="">', '<img usemap={"#none"} alt={""} />'],
	['progress-value-bounds', '<progress value="5" max="3"></progress>', '<progress value={5} max={3}></progress>'],
	[
		'form-attr-references-form',
		'<div id="notaform">Not a form</div><input type="text" form="notaform">',
		'<><div id={"notaform"}>Not a form</div><input type={"text"} form={"notaform"} /></>',
	],
	['map-id-name-match', '<map id="a" name="b"></map>', '<map id={"a"} name={"b"}></map>'],
	['meter-value-bounds', '<meter value="9" max="3"></meter>', '<meter value={9} max={3}></meter>'],
	[
		'input-list-references-datalist',
		'<input type="text" list="notdatalist"><div id="notdatalist">Not a datalist</div>',
		'<><input type={"text"} list={"notdatalist"} /><div id={"notdatalist"}>Not a datalist</div></>',
	],
	['no-refer-to-non-existent-id', '<label for="none"></label>', '<label for={"none"}></label>'],
	[
		'no-duplicate-aria-owns',
		'<div><div aria-owns="a"></div><div aria-owns="a"></div><p id="a"></p></div>',
		'<div><div aria-owns={"a"}></div><div aria-owns={"a"}></div><p id={"a"}></p></div>',
	],
	['no-circular-aria-owns', '<div id="a" aria-owns="a"></div>', '<div id={"a"} aria-owns={"a"}></div>'],
	['no-broken-fragment-link', '<a href="#none"></a>', '<a href={"#none"}></a>'],
	[
		'no-unpaired-srcset-sizes',
		'<img srcset="image-1x.png 1x, image-2x.png 2x" sizes="100vw" src="image-1x.png" alt="photo">',
		'<img srcset={"image-1x.png 1x, image-2x.png 2x"} sizes={"100vw"} src={"image-1x.png"} alt={"photo"} />',
	],
	['no-default-value', '<input type="text">', '<input type={"text"} />'],
	['no-ambiguous-navigable-target-names', '<a href="x" target="blank"></a>', '<a href={"x"} target={"blank"}></a>'],
	[
		'no-redundant-aria-prop',
		'<button aria-disabled="true" disabled></button>',
		'<button aria-disabled={true} disabled></button>',
	],
	[
		'no-contradictory-aria-prop',
		'<button aria-disabled="false" disabled></button>',
		'<button aria-disabled={false} disabled></button>',
	],
	[
		'tab-requires-tabpanel',
		'<div role="tab" aria-selected="true"></div>',
		'<div role={"tab"} aria-selected={true}></div>',
	],
	[
		'no-aria-hidden-on-hidden-until-found',
		'<div hidden="until-found" aria-hidden="true"></div>',
		'<div hidden={"until-found"} aria-hidden={true}></div>',
	],
	[
		'no-focusable-in-aria-hidden',
		'<div aria-hidden="true"><button></button></div>',
		'<div aria-hidden={true}><button></button></div>',
	],
	['require-aria-prop', '<div role="checkbox"></div>', '<div role={"checkbox"}></div>'],
	[
		'role-supports-aria-prop',
		'<div role="button" aria-checked="true"></div>',
		'<div role={"button"} aria-checked={true}></div>',
	],
	['require-owned-elements', '<ul role="list"></ul>', '<ul role={"list"}></ul>'],
	[
		'label-no-multiple-controls',
		'<label>Name: <input type="text" name="first"> <input type="text" name="last"></label>',
		'<label>Name: <input type={"text"} name={"first"} /> <input type={"text"} name={"last"} /></label>',
	],
	[
		'label-for-references-labelable',
		'<div id="notaformcontrol">Just a div</div><label for="notaformcontrol">Label for non-form-control</label>',
		'<><div id={"notaformcontrol"}>Just a div</div><label for={"notaformcontrol"}>Label for non-form-control</label></>',
	],
	[
		'no-disallowed-attr',
		'<script type="text/javascript" async></script>',
		'<script type={"text/javascript"} async></script>',
	],
];

describe('a literal in {…} is what the same value as a string is', () => {
	test.each([...LITERALS.map(([name, html, jsx]) => [name, html, jsx, undefined] as const), ...WITH_OPTIONS])(
		'%s',
		async (ruleName, html, jsx, ruleConfig) => {
			const expected = await messagesOf(ruleName, html, false, ruleConfig);
			// The string makes the rule report, so that the pair is not equal for the reason that neither does
			expect(expected.length).toBeGreaterThan(0);
			expect(await messagesOf(ruleName, jsx, true, ruleConfig)).toStrictEqual(expected);
		},
	);
});

/**
 * A rule, the source without the attribute, the source in JSX that has it as an attribute that is not output,
 * and the source in JSX that has it with a literal that is output, which the rule judges differently from the
 * source without it (so that the pair is not equal for the reason that the attribute does not matter).
 */
const ABSENT: readonly (readonly [string, string, string, string])[] = [
	[
		'no-disallowed-attr',
		'<script async></script>',
		'<script type={null} async></script>',
		'<script type={"module"} async></script>',
	],
	[
		'no-disallowed-attr',
		'<script async></script>',
		'<script type={undefined} async></script>',
		'<script type={"module"} async></script>',
	],
	[
		'require-accessible-name',
		'<button></button>',
		'<button disabled={false}></button>',
		'<button aria-label={"x"} disabled={false}></button>',
	],
	[
		'require-accessible-name',
		'<button></button>',
		'<button hidden={undefined}></button>',
		'<button hidden={true}></button>',
	],
	[
		'no-refer-to-non-existent-id',
		'<label for="x"></label>',
		'<><div id={null}></div><label for="x"></label></>',
		'<><div id={"x"}></div><label for="x"></label></>',
	],
	[
		'no-duplicate-id',
		'<><div id="a"></div><div id="a"></div></>',
		'<><div id="a"></div><div id={null}></div><div id="a"></div></>',
		'<><div id="a"></div><div id={"a"}></div><div id="a"></div></>',
	],
	[
		'require-aria-prop',
		'<div role="checkbox"></div>',
		'<div role="checkbox" aria-checked={null}></div>',
		'<div role="checkbox" aria-checked={true}></div>',
	],
	[
		'role-supports-aria-prop',
		'<div role="button"></div>',
		'<div role="button" aria-checked={null}></div>',
		'<div role="button" aria-checked={true}></div>',
	],
	[
		'element-supports-aria-prop',
		'<details><summary>s</summary></details>',
		'<details><summary aria-expanded={null}>s</summary></details>',
		'<details><summary aria-expanded={false}>s</summary></details>',
	],
	[
		'aria-prop-requires-role',
		'<cite></cite>',
		'<cite aria-pressed={null}></cite>',
		'<cite aria-pressed={true}></cite>',
	],
	['no-prohibited-naming', '<cite>y</cite>', '<cite aria-label={null}>y</cite>', '<cite aria-label={"x"}>y</cite>'],
	[
		'no-deprecated-aria-prop',
		'<div role="button"></div>',
		'<div role="button" aria-errormessage={null}></div>',
		'<div role="button" aria-errormessage={"x"}></div>',
	],
	[
		'no-redundant-aria-prop',
		'<button disabled></button>',
		'<button disabled aria-disabled={null}></button>',
		'<button disabled aria-disabled={true}></button>',
	],
	[
		'no-contradictory-aria-prop',
		'<button disabled></button>',
		'<button disabled aria-disabled={null}></button>',
		'<button disabled aria-disabled={false}></button>',
	],
	[
		'no-default-aria-value',
		'<div></div>',
		'<div aria-expanded={null}></div>',
		'<div aria-expanded={"undefined"}></div>',
	],
	['no-invalid-aria-prop-value', '<div></div>', '<div aria-busy={null}></div>', '<div aria-busy={"bogus"}></div>'],
	[
		'no-aria-on-presentational-children',
		'<><div role="button"><span></span></div><p id="d">d</p></>',
		'<><div role="button"><span aria-describedby={null}></span></div><p id="d">d</p></>',
		'<><div role="button"><span aria-describedby={"d"}></span></div><p id="d">d</p></>',
	],
	[
		'no-focusable-in-aria-hidden',
		'<div><button></button></div>',
		'<div aria-hidden={null}><button></button></div>',
		'<div aria-hidden={true}><button></button></div>',
	],
	[
		'no-aria-hidden-on-hidden-until-found',
		'<div hidden="until-found"></div>',
		'<div hidden="until-found" aria-hidden={null}></div>',
		'<div hidden="until-found" aria-hidden={true}></div>',
	],
	['no-default-value', '<input />', '<input type={null} />', '<input type={"text"} />'],
	[
		'no-input-file-value',
		'<input type="file" />',
		'<input type="file" value={null} />',
		'<input type="file" value={"x"} />',
	],
];

describe('an attribute that the framework does not output is as if it were not written', () => {
	test.each(ABSENT)('%s: %s', async (ruleName, omitted, absent, output) => {
		const expected = await messagesOf(ruleName, omitted, true);
		expect(await messagesOf(ruleName, absent, true)).toStrictEqual(expected);
		// The same attribute with a literal that is output matters to the rule
		expect(await messagesOf(ruleName, output, true)).not.toStrictEqual(expected);
	});
});

/**
 * A rule that judges the name of an attribute judges what the author wrote, so it reports an attribute that
 * the framework does not output as it reports the same name written as a string. (A rule that judges the
 * value or the presence is in the pairs above.) A rule, an element with the attribute that is not output,
 * the same with a string, and the configuration of the rule.
 */
const NAME_BASED: readonly (readonly [string, string, string, unknown])[] = [
	['no-unknown-attr', '<div foo={null}></div>', '<div foo="x"></div>', undefined],
	['no-deprecated-attr', '<a charset={null}></a>', '<a charset="x"></a>', undefined],
	[
		'no-obsolete-attr',
		'<link rel="made" href="/a" rev={null} />',
		'<link rel="made" href="/a" rev="made" />',
		undefined,
	],
	[
		'no-restricted-attr',
		'<div foo={null}></div>',
		'<div foo="x"></div>',
		{ severity: 'warning', options: { disallowAttrs: ['foo'] } },
	],
	['no-event-handler-attr', '<button onclick={null}></button>', '<button onclick="x"></button>', undefined],
	['no-duplicate-attr', '<div a="1" a={null}></div>', '<div a="1" a="2"></div>', undefined],
	[
		'attr-order',
		'<div b={null} a="1"></div>',
		'<div b="1" a="1"></div>',
		{ severity: 'warning', options: { order: ['a', 'b'] } },
	],
];

describe('a rule that judges the name of an attribute reports an attribute that the framework does not output', () => {
	test.each(NAME_BASED)('%s: %s', async (ruleName, absent, written, ruleConfig) => {
		const expected = await messagesOf(ruleName, written, true, ruleConfig);
		// The string makes the rule report, so that the pair is not equal for the reason that neither does
		expect(expected.length).toBeGreaterThan(0);
		expect(await messagesOf(ruleName, absent, true, ruleConfig)).toStrictEqual(expected);
	});
});

/**
 * What the pairs above rely on, in a case that is not equal: an attribute whose value is code that is not a
 * literal may be anything, so the rule does not judge by it.
 */
describe('an attribute whose value is code that is not a literal is not judged', () => {
	test.each([
		['require-aria-prop', '<div role="checkbox" aria-checked={cond}></div>'],
		['require-accessible-name', '<button disabled={cond}></button>'],
		['no-refer-to-non-existent-id', '<><div id={cond}></div><label for="x"></label></>'],
		['no-disallowed-attr', '<script type={cond} async></script>'],
	])('%s: %s', async (ruleName, jsx) => {
		expect(await messagesOf(ruleName, jsx, true)).toStrictEqual([]);
	});
});
