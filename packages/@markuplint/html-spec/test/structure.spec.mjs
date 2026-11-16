import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveNamespace, getAttrSpecsByNames } from '@markuplint/ml-spec';
import { glob } from '@markuplint/test-tools';
import Ajv from 'ajv';
import { parse } from 'jsonc-parser';
import { describe, test, expect } from 'vitest';

import { getDefinitionCite } from '../generator/read-json.ts';
import htmlSpec from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

/**
 * The status flags that an attribute may carry in `index.json`: `obsolete` and the spec's `deprecated` are written
 * in the sources, the other flags are the sources' or BCD's (`generator/bcd.ts`).
 */
const STATUS_FLAGS = ['experimental', 'obsolete', 'deprecated', 'nonStandard'];

const schemas = {
	element: {
		$id: '@markuplint/ml-spec/schemas/element.schema.json',
		...require('../../ml-spec/schemas/element.schema.json'),
	},
	aria: {
		$id: '@markuplint/ml-spec/schemas/aria.schema.json',
		...require('../../ml-spec/schemas/aria.schema.json'),
	},
	contentModels: {
		$id: '@markuplint/ml-spec/schemas/content-models.schema.json',
		...require('../../ml-spec/schemas/content-models.schema.json'),
	},
	globalAttributes: {
		$id: '@markuplint/ml-spec/schemas/global-attributes.schema.json',
		...require('../../ml-spec/schemas/global-attributes.schema.json'),
	},
	attributes: {
		$id: '@markuplint/ml-spec/schemas/attributes.schema.json',
		...require('../../ml-spec/schemas/attributes.schema.json'),
	},
	types: {
		$id: '@markuplint/types/types.schema.json',
		...require('../../types/types.schema.json'),
	},
};

test('structure', () => {
	for (const el of htmlSpec.specs) {
		const { localName, namespaceURI } = resolveNamespace(el.name);
		try {
			getAttrSpecsByNames(localName, namespaceURI, htmlSpec);
		} catch {
			throw el;
		}
	}
});

/**
 * The data carries no prose: the weekly spec citation watch reads the specifications themselves, and what the W3C
 * documents say in their own words is not copied into the package (`generator/strip-prose.ts`).
 */
describe('index.json carries no prose', () => {
	const aria = htmlSpec.def['#aria'];

	test('no element has a description', () => {
		expect(htmlSpec.specs.filter(el => 'description' in el).map(el => el.name)).toStrictEqual([]);
	});

	test('no attribute of an element has a description', () => {
		const withDescription = htmlSpec.specs.flatMap(el =>
			Object.entries(el.attributes ?? {})
				.filter(([, attr]) => 'description' in attr)
				.map(([name]) => `${el.name}[${name}]`),
		);
		expect(withDescription).toStrictEqual([]);
	});

	test('no global attribute has a description', () => {
		const withDescription = Object.entries(htmlSpec.def['#globalAttrs']).flatMap(([category, attrs]) =>
			Object.entries(attrs)
				.filter(([, attr]) => 'description' in attr)
				.map(([name]) => `${category}[${name}]`),
		);
		expect(withDescription).toStrictEqual([]);
	});

	/**
	 * The keys of `attributes` and of a category of `#globalAttrs` are attribute names, and an attribute can be called
	 * `description`; everywhere else the key is a field of the data.
	 */
	test('no field called description or valueDescriptions is anywhere', () => {
		const found = [];
		const walk = (value, trail, isNameMap) => {
			if (Array.isArray(value)) {
				for (const [i, item] of value.entries()) {
					walk(item, `${trail}[${i}]`, false);
				}
			} else if (value && typeof value === 'object') {
				for (const [key, child] of Object.entries(value)) {
					if (!isNameMap && (key === 'description' || key === 'valueDescriptions')) {
						found.push(`${trail}.${key}`);
					}
					const childIsNameMap = key === 'attributes' || (trail === '$.def.#globalAttrs' && !isNameMap);
					walk(child, `${trail}.${key}`, childIsNameMap);
				}
			}
		};
		walk(htmlSpec, '$', false);
		expect(found).toStrictEqual([]);
	});

	test.each(['1.1', '1.2', '1.3'])(
		'ARIA %s: no role has a description and no property has valueDescriptions',
		version => {
			const roles = ['roles', 'graphicsRoles', 'dpubRoles'].flatMap(key => aria[version][key] ?? []);
			expect(roles.filter(role => 'description' in role).map(role => role.name)).toStrictEqual([]);
			expect(roles.length).toBeGreaterThan(0);
			expect(
				(aria[version].props ?? []).filter(prop => 'valueDescriptions' in prop).map(prop => prop.name),
			).toStrictEqual([]);
		},
	);
});

/**
 * The generator reads deprecation only from marker wording in the spec text
 * (`generator/utils.ts`), so a rewording upstream drops the flags without any
 * error. These are the roles and properties the specs list as deprecated.
 */
describe('deprecation flags scraped from the specs', () => {
	const aria = htmlSpec.def['#aria'];

	test.each(['1.2', '1.3'])('ARIA %s: directory is deprecated', version => {
		expect(aria[version].roles.find(role => role.name === 'directory')?.deprecated).toBe(true);
	});

	test.each(['1.1', '1.2', '1.3'])('ARIA %s: doc-biblioentry and doc-endnote are deprecated', version => {
		const deprecated = aria[version].dpubRoles.filter(role => role.deprecated).map(role => role.name);
		expect(deprecated).toStrictEqual(['doc-biblioentry', 'doc-endnote']);
	});

	test.each(['1.2', '1.3'])('ARIA %s: aria-errormessage is deprecated on the button role', version => {
		const button = aria[version].roles.find(role => role.name === 'button');
		expect(button?.ownedProperties?.find(prop => prop.name === 'aria-errormessage')?.deprecated).toBe(true);
	});

	test.each(['1.1', '1.2', '1.3'])('ARIA %s: no DPUB-ARIA role lists a property twice', version => {
		const duplicated = aria[version].dpubRoles.filter(role => {
			const names = (role.ownedProperties ?? []).map(prop => prop.name);
			return new Set(names).size !== names.length;
		});
		expect(duplicated.map(role => role.name)).toStrictEqual([]);
	});

	test.each(['1.2', '1.3'])('ARIA %s: doc-noteref takes the deprecated properties of link', version => {
		const noteref = aria[version].dpubRoles.find(role => role.name === 'doc-noteref');
		const deprecated = noteref?.ownedProperties?.filter(prop => prop.deprecated).map(prop => prop.name);
		expect(deprecated).toStrictEqual(['aria-errormessage', 'aria-invalid']);
	});
});

/**
 * What an element says about where it is defined comes from the sources: the `cite` of an element with
 * a source file is the section on the first line of that file, which the weekly spec citation watch reads, and the
 * categories and the tag omission are not written at all.
 */
describe('index.json carries what the sources own', () => {
	const sourceDir = path.resolve(__dirname, '..', 'src');

	/**
	 * @returns A map of the qualified name of an element to the URL on the first line of its source file
	 */
	async function readDefinitionCites() {
		const files = await glob('spec.*.jsonc', { cwd: sourceDir, absolute: true });
		// A pattern that matches nothing checks nothing and passes: the source files are in `src/`.
		expect(files.length).toBeGreaterThan(0);
		const cites = new Map();
		for (const file of files) {
			const name = path
				.basename(file)
				.replace(/^spec\.(.+)\.jsonc$/, '$1')
				.replace(/^svg_/, 'svg:')
				.replace(/^mml_/, 'mml:');
			cites.set(name, getDefinitionCite(await readFile(file, { encoding: 'utf-8' }), file));
		}
		return cites;
	}

	test('no element has categories or omission', () => {
		expect(htmlSpec.specs.filter(el => 'categories' in el || 'omission' in el).map(el => el.name)).toStrictEqual(
			[],
		);
	});

	test('there is no list of reference URLs', () => {
		expect('cites' in htmlSpec).toBe(false);
	});

	test('the cite of an element with a source file is the URL on the first line of the file', async () => {
		const cites = await readDefinitionCites();
		const mismatched = htmlSpec.specs
			.filter(el => cites.has(el.name) && el.cite !== cites.get(el.name))
			.map(el => `${el.name}: ${el.cite}`);
		expect(mismatched).toStrictEqual([]);
	});

	test('every source file is an element of the data', async () => {
		const cites = await readDefinitionCites();
		const names = new Set(htmlSpec.specs.map(el => el.name));
		expect([...cites.keys()].filter(name => !names.has(name))).toStrictEqual([]);
	});

	/**
	 * The names of the attributes of an element are what the sources define, each with the citation of its section:
	 * in the `attributes` of its file, or through the categories of `globalAttrs` that the file selects. BCD adds an
	 * attribute only with a status flag.
	 */
	test('every attribute of an element is in its source file or carries a status flag', async () => {
		const stray = [];
		for (const el of htmlSpec.specs) {
			const file = path.join(
				sourceDir,
				`spec.${el.name.replace(/^svg:/, 'svg_').replace(/^mml:/, 'mml_')}.jsonc`,
			);
			let source = {};
			try {
				const parseErrors = [];
				source = parse(await readFile(file, { encoding: 'utf-8' }), parseErrors);
				expect(parseErrors, `${el.name}: ${file}`).toStrictEqual([]);
			} catch (error) {
				// Every element has a source file (a test below says so): only a read error other than a missing file is thrown.
				if (error?.code !== 'ENOENT') {
					throw error;
				}
			}
			const defined = new Set(Object.keys(source.attributes ?? {}));
			for (const [category, selected] of Object.entries(source.globalAttrs ?? {})) {
				if (selected === true) {
					const names = htmlSpec.def['#globalAttrs'][category];
					expect(names, `${el.name} selects the category ${category}`).toBeDefined();
					for (const name of Object.keys(names)) {
						defined.add(name);
					}
				} else if (Array.isArray(selected)) {
					for (const name of selected) {
						defined.add(name);
					}
				}
			}
			for (const [name, attr] of Object.entries(el.attributes ?? {})) {
				if (!defined.has(name) && !STATUS_FLAGS.some(flag => attr[flag])) {
					stray.push(`${el.name}[${name}]`);
				}
			}
		}
		expect(stray).toStrictEqual([]);
	});

	/**
	 * No specification defines `decoding` for the SVG `image` element (SVG 2 lists none, and the HTML Standard
	 * defines it for `img`), while browsers implement it: it is known, and flagged as no specification's.
	 */
	test('decoding of the SVG image element is known and non-standard', () => {
		const attribute = htmlSpec.specs.find(el => el.name === 'svg:image')?.attributes.decoding;
		expect(attribute?.nonStandard).toBe(true);
		expect(attribute?.type).toStrictEqual({
			enum: ['sync', 'async', 'auto'],
			invalidValueDefault: 'auto',
			missingValueDefault: 'auto',
		});
	});

	test('every element has a source file', async () => {
		const cites = await readDefinitionCites();
		const withoutSource = htmlSpec.specs.filter(el => !cites.has(el.name));
		expect(withoutSource.map(el => el.name)).toStrictEqual([]);
	});
});

/**
 * What the HTML Standard calls obsolete is written in the sources, with the citation of its section: "Non-conforming
 * features" lists the attributes that "must not be used by authors", and the ones it lists "except as noted in the
 * previous section" are the "obsolete but conforming" ones, which conformance checkers must warn about. The pairs are
 * the list of the page as read on 2026-11-15 (`obsolete-features.json`), not read from the data, so that an attribute
 * dropped from the sources fails here.
 * @see https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features
 */
describe('obsolete features of the HTML Standard', () => {
	const {
		obsoleteElements,
		nonConformingAttributes,
		obsoleteButConforming,
		conditionalWarnings,
	} = require('./obsolete-features.json');
	const htmlNames = htmlSpec.specs.filter(el => !el.name.includes(':')).map(el => el.name);

	/**
	 * @param {string} element - The local name of an HTML element
	 * @param {string} name - The attribute name
	 * @returns The resolved attribute spec, or `undefined` for an unknown attribute
	 */
	function getAttr(element, name) {
		const { localName, namespaceURI } = resolveNamespace(element);
		return getAttrSpecsByNames(localName, namespaceURI, htmlSpec).find(attr => attr.name === name);
	}

	test('the list of the page has no entry twice, and none is missing from it', () => {
		for (const pairs of [nonConformingAttributes, obsoleteButConforming, conditionalWarnings]) {
			expect(pairs.length).toBeGreaterThan(0);
			expect(new Set(pairs.map(pair => pair.join('[')))).toHaveProperty('size', pairs.length);
		}
		expect(obsoleteElements.length).toBeGreaterThan(0);
	});

	test('the elements that 16.2 lists are the obsolete elements of the data', () => {
		const obsolete = htmlSpec.specs.filter(el => el.obsolete).map(el => el.name);
		expect(obsolete.toSorted()).toStrictEqual(obsoleteElements.toSorted());
	});

	test('no HTML attribute is obsolete that 16.2 does not list', () => {
		const listed = new Set(nonConformingAttributes.map(([element, name]) => `${element}[${name}]`));
		const unlisted = [];
		for (const el of htmlSpec.specs.filter(el => !el.name.includes(':'))) {
			for (const [name, attr] of Object.entries(el.attributes ?? {})) {
				if (attr.obsolete && !listed.has(`${el.name}[${name}]`) && !listed.has(`*[${name}]`)) {
					unlisted.push(`${el.name}[${name}]`);
				}
			}
		}
		for (const name of ['#HTMLGlobalAttrs', '#GlobalEventAttrs']) {
			for (const [attr, spec] of Object.entries(htmlSpec.def['#globalAttrs'][name])) {
				if (spec.obsolete && !listed.has(`*[${attr}]`)) {
					unlisted.push(`${name}[${attr}]`);
				}
			}
		}
		expect(unlisted).toStrictEqual([]);
	});

	test('every attribute of 16.2 is known and obsolete', () => {
		const wrong = [];
		for (const [element, name] of nonConformingAttributes) {
			for (const el of element === '*' ? htmlNames : [element]) {
				const attr = getAttr(el, name);
				if (!attr?.obsolete) {
					wrong.push(`${el}[${name}]`);
				}
			}
		}
		expect(wrong).toStrictEqual([]);
	});

	test('the obsolete but conforming ones are known and deprecated, not obsolete', () => {
		const wrong = obsoleteButConforming
			.filter(([element, name]) => {
				const attr = getAttr(element, name);
				return !attr?.deprecated || attr.obsolete;
			})
			.map(([element, name]) => `${element}[${name}]`);
		expect(wrong).toStrictEqual([]);
	});

	test('the ones that depend on the value or on another attribute are deprecated by a selector', () => {
		const wrong = conditionalWarnings
			.filter(([element, name]) => {
				const attr = getAttr(element, name);
				return !attr?.deprecatedWhen || attr.deprecated || attr.obsolete;
			})
			.map(([element, name]) => `${element}[${name}]`);
		expect(wrong).toStrictEqual([]);
	});

	test('no attribute is both obsolete and deprecated', () => {
		const both = [];
		for (const el of htmlSpec.specs) {
			for (const [name, attr] of Object.entries(el.attributes ?? {})) {
				if (attr.obsolete && attr.deprecated) {
					both.push(`${el.name}[${name}]`);
				}
			}
		}
		for (const [category, attrs] of Object.entries(htmlSpec.def['#globalAttrs'])) {
			for (const [name, attr] of Object.entries(attrs)) {
				if (attr.obsolete && attr.deprecated) {
					both.push(`${category}[${name}]`);
				}
			}
		}
		expect(both).toStrictEqual([]);
	});

	/**
	 * Every obsolete element takes the global attributes: "The following attributes are global attributes and may be
	 * specified on all HTML elements (even those not defined in this specification)".
	 * @see https://html.spec.whatwg.org/multipage/dom.html#global-attributes
	 */
	test('an obsolete element takes the global attributes of HTML', () => {
		const obsoleteInData = htmlSpec.specs.filter(el => el.obsolete);
		expect(obsoleteInData.length).toBe(obsoleteElements.length);
		const without = obsoleteInData
			.filter(el => !['#HTMLGlobalAttrs', '#GlobalEventAttrs', '#ARIAAttrs'].every(c => el.globalAttrs?.[c]))
			.map(el => el.name);
		expect(without).toStrictEqual([]);
	});
});

/**
 * The aliases of the selector (`#ClassicScript`) are expanded where `index.json` is written: an alias that is left in
 * a selector never matches, and the rules would run a selector that no engine parses.
 */
test('no selector of the data holds an alias that was not expanded', () => {
	const selectors = [];
	const collect = (where, attr) => {
		for (const field of ['condition', 'deprecatedWhen', 'ineffective']) {
			selectors.push(...[attr[field] ?? []].flat().map(selector => [where, selector]));
		}
	};
	for (const el of htmlSpec.specs) {
		for (const [name, attr] of Object.entries(el.attributes ?? {})) {
			collect(`${el.name}[${name}]`, attr);
		}
	}
	for (const [category, attrs] of Object.entries(htmlSpec.def['#globalAttrs'])) {
		for (const [name, attr] of Object.entries(attrs)) {
			collect(`${category}[${name}]`, attr);
		}
	}
	expect(selectors.length).toBeGreaterThan(0);
	expect(selectors.filter(([, selector]) => /#[A-Z]/.test(selector)).map(([where]) => where)).toStrictEqual([]);
});

/**
 * Where a specification does not define an attribute, `nonStandard` comes from BCD (`generator/bcd.ts`): an attribute
 * that BCD has for an element and the sources lack is added, and BCD's `standard_track` flags the others. BCD's
 * keys are read by their shape, so a key that is not an attribute would be added as one. The list is pinned, so that
 * a change of the BCD version that adds or drops one fails here and a person reads it: a real attribute that a
 * specification defines is written in the sources (`html-spec/CLAUDE.md`, "Data precedence"), any other is added to
 * this list, and a key that is not an attribute is a bug of the generator.
 */
test('the non-standard attributes are the ones that were read', () => {
	const found = [];
	for (const el of htmlSpec.specs) {
		for (const [name, attr] of Object.entries(el.attributes ?? {})) {
			if (attr.nonStandard) {
				found.push(`${el.name}[${name}]`);
			}
		}
	}
	for (const [category, attrs] of Object.entries(htmlSpec.def['#globalAttrs'])) {
		for (const [name, attr] of Object.entries(attrs)) {
			if (attr.nonStandard) {
				found.push(`${category}[${name}]`);
			}
		}
	}
	expect(found.toSorted()).toStrictEqual([
		'#HTMLGlobalAttrs[anchor]',
		'#HTMLGlobalAttrs[containertiming]',
		'#HTMLGlobalAttrs[containertimingignore]',
		'#HTMLGlobalAttrs[drawable]',
		'#HTMLGlobalAttrs[focusgroup]',
		'#HTMLGlobalAttrs[focusgroupstart]',
		'#MathMLGlobalAttrs[href]',
		'#SVGCoreAttrs[focusgroup]',
		'#SVGCoreAttrs[focusgroupstart]',
		'#SVGCoreAttrs[font-width]',
		'a[attributionsourceid]',
		'a[attributionsrc]',
		'a[hreftranslate]',
		'a[interestfor]',
		'area[attributionsrc]',
		'area[interestfor]',
		'button[interestfor]',
		'canvas[content]',
		'canvas[moz-opaque]',
		'colgroup[align]',
		'colgroup[char]',
		'colgroup[charoff]',
		'colgroup[valign]',
		'colgroup[width]',
		'html[xmlns]',
		'iframe[allowpaymentrequest]',
		'iframe[browsingtopics]',
		'iframe[credentialless]',
		'iframe[cross-origin-top-navigation-by-user-activation]',
		'iframe[csp]',
		'img[attributionsrc]',
		'input[incremental]',
		'input[orient]',
		'input[results]',
		'input[switch]',
		'mml:maction[actiontype]',
		'mml:maction[selection]',
		'mml:menclose[notation]',
		'mml:mfrac[denomalign]',
		'mml:mfrac[numalign]',
		'mml:mmultiscripts[subscriptshift]',
		'mml:mmultiscripts[superscriptshift]',
		'mml:mo[accent]',
		'mml:msub[subscriptshift]',
		'mml:msubsup[subscriptshift]',
		'mml:msubsup[superscriptshift]',
		'mml:msup[superscriptshift]',
		'mml:mtable[align]',
		'mml:mtable[columnalign]',
		'mml:mtable[columnlines]',
		'mml:mtable[columnspacing]',
		'mml:mtable[frame]',
		'mml:mtable[framespacing]',
		'mml:mtable[rowalign]',
		'mml:mtable[rowlines]',
		'mml:mtable[rowspacing]',
		'mml:mtable[width]',
		'mml:mtd[columnalign]',
		'mml:mtd[rowalign]',
		'mml:mtr[columnalign]',
		'mml:mtr[rowalign]',
		'pre[wrap]',
		'script[attributionsrc]',
		'svg:a[interestfor]',
		'svg:defs[systemLanguage]',
		'svg:feImage[fetchpriority]',
		'svg:filter[xlink:href]',
		'svg:image[decoding]',
		'svg:image[fetchpriority]',
		'svg:pattern[systemLanguage]',
		'svg:script[async]',
		'svg:script[defer]',
		'svg:script[fetchpriority]',
		'svg:view[svgView]',
		'tbody[bgcolor]',
		'template[for]',
		'template[shadowrootreferencetarget]',
		'tfoot[bgcolor]',
		'thead[bgcolor]',
	]);
});

/**
 * The elements are what the sources define: an element is added by writing its source file, and nothing in the
 * generator notices that a specification or a browser has a new one. BCD lists the elements of the browsers, so the
 * ones that it has and the data lacks are pinned here, and a change of the BCD version that adds one fails the test and
 * a person reads it: an element that a specification defines is written in `src/`, any other is added to this list.
 * `mml:a` (MathML Core) and `selectedcontent` (the HTML Standard) are defined by a specification and are not in the
 * data yet.
 */
test('the elements that BCD has and the data lacks are the ones that were read', async () => {
	const { default: bcd } = await import('@mdn/browser-compat-data/forLegacyNode');
	const names = new Set(htmlSpec.specs.map(el => el.name));
	const missing = [];
	for (const [namespace, prefix] of [
		['html', ''],
		['svg', 'svg:'],
		['mathml', 'mml:'],
	]) {
		for (const [name, feature] of Object.entries(bcd[namespace].elements)) {
			if (feature.__compat && !names.has(`${prefix}${name}`)) {
				missing.push(`${prefix}${name}`);
			}
		}
	}
	expect(missing.toSorted()).toStrictEqual([
		'camera',
		'fencedframe',
		'geolocation',
		'install',
		'microphone',
		'mml:a',
		'model',
		'selectedcontent',
		'usermedia',
	]);
});

describe('schema', () => {
	const map = [
		[
			'spec.*.jsonc',
			new Ajv({
				schemas: [
					schemas.element,
					schemas.aria,
					schemas.contentModels,
					schemas.globalAttributes,
					schemas.attributes,
					schemas.types,
				],
			}).getSchema(schemas.element.$id),

			'spec.*.jsonc',
		],
		[
			'spec-common.attributes.jsonc',
			new Ajv({
				schemas: [schemas.globalAttributes, schemas.attributes, schemas.types],
			}).getSchema(schemas.globalAttributes.$id),

			'spec-common.attributes.jsonc',
		],
	];

	for (const [testName, validator, pattern] of map) {
		test(testName, async () => {
			const files = await glob(pattern, { cwd: path.resolve(__dirname, '..', 'src'), absolute: true });
			// A pattern that matches nothing validates nothing and passes: the source files are in `src/`.
			expect(files.length).toBeGreaterThan(0);
			for (const jsonPath of files) {
				const json = parse(await readFile(jsonPath, { encoding: 'utf-8' }));
				const isValid = validator(json);
				if (!isValid) {
					throw new Error(`${path.basename(jsonPath)} is invalid (${validator.schemaEnv.baseId})`);
				}
			}
		});
	}
});
