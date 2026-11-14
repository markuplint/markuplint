import type { ExtendedSpec } from '@markuplint/ml-spec';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { finalizeSpec } from './index.ts';

/** The element names of the committed data: `validateSpecs` needs the core elements, and these include them. */
const elementNames = (
	JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', 'index.json'), 'utf8')) as ExtendedSpec
).specs!.map(spec => spec.name);

function scraped(description: string): ExtendedSpec {
	const role = (name: string) => ({ name, description: `The ${name} role.` });
	const aria = {
		roles: [role('button'), role('link')],
		graphicsRoles: [],
		dpubRoles: [],
		props: [{ name: 'aria-label' }],
	};
	return {
		cites: ['https://html.spec.whatwg.org/multipage/'],
		def: { '#globalAttrs': {}, '#aria': { '1.1': aria, '1.2': aria, '1.3': aria }, '#contentModels': {} },
		specs: elementNames.map(name => ({ name, description, attributes: { id: { description: 'The id.' } } })),
	} as unknown as ExtendedSpec;
}

describe('finalizeSpec', () => {
	test('returns the scraped spec without its prose', () => {
		const output = JSON.stringify(finalizeSpec(scraped('A scraped description.'), null));
		expect(output).not.toContain('description');
		expect(output).toContain('"name":"div"');
	});

	test('validates the scraped text: a failed MDN fetch (empty descriptions) is reported before the prose is dropped', () => {
		expect(() => finalizeSpec(scraped(''), null)).toThrow(/empty descriptions/);
	});

	test('does not change the scraped spec', () => {
		const input = scraped('A scraped description.');
		finalizeSpec(input, null);
		expect(JSON.stringify(input)).toContain('A scraped description.');
	});
});
