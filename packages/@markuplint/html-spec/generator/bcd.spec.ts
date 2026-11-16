import { describe, expect, test } from 'vitest';

import type { BCDNode, ElementLike } from './bcd.ts';

import { applyBCD, fromBCDKey, loadBCD, lookupAttributeStatus, readStatus, resolveFlags, toBCDKey } from './bcd.ts';

const standard = { deprecated: false, experimental: false, standard_track: true };

/**
 * @param status - The `status` block of a feature
 * @returns A BCD node with that status
 */
function feature(status: Partial<typeof standard> = {}, children: Record<string, BCDNode> = {}): BCDNode {
	return { __compat: { status: { ...standard, ...status } }, ...children };
}

const bcd: BCDNode = {
	html: {
		elements: {
			a: feature(
				{},
				{
					ping: feature(),
					// the global `focusgroup` is non-standard and experimental, and on `a` it is not
					focusgroup: feature(),
					foo: feature(),
					attributionsrc: feature({ standard_track: false, experimental: true }),
					// not an attribute: a feature of the element
					text_fragments: feature(),
				},
			),
			img: feature(
				{},
				{
					loading: feature({ experimental: true }),
					border: feature({ deprecated: true, standard_track: false, experimental: true }),
				},
			),
			marquee: feature({ deprecated: true }, { behavior: feature({ deprecated: true, standard_track: false }) }),
			selectedcontent: feature({ experimental: true }),
		},
		global_attributes: {
			focusgroup: feature({ standard_track: false, experimental: true }),
			title: feature(),
			part: feature(),
			data_attributes: feature(),
		},
	},
	svg: {
		elements: {
			a: feature({}, { xlink_href: feature({ deprecated: true }) }),
			image: feature({}, { decoding: feature({ standard_track: false }) }),
		},
		global_attributes: {
			clip: feature({ deprecated: true }),
			xml_lang: feature({ deprecated: true }),
		},
	},
	mathml: {
		elements: {
			mi: feature(),
			mfrac: feature({}, { numalign: feature({ deprecated: true, standard_track: false }) }),
		},
		global_attributes: { href: feature({ standard_track: false, deprecated: true }) },
	},
};

describe('toBCDKey and fromBCDKey', () => {
	test.each([
		['xlink:href', 'xlink_href'],
		['xml:lang', 'xml_lang'],
		['viewBox', 'viewBox'],
		['aria-label', 'aria-label'],
	])('%s is %s in BCD', (name, key) => {
		expect(toBCDKey(name)).toBe(key);
		expect(fromBCDKey(key)).toBe(name);
	});

	test.each(['__compat', 'text_fragments', 'data_attributes', 'type_checkbox', ''])('%s is not an attribute', key => {
		expect(fromBCDKey(key)).toBeNull();
	});
});

describe('readStatus', () => {
	test('reads nothing of a feature that BCD does not have', () => {
		expect(readStatus()).toBeUndefined();
		expect(readStatus({})).toBeUndefined();
	});

	test('writes a flag as true or not at all', () => {
		expect(readStatus(feature())).toStrictEqual({});
		expect(readStatus(feature({ experimental: true }))).toStrictEqual({ experimental: true });
		expect(readStatus(feature({ deprecated: true }))).toStrictEqual({ deprecated: true });
	});

	test('a feature that is not on the standards track is non-standard', () => {
		expect(readStatus(feature({ standard_track: false }))).toStrictEqual({ nonStandard: true });
	});
});

describe('lookupAttributeStatus', () => {
	test('reads the attribute of the element by its direct path', () => {
		expect(lookupAttributeStatus(bcd, 'html', 'img', 'loading')).toStrictEqual({ experimental: true });
		expect(lookupAttributeStatus(bcd, 'svg', 'a', 'xlink:href')).toStrictEqual({ deprecated: true });
	});

	test('falls back to the global attributes of the namespace, and to nothing else', () => {
		expect(lookupAttributeStatus(bcd, 'html', 'img', 'focusgroup')).toStrictEqual({
			nonStandard: true,
			experimental: true,
		});
		// `ping` is the attribute of `a`, not of `img`: no other element is looked at
		expect(lookupAttributeStatus(bcd, 'html', 'img', 'ping')).toBeUndefined();
		// the global attributes of HTML are not those of SVG
		expect(lookupAttributeStatus(bcd, 'svg', 'a', 'focusgroup')).toBeUndefined();
	});

	test('an element that BCD lacks falls back to the global attributes of the namespace', () => {
		expect(lookupAttributeStatus(bcd, 'html', 'unknown-element', 'title')).toStrictEqual({});
	});

	test('an attribute that BCD has nowhere has no status', () => {
		expect(lookupAttributeStatus(bcd, 'html', 'unknown-element', 'nope')).toBeUndefined();
	});

	test('a namespace that the BCD tree lacks has no status', () => {
		expect(lookupAttributeStatus({}, 'svg', 'a', 'x')).toBeUndefined();
	});

	test('reads the real BCD that is installed', async () => {
		// A change of the shape of BCD, which the fixtures above cannot show
		const real = await loadBCD();
		expect(lookupAttributeStatus(real, 'html', 'img', 'src')).toBeDefined();
		expect(lookupAttributeStatus(real, 'html', 'marquee', 'behavior')).toMatchObject({ deprecated: true });
	});
});

describe('resolveFlags', () => {
	test('takes the flags of BCD for an attribute that no specification flags', () => {
		expect(resolveFlags({}, { experimental: true, nonStandard: true })).toStrictEqual({
			experimental: true,
			nonStandard: true,
		});
	});

	test('does not add the flags of BCD to an attribute that the specification flags', () => {
		const status = { deprecated: true, nonStandard: true, experimental: true } as const;
		// `obsolete` stays on the entry itself: only the flags of BCD's three are decided here
		expect(resolveFlags({ obsolete: true }, status)).toStrictEqual({});
		expect(resolveFlags({ deprecated: true }, status)).toStrictEqual({ deprecated: true });
	});

	test('an attribute that the specification deprecates for some elements takes no flag of BCD', () => {
		const status = { deprecated: true, nonStandard: true, experimental: true } as const;
		expect(resolveFlags({ deprecatedWhen: "[type='number' i]" }, status)).toStrictEqual({});
	});

	test('keeps a hand-written flag that BCD lacks', () => {
		expect(resolveFlags({ nonStandard: true }, {})).toStrictEqual({ nonStandard: true });
		expect(resolveFlags({ nonStandard: true })).toStrictEqual({ nonStandard: true });
	});

	test('a flag written as false is not overridden by BCD', () => {
		expect(resolveFlags({ experimental: false }, { experimental: true })).toStrictEqual({});
		expect(resolveFlags({ deprecated: false }, { deprecated: true })).toStrictEqual({});
	});

	test('keeps a hand-written flag next to a flag that the specification gives', () => {
		expect(resolveFlags({ obsolete: true, nonStandard: true }, { nonStandard: true })).toStrictEqual({
			nonStandard: true,
		});
	});
});

describe('applyBCD', () => {
	const globals = () => ({
		'#HTMLGlobalAttrs': { title: {}, focusgroup: {} },
		'#SVGCoreAttrs': { 'xml:lang': {} },
		'#MathMLGlobalAttrs': {},
		'#ARIAAttrs': { 'aria-label': {} },
	});

	test('flags an element and its attributes from BCD', () => {
		const specs: ElementLike[] = [
			{ name: 'selectedcontent', attributes: {} },
			{ name: 'img', attributes: { loading: {}, alt: {}, border: { deprecated: true } } },
		];
		const result = applyBCD(specs, globals(), bcd);
		expect(result.specs[0]?.experimental).toBe(true);
		expect(result.specs[1]?.attributes).toStrictEqual({
			loading: { experimental: true },
			alt: {},
			border: { deprecated: true },
		});
	});

	test.each([[{ deprecated: true }], [{ obsolete: true }], [{ deprecatedWhen: "[alt='']" }]])(
		'a flag that a specification defines wins over BCD (%o)',
		entry => {
			// BCD says `border` is deprecated, experimental and not on the standards track: none of it is added
			const specs: ElementLike[] = [{ name: 'img', attributes: { border: entry } }];
			expect(applyBCD(specs, globals(), bcd).specs[0]?.attributes?.border).toStrictEqual(entry);
		},
	);

	test('a hand-written non-standard flag stays on an attribute that BCD has on the standards track', () => {
		const specs: ElementLike[] = [{ name: 'a', attributes: { ping: { nonStandard: true } } }];
		expect(applyBCD(specs, globals(), bcd).specs[0]?.attributes?.ping).toStrictEqual({ nonStandard: true });
	});

	test('an element takes back the flags that BCD gave the global attribute, where BCD says otherwise of the element', () => {
		const specs: ElementLike[] = [
			{ name: 'a', globalAttrs: { '#HTMLGlobalAttrs': ['focusgroup'] }, attributes: {} },
			{ name: 'img', globalAttrs: { '#HTMLGlobalAttrs': ['focusgroup'] }, attributes: {} },
		];
		const { specs: result } = applyBCD(specs, globals(), bcd);
		// BCD has `focusgroup` for `a`, with no flag
		expect(result[0]?.attributes?.focusgroup).toStrictEqual({ nonStandard: false, experimental: false });
		// BCD has none for `img`: the global attribute's flags stand, and nothing is written
		expect(result[1]?.attributes?.focusgroup).toBeUndefined();
	});

	test('an element that selects a category by a list of names takes the attributes that BCD added to it', () => {
		const specs: ElementLike[] = [
			{ name: 'svg:a', globalAttrs: { '#SVGCoreAttrs': ['xml:lang'] }, attributes: {} },
		];
		const [a] = applyBCD(specs, globals(), bcd).specs;
		expect(a?.globalAttrs?.['#SVGCoreAttrs']).toStrictEqual(['xml:lang', 'clip']);
		// an element that selects the whole category has them without a list
		const whole: ElementLike[] = [{ name: 'svg:a', globalAttrs: { '#SVGCoreAttrs': true }, attributes: {} }];
		expect(applyBCD(whole, globals(), bcd).specs[0]?.globalAttrs?.['#SVGCoreAttrs']).toBe(true);
	});

	test('a flag written as false in a source stays in the output', () => {
		const specs: ElementLike[] = [{ name: 'img', attributes: { loading: { experimental: false } } }];
		expect(applyBCD(specs, globals(), bcd).specs[0]?.attributes?.loading).toStrictEqual({ experimental: false });
	});

	test('an element does not take back a flag that is written in the sources', () => {
		const g = { ...globals(), '#HTMLGlobalAttrs': { foo: { nonStandard: true as const } } };
		const specs: ElementLike[] = [{ name: 'a', globalAttrs: { '#HTMLGlobalAttrs': ['foo'] }, attributes: {} }];
		// BCD has `foo` for `a` as standard, and the category says non-standard by hand
		expect(applyBCD(specs, g, bcd).specs[0]?.attributes?.foo).toBeUndefined();
	});

	test('a category entry that carries a flag of the specification takes nothing from BCD', () => {
		const g = { ...globals(), '#HTMLGlobalAttrs': { focusgroup: { obsolete: true as const } } };
		expect(applyBCD([], g, bcd).globalAttrs['#HTMLGlobalAttrs']?.focusgroup).toStrictEqual({ obsolete: true });
	});

	test('MathML elements are looked up in the mathml namespace', () => {
		const specs: ElementLike[] = [
			{ name: 'mml:mfrac', attributes: {} },
			{ name: 'mml:mi', attributes: { numalign: {} } },
		];
		const result = applyBCD(specs, globals(), bcd);
		expect(result.specs[0]?.attributes).toStrictEqual({ numalign: { nonStandard: true, deprecated: true } });
		// `numalign` is not an attribute of `mi` in BCD: the entry is left as it is
		expect(result.specs[1]?.attributes).toStrictEqual({ numalign: {} });
	});

	test('an obsolete element takes no flag of BCD, and nor do its attributes', () => {
		const specs: ElementLike[] = [{ name: 'marquee', obsolete: true, attributes: { behavior: {} } }];
		const [marquee] = applyBCD(specs, globals(), bcd).specs;
		expect(marquee?.deprecated).toBeUndefined();
		expect(marquee?.attributes).toStrictEqual({ behavior: {} });
	});

	test('an attribute that BCD flags for the element and that a category gives it is written as a flagged entry', () => {
		// `ping` is known through the category and BCD has nothing to say of it; `attributionsrc` is flagged
		const g = { ...globals(), '#HTMLLinkAndFetchingAttrs': { ping: {}, attributionsrc: {} } };
		const specs: ElementLike[] = [
			{ name: 'a', globalAttrs: { '#HTMLLinkAndFetchingAttrs': true }, attributes: {} },
		];
		const attributes = applyBCD(specs, g, bcd).specs[0]?.attributes;
		expect(attributes?.attributionsrc).toStrictEqual({ nonStandard: true, experimental: true });
		expect(attributes?.ping).toBeUndefined();
	});

	test('does not repeat on the element a flag that the entry of the category already carries', () => {
		// BCD says `xlink:href` of `a` is deprecated, and the category says so too
		const g = { ...globals(), '#XLinkAttrs': { 'xlink:href': { deprecated: true as const } } };
		const specs = [{ name: 'svg:a', globalAttrs: { '#XLinkAttrs': true as const }, attributes: {} }];
		expect(applyBCD(specs, g, bcd).specs[0]?.attributes).toStrictEqual({});
	});

	test('an attribute that BCD has and that the sources lack is added as non-standard', () => {
		const specs = [{ name: 'svg:image', attributes: {} }];
		expect(applyBCD(specs, globals(), bcd).specs[0]?.attributes).toStrictEqual({ decoding: { nonStandard: true } });
	});

	test('an attribute that BCD has and the sources lack takes the vendor deprecation along with non-standard', () => {
		const specs = [{ name: 'svg:a', attributes: {} }];
		expect(applyBCD(specs, globals(), bcd).specs[0]?.attributes).toStrictEqual({
			'xlink:href': { nonStandard: true, deprecated: true },
		});
	});

	test('a feature that is not an attribute is never added', () => {
		const specs = [{ name: 'a', attributes: {} }];
		const names = Object.keys(applyBCD(specs, globals(), bcd).specs[0]?.attributes ?? {});
		expect(names).not.toContain('text_fragments');
		expect(names).not.toContain('__compat');
	});

	test('flags the attributes of a category from the global attributes of its namespace', () => {
		const { globalAttrs } = applyBCD([], globals(), bcd);
		expect(globalAttrs['#HTMLGlobalAttrs']?.focusgroup).toStrictEqual({ nonStandard: true, experimental: true });
		expect(globalAttrs['#HTMLGlobalAttrs']?.title).toStrictEqual({});
		expect(globalAttrs['#SVGCoreAttrs']?.['xml:lang']).toStrictEqual({ deprecated: true });
		expect(globalAttrs['#ARIAAttrs']?.['aria-label']).toStrictEqual({});
	});

	test('a global attribute that BCD has and the categories lack is added as non-standard to the category of its namespace', () => {
		const { globalAttrs } = applyBCD([], globals(), bcd);
		expect(globalAttrs['#HTMLGlobalAttrs']?.part).toStrictEqual({ nonStandard: true });
		expect(Object.keys(globalAttrs['#HTMLGlobalAttrs'] ?? {})).not.toContain('data_attributes');
		expect(globalAttrs['#SVGCoreAttrs']?.clip).toStrictEqual({ nonStandard: true, deprecated: true });
		expect(globalAttrs['#MathMLGlobalAttrs']?.href).toStrictEqual({ nonStandard: true, deprecated: true });
	});

	test('does not change what it is given', () => {
		const specs: ElementLike[] = [
			{ name: 'img', attributes: { loading: {} } },
			{ name: 'selectedcontent', attributes: {} },
		];
		const given = globals();
		const before = structuredClone({ specs, given });
		applyBCD(specs, given, bcd);
		expect({ specs, given }).toStrictEqual(before);
	});

	test('is idempotent: what it gives, given again, does not change', () => {
		const specs: ElementLike[] = [
			{ name: 'img', attributes: { loading: {}, border: { deprecated: true } } },
			{ name: 'svg:a', attributes: {} },
		];
		const once = applyBCD(specs, globals(), bcd);
		expect(applyBCD(once.specs, once.globalAttrs, bcd)).toStrictEqual(once);
	});
});
