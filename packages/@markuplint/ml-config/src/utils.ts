import type { AnyRule, RuleConfigValue } from './types';

import mustache from 'mustache';

export function toRegxp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
	if (matched) {
		return new RegExp(matched[1], matched[2]);
	}
	return pattern;
}

export function regexSelectorMatches(reg: string, raw: string, ignoreCase: boolean) {
	const res: Record<string, string> = {};
	const pattern = toRegxp(reg);
	const regex = new RegExp(pattern instanceof RegExp ? pattern : `^${pattern.trim()}$`, ignoreCase ? 'i' : undefined);
	const matched = regex.exec(raw);
	if (!matched) {
		return null;
	}
	matched.forEach((val, i) => (res[`$${i}`] = val));
	return {
		...res,
		...matched.groups,
	};
}

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

export function exchangeValueOnRule(rule: AnyRule, data: Record<string, string>): AnyRule | undefined {
	if (rule != null && typeof rule === 'object' && !Array.isArray(rule)) {
		if (rule.value != null) {
			rule = {
				...rule,
				value: exchangeValue(rule.value, data),
			};
		}
		if (rule.option) {
			rule = {
				...rule,
				option: exchangeOption(rule.option as PlainData, data),
			};
		}
		if (rule.reason != null) {
			const exchangedValue = exchangeValue(rule.reason, data);
			rule = {
				...rule,
				reason: exchangedValue ? `${exchangedValue}` : undefined,
			};
		}
		return rule;
	}
	return exchangeValue(rule, data);
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
