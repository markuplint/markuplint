import type { ExtendedSpec } from '@markuplint/ml-spec';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { validateSpecs } from './validate.ts';

/** The committed, real generated spec — used to pin real-data-shape compatibility. */
const realSpec = JSON.parse(
	readFileSync(path.resolve(import.meta.dirname, '..', 'index.json'), 'utf8'),
) as ExtendedSpec;

/**
 * Builds a minimal but valid spec, with overrides merged in. The base passes
 * every check so each test can break exactly one thing.
 */
function spec(overrides: Partial<ExtendedSpec> = {}): ExtendedSpec {
	const roles = [{ name: 'button' }, { name: 'link' }, { name: 'generic' }];
	const ariaSpec = { roles, graphicsRoles: [], dpubRoles: [], props: [] };
	const requiredElements = [
		'html',
		'head',
		'body',
		'div',
		'span',
		'p',
		'a',
		'ul',
		'li',
		'table',
		'form',
		'input',
		'button',
		'img',
	];
	return {
		cites: ['https://html.spec.whatwg.org/'],
		def: {
			'#globalAttrs': {},
			'#aria': {
				'1.1': ariaSpec,
				'1.2': ariaSpec,
				'1.3': ariaSpec,
			},
			'#contentModels': {},
		},
		specs: requiredElements.map(name => ({ name, description: `The ${name} element.` })),
		...overrides,
	} as ExtendedSpec;
}

describe('validateSpecs', () => {
	test('passes for a well-formed spec', () => {
		expect(() => validateSpecs(spec())).not.toThrow();
	});

	test('throws when more than half of HTML elements have empty descriptions', () => {
		// 14 elements; empty the first 8 (57%) to cross the 50% threshold
		const broken = spec().specs!.map((s, i) => (i < 8 ? { ...s, description: '' } : s));
		expect(() => validateSpecs(spec({ specs: broken }))).toThrow(/empty descriptions/);
	});

	test('throws when a required core element is missing', () => {
		const withoutDiv = spec().specs!.filter(s => s.name !== 'div');
		expect(() => validateSpecs(spec({ specs: withoutDiv }))).toThrow(/Required core elements are missing: div/);
	});

	test('throws when there are no cites', () => {
		expect(() => validateSpecs(spec({ cites: [] }))).toThrow(/No reference URLs/);
	});

	test('throws when an ARIA version has no roles', () => {
		const base = spec();
		const emptied: ExtendedSpec = {
			...base,
			def: {
				...base.def!,
				'#aria': {
					...base.def!['#aria'],
					'1.2': { roles: [], graphicsRoles: [], dpubRoles: [], props: [] },
				},
			},
		} as ExtendedSpec;
		expect(() => validateSpecs(emptied)).toThrow(/ARIA 1\.2 has no roles/);
	});

	test('throws when an ARIA version is missing an expected role', () => {
		const base = spec();
		const withoutButton: ExtendedSpec = {
			...base,
			def: {
				...base.def!,
				'#aria': {
					...base.def!['#aria'],
					'1.3': {
						roles: [{ name: 'link' }, { name: 'generic' }],
						graphicsRoles: [],
						dpubRoles: [],
						props: [],
					},
				},
			},
		} as ExtendedSpec;
		expect(() => validateSpecs(withoutButton)).toThrow(/ARIA 1\.3 is missing expected roles: button/);
	});

	test('throws when the element count drops below the stability threshold', () => {
		const previous = spec({
			specs: Array.from({ length: 100 }, (_, i) => ({ name: `el-${i}`, description: 'x' })),
		});
		// current has the 14 required elements only → 14/100 = 14% retained
		expect(() => validateSpecs(spec(), previous)).toThrow(/Element count dropped from 100 to 14/);
	});

	test('does not run the stability check on first generation (no previous)', () => {
		expect(() => validateSpecs(spec(), null)).not.toThrow();
	});

	test('allows a small element-count decrease within the threshold', () => {
		// previous 15, current 14 → 93% retained, above 85%
		const previous = spec({ specs: [...spec().specs!, { name: 'aside', description: 'x' }] });
		expect(() => validateSpecs(spec(), previous)).not.toThrow();
	});

	test('reports multiple issues together', () => {
		// Empty cites (1) + a missing required element (1) = exactly 2 issues
		const withoutDiv = spec().specs!.filter(s => s.name !== 'div');
		expect(() => validateSpecs(spec({ cites: [], specs: withoutDiv }))).toThrow(/2 issues/);
	});

	test('the committed index.json passes validation against itself', () => {
		// Real-data shape check: the shipped spec must satisfy every rule,
		// including the stability check when compared with itself.
		expect(() => validateSpecs(realSpec, realSpec)).not.toThrow();
	});
});
