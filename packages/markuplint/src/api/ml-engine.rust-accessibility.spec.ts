import type { Config } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function' && typeof mod.accessibilityHtml === 'function',
	() => false,
);

/**
 * The accessibility properties at a position, as the hover of the language server reads them, from
 * one engine. The Rust one must not have fallen back to the TypeScript one. The result is read as
 * JSON, which is how a consumer of either engine sees it: TypeScript keeps a key whose value is
 * `undefined`, and the Rust engine has no such key.
 */
const accessibilityAt = async (
	sourceCode: string,
	line: number,
	col: number,
	rust: boolean,
	ariaVersion: ARIAVersion = '1.3',
	name = 'a.html',
	config: Config = {},
) => {
	const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	try {
		const file = await MLEngine.toMLFile({ sourceCode, name });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: rust,
			config: { parser: { '\\.vue$': '@markuplint/vue-parser' }, ...config },
		});
		await engine.exec();
		const found = engine.accessibilityAt(line, col, ariaVersion);
		expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain('[experimental-rust-core]');
		// The round trip is the point: it drops the keys whose value is `undefined`, which a deep clone keeps.
		// eslint-disable-next-line unicorn/prefer-structured-clone
		return found === null ? null : (JSON.parse(JSON.stringify(found)) as unknown);
	} finally {
		stderr.mockRestore();
	}
};

type Row = readonly [name: string, sourceCode: string, line: number, col: number];

/**
 * Each row is a place in a document, and both engines must say the same of it. `role` is what the
 * row is about, so that two engines that both find nothing are not taken for agreeing.
 */
describe.skipIf(!nativeAddonIsBuilt)('the accessibility properties at a position', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each<readonly [...Row, role: string | null]>([
		['a button', '<button aria-pressed="true">b</button>', 1, 1, 'button'],
		['a button with no aria attribute', '<button>b</button>', 1, 1, 'button'],
		['a heading, whose level is its number', '<h2>t</h2>', 1, 1, 'heading'],
		['a heading with aria-level', '<h2 aria-level="4">t</h2>', 1, 1, 'heading'],
		['an aria attribute that is not valid', '<button aria-pressed="nope">b</button>', 1, 1, 'button'],
		['an aria attribute that is empty', '<button aria-pressed="">b</button>', 1, 1, 'button'],
		['an equivalent HTML attribute', '<input type="checkbox" checked>', 1, 1, 'checkbox'],
		['an explicit role with required properties', '<div role="checkbox"></div>', 1, 1, 'checkbox'],
		['a link', '<a href="/x">text</a>', 1, 1, 'link'],
		['an image with an alternative text', '<img src="a.png" alt="A">', 1, 1, 'img'],
		['an image with an empty alternative text', '<img src="a.png" alt="">', 1, 1, 'presentation'],
		['a name by a reference', '<p id="l">Label</p><div role="group" aria-labelledby="l"></div>', 1, 20, 'group'],
		['a name from a label', '<label for="i">Name</label><input id="i">', 1, 28, 'textbox'],
		['a hidden element', '<div hidden>x</div>', 1, 1, null],
		['an element that is aria-hidden', '<div aria-hidden="true">x</div>', 1, 1, null],
		['a slot', '<slot></slot>', 1, 1, null],
		['an element with a slot below', '<div><slot></slot></div>', 1, 1, 'generic'],
		['an element with a slot in a template', '<div><template><slot></slot></template></div>', 1, 1, 'generic'],
		[
			'a host with a declarative shadow root',
			'<my-el><template shadowrootmode="open"><slot></slot></template>x</my-el>',
			1,
			1,
			null,
		],
		['an element that has no role', '<script></script>', 1, 1, null],
		['an upper case heading', '<H2>t</H2>', 1, 1, 'heading'],
		['an element after text that is not ASCII', '日本語<button>b</button>', 1, 5, 'button'],
		['an element after an emoji', '😀<button>b</button>', 1, 4, 'button'],
		['an element on the second line of a CRLF source', '<div>\r\n<button>b</button>\r\n</div>', 2, 1, 'button'],
		['a custom element', '<my-el>x</my-el>', 1, 1, null],
		['an svg element', '<svg><circle r="1"></circle></svg>', 1, 6, null],
		[
			'a property with a value of another type for the role',
			'<div role="spinbutton" aria-valuenow="abc"></div>',
			1,
			1,
			'spinbutton',
		],
		['a doctype', '<!DOCTYPE html><html><body></body></html>', 1, 1, null],
		['a comment', '<!-- c --><p></p>', 1, 1, null],
		['a text node', '<p>text</p>', 1, 5, null],
		['a place where there is no node', '<p>text</p>', 9, 1, null],
		['the second line', '<div>\n<button>b</button>\n</div>', 2, 1, 'button'],
		['the column of an element on the second line', '<div>\n  <button>b</button>\n</div>', 2, 3, 'button'],
		['a position in a start tag that spans lines', '<button\n  aria-pressed="true">b</button>', 2, 5, 'button'],
		[
			// The column is tried apart from the line, so the `div` (columns up to 10 on its last line) is found first
			'a position that is in the range of an element before it, by TypeScript',
			'<div\n  id="a"><button>b</button></div>',
			2,
			10,
			'generic',
		],
	])('is the same on both engines for %s', async (_name, sourceCode, line, col, role) => {
		const expected = await accessibilityAt(sourceCode, line, col, false);
		const actual = await accessibilityAt(sourceCode, line, col, true);

		if (role !== null) {
			expect(expected).toMatchObject({ aria: { role } });
		}
		expect(actual).toStrictEqual(expected);
	});

	it('is the same on both engines for an element that a pretender makes a heading', async () => {
		const config: Config = { pretenders: [{ selector: 'x-h', as: 'h2' }] };
		const expected = await accessibilityAt('<x-h>t</x-h>', 1, 1, false, '1.3', 'a.html', config);
		const actual = await accessibilityAt('<x-h>t</x-h>', 1, 1, true, '1.3', 'a.html', config);

		expect(expected).toMatchObject({ aria: { role: 'heading' } });
		expect(actual).toStrictEqual(expected);
	});

	it('has no document where a selector of the config cannot be read, on either engine', async () => {
		const config: Config = { nodeRules: [{ selector: 'p[', rules: { 'no-duplicate-id': true } }] };
		const expected = await accessibilityAt('<button>b</button>', 1, 1, false, '1.3', 'a.html', config);
		const actual = await accessibilityAt('<button>b</button>', 1, 1, true, '1.3', 'a.html', config);

		expect(expected).toBeNull();
		expect(actual).toBeNull();
	});

	it('keeps the order of the properties', async () => {
		const sourceCode = '<button aria-pressed="true" aria-expanded="false" aria-describedby="x">b</button>';
		const expected = await accessibilityAt(sourceCode, 1, 1, false);
		const actual = await accessibilityAt(sourceCode, 1, 1, true);

		expect(Object.keys((actual as { aria: { props: object } }).aria.props)).toStrictEqual(
			Object.keys((expected as { aria: { props: object } }).aria.props),
		);
		expect(Object.keys((expected as { aria: { props: object } }).aria.props).length).toBeGreaterThan(1);
	});

	it.each<ARIAVersion>(['1.1', '1.2', '1.3'])('is the same on both engines for ARIA %s', async version => {
		const sourceCode = '<div role="switch" aria-checked="true">s</div><h3>t</h3>';
		for (const col of [1, 47]) {
			const expected = await accessibilityAt(sourceCode, 1, col, false, version);
			const actual = await accessibilityAt(sourceCode, 1, col, true, version);
			expect(expected).not.toBeNull();
			expect(actual).toStrictEqual(expected);
		}
	});

	it('is the same on both engines for an element of a file that a framework parser reads', async () => {
		const sourceCode = '<template>\n  <button aria-pressed="true">b</button>\n</template>\n';
		const expected = await accessibilityAt(sourceCode, 2, 3, false, '1.3', 'a.vue');
		const actual = await accessibilityAt(sourceCode, 2, 3, true, '1.3', 'a.vue');

		expect(expected).toMatchObject({ node: 'button', aria: { role: 'button' } });
		expect(actual).toStrictEqual(expected);
	});

	it('is `null` before anything was linted, and the engine says it was not', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p></p>', name: 'a.html' });
		for (const experimentalRustCore of [false, true]) {
			const engine = new MLEngine(file!, { noSearchConfig: true, locale: 'en', experimentalRustCore });
			expect(engine.linted).toBe(false);
			expect(engine.accessibilityAt(1, 1, '1.3')).toBeNull();

			await engine.exec();

			expect(engine.linted).toBe(true);
			expect(engine.accessibilityAt(1, 1, '1.3')).toMatchObject({ node: 'p' });
		}
	});
});
