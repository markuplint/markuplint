import type { ConfigSet } from '@markuplint/file-resolver';
import type { LocaleSet } from '@markuplint/i18n';
import type { Config, SeverityOptions, Violation } from '@markuplint/ml-config';
import type { AnyMLRule, FixSummary, MLSchema, Ruleset } from '@markuplint/ml-core';

/**
 * Options for the markuplint API, controlling configuration, locale, rules, and behavior.
 */
export type APIOptions = {
	/**
	 * The configuration file to use; the search for one is skipped. Resolved as a value of
	 * `extends` is: a module name is loaded as such, and a relative path is based on the working
	 * directory, as a relative path in `config` and `defaultConfig` is.
	 */
	readonly configFile?: string;
	readonly config?: Config;
	readonly defaultConfig?: Config;
	readonly noSearchConfig?: boolean;
	readonly locale?: string;
	readonly fix?: boolean;
	/** When true, compute fixes without writing files (CLI dry-run mode). */
	readonly fixDryRun?: boolean;
	readonly ignoreExt?: boolean;
	/**
	 * Evaluates no rule, on either engine. The rules the config sets are not read, so none is
	 * reported as not found or as deprecated; what is not about a rule (a parse error, a config
	 * that cannot be loaded) is reported as usual. For a caller that reads the document and not the
	 * verdict (`markuplint --search`).
	 *
	 * @internal
	 */
	readonly noRules?: boolean;
	readonly severity?: SeverityOptions;
	/**
	 * [Experimental] Use the Rust linting engine for built-in rules.
	 * The files of framework parsers are parsed in TypeScript and the result is handed to the Rust
	 * engine. Falls back to the TypeScript engine when the native addon is missing. A fallback is
	 * written to stderr once for an engine, and emitted every time as a `log` event of the phase
	 * `experimental-rust-core:fallback`.
	 */
	readonly experimentalRustCore?: boolean;
};

/**
 * Event map for the {@link MLEngine}, defining all emitted events and their payload types.
 */
export type MLEngineEventMap = {
	log: [phase: string, message: string];
	config: [filePath: string, config: ConfigSet, message?: string];
	exclude: [filePath: string, setting: string, message?: string];
	parser: [filePath: string, parser: string, message?: string];
	ruleset: [filePath: string, ruleset: Ruleset, message?: string];
	schemas: [filePath: string, schemas: MLSchema, message?: string];
	rules: [filePath: string, rules: readonly Readonly<AnyMLRule>[], message?: string];
	i18n: [filePath: string, locale: LocaleSet, message?: string];
	code: [filePath: string, sourceCode: string, message?: string];
	lint: [
		filePath: string,
		sourceCode: string,
		violations: readonly Violation[],
		fixedCode: string,
		/**
		 * The AST mapping dump. It is built only when the engine's `debug`
		 * option is on and a `lint` listener is registered at the time the
		 * engine emits, because the dump costs a full walk of the document
		 * that nobody reads unless debugging was requested. Otherwise, or when
		 * the engine has no parsed document, it is `null`.
		 */
		debug: readonly string[] | null,
		fixSummary: FixSummary | null,
	];
	'lint-error': [filePath: string, sourceCode: string, error: Readonly<Error>];
	'config-errors': [filePath: string, errors: readonly Readonly<Error>[]];
};
