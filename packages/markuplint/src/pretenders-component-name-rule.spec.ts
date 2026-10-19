import { describe, test, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * What a component's name is, is the rule of the parser of the document (`Parser#isComponentName`), and
 * it reaches the target of a pretender through `MLParser` and `MLDocument`. A target that is a component
 * counts as a custom element, which a `p` permits; a target that is an HTML element without a
 * specification is not one, and a `p` does not.
 *
 * `X` pretends to be `_Layout`: JSX takes a name that does not start with a lowercase ASCII letter for a
 * component, and Astro takes only a capital initial.
 */

async function lint(parser: string, code: string) {
	const { violations } = await mlTest(code, {
		parser: { '.*': parser },
		pretenders: [{ selector: 'X', as: '_Layout' }],
		rules: { 'permitted-contents': true },
	});
	return violations.map(v => v.raw);
}

describe('the target of a pretender is typed by the rule of the parser', () => {
	test('JSX: _Layout is a component, so a p permits it', async () => {
		expect(await lint('@markuplint/jsx-parser', '<p><X /></p>')).toStrictEqual([]);
	});

	test('MDX: _Layout is a component, so a p permits it', async () => {
		expect(await lint('@markuplint/mdx-parser', '<p><X /></p>')).toStrictEqual([]);
	});

	test('Astro: _Layout is not a component but an unknown element, which a p does not permit', async () => {
		expect(await lint('@markuplint/astro-parser', '<p><X /></p>')).toStrictEqual(['<X />']);
	});

	test('HTML: the form that most languages share does not take _Layout for a component either', async () => {
		expect(await lint('@markuplint/html-parser', '<p><X></X></p>')).toStrictEqual(['<X>']);
	});
});
