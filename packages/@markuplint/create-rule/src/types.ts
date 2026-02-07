/**
 * Parameters for the create-rule helper, combining creator params with a purpose selection.
 */
export type CreateRuleHelperParams = CreateRuleCreatorParams & {
	readonly purpose: CreateRulePurpose;
};

/**
 * Parameters required for scaffolding a new markuplint rule.
 */
export type CreateRuleCreatorParams = {
	/** The name of the plugin that will contain the rule. */
	readonly pluginName: string;
	/** The name of the rule to create. */
	readonly ruleName: string;
	/** The programming language for the rule implementation. */
	readonly lang: CreateRuleLanguage;
	/** Whether to generate test files alongside the rule. */
	readonly needTest: boolean;
	/** Additional parameters required when contributing to core rules. */
	readonly core?: CreateRuleCreatorCoreParams;
};

/**
 * Additional parameters specific to contributing a rule to the markuplint core.
 */
export type CreateRuleCreatorCoreParams = {
	/** A human-readable description of what the rule checks. */
	readonly description: string;
	/** The rule category (e.g., "validation", "a11y", "style"). */
	readonly category: string;
	/** The default severity level for rule violations. */
	readonly severity: string;
};

/**
 * The result returned after scaffolding a new rule, containing generated files and dependency information.
 */
export type CreateRuleHelperResult = {
	/** The list of files that were generated. */
	readonly files: readonly File[];
	/** Runtime dependencies to install. */
	readonly dependencies: readonly string[];
	/** Development dependencies to install. */
	readonly devDependencies: readonly string[];
};

/**
 * The programming language used for the rule implementation.
 */
export type CreateRuleLanguage = 'JAVASCRIPT' | 'TYPESCRIPT';

/**
 * The intended purpose for creating a rule, which determines the scaffolding strategy.
 *
 * - `ADD_TO_PROJECT` - Add the rule directly to the current project.
 * - `PUBLISH_AS_PACKAGE` - Create a standalone publishable npm package.
 * - `CONTRIBUTE_TO_CORE` - Add the rule to the markuplint core rules.
 */
export type CreateRulePurpose = 'ADD_TO_PROJECT' | 'PUBLISH_AS_PACKAGE' | 'CONTRIBUTE_TO_CORE';

/**
 * Metadata describing a generated file in the scaffold output.
 */
export type File = {
	/** The file extension (e.g., ".ts", ".js", ".json"). */
	readonly ext: string;
	/** The base name of the file without extension or test suffix. */
	readonly name: string;
	/** The full file name including test suffix if applicable, but without extension. */
	readonly fileName: string;
	/** Whether this file is a test file. */
	readonly test: boolean;
	/** The destination directory where the file is written. */
	readonly destDir: string;
	/** The absolute path to the source file in the scaffold. */
	readonly filePath: string;
};
