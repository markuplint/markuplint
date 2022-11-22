import type { MLResultInfo } from '../types';
import type { APIOptions, MLEngineEventMap, MLFabric } from './types';
import type { ConfigSet, MLFile, Target } from '@markuplint/file-resolver';
import type { Ruleset, Plugin, Document, RuleConfigValue } from '@markuplint/ml-core';

import { ConfigProvider, resolveFiles, resolveParser, resolveRules, resolveSpecs } from '@markuplint/file-resolver';
import { MLCore, convertRuleset } from '@markuplint/ml-core';
import { FSWatcher } from 'chokidar';
import { StrictEventEmitter } from 'strict-event-emitter';

import { log as coreLog, verbosely } from '../debug';
import { i18n } from '../i18n';

const log = coreLog.extend('ml-engine');
const fileLog = log.extend('file');

type MLEngineOptions = {
	debug?: boolean;
	watch?: boolean;
};

export default class MLEngine extends StrictEventEmitter<MLEngineEventMap> {
	static async toMLFile(target: Target) {
		const files = await resolveFiles([target]);
		return files[0];
	}

	#configProvider: ConfigProvider;
	#core: MLCore | null = null;
	#file: MLFile;
	#options?: APIOptions & MLEngineOptions;
	#watcher = new FSWatcher();

	constructor(file: MLFile, options?: APIOptions & MLEngineOptions) {
		super();
		this.#file = file;
		this.#options = options;
		this.#configProvider = new ConfigProvider();
		this.watchMode(!!this.#options?.watch);

		if (this.#options?.debug) {
			verbosely();
		}
	}

	get document(): Document<RuleConfigValue, unknown> | null {
		if (this.#core?.document instanceof Error) {
			return null;
		}
		return this.#core?.document ?? null;
	}

	async close() {
		this.removeAllListeners();
		await this.#watcher.close();
	}

	async exec(): Promise<MLResultInfo | null> {
		log('exec: start');
		const core = await this.setup();

		if (!core) {
			log('exec: cancel (unsetuped yet)');
			return null;
		}

		const violations = await core.verify(this.#options?.fix).catch(e => {
			if (e instanceof Error) {
				return e;
			}
			throw e;
		});

		const sourceCode = await this.#file.getCode();
		const fixedCode = core.document.toString();

		if (violations instanceof Error) {
			this.emit('lint-error', this.#file.path, sourceCode, violations);
			const errMessage = violations.stack ?? violations.message;
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
				fixedCode,
			};
		}

		const debugMap = ('debugMap' in core.document && core.document.debugMap()) || null;

		this.emit('lint', this.#file.path, sourceCode, violations, fixedCode, debugMap);
		log('exec: end');
		return {
			violations,
			filePath: this.#file.path,
			sourceCode,
			fixedCode,
		};
	}

	async setCode(code: string) {
		const core = await this.setup();

		if (!core) {
			return;
		}

		this.#file.setCode(code);
		core.setCode(code);
	}

	watchMode(enable: boolean) {
		this.#options = {
			...this.#options,
			watch: enable,
		};

		if (enable) {
			this.#watcher.on('change', this.onChange.bind(this));
		} else {
			this.#watcher.removeAllListeners();
		}
	}

	private async createCore(fabric: MLFabric) {
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

	private async i18n() {
		const i18nSettings = await i18n(this.#options?.locale);
		this.emit('i18n', this.#file.path, i18nSettings);
		return i18nSettings;
	}

	private async onChange(filePath: string) {
		if (!this.#options?.watch) {
			return;
		}

		this.emit('log', 'watch:onChange', filePath);

		const fabric = await this.provide(false);

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

	private async provide(cache = true): Promise<MLFabric | null> {
		const configSet = await this.resolveConfig(cache);
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
		const excludeFiles = configSet.config.excludeFiles || [];
		for (const excludeFile of excludeFiles) {
			if (this.#file.matches(excludeFile)) {
				this.emit('exclude', this.#file.path, excludeFile);
				fileLog('Excludes the file: %s', this.#file.path);
				return null;
			}
		}

		const { parser, parserOptions, matched } = await this.resolveParser(configSet);
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

		const ruleset = this.resolveRuleset(configSet);
		fileLog('Resolved ruleset: %O', ruleset);

		const schemas = await this.resolveSchemas(configSet);
		if (fileLog.enabled) {
			if (schemas[0].cites.length) {
				const [, ...additionalSpecs] = schemas;
				fileLog('Resolved schemas: HTML Standard');
				for (const additionalSpec of additionalSpecs) {
					fileLog('Resolved schemas: %O', additionalSpec);
				}
			} else {
				fileLog('Resolved schemas: %O', schemas);
			}
		}

		const rules = await this.resolveRules(configSet.plugins, ruleset);
		fileLog('Resolved rules: %O', rules);

		const locale = await i18n(this.#options?.locale);

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
			pretenders: configSet.config.pretenders ?? [],
			ruleset,
			schemas,
			rules,
			locale,
			configErrors: configSet.errs,
		};
	}

	private async resolveConfig(cache: boolean) {
		const defaultConfigKey = this.#options?.defaultConfig && this.#configProvider.set(this.#options?.defaultConfig);
		const configFilePathsFromTarget = this.#options?.noSearchConfig
			? defaultConfigKey ?? null
			: (await this.#configProvider.search(this.#file)) || defaultConfigKey;
		this.emit('log', 'configFilePathsFromTarget', configFilePathsFromTarget || 'null');
		const configKey = this.#options?.config && this.#configProvider.set(this.#options.config);
		this.emit('log', 'configKey', configKey || 'null');
		const configSet = await this.#configProvider.resolve(
			this.#file,
			[configFilePathsFromTarget, this.#options?.configFile, configKey],
			cache,
		);
		this.emit('config', this.#file.path, configSet);

		if (this.#options?.watch) {
			// It doesn't watch the main HTML file because it may is watched and managed by a language server or text editor or more.
			this.#watcher.add(Array.from(configSet.files));
		}

		return configSet;
	}

	private async resolveParser(configSet: ConfigSet) {
		const parser = await resolveParser(this.#file, configSet.config.parser, configSet.config.parserOptions);
		this.emit('parser', this.#file.path, parser.parserModName);
		fileLog('Fetched Parser module: %s', parser.parserModName);
		return parser;
	}

	private async resolveRules(plugins: Plugin[], ruleset: Ruleset) {
		const rules = await resolveRules(
			plugins,
			ruleset,
			this.#options?.importPresetRules ?? true,
			this.#options?.autoLoad ?? true,
		);

		if (this.#options?.rules) {
			rules.push(...this.#options.rules);
		}
		this.emit('rules', this.#file.path, rules);
		return rules;
	}

	private resolveRuleset(configSet: ConfigSet) {
		const ruleset = convertRuleset(configSet.config);
		this.emit('ruleset', this.#file.path, ruleset);
		return ruleset;
	}

	private async resolveSchemas(configSet: ConfigSet) {
		const { schemas } = await resolveSpecs(this.#file.path, configSet.config.specs);
		this.emit('schemas', this.#file.path, schemas);
		return schemas;
	}

	private async setup() {
		if (this.#core) {
			return this.#core;
		}
		const fabric = await this.provide();

		if (!fabric) {
			return null;
		}

		if (fabric.configErrors) {
			this.emit('config-errors', this.#file.path, fabric.configErrors);
		}

		return this.createCore(fabric);
	}
}
