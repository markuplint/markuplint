import type { Rule, RuleConfigValue } from './types';
import mustache from 'mustache';

export function toRegxp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
	if (matched) {
		return new RegExp(matched[1], matched[2]);
	}
	return pattern;
}

export function regexSelectorMatches(reg: string, raw: string) {
	const res: Record<string, string> = {};
	const pattern = toRegxp(reg);
	const regex = pattern instanceof RegExp ? pattern : new RegExp(`^${pattern.trim()}$`);
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

export function exchangeValueOnRule(rule: Rule, data: Record<string, string>): Rule | undefined {
	if (rule != null && typeof rule === 'object' && !Array.isArray(rule)) {
		if ('value' in rule && rule.value != null) {
			return {
				...rule,
				value: exchangeValue(rule.value, data),
			};
		} else {
			return rule;
		}
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
