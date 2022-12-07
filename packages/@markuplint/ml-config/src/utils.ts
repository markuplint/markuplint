import type { AnyRule, AnyRuleV2, RuleConfig, RuleConfigV2, RuleConfigValue } from './types';

import { isPlainObject } from 'is-plain-object';
import mustache from 'mustache';

type PlainData =
	| string
	| number
	| boolean
	| null
	| undefined
	| PlainData[]
	| {
			[key: string]: PlainData;
	  };

/**
 * Return undefined if the template doesn't include the variable that is set as a property in data.
 * But return template string without changes if it doesn't have a variable.
 *
 * @param template Mustache template string
 * @param data Captured string for replacement
 */
export function provideValue(template: string, data: Record<string, string>) {
	const ast = mustache.parse(template);
	if (ast.length === 1 && ast[0][0] === 'text') {
		// It doesn't have a variable
		return template;
	}
	const noDataResult = mustache.render(template, {});
	const result = mustache.render(template, data);
	// Assume variables are empty in the template if it matched.
	if (noDataResult === result) {
		return;
	}
	return result;
}

export function exchangeValueOnRule(rule: AnyRule | AnyRuleV2, data: Record<string, string>): AnyRule | undefined {
	if (isRuleConfigValue(rule)) {
		return exchangeValue(rule, data);
	}
	let result = cleanOptions(rule);
	if (result.value != null) {
		result = {
			...result,
			value: exchangeValue(result.value, data),
		};
	}
	const options = extractOptions(result);
	if (options) {
		result = {
			...result,
			options: exchangeOption(options as PlainData, data),
		};
	}
	if (result.reason != null) {
		const exchangedValue = exchangeValue(result.reason, data);
		result = {
			...result,
			reason: exchangedValue ? `${exchangedValue}` : undefined,
		};
	}
	deleteUndefProp(result);
	return result;
}

export function cleanOptions(
	rule: RuleConfig<RuleConfigValue, unknown> | RuleConfigV2<RuleConfigValue, unknown>,
): RuleConfig<RuleConfigValue, unknown> {
	const res = {
		severity: rule.severity,
		value: rule.value,
		options: extractOptions(rule),
		reason: rule.reason,
	};
	deleteUndefProp(res);
	return res;
}

export function isRuleConfigValue(v: any): v is RuleConfigValue {
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

/**
 *
 * @param obj
 * @returns
 */
export function deleteUndefProp(obj: any) {
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
 * Return options from `options` or `option`
 *
 * @param rule
 * @returns
 */
function extractOptions(rule: RuleConfig<RuleConfigValue, unknown> | RuleConfigV2<RuleConfigValue, unknown>): unknown {
	if ('options' in rule && rule.options) {
		return rule.options;
	}
	if ('option' in rule && rule.option) {
		return rule.option;
	}
}

function exchangeValue(rule: RuleConfigValue, data: Record<string, string>): RuleConfigValue | undefined {
	if (rule == null) {
		return rule;
	}
	if (typeof rule === 'string') {
		return provideValue(rule, data);
	}
	if (Array.isArray(rule)) {
		const ruleArray = rule
			.map(val => {
				if (typeof val === 'string') {
					return provideValue(val, data);
				}
				return val;
			})
			.filter(item => item !== undefined);
		return ruleArray.length ? ruleArray : undefined;
	}
	return rule;
}

function exchangeOption(optionValue: PlainData, data: Record<string, string>): PlainData | undefined {
	if (optionValue == null) {
		return optionValue;
	}
	if (typeof optionValue === 'boolean' || typeof optionValue === 'number') {
		return optionValue;
	}
	if (typeof optionValue === 'string') {
		return provideValue(optionValue, data);
	}
	if (Array.isArray(optionValue)) {
		return optionValue.map(v => exchangeOption(v, data));
	}
	const result: Record<string, PlainData> = {};
	Object.keys(optionValue).forEach(key => {
		result[key] = exchangeOption(optionValue[key], data);
	});
	return result;
}
