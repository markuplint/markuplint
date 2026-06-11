import type { APIOptions, MLEngineEventMap } from './types.js';
import type { MLResultInfo } from '../types.js';
import type { ConfigSet, MLFile, Target } from '@markuplint/file-resolver';
import type { PlainData, Violation } from '@markuplint/ml-config';
import type { Ruleset, Plugin, Document, RuleConfigValue, MLFabric } from '@markuplint/ml-core';

import {
	ConfigProvider,
	resolveFiles,
	resolveParser,
	resolvePretenders,
	resolveRules,
	resolveSpecs,
} from '@markuplint/file-resolver';
import { mergeConfig } from '@markuplint/ml-config';
import { MLCore, convertRuleset } from '@markuplint/ml-core';
import { isFatalError } from '@markuplint/shared';
import { FSWatcher } from 'chokidar';
import { Emitter } from 'strict-event-emitter';

import { log as coreLog, verbosely } from '../debug.js';
import { i18n } from '../i18n.js';

const log = coreLog.extend('ml-engine');
const fileLog = log.extend('file');
const configLog = log.extend('config');

type MLEngineOptions = {
	readonly debug?: boolean;
	readonly watch?: boolean;
};

/**
 * Options for creating an {@link MLEngine} from inline source code.
 */
export type FromCodeOptions = APIOptions &
	MLEngineOptions & {
		/** Optional filename for the inline source code */
		readonly name?: string;
		/** Optional working directory for config resolution */
		readonly dirname?: string;
	};

/**
 * The main markuplint engine that orchestrates file resolution, configuration loading,
 * parsing, and linting. Supports both single-file and watch-mode operation.
 *
 * Emits events at each stage of the linting pipeline for monitoring and debugging.
 */
export class MLEngine extends Emitter<MLEngineEventMap> {
	/**
	 * Creates an MLEngine instance from inline source code.
	 *
	 * @param sourceCode - The markup source code to lint
	 * @param options - Options for configuration, naming, and behavior
	 * @returns A new MLEngine instance ready to lint the provided code
	 */
	static async fromCode(sourceCode: string, options?: FromCodeOptions) {
		if (options?.debug) {
			verbosely();
		}
		log('[fromCode] Creates: %O', options);

		const file = await MLEngine.toMLFile({
			sourceCode,
			name: options?.name,
			workspace: options?.dirname,
		});

		if (!file) {
			throw new Error('Never reach error');
		}

		log('[fromCode] Created file: %s', file.path);
		const engine = new MLEngine(file, options);
		return engine;
	}

	/**
	 * Converts a target (file path or inline source) into an MLFile instance.
	 *
	 * @param target - A file path string or inline source code target
	 * @returns The resolved MLFile, or `undefined` if resolution failed
	 */
	static async toMLFile(target: Target) {
		const files = await resolveFiles([target]);
		return files[0];
	}

	#configProvider: ConfigProvider;
	#core: MLCore | null = null;
	#file: Readonly<MLFile>;
	/** Whether any plugin provides custom rules. Updated by #provide() on every exec(). */
	#hasPluginRules = false;
	#options?: APIOptions & MLEngineOptions;
	/** The resolved parser module name. Updated by #provide() on every exec(). */
	#parserModName = '@markuplint/html-parser';
	#watcher = new FSWatcher();

	constructor(file: Readonly<MLFile>, options?: APIOptions & MLEngineOptions) {
		super();

		if (this.#options?.debug) {
			verbosely();
		}

		this.#file = file;
		this.#options = options;
		this.#configProvider = new ConfigProvider();
		this.watchMode(!!this.#options?.watch);

		log('[MLEngine] Initialized: %s', this.#file.path);
	}

	/**
	 * The parsed document, or `null` if not yet set up or if parsing failed.
	 */
	get document(): Document<RuleConfigValue, PlainData> | null {
		if (this.#core?.document instanceof Error) {
			return null;
		}
		return this.#core?.document ?? null;
	}

	/**
	 * Closes the engine, removing all event listeners and stopping the file watcher.
	 */
	async close() {
		this.removeAllListeners();
		await this.#watcher.close();
	}

	/**
	 * Executes linting on the target file and returns the results.
	 *
	 * Sets up the engine on first call, then verifies the document against all rules.
	 *
	 * @returns The lint result including violations and fixed code, or `null` if setup was skipped
	 */
	async exec(): Promise<MLResultInfo | null> {
		log('exec: start');

		// Rust path: resolve fabric first, then decide whether to use Rust or TS
		if (this.#options?.experimentalRustCore) {
			const fabric = await this.#provideFabric();
			if (!fabric) {
				log('exec: cancel (unsetuped yet)');
				return null;
			}

			const rustResult = await this.#tryExecRustPath(fabric);
			if (rustResult) {
				log('exec: end (rust path)');
				return rustResult;
			}

			// Fall through to TS path — core will be created below
			const core = await this.#createCore(fabric);
			this.#core = core;
			return this.#execWithCore(core);
		}

		// TS path (default)
		const core = await this.#setup();

		if (!core) {
			log('exec: cancel (unsetuped yet)');
			return null;
		}

		return this.#execWithCore(core);
	}

	/**
	 * Executes linting using MLCore (TypeScript engine).
	 */
	async #execWithCore(core: MLCore): Promise<MLResultInfo> {
		const verifyResult = await core.verify({ fix: this.#options?.fix ?? false }).catch(error => {
			if (isFatalError(error)) {
				throw error;
			}
			if (error instanceof Error) {
				return error;
			}
			throw error;
		});

		const sourceCode = await this.#file.getCode();

		if (verifyResult instanceof Error) {
			this.emit('lint-error', this.#file.path, sourceCode, verifyResult);
			// Accessing `.stack` can throw in Deno when source map resolution
			// encounters invalid mappings (e.g., negative column values).
			let errMessage: string;
			try {
				errMessage = verifyResult.stack ?? verifyResult.message;
			} catch {
				errMessage = verifyResult.message;
			}
			log('exec: error %O', errMessage);
			return {
				violations: [
					{
						severity: 'error',
						message: errMessage,
						ruleId: '@markuplint/ml-core',
						line: 0,
						col: 0,
						raw: '',
					},
				],
				filePath: this.#file.path,
				sourceCode,
				fixedCode: sourceCode,
				status: 'processed',
			};
		}

		const { violations, fixedCode, fixSummary } = verifyResult;
		const debugMap = 'debugMap' in core.document ? core.document.debugMap() : null;

		const resolvedFixedCode = fixedCode ?? sourceCode;
		this.emit('lint', this.#file.path, sourceCode, violations, resolvedFixedCode, debugMap, fixSummary ?? null);
		log('exec: end');
		return {
			violations: [...violations],
			filePath: this.#file.path,
			sourceCode,
			fixedCode: resolvedFixedCode,
			status: 'processed',
			fixSummary,
		};
	}

	/**
	 * Attempts to execute linting via the Rust NAPI engine.
	 * Returns `null` if the file is not eligible (framework parser, custom rules, fix mode),
	 * in which case the caller should fall back to the TS engine.
	 */
	async #tryExecRustPath(fabric: MLFabric): Promise<MLResultInfo | null> {
		const fix = this.#options?.fix ?? this.#options?.fixDryRun ?? false;

		// Fallback: fix mode not supported in Rust
		if (fix) {
			process.stderr.write(
				`⚠ [experimental-rust-core] "${this.#file.path}" uses --fix — falling back to TypeScript engine.\n`,
			);
			return null;
		}

		// Fallback: framework parser
		if (this.#parserModName !== '@markuplint/html-parser') {
			process.stderr.write(
				`⚠ [experimental-rust-core] "${this.#file.path}" uses a framework parser (${this.#parserModName}) — falling back to TypeScript engine.\n`,
			);
			return null;
		}

		// Fallback: custom rules from plugins
		if (this.#hasPluginRules) {
			process.stderr.write(
				`⚠ [experimental-rust-core] "${this.#file.path}" has custom plugin rules — falling back to TypeScript engine.\n`,
			);
			return null;
		}

		// Load NAPI binding
		let lintHtml: (html: string, configJson: string, specJson: string) => NapiViolation[];
		try {
			const napi = await loadNapiBinding();
			lintHtml = napi.lintHtml;
		} catch (error) {
			if (isFatalError(error)) {
				throw error;
			}
			process.stderr.write(
				'⚠ [experimental-rust-core] NAPI binary not found — falling back to TypeScript engine.\n',
			);
			return null;
		}

		const sourceCode = await this.#file.getCode();

		// Build config JSON for Rust
		const configJson = buildRustConfigJson(fabric.ruleset);
		const specJson = JSON.stringify(fabric.schemas[0]);

		log('exec: rust path lintHtml');

		let napiViolations: NapiViolation[];
		try {
			napiViolations = lintHtml(sourceCode, configJson, specJson);
		} catch (error) {
			if (isFatalError(error)) {
				throw error;
			}
			// NAPI errors (config/spec parse failures) — report as lint error
			const message = error instanceof Error ? error.message : String(error);
			this.emit('lint-error', this.#file.path, sourceCode, new Error(message));
			return {
				violations: [
					{
						severity: 'error',
						message,
						ruleId: '@markuplint/core',
						line: 0,
						col: 0,
						raw: '',
					},
				],
				filePath: this.#file.path,
				sourceCode,
				fixedCode: sourceCode,
				status: 'processed',
			};
		}

		// Convert NapiViolation[] → Violation[]
		const violations: Violation[] = napiViolations.map(v => ({
			ruleId: v.ruleId,
			name: v.name ?? undefined,
			severity: v.severity as Violation['severity'],
			message: v.message,
			line: v.line,
			col: v.col,
			raw: v.raw,
		}));

		this.emit('lint', this.#file.path, sourceCode, violations, sourceCode, null, null);
		return {
			violations,
			filePath: this.#file.path,
			sourceCode,
			fixedCode: sourceCode,
			status: 'processed',
		};
	}

	/**
	 * Resolves fabric and emits config-errors, but does NOT create MLCore.
	 * Used by the Rust path to get config/specs without the overhead of TS DOM construction.
	 */
	async #provideFabric(): Promise<MLFabric | null> {
		const fabric = await this.#provide();
		if (!fabric) {
			return null;
		}
		if (fabric.configErrors) {
			this.emit('config-errors', this.#file.path, fabric.configErrors);
		}
		return fabric;
	}

	/**
	 * Updates the source code and re-parses the document without re-resolving configuration.
	 *
	 * @param code - The new markup source code
	 */
	async setCode(code: string) {
		const core = await this.#setup();

		if (!core) {
			return;
		}

		this.#file.setCode(code);
		core.setCode(code);
	}

	/**
	 * Enables or disables watch mode. When enabled, the engine watches config files
	 * for changes and re-lints automatically.
	 *
	 * @param enable - Whether to enable watch mode
	 */
	watchMode(enable: boolean) {
		this.#options = {
			...this.#options,
			watch: enable,
		};

		if (enable) {
			this.#watcher.on('change', this.#onChange.bind(this));
		} else {
			this.#watcher.removeAllListeners();
		}
	}

	async #createCore(fabric: MLFabric) {
		fileLog('Get source code');
		const sourceCode = await this.#file.getCode();
		fileLog('Source code path: %s', this.#file.path);
		// cspell: disable-next-line
		fileLog('Source code size: %dbyte', sourceCode.length);
		this.emit('code', this.#file.path, sourceCode);

		const core = new MLCore({
			sourceCode,
			filename: this.#file.path,
			debug: this.#options?.debug,
			...fabric,
		});

		this.#core = core;
		return core;
	}

	async #onChange(filePath: string) {
		if (!this.#options?.watch) {
			return;
		}

		this.emit('log', 'watch:onChange', filePath);

		const fabric = await this.#provide(false);

		if (!fabric) {
			return;
		}

		if (fabric.configErrors) {
			this.emit('config-errors', this.#file.path, fabric.configErrors);
		}

		this.emit('log', 'update:core', this.#file.path);
		this.#core?.update(fabric);
		await this.exec();
	}

	async #provide(cache = true): Promise<MLFabric | null> {
		let configSet: ConfigSet;

		try {
			configSet = await this.resolveConfig(cache);
		} catch (error: unknown) {
			if (error instanceof Error) {
				configSet = {
					config: {},
					plugins: [],
					files: new Set(),
					errs: [error],
				};
			} else {
				throw error;
			}
		}

		fileLog('Fetched Config files: %O', configSet.files);
		fileLog('Resolved Config: %O', configSet.config);
		fileLog('Resolved Plugins: %O', configSet.plugins);
		fileLog('Resolve Errors: %O', configSet.errs);

		if (!(await this.#file.isFile())) {
			this.emit('log', 'file-no-exists', `The file doesn't exist or it is not a file: ${this.#file.path}`);
			fileLog("The file doesn't exist or it is not a file: %s", this.#file.path);
			return null;
		}

		// Exclude
		const excludeFiles = configSet.config.excludeFiles ?? [];
		if (this.#file.ignored(excludeFiles)) {
			fileLog('Excludes the file: %s', this.#file.path);
			return null;
		}

		const { parser, parserOptions, matched, parserModName } = await this.#resolveParser(configSet);
		this.#parserModName = parserModName;
		const checkingExt = !this.#options?.ignoreExt;

		if (checkingExt && !matched) {
			this.emit(
				'log',
				'ext-unmatched',
				`Avoided linting because a file is unmatched by the extension: ${this.#file.path}`,
			);
			fileLog('Avoided linting because a file is unmatched by the extension: %s', this.#file.path);
			return null;
		}

		const severity = {
			...configSet.config.severity,
			...this.#options?.severity,
		};

		const pretenders = await this.#resolvePretenders(configSet);
		fileLog('Resolved pretenders: %O', pretenders);

		const ruleset = this.#resolveRuleset(configSet);
		fileLog('Resolved ruleset: %O', ruleset);

		const schemas = await this.#resolveSchemas(configSet);
		if (fileLog.enabled) {
			if (schemas[0].cites.length > 0) {
				const [, ...additionalSpecs] = schemas;
				fileLog('Resolved schemas: HTML Standard');
				for (const additionalSpec of additionalSpecs) {
					fileLog('Resolved schemas: %O', additionalSpec);
				}
			} else {
				fileLog('Resolved schemas: %O', schemas);
			}
		}

		const rules = await this.#resolveRules(configSet.plugins, ruleset);
		this.#hasPluginRules = configSet.plugins.some(p => p.rules && Object.keys(p.rules).length > 0);
		fileLog('Resolved rules: %O', rules);

		const locale = i18n(this.#options?.locale);

		const ruleCommonSettings = configSet.config.ruleCommonSettings ?? {};

		if (fileLog.enabled) {
			fileLog(
				'Loaded %d rules: %O',
				rules.length,
				rules.map(r => r.name),
			);
		}

		return {
			parser,
			parserOptions,
			severity,
			pretenders,
			ruleset,
			schemas,
			rules,
			locale,
			ruleCommonSettings,
			configErrors: configSet.errs,
		};
	}

	/**
	 * Resolves the configuration set for the target file.
	 *
	 * Public — unlike the other resolution steps, which are private —
	 * because the CLI's `--show-config` needs the computed configuration
	 * without running a lint.
	 *
	 * Precedence contract (highest first): the inline `config` option,
	 * then the explicit `configFile` path, then auto-discovered config files
	 * (search is skipped when `noSearchConfig` or `configFile` is set),
	 * then `defaultConfig`. `markuplint:recommended` applies only when none
	 * of these are provided.
	 *
	 * @param cache - Whether to reuse previously loaded config files
	 * @returns The resolved configuration set
	 */
	async resolveConfig(cache: boolean) {
		this.emit('log', 'resolveConfig', JSON.stringify(this.#configProvider, null, 2));
		configLog('configProvider: %s', this.#configProvider);

		const defaultConfigKey =
			this.#options?.defaultConfig && this.#configProvider.set(mergeConfig(this.#options?.defaultConfig));
		configLog('defaultConfigKey: %s', defaultConfigKey ?? 'N/A');
		this.emit('log', 'defaultConfigKey', defaultConfigKey ?? 'N/A');

		const targetConfig = await this.#configProvider.search(this.#file);
		this.emit('log', 'targetConfig', targetConfig ?? 'N/A');

		const configFilePathsFromTarget =
			this.#options?.noSearchConfig || this.#options?.configFile
				? (defaultConfigKey ?? null)
				: (targetConfig ?? defaultConfigKey);
		configLog('configFilePathsFromTarget: %s', configFilePathsFromTarget ?? 'N/A');
		this.emit('log', 'configFilePathsFromTarget', configFilePathsFromTarget ?? 'N/A');

		const configKey = this.#options?.config && this.#configProvider.set(mergeConfig(this.#options.config));
		configLog('option.config: %s', configKey ?? 'N/A');
		this.emit('log', 'option.config', configFilePathsFromTarget ?? 'N/A');

		let defaultRecommended: string | null = null;
		if (!defaultConfigKey && !configFilePathsFromTarget && !configKey && !this.#options?.configFile) {
			// No configured
			// Default: set recommended
			defaultRecommended = this.#configProvider.set({ extends: ['markuplint:recommended'] });
		}
		configLog('defaultRecommended: %s', defaultRecommended ?? 'N/A');
		this.emit('log', 'defaultRecommended', defaultRecommended ?? 'N/A');

		const configSet = await this.#configProvider.resolve(
			this.#file,
			[configFilePathsFromTarget, this.#options?.configFile, configKey, defaultRecommended],
			cache,
		);
		this.emit('config', this.#file.path, configSet);

		if (this.#options?.watch) {
			// It doesn't watch the main HTML file because it may is watched and managed by a language server or text editor or more.
			this.#watcher.add([...configSet.files]);
		}

		return configSet;
	}

	async #resolveParser(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		configSet: ConfigSet,
	) {
		const parser = await resolveParser(this.#file, configSet.config.parser, configSet.config.parserOptions);
		this.emit('parser', this.#file.path, parser.parserModName);
		fileLog('Fetched Parser module: %s', parser.parserModName);
		return parser;
	}

	async #resolvePretenders(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		configSet: ConfigSet,
	) {
		const pretenders = await resolvePretenders(configSet.config.pretenders);
		fileLog('Resolved pretenders: %O', pretenders);
		return pretenders;
	}

	async #resolveRules(plugins: readonly Plugin[], ruleset: Ruleset) {
		const rules = await resolveRules(plugins, ruleset, this.#options?.importPresetRules ?? true);

		if (this.#options?.rules) {
			rules.push(...this.#options.rules);
		}
		this.emit('rules', this.#file.path, rules);
		return rules;
	}

	#resolveRuleset(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		configSet: ConfigSet,
	) {
		const ruleset = convertRuleset(configSet.config);
		this.emit('ruleset', this.#file.path, ruleset);
		return ruleset;
	}

	async #resolveSchemas(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		configSet: ConfigSet,
	) {
		const { schemas } = await resolveSpecs(this.#file.path, configSet.config.specs);
		this.emit('schemas', this.#file.path, schemas);
		return schemas;
	}

	async #setup() {
		if (this.#core) {
			return this.#core;
		}
		const fabric = await this.#provide();

		if (!fabric) {
			return null;
		}

		if (fabric.configErrors) {
			this.emit('config-errors', this.#file.path, fabric.configErrors);
		}

		return this.#createCore(fabric);
	}
}

// --- Rust NAPI helpers (module-level) ---

type NapiViolation = {
	ruleId: string;
	name?: string;
	severity: string;
	message: string;
	line: number;
	col: number;
	raw: string;
};

type NapiBinding = {
	lintHtml: (html: string, configJson: string, specJson: string) => NapiViolation[];
};

let cachedNapi: NapiBinding | undefined;

async function loadNapiBinding(): Promise<NapiBinding> {
	if (cachedNapi) {
		return cachedNapi;
	}
	const mod = (await import('@markuplint/core')) as NapiBinding;
	cachedNapi = mod;
	return cachedNapi;
}

/**
 * Converts the TS Ruleset into a JSON string that the Rust LintConfig can deserialize.
 *
 * Rust LintConfig expects: `{ rules: {...}, node_rules: [...], child_node_rules: [...] }`
 *
 * Namespaced rule IDs (e.g., "html-standard/attr-duplication") are passed through as-is.
 * Rust strips the namespace prefix internally for rule lookup and preserves the original
 * key in violation ruleIds.
 */
function buildRustConfigJson(ruleset: Partial<Readonly<Ruleset>>): string {
	return JSON.stringify({
		rules: ruleset.rules ?? {},
		node_rules: ruleset.nodeRules ?? [],
		child_node_rules: ruleset.childNodeRules ?? [],
	});
}
