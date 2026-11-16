import { afterEach, describe, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('fetchHTMLElement', () => {
	const page = `<main id="content">
		<div class="reference-layout__header"><div class="content-section">The element.</div></div>
		<table class="properties"><tbody>
			<tr><th>Content categories</th><td><a href="#">Flow content</a>, phrasing content.</td></tr>
			<tr><th>Tag omission</th><td>None; both the starting and ending tag are mandatory.</td></tr>
		</tbody></table>
	</main>`;

	test('reads the description of the page, but neither the categories, the tag omission nor a reference', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(page, { status: 200 }))),
		);
		vi.resetModules();
		const { fetchHTMLElement } = await import('./scraping.ts');

		const spec = await fetchHTMLElement('https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/b');

		expect(spec.description).toBe('The element.');
		expect(Object.keys(spec).filter(key => ['categories', 'omission', 'cite'].includes(key))).toStrictEqual([]);
	});
});
