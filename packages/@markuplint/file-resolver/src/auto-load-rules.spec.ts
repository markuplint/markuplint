import { Ruleset } from '@markuplint/ml-core';
import { afterEach, test, expect, vi } from 'vitest';

import { autoLoadRules, clearAutoLoadRulesCache } from './auto-load-rules.js';

afterEach(() => {
	clearAutoLoadRulesCache();
});

vi.mock('markuplint-rule-fake', () => {
	return {
		default: {},
	};
});

const slowGate = vi.hoisted(() => {
	let release!: () => void;
	const opened = new Promise<void>(resolve => {
		release = resolve;
	});
	return { opened, release };
});

vi.mock('markuplint-rule-slow', async () => {
	await slowGate.opened;
	// Not a rule seed, so the probe ends as a miss
	return { default: {} };
});

test('third-party-rules', async () => {
	const r = await autoLoadRules(
		new Ruleset({
			rules: {
				fake: true,
			},
		}),
	);

	expect(r.rules).toEqual([]);
	expect(r.errors.length).toBe(1);
});

test('invalid-rules', async () => {
	const r = await autoLoadRules(
		new Ruleset({
			rules: {
				invalid: true,
			},
		}),
	);

	expect(r.rules).toEqual([]);
	expect(r.errors.length).toBe(2);
});

test('missing rules are not re-imported until clearAutoLoadRulesCache', async () => {
	const ruleset = new Ruleset({
		rules: {
			'not-installed': true,
		},
	});

	const first = await autoLoadRules(ruleset);
	const second = await autoLoadRules(ruleset);
	expect(first.errors.length).toBe(2);
	// Same errors, not re-raised
	expect(second.errors).toEqual(first.errors);

	clearAutoLoadRulesCache();
	const third = await autoLoadRules(ruleset);
	expect(third.errors.length).toBe(2);
	expect(third.errors[0]).not.toBe(first.errors[0]);
});

test('a clearAutoLoadRulesCache during an in-flight load is not undone by the stale miss', async () => {
	const ruleset = new Ruleset({ rules: { slow: true } });

	const inFlight = autoLoadRules(ruleset);
	// Let the first probe (`@markuplint/rule-slow`) fail and the second block on the gate
	await new Promise(resolve => setTimeout(resolve, 50));
	clearAutoLoadRulesCache();
	slowGate.release();
	await inFlight;

	// The cache was cleared while loading, so the next call must probe again
	expect((await autoLoadRules(ruleset)).errors.length).toBe(1);
});
