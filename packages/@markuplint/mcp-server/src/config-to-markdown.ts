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
 */
const BUILTIN_RULES: Record<string, { description: string; category?: string }> = {
	'required-attr': {
		description: 'Warns if specified attributes or required attribute on specs are not appeared on an element.',
		category: 'validation',
	},
	'required-h1': {
		description: 'Warn if there is no h1 element in the document.',
		category: 'validation',
	},
	'wai-aria': {
		description: 'Warns against any use of inaccessible ARIA attributes.',
		category: 'accessibility',
	},
	'deprecated-attr': {
		description: 'Warns against any use of deprecated attributes.',
		category: 'validation',
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
