import { join } from 'node:path';

import rules from '@markuplint/rules';
import { describe, expect, test } from 'vitest';

import { allRuleNames, diagnose, isCrash, toLines } from './diagnostics.ts';
import { EXPECTED, EXTENDED_INPUTS, readInputs } from './fixtures.ts';

const inputs = readInputs();

const diagnoses = new Map<string, Awaited<ReturnType<typeof diagnose>>>();

async function diagnosisOf(name: string) {
	let diagnosis = diagnoses.get(name);
	const input = inputs.find(item => item.name === name);
	if (!diagnosis && input) {
		diagnosis = await diagnose(input.html, { extendedSpec: input.extendedSpec });
		diagnoses.set(name, diagnosis);
	}
	if (!diagnosis) {
		throw new Error(`There is no input "${name}"`);
	}
	return diagnosis;
}

const names = inputs.map(input => input.name);

describe('every rule is enabled in the record', () => {
	test('the rules of the record are those of the package', () => {
		expect(allRuleNames()).toStrictEqual(Object.keys(rules).toSorted());
	});

	test('the inputs that are linted with the extended spec are inputs', () => {
		for (const name of EXTENDED_INPUTS) {
			expect(names).toContain(name);
		}
	});
});

describe('the violations of every rule', () => {
	test.each(names)('%s', async name => {
		const { violations } = await diagnosisOf(name);
		await expect(toLines(violations)).toMatchFileSnapshot(join(EXPECTED, `${name}.violations.ndjson`));
	});
});

describe('the categories of every element', () => {
	test.each(names)('%s', async name => {
		const { elements } = await diagnosisOf(name);
		await expect(toLines(elements)).toMatchFileSnapshot(join(EXPECTED, `${name}.categories.ndjson`));
	});
});

describe('which rules the inputs exercise', () => {
	test('lists the rules that no input makes report, so that a change in what is covered is seen', async () => {
		const reported = new Set<string>();
		for (const name of names) {
			for (const violation of (await diagnosisOf(name)).violations) {
				reported.add(String(violation.ruleId));
			}
		}
		const silent = allRuleNames().filter(rule => !reported.has(rule));
		await expect(`${silent.join('\n')}\n`).toMatchFileSnapshot(join(EXPECTED, 'rules-without-a-violation.txt'));
	});
});

describe('a record of the same document', () => {
	test('is the same each time, and has no violation of the parser, for markup that the parser takes apart', async () => {
		// the parser closes the paragraph at the div and makes the link again, which has no place in the source
		const html =
			'<!doctype html><html lang="en"><head><title>t</title></head><body><p><a href="#x"><div>x</div></a></p><b><i>y</b>z</i></body></html>';
		const first = await diagnose(html);
		const second = await diagnose(html);
		expect(JSON.stringify(first)).toBe(JSON.stringify(second));
		expect(first.violations.filter(violation => violation.ruleId === 'parse-error')).toStrictEqual([]);
	});
});

describe('isCrash', () => {
	test('is true for an error that a rule threw, whatever the type of the error', () => {
		const at = { line: 0, col: 0, ruleId: 'permitted-contents' };
		expect(isCrash({ ...at, message: 'Error: x is empty\n    at f (file.js:1:1)' })).toBe(true);
		expect(isCrash({ ...at, message: 'TypeError: Cannot read properties of undefined' })).toBe(true);
		expect(isCrash({ ...at, message: 'RangeError: Maximum call stack size exceeded' })).toBe(true);
	});

	test('is true for an error of the engine, which it reports under the name of the package', () => {
		expect(isCrash({ line: 3, col: 5, ruleId: '@markuplint/ml-core', message: 'Broke mapping nodes.' })).toBe(true);
	});

	test('is false for a violation that a rule reports', () => {
		expect(
			isCrash({ line: 3, col: 5, ruleId: 'permitted-contents', message: 'The "p" element is not allowed' }),
		).toBe(false);
		expect(isCrash({ line: 0, col: 0, ruleId: 'require-h1', message: 'Require the "h1" element' })).toBe(false);
	});
});

describe('the spec that the inputs are linted against', () => {
	test('no input makes a rule throw, which would leave the record without what the other rules say', async () => {
		for (const name of names) {
			const crashes = (await diagnosisOf(name)).violations.filter(violation => isCrash(violation));
			expect(crashes, name).toStrictEqual([]);
		}
	});

	test('the extended spec changes what permitted-contents reports for the extended input', async () => {
		const input = inputs.find(item => item.name === 'extended-content-model');
		const without = await diagnose(input?.html ?? '');
		const contentsOf = (violations: readonly Record<string, unknown>[]) =>
			violations
				.filter(violation => violation.ruleId === 'permitted-contents')
				.map(violation => JSON.stringify(violation));
		const withExtension = contentsOf((await diagnosisOf('extended-content-model')).violations);
		expect(withExtension.length).toBeGreaterThan(0);
		expect(withExtension).not.toStrictEqual(contentsOf(without.violations));
	});

	test('the extended spec adds the categories that it names', async () => {
		const { elements } = await diagnosisOf('extended-content-model');
		const captions = elements.filter(element => element.raw.startsWith('<figcaption'));
		expect(captions.length).toBeGreaterThan(0);
		expect(captions.every(element => element.categories.includes('#flow'))).toBe(true);
	});
});
