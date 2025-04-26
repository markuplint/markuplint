import type {
	Config,
	AnyRule,
	AnyRuleV2,
	Rules,
	OptimizedConfig,
	OverrideConfig,
	OptimizedOverrideConfig,
	PretenderDetails,
	Pretender,
} from './types.js';
import type { Nullable } from '@markuplint/shared';
import type { Writable } from 'type-fest';

import deepmerge from 'deepmerge';

import { deleteUndefProp, cleanOptions, isRuleConfigValue } from './utils.js';

export function mergeConfig(a: Config, b?: Config): OptimizedConfig {
	const deleteExtendsProp = !!b;
	b = b ?? {};
	const config: OptimizedConfig = {
		...a,
		...b,
		plugins: concatArray(a.plugins, b.plugins, true, 'name')?.map(plugin => {
			if (typeof plugin === 'string') {
				return {
					name: plugin,
				};
			}
			return plugin;
		}),
		parser: mergeObject(a.parser, b.parser),
		parserOptions: mergeObject(a.parserOptions, b.parserOptions),
		specs: mergeObject(a.specs, b.specs),
		excludeFiles: concatArray(a.excludeFiles, b.excludeFiles, true),
		severity: mergeObject(a.severity, b.severity),
		pretenders: mergePretenders(a.pretenders, b.pretenders),
		rules: mergeRules(
			// TODO: Deep merge
			a.rules,
			b.rules,
		),
		nodeRules: concatArray(a.nodeRules, b.nodeRules),
		childNodeRules: concatArray(a.childNodeRules, b.childNodeRules),
		overrideMode: b.overrideMode ?? a.overrideMode,
		overrides: mergeOverrides(a.overrides, b.overrides),
		extends: concatArray(toReadonlyArray(a.extends), toReadonlyArray(b.extends)),
	};
	if (deleteExtendsProp) {
		// @ts-ignore
		delete config.extends;
	}
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

function mergePretenders(
	a?: readonly Pretender[] | PretenderDetails,
	b?: readonly Pretender[] | PretenderDetails,
): PretenderDetails | undefined {
	if (!a && !b) {
		return;
	}
	const aDetails = a ? convertPretenersToDetails(a) : undefined;
	const bDetails = b ? convertPretenersToDetails(b) : undefined;
	const details = mergeObject(aDetails, bDetails) ?? {};
	deleteUndefProp(details);
	return details;
}

function convertPretenersToDetails(pretenders: readonly Pretender[] | PretenderDetails): PretenderDetails {
	if (isReadonlyArray(pretenders)) {
		return {
			data: pretenders,
		};
	}
	return pretenders;
}

function mergeOverrides(
	a: Record<string, OverrideConfig> = {},
	b: Record<string, OverrideConfig> = {},
): Record<string, OptimizedOverrideConfig> | undefined {
	const keys = new Set<string>();
	for (const key of Object.keys(a)) keys.add(key);
	for (const key of Object.keys(b)) keys.add(key);

	if (keys.size === 0) {
		return;
	}

	const result: Record<string, OptimizedOverrideConfig> = {};

	for (const key of keys) {
		const config = mergeConfig(a[key] ?? {}, b[key] ?? {});
		// @ts-ignore
		delete config.$schema;
		// @ts-ignore
		delete config.extends;
		// @ts-ignore
		delete config.overrides;
		deleteUndefProp(config);
		result[key] = config;
	}

	return result;
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
		return item[comparePropName];
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

function toReadonlyArray<T>(value: NonNullable<T> | readonly NonNullable<T>[] | undefined): readonly T[] {
	if (value == null) {
		return [];
	}

	return isReadonlyArray(value) ? value : ([value] as const);
}

/**
 * Checks if a value is a readonly array.
 *
 * If the array is readonly, it passes the type check.
 * However, it saves the type because using ESLint warns `@typescript-eslint/prefer-readonly-parameter-types`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a readonly array, `false` otherwise.
 * @template T - The type of elements in the array.
 * @template X - The type of the value if it's not an array.
 */
function isReadonlyArray<T, X = unknown>(value: readonly T[] | X): value is ReadonlyArray<T> {
	return Array.isArray(value);
}
