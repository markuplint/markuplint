import type { Config, AnyRule, AnyRuleV2, Rules } from './types.js';
import type { Nullable } from '@markuplint/shared';
import type { Writable } from 'type-fest';

import deepmerge from 'deepmerge';

import { deleteUndefProp, cleanOptions, isRuleConfigValue } from './utils.js';

export function mergeConfig(a: Config, b: Config): Config {
	const config: Config = {
		...a,
		...b,
		plugins: concatArray(a.plugins, b.plugins, true, 'name'),
		parser: mergeObject(a.parser, b.parser),
		parserOptions: mergeObject(a.parserOptions, b.parserOptions),
		specs: mergeObject(a.specs, b.specs),
		excludeFiles: concatArray(a.excludeFiles, b.excludeFiles, true),
		rules: mergeRules(
			// TODO: Deep merge
			a.rules,
			b.rules,
		),
		nodeRules: concatArray(a.nodeRules, b.nodeRules),
		childNodeRules: concatArray(a.childNodeRules, b.childNodeRules),
		overrideMode: b.overrideMode ?? a.overrideMode,
		overrides: mergeObject(a.overrides, b.overrides),
		// delete all
		extends: undefined,
	};
	deleteUndefProp(config);
	return config;
}

export function mergeRule(a: Nullable<AnyRule | AnyRuleV2>, b: AnyRule | AnyRuleV2): AnyRule {
	const oA = optimizeRule(a);
	const oB = optimizeRule(b);

	// Particular behavior:
	// If the right-side value is false, return false.
	// In short; The `false` makes the rule to be disabled absolutely.
	if (oB === false || (!isRuleConfigValue(oB) && oB?.value === false)) {
		return false;
	}

	if (oA === undefined) {
		return oB ?? {};
	}

	if (oB === undefined) {
		return oA;
	}

	if (isRuleConfigValue(oB)) {
		if (isRuleConfigValue(oA)) {
			if (Array.isArray(oA) && Array.isArray(oB)) {
				return [...oA, ...oB];
			}
			return oB;
		}
		const value = Array.isArray(oA.value) && Array.isArray(oB) ? [...oA.value, ...oB] : oB;
		const res = cleanOptions({ ...oA, value });
		deleteUndefProp(res);
		return res;
	}

	const severity = oB.severity ?? (isRuleConfigValue(oA) ? undefined : oA.severity);
	const value = oB.value ?? (isRuleConfigValue(oA) ? oA : oA.value);
	const options = mergeObject(isRuleConfigValue(oA) ? undefined : oA.options, oB.options);
	const reason = oB.reason ?? (isRuleConfigValue(oA) ? undefined : oA.reason);
	const res = {
		severity,
		value,
		options,
		reason,
	};
	deleteUndefProp(res);
	return res;
}

function mergeObject<T>(a: Nullable<T>, b: Nullable<T>): T | undefined {
	if (a == null) {
		return b ?? undefined;
	}
	if (b == null) {
		return a ?? undefined;
	}
	const res = deepmerge<T>(a, b);
	deleteUndefProp(res);
	return res;
}

function concatArray<T extends any>(
	a: Nullable<readonly T[]>,
	b: Nullable<readonly T[]>,
	uniquely = false,
	comparePropName?: string,
): readonly T[] | undefined {
	const newArray: T[] = [];
	function concat(item: T) {
		if (!uniquely) {
			newArray.push(item);
			return;
		}
		if (newArray.includes(item)) {
			return;
		}

		if (!comparePropName) {
			newArray.push(item);
			return;
		}

		const name = getName(item, comparePropName);
		if (!name) {
			newArray.push(item);
			return;
		}

		const existedIndex = newArray.findIndex(e => getName(e, comparePropName) === name);
		if (existedIndex === -1) {
			newArray.push(item);
			return;
		}

		if (typeof item === 'string') {
			return;
		}

		const existed = newArray[existedIndex];
		const merged = mergeObject(existed, item);
		if (!merged) {
			newArray.push(item);
			return;
		}

		newArray.splice(existedIndex, 1, merged);
	}

	// eslint-disable-next-line unicorn/no-array-for-each
	a?.forEach(concat);
	// eslint-disable-next-line unicorn/no-array-for-each
	b?.forEach(concat);

	return newArray.length === 0 ? undefined : newArray;
}

function getName(item: any, comparePropName: string) {
	if (item == null) {
		return null;
	}
	if (typeof item === 'string') {
		return item;
	}
	if (typeof item === 'object' && item && comparePropName in item && typeof item[comparePropName] === 'string') {
		return item[comparePropName] as string;
	}
	return null;
}

function mergeRules(a?: Rules, b?: Rules): Rules | undefined {
	if (a == null) {
		return b && optimizeRules(b);
	}
	if (b == null) {
		return optimizeRules(a);
	}
	const res = optimizeRules(a);
	for (const [key, rule] of Object.entries(b)) {
		const merged = mergeRule(res[key], rule);
		if (merged != null) {
			res[key] = merged;
		}
	}
	deleteUndefProp(res);
	return Object.freeze(res);
}

function optimizeRules(rules: Rules) {
	const res: Writable<Rules> = {};
	for (const [key, rule] of Object.entries(rules)) {
		const _rule = optimizeRule(rule);
		if (_rule != null) {
			res[key] = _rule;
		}
	}
	return res;
}

function optimizeRule(rule: Nullable<AnyRule | AnyRuleV2>): AnyRule | undefined {
	if (rule === undefined) {
		return;
	}
	if (isRuleConfigValue(rule)) {
		return rule;
	}
	return cleanOptions(rule);
}
