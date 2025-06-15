// Basic types for Markuplint configuration
export interface Config {
	readonly extends?: string | readonly string[];
	readonly rules?: Rules;
	readonly nodeRules?: readonly NodeRule[];
	readonly childNodeRules?: readonly ChildNodeRule[];
}

export interface Rules {
	readonly [ruleName: string]: any;
}

export interface NodeRule {
	readonly selector?: string;
	readonly rules?: Rules;
}

export interface ChildNodeRule {
	readonly selector?: string;
	readonly inheritance?: boolean;
	readonly rules?: Rules;
}

export interface RuleDescription {
	name: string;
	description: string;
	category?: string;
	enabled: boolean;
	value?: any;
}

/**
 * Built-in rule metadata mapping rule names to their descriptions and categories
 * Automatically extracted from @markuplint/rules package README files
 */
const BUILTIN_RULES: Record<string, { description: string; category?: string }> = {
	'attr-duplication': {
		description: 'Warns that attributes were duplicated in one element. Capital letters and lower-case letters are not distinguished.',
		category: 'validation',
	},
	'attr-value-quotes': {
		description: 'Warns if the attribute value is not quoted.',
		category: 'style',
	},
	'case-sensitive-attr-name': {
		description: 'Warns that the attribute name is not in one of uppercase or lowercase letters.',
		category: 'style',
	},
	'case-sensitive-tag-name': {
		description: 'Warns that the tag name is not in one of uppercase or lowercase letters.',
		category: 'style',
	},
	'character-reference': {
		description: 'Warns when unauthorized illegal characters are not escaped with character reference in the text node or attribute value.',
		category: 'style',
	},
	'class-naming': {
		description: 'Warn if the class name does not conform to the specified rules.',
		category: 'naming-convention',
	},
	'deprecated-attr': {
		description: 'Warns when there is an attribute defined as deprecated or obsolete.',
		category: 'validation',
	},
	'deprecated-element': {
		description: 'Warns when there is an element defined as deprecated or obsolete or non-standard.',
		category: 'validation',
	},
	'disallowed-element': {
		description: 'Warns if specified elements appear on a document or an element.',
		category: 'validation',
	},
	'doctype': {
		description: "Warns when doesn't including DOCTYPE.",
		category: 'validation',
	},
	'end-tag': {
		description: 'Warn if there is not an end tag.',
		category: 'style',
	},
	'heading-levels': {
		description: 'Warns for skipped  heading levels',
		category: 'validation',
	},
	'id-duplication': {
		description: 'Warns that id attribute value were duplicated in one document.',
		category: 'validation',
	},
	'ineffective-attr': {
		description: 'Warn that if the attribute specified cannot affect (in other words, mean-less) the element.',
		category: 'style',
	},
	'invalid-attr': {
		description: 'Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).',
		category: 'validation',
	},
	'label-has-control': {
		description: 'Warns if the label element has no control.',
		category: 'a11y',
	},
	'landmark-roles': {
		description: 'Whether banner, main, complementary and contentinfo are top-level landmarks. Whether a specific landmark roll has unique label when used multiple times on a page',
		category: 'a11y',
	},
	'neighbor-popovers': {
		description: 'Warns when popover triggers and their corresponding targets are not adjacent',
		category: 'a11y',
	},
	'no-ambiguous-navigable-target-names': {
		description: 'Prevents typographical errors in links and more that could inadvertently replace special navigational keywords (`_blank`, `_self`, `_parent`, `_top`) with invalid target names, ensuring navigations behave as intended.',
		category: 'a11y',
	},
	'no-boolean-attr-value': {
		description: 'Warn when it specified any value to the boolean attribute.',
		category: 'style',
	},
	'no-consecutive-br': {
		description: 'Warns against the use of consecutive `<br>` tags',
		category: 'a11y',
	},
	'no-default-value': {
		description: 'Warn when it specifies the default value to the attribute.',
		category: 'style',
	},
	'no-duplicate-dt': {
		description: 'No duplicate names in `<dl>`',
		category: 'validation',
	},
	'no-empty-palpable-content': {
		description: 'Warn if there is an empty palpable content element.',
		category: 'validation',
	},
	'no-hard-code-id': {
		description: 'Warn it hard-coded the value of the id attribute when the element is a fragment.',
		category: 'maintainability',
	},
	'no-orphaned-end-tag': {
		description: 'Warns when an end tag appears without a corresponding start tag, which constitutes an inner parse error in HTML Standard.',
		category: 'validation',
	},
	'no-refer-to-non-existent-id': {
		description: 'Check whether the ID or the list of ID specified to for, form, aria-*, and more, or a fragment in a hyperlink are referencing it that existed in the same document.',
		category: 'a11y',
	},
	'no-use-event-handler-attr': {
		description: 'Warn when specifying the event handler attribute.',
		category: 'maintainability',
	},
	'permitted-contents': {
		description: 'Warn if a child element has a not allowed element or text node.',
		category: 'validation',
	},
	'placeholder-label-option': {
		description: 'Checking whether the select element needs the placeholder label option.',
		category: 'validation',
	},
	'require-accessible-name': {
		description: 'Warn if the element has no accessible name.',
		category: 'a11y',
	},
	'require-datetime': {
		description: 'Warn to need the datetime attribute if the time element has invalid content.',
		category: 'validation',
	},
	'required-attr': {
		description: 'Warns if specified attributes or required attribute on specs are not appeared on an element.',
		category: 'validation',
	},
	'required-element': {
		description: 'Required elements',
		category: 'validation',
	},
	'required-h1': {
		description: 'Warn if there is no h1 element in the document.',
		category: 'a11y',
	},
	'table-row-column-alignment': {
		description: 'Checks for consistency in the defined number of rows and columns.',
		category: 'a11y',
	},
	'use-list': {
		description: 'Prompt to use list element when a bullet character is at the start of a text node.',
		category: 'a11y',
	},
	'wai-aria': {
		description: 'Warn if the role attribute and aria-* attributes don\'t set in accordance with specs that are WAI-ARIA and ARIA in HTML.',
		category: 'a11y',
	},
};

/**
 * Converts Markuplint configuration to markdown format
 */
export class ConfigToMarkdown {
	/**
	 * Convert a configuration object to markdown
	 */
	public static configToMarkdown(config: Config): string {
		const rules = config.rules || {};
		const ruleDescriptions = this.extractRuleDescriptions(rules);

		return this.generateMarkdown(ruleDescriptions);
	}

	/**
	 * Get detailed information about a specific rule
	 */
	public static getRuleDetails(ruleName: string): { name: string; description: string; category?: string } | null {
		const builtinRule = BUILTIN_RULES[ruleName];
		if (builtinRule) {
			return {
				name: ruleName,
				description: builtinRule.description,
				category: builtinRule.category,
			};
		}
		return null;
	}

	/**
	 * Get a list of all available built-in rules
	 */
	public static getAllBuiltinRules(): Array<{ name: string; description: string; category?: string }> {
		return Object.entries(BUILTIN_RULES).map(([name, rule]) => ({
			name,
			description: rule.description,
			category: rule.category,
		}));
	}

	/**
	 * Extract rule descriptions from the configuration
	 */
	private static extractRuleDescriptions(rules: Rules): RuleDescription[] {
		const descriptions: RuleDescription[] = [];

		for (const [ruleName, ruleConfig] of Object.entries(rules)) {
			const enabled = this.isRuleEnabled(ruleConfig);
			const value = this.extractRuleValue(ruleConfig);

			// Try to get description from built-in rules
			const builtinRule = BUILTIN_RULES[ruleName];
			const description = builtinRule?.description || `Rule: ${ruleName}`;
			const category = builtinRule?.category;

			descriptions.push({
				name: ruleName,
				description,
				category,
				enabled,
				value,
			});
		}

		return descriptions;
	}

	/**
	 * Check if a rule is enabled
	 */
	private static isRuleEnabled(ruleConfig: unknown): boolean {
		if (typeof ruleConfig === 'boolean') {
			return ruleConfig;
		}
		if (typeof ruleConfig === 'object' && ruleConfig !== null && 'severity' in ruleConfig) {
			return (ruleConfig as { severity: string }).severity !== 'off';
		}
		return true; // Default to enabled for non-boolean values
	}

	/**
	 * Extract the value configuration from a rule
	 */
	private static extractRuleValue(ruleConfig: unknown): unknown {
		if (typeof ruleConfig === 'object' && ruleConfig !== null && 'value' in ruleConfig) {
			return (ruleConfig as { value: unknown }).value;
		}
		if (typeof ruleConfig !== 'boolean' && typeof ruleConfig !== 'object') {
			return ruleConfig;
		}
		return undefined;
	}

	/**
	 * Generate markdown from rule descriptions
	 */
	private static generateMarkdown(rules: readonly RuleDescription[]): string {
		const enabledRules = rules.filter(rule => rule.enabled);
		const disabledRules = rules.filter(rule => !rule.enabled);

		let markdown = '# Markuplint Rules Configuration\n\n';

		if (enabledRules.length > 0) {
			markdown += '## Enabled Rules\n\n';
			for (const rule of enabledRules) {
				markdown += `- ✅ **${rule.name}**: ${rule.description}`;
				if (rule.value !== undefined) {
					markdown += ` (value: ${JSON.stringify(rule.value)})`;
				}
				markdown += '\n';
			}
			markdown += '\n';
		}

		if (disabledRules.length > 0) {
			markdown += '## Disabled Rules\n\n';
			for (const rule of disabledRules) {
				markdown += `- ❌ **${rule.name}**: ${rule.description}\n`;
			}
			markdown += '\n';
		}

		if (enabledRules.length === 0 && disabledRules.length === 0) {
			markdown += 'No rules configured.\n\n';
		}

		return markdown;
	}
}
