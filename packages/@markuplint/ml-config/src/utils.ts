import type {
	AnyRule,
	NamedRuleGroup,
	PlainData,
	PrimitiveScalar,
	RuleConfig,
	RuleConfigValue,
	Severity,
} from './types.js';

// @ts-ignore
import { isPlainObject } from 'is-plain-object';
import mustache from 'mustache';

/**
 * Renders a Mustache template with the provided data.
 *
 * Returns `undefined` if the template contains variables but none of them
 * are present in `data`. Returns the template unchanged if it has no variables.
 *
 * @param template - A Mustache template string with `{{variable}}` placeholders
 * @param data - Key-value pairs for template variable replacement
 * @returns The rendered string, or `undefined` if no matching variables were found
 */
export function provideValue(template: string, data: Readonly<Record<string, string>>) {
	const ast = mustache.parse(template);
	if (ast.length === 1 && ast[0]?.[0] === 'text') {
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

/**
 * Applies Mustache template rendering to all string values within a rule configuration,
 * including the rule's value, options, and reason fields.
 *
 * @param rule - The rule configuration containing potential template strings
 * @param data - Key-value pairs for template variable replacement
 * @returns The rule with all template strings rendered, or `undefined` if rendering fails
 */
export function exchangeValueOnRule(rule: AnyRule, data: Readonly<Record<string, string>>): AnyRule | undefined {
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
	const options = result.options;
	if (options != null && options !== '' && options !== 0) {
		const newOptions = exchangeOption(options, data);
		result = {
			...result,
			...(newOptions == null
				? undefined
				: {
						options: newOptions,
					}),
		};
	}
	if (result.reason != null) {
		const exchangedValue = exchangeValue(result.reason, data);
		result = {
			...result,
			reason: exchangedValue == null ? undefined : `${exchangedValue}`,
		};
	}
	deleteUndefProp(result);
	return result;
}

/**
 * Normalizes a rule configuration by extracting the standard fields
 * (`severity`, `value`, `options`, `reason`, `reasonOnly`) and removing `undefined` properties.
 *
 * @param rule - The rule configuration to normalize
 * @returns A clean rule configuration with only defined properties
 */
export function cleanOptions(rule: RuleConfig<RuleConfigValue, PlainData>): RuleConfig<RuleConfigValue, PlainData> {
	const res = {
		severity: rule.severity,
		value: rule.value,
		options: rule.options,
		reason: rule.reason,
		reasonOnly: rule.reasonOnly,
	};
	deleteUndefProp(res);
	return res;
}

/**
 * Type guard that checks whether a value is a {@link NamedRuleGroup}.
 * A NamedRuleGroup is an object with a `rules` property (and optionally `specConformance` and `severity`).
 *
 * @param v - The value to check
 * @returns `true` if `v` is a named rule group
 */
export function isNamedRuleGroup(v: unknown): v is NamedRuleGroup {
	return (
		v != null &&
		typeof v === 'object' &&
		!Array.isArray(v) &&
		'rules' in v &&
		(v as Record<string, unknown>).rules != null &&
		typeof (v as Record<string, unknown>).rules === 'object' &&
		!Array.isArray((v as Record<string, unknown>).rules)
	);
}

/**
 * Type guard that checks whether a string is a valid {@link Severity} value.
 *
 * @param v - The string to check
 * @returns `true` if `v` is "error", "warning", or "info"
 */
export function isSeverity(v: string): v is Severity {
	return v === 'error' || v === 'warning' || v === 'info';
}

/**
 * Type guard that checks whether a value is a {@link RuleConfigValue}
 * (i.e. a primitive, `null`, or an array) rather than a full {@link RuleConfig} object.
 *
 * @param v - The value to check
 * @returns `true` if `v` is a rule config value (string, number, boolean, null, or array)
 */
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
 * Removes all properties with `undefined` values from a plain object in-place.
 * Has no effect on non-plain-object values.
 *
 * @param obj - The object to clean up
 */
export function deleteUndefProp(obj: any) {
	if (!isPlainObject(obj)) {
		return;
	}
	for (const key of Object.keys(obj)) {
		if (obj[key] === undefined) {
			delete obj[key];
		}
	}
}

function exchangeValue(rule: RuleConfigValue, data: Readonly<Record<string, string>>): RuleConfigValue | undefined {
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
			.filter((item): item is PrimitiveScalar => item !== undefined);
		return ruleArray.length > 0 ? ruleArray : undefined;
	}
	return rule;
}

function exchangeOption(optionValue: PlainData, data: Readonly<Record<string, string>>): PlainData | undefined {
	if (optionValue == null) {
		return optionValue;
	}
	if (typeof optionValue === 'boolean' || typeof optionValue === 'number') {
		return optionValue;
	}
	if (typeof optionValue === 'string') {
		return provideValue(optionValue, data);
	}
	if (isArray<PlainData>(optionValue)) {
		return optionValue.map(v => exchangeOption(v, data));
	}
	const result: Record<string, PlainData> = {};
	for (const key of Object.keys(optionValue)) {
		result[key] = exchangeOption(optionValue[key], data);
	}
	return result;
}

/**
 * `Array.isArray` narrows to `any[]` for `ReadonlyArray<T>`.
 *
 * @see https://github.com/microsoft/TypeScript/issues/17002
 */
function isArray<T>(value: any): value is T[] | readonly T[] {
	return Array.isArray(value);
}
