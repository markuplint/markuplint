import type {
	Config,
	AnyRule,
	Rules,
	OptimizedConfig,
	OverrideConfig,
	OptimizedOverrideConfig,
	PretenderDetails,
	Pretender,
	PluginConfig,
} from './types.js';
import type { Nullable } from '@markuplint/shared';
import type { Writable } from 'type-fest';

import { deleteUndefProp, cleanOptions, isRuleConfigValue } from './utils.js';

export function mergeConfig(a: Config, b?: Config): OptimizedConfig {
	const deleteExtendsProp = !!b;
	b = b ?? {};
	const config: OptimizedConfig = {
		...a,
		...b,
		ruleCommonSettings: mergeObject(a.ruleCommonSettings, b.ruleCommonSettings),
		plugins: overrideOrMergeArray(a.plugins, b.plugins)?.map(plugin => {
			if (typeof plugin === 'string') {
				return { name: plugin };
			}
			return plugin;
		}) as readonly PluginConfig[] | undefined,
		parser: mergeObject(a.parser, b.parser),
		parserOptions: mergeObject(a.parserOptions, b.parserOptions),
		specs: mergeObject(a.specs, b.specs),
		excludeFiles: overrideOrMergeArray(a.excludeFiles, b.excludeFiles),
		severity: mergeObject(a.severity, b.severity),
		pretenders: mergePretenders(a.pretenders, b.pretenders),
		rules: mergeRules(a.rules, b.rules),
		nodeRules: overrideOrMergeArray(a.nodeRules, b.nodeRules, true),
		childNodeRules: overrideOrMergeArray(a.childNodeRules, b.childNodeRules, true),
		overrideMode: b.overrideMode ?? a.overrideMode,
		overrides: mergeOverrides(a.overrides, b.overrides),
		extends: overrideOrMergeArray(
			a.extends == null ? undefined : Array.isArray(a.extends) ? a.extends : [a.extends],
			b.extends == null ? undefined : Array.isArray(b.extends) ? b.extends : [b.extends],
		),
	};
	if (deleteExtendsProp) {
		// @ts-ignore
		delete config.extends;
	}
	deleteUndefProp(config);
	return config;
}

export function mergeRule(a: Nullable<AnyRule>, b: AnyRule): AnyRule {
	const oA = optimizeRule(a);
	const oB = optimizeRule(b);

	// Particular behavior:
	// If the right-side value is false, return false.
	// In short; The `false` makes the rule to be disabled absolutely.
	if (oB === false || (!isRuleConfigValue(oB) && oB?.value === false)) {
		return false;
	}

	if (oA === undefined) {
		return isRuleConfigValue(oB) ? { value: oB } : (oB ?? {});
	}

	if (oB === undefined) {
		return oA;
	}

	if (isRuleConfigValue(oB)) {
		return { value: oB };
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
	if (!aDetails) {
		return bDetails;
	}
	if (!bDetails) {
		return aDetails;
	}
	const result = {} as Writable<PretenderDetails>;
	if (bDetails.files || aDetails.files) {
		result.files = bDetails.files ?? aDetails.files;
	}
	if (bDetails.data || aDetails.data) {
		result.data = [...(aDetails.data ?? []), ...(bDetails.data ?? [])];
	}
	return result;
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
	const res = { ...a, ...b };
	deleteUndefProp(res);
	return res;
}

function overrideOrMergeArray<T extends any>(
	a: Nullable<readonly T[]>,
	b: Nullable<readonly T[]>,
	shouldMerge = false,
	comparePropName?: string,
): readonly T[] | undefined {
	if (!b) {
		return a ?? undefined;
	}
	if (!shouldMerge) {
		return b;
	}

	const newArray: T[] = [];
	function merge(item: T) {
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
	a?.forEach(merge);
	// eslint-disable-next-line unicorn/no-array-for-each
	b?.forEach(merge);

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

function optimizeRule(rule: Nullable<AnyRule>): AnyRule | undefined {
	if (rule === undefined) {
		return;
	}
	if (isRuleConfigValue(rule)) {
		return rule;
	}
	return cleanOptions(rule);
}

function isReadonlyArray<T, X = unknown>(value: readonly T[] | X): value is ReadonlyArray<T> {
	return Array.isArray(value);
}
