import type { APIOptions, MLEngineEventMap } from './types.js';
import type { MLResultInfo } from '../types.js';
import type { ConfigSet, MLFile, Target } from '@markuplint/file-resolver';
import type { PlainData } from '@markuplint/ml-config';
import type { Ruleset, Plugin, Document, RuleConfigValue, MLFabric } from '@markuplint/ml-core';

import {
	ConfigProvider,
	disambiguatePretendersForFile,
	invalidatePretenderResolutionCaches,
	resolveFiles,
	resolveParser,
	resolvePretenders,
	resolveRules,
	resolveSpecs,
} from '@markuplint/file-resolver';
import { applyRuleAliasesToConfig, mergeConfig } from '@markuplint/ml-config';
import { MLCore, convertRuleset } from '@markuplint/ml-core';
import { ruleAliasTable } from '@markuplint/rules';
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
	#options?: APIOptions & MLEngineOptions;
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
		const core = await this.#setup();

		if (!core) {
			log('exec: cancel (unsetuped yet)');
			return null;
		}

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

		const { parser, parserOptions, matched } = await this.#resolveParser(configSet);
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

		const pretenders = await this.#resolvePretenders(configSet, cache);
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

		const resolvedConfigSet = await this.#configProvider.resolve(
			this.#file,
			[configFilePathsFromTarget, this.#options?.configFile, configKey, defaultRecommended],
			cache,
		);

		// Rewrite deprecated rule names (v5 rule-system redesign, #3989) to
		// their current replacement(s) so old configurations keep working.
		// Applied once, here, after `extends` is fully merged — everything
		// downstream (Ruleset, rule resolution, `--show-config`) sees only
		// current rule names. Covers all three places a rule name can appear:
		// the top-level `rules` map, and each `nodeRules`/`childNodeRules`
		// entry's own `rules`.
		const { config: aliasedConfig, warnings: ruleAliasWarnings } = applyRuleAliasesToConfig(
			resolvedConfigSet.config,
			ruleAliasTable,
		);
		const configSet: ConfigSet =
			ruleAliasWarnings.length === 0
				? resolvedConfigSet
				: {
						...resolvedConfigSet,
						config: aliasedConfig,
						errs: [
							...resolvedConfigSet.errs,
							...ruleAliasWarnings.map(
								({ deprecatedName, replacedBy }) =>
									new Error(
										`Rule "${deprecatedName}" is deprecated and will be removed in v6. Use ${replacedBy.join(', ')} instead.`,
									),
							),
						],
					};

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
		cache: boolean,
	) {
		if (!cache) {
			// A cache-busting re-resolve (e.g. watch mode after a file change) must also
			// invalidate `@markuplint/pretenders`' own module-level resolution caches —
			// otherwise a renamed export or a newly valid tsconfig `paths` alias keeps
			// resolving as it did before the change for the rest of the process's lifetime.
			await invalidatePretenderResolutionCaches();
		}
		const sourceCode = await this.#file.getCode();
		const pretenders = await resolvePretenders(configSet.config.pretenders, {
			filePath: this.#file.path,
			sourceCode,
		});
		const disambiguated = await disambiguatePretendersForFile(this.#file.path, sourceCode, pretenders);
		fileLog('Resolved pretenders: %O', disambiguated);
		return disambiguated;
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
