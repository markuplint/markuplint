import type { ExtendedSpec } from '@markuplint/ml-spec';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { summarizeChanges } from './summarize.ts';

/** The committed, real generated spec — used to pin real-data-shape compatibility. */
const realSpec = JSON.parse(
	readFileSync(path.resolve(import.meta.dirname, '..', 'index.json'), 'utf8'),
) as ExtendedSpec;

function aria(
	roles: readonly string[],
	props: readonly string[] = [],
	graphicsRoles: readonly string[] = [],
	dpubRoles: readonly string[] = [],
) {
	return {
		roles: roles.map(name => ({ name })),
		graphicsRoles: graphicsRoles.map(name => ({ name })),
		dpubRoles: dpubRoles.map(name => ({ name })),
		props: props.map(name => ({ name })),
	};
}

function spec(elements: readonly string[], cites: readonly string[] = ['https://html.spec.whatwg.org/']): ExtendedSpec {
	const a = aria(['button', 'link']);
	return {
		cites,
		def: {
			'#globalAttrs': {},
			'#aria': { '1.1': a, '1.2': a, '1.3': a },
			'#contentModels': {},
		},
		specs: elements.map(name => ({ name, description: `The ${name} element.` })),
	} as ExtendedSpec;
}

describe('summarizeChanges', () => {
	test('returns an initial-generation note when there is no previous spec', () => {
		const result = summarizeChanges(null, spec(['div', 'span']));
		expect(result).toBe('Initial generation: 2 elements, 1 reference URLs.');
	});

	test('reports added and removed elements', () => {
		const previous = spec(['div', 'span', 'old-el']);
		const next = spec(['div', 'span', 'new-el']);
		const result = summarizeChanges(previous, next);
		expect(result).toContain('**Elements**: 3 (unchanged)');
		expect(result).toContain('**Added (1)**: `new-el`');
		expect(result).toContain('**Removed (1)**: `old-el`');
	});

	test('reports the element count delta with a sign', () => {
		const result = summarizeChanges(spec(['div']), spec(['div', 'span', 'p']));
		expect(result).toContain('**Elements**: 1 → 3 (+2)');
	});

	test('reports ARIA role additions per version', () => {
		const previous = spec(['div']);
		const next: ExtendedSpec = {
			...spec(['div']),
			def: {
				...spec(['div']).def!,
				'#aria': {
					'1.1': aria(['button', 'link']),
					'1.2': aria(['button', 'link']),
					'1.3': aria(['button', 'link', 'switch']),
				},
			},
		} as ExtendedSpec;
		const result = summarizeChanges(previous, next);
		expect(result).toContain('### ARIA changes');
		expect(result).toContain('**ARIA 1.3**: +1 roles');
		expect(result).toContain('roles added: `switch`');
		// Versions without changes are not listed
		expect(result).not.toContain('**ARIA 1.1**');
	});

	test('reports ARIA property changes per version', () => {
		const previous = spec(['div']);
		const next: ExtendedSpec = {
			...spec(['div']),
			def: {
				...spec(['div']).def!,
				'#aria': {
					'1.1': aria(['button', 'link']),
					'1.2': aria(['button', 'link'], ['aria-braillelabel']),
					'1.3': aria(['button', 'link']),
				},
			},
		} as ExtendedSpec;
		const result = summarizeChanges(previous, next);
		expect(result).toContain('**ARIA 1.2**: +1 props');
		expect(result).toContain('props added: `aria-braillelabel`');
	});

	test('reports graphics-role and dpub-role changes per version', () => {
		const previous = spec(['div']);
		const next: ExtendedSpec = {
			...spec(['div']),
			def: {
				...spec(['div']).def!,
				'#aria': {
					'1.1': aria(['button', 'link']),
					'1.2': aria(['button', 'link']),
					'1.3': aria(['button', 'link'], [], ['graphics-symbol'], ['doc-chapter']),
				},
			},
		} as ExtendedSpec;
		const result = summarizeChanges(previous, next);
		expect(result).toContain('**ARIA 1.3**: +1 graphics roles, +1 dpub roles');
		expect(result).toContain('graphics roles added: `graphics-symbol`');
		expect(result).toContain('dpub roles added: `doc-chapter`');
	});

	test('reports a reference URL count change', () => {
		const previous = spec(['div'], ['https://a/']);
		const next = spec(['div'], ['https://a/', 'https://b/']);
		const result = summarizeChanges(previous, next);
		expect(result).toContain('**Reference URLs**: 1 → 2 (+1)');
	});

	test('reports no structural changes when only descriptions/attributes differ', () => {
		const previous = spec(['div', 'span']);
		const next: ExtendedSpec = {
			...spec(['div', 'span']),
			specs: [
				{ name: 'div', description: 'A changed description.' },
				{ name: 'span', description: 'Another changed description.' },
			],
		} as ExtendedSpec;
		const result = summarizeChanges(previous, next);
		expect(result).toContain('No structural changes');
	});

	test('reports no structural changes for the committed index.json against itself', () => {
		// Real-data shape check: identical input must not fabricate changes.
		expect(summarizeChanges(realSpec, realSpec)).toContain('No structural changes');
	});
});
