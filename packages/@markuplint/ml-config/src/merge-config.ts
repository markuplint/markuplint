import { Config, Nullable, Rule, RuleConfigValue, Rules, SpecConfig, SpecConfig_v1 } from './types';
import deepmerge from 'deepmerge';
import { isPlainObject } from 'is-plain-object';

export function mergeConfig(a: Config, b: Config): Config {
	const config: Config = {
		...a,
		...b,
		parser: mergeObject(a.parser, b.parser),
		parserOptions: mergeObject(a.parserOptions, b.parserOptions),
		specs:
			// v3
			// mergeObject(a.specs, b.specs),
			// v2
			mergeSpecs(a.specs, b.specs),
		importRules: concatArrayUniquely(a.importRules, b.importRules),
		excludeFiles: concatArrayUniquely(a.excludeFiles, b.excludeFiles),
		rules: mergeRules(
			// TODO: Deep merge
			a.rules,
			b.rules,
		),
		nodeRules: concatArray(a.nodeRules, b.nodeRules),
		childNodeRules: concatArray(a.childNodeRules, b.childNodeRules),
		// delete all
		extends: undefined,
	};
	deleteUndefProp(config);
	return config;
}

function mergeObject<T>(a: Nullable<T>, b: Nullable<T>): T | undefined {
	if (a == null) {
		return b || undefined;
	}
	if (b == null) {
		return a || undefined;
	}
	const res = deepmerge<T>(a, b);
	deleteUndefProp(res);
	return res;
}

function concatArray<T>(a: Nullable<T[]>, b: Nullable<T[]>): T[] | undefined {
	const res = [...(a || []), ...(b || [])];
	return res.length === 0 ? undefined : res;
}

function concatArrayUniquely<T>(a: Nullable<T[]>, b: Nullable<T[]>): T[] | undefined {
	const concated = concatArray(a, b);
	if (!concated) {
		return;
	}
	const res = Array.from(new Set(concated));
	return res.length === 0 ? undefined : res;
}

function mergeRules(a: Nullable<Rules>, b: Nullable<Rules>): Rules | undefined {
	if (!a) {
		return b || undefined;
	}
	if (!b) {
		return a || undefined;
	}
	const res = { ...a };
	for (const [key, rule] of Object.entries(b)) {
		const merged = mergeRule(res[key], rule);
		if (merged) {
			res[key] = merged;
		}
	}
	deleteUndefProp(res);
	return res;
}

function mergeRule(a: Nullable<Rule>, b: Rule): Rule {
	if (a === undefined) {
		return b;
	}
	if (isRuleConfigValue(b)) {
		if (isRuleConfigValue(a)) {
			if (Array.isArray(a) && Array.isArray(b)) {
				return [...a, ...b];
			}
			return b;
		}
		const value = Array.isArray(a.value) && Array.isArray(b) ? [...a.value, b] : b;
		const res = {
			...a,
			value,
		};
		deleteUndefProp(res);
		return res;
	}
	const severity = b.severity || (!isRuleConfigValue(a) ? a.severity : undefined);
	const value = b.value || (isRuleConfigValue(a) ? a : a.value);
	const option = mergeObject(!isRuleConfigValue(a) ? a.option : undefined, b.option);
	const res = {
		severity,
		value,
		option,
	};
	deleteUndefProp(res);
	return res;
}

function isRuleConfigValue(v: any): v is RuleConfigValue {
	switch (typeof v) {
		case 'string':
		case 'number':
		case 'boolean': {
			return true;
		}
	}
	if (v === null) {
		return true;
	}
	return Array.isArray(v);
}

function deleteUndefProp(obj: any) {
	if (!isPlainObject(obj)) {
		return;
	}
	for (const key in obj) {
		if (obj[key] === undefined) {
			delete obj[key];
		}
	}
}

/**
 * @deprecated
 * @param a
 * @param b
 * @returns
 */
function mergeSpecs(
	a: Nullable<SpecConfig | SpecConfig_v1>,
	b: Nullable<SpecConfig | SpecConfig_v1>,
): SpecConfig | undefined {
	return mergeObject(convertSpec_v1_to_v2(a), convertSpec_v1_to_v2(b));
}

/**
 * @deprecated
 * @param spec
 * @returns
 */
function convertSpec_v1_to_v2(spec: Nullable<SpecConfig | SpecConfig_v1>): SpecConfig | undefined {
	if (spec == null) {
		return;
	}
	if (typeof spec === 'string') {
		return { '/.+/': spec };
	}
	if (Array.isArray(spec)) {
		if (spec.length === 0) {
			return {};
		} else if (spec.length === 1) {
			return { '/.+/': spec[0] };
		}
		const res: SpecConfig = {};
		for (const item of spec) {
			switch (item) {
				case '@markuplint/vue-spec': {
					res['/\\.vue$/i'] = item;
					break;
				}
				case '@markuplint/react-spec': {
					res['/\\.[jt]sx?$/i'] = item;
					break;
				}
				default: {
					res['/.+/'] = item;
				}
			}
		}
		deleteUndefProp(res);
		return res;
	}
	return spec;
}
