import { APIOptions, MLEngineEventMap, MLFabric } from './types';
import {
	ConfigSet,
	MLFile,
	Target,
	configProvider,
	moduleAutoLoader,
	resolveFiles,
	resolveParser,
	resolveRules,
	resolveSpecs,
} from '@markuplint/file-resolver';
import { MLCore, Ruleset, convertRuleset } from '@markuplint/ml-core';
import { FSWatcher } from 'chokidar';
import { MLResultInfo } from '../types';
import { RuleConfigValue } from '@markuplint/ml-config';
import { StrictEventEmitter } from 'strict-event-emitter';
import { i18n } from '../i18n';

type MLEngineOptions = {
	watch?: boolean;
};

export default class MLEngine extends StrictEventEmitter<MLEngineEventMap> {
	#file: MLFile;
	#options?: APIOptions & MLEngineOptions;
	#core: MLCore | null = null;
	#watcher = new FSWatcher();

	static async toMLFile(target: Target) {
		const files = await resolveFiles([target]);
		return files[0];
	}

	constructor(file: MLFile, options?: APIOptions & MLEngineOptions) {
		super();
		this.#file = file;
		this.#options = options;

		if (options?.watch) {
			this.#watcher.on('all', this.watch.bind(this));
		} else {
			this.#watcher.close();
		}
	}

	async exec(): Promise<MLResultInfo | null> {
		const core = await this.setup();

		if (!core) {
			return null;
		}

		const sourceCode = await this.#file.getCode();
		const violations = await core.verify(this.#options?.fix);
		const fixedCode = core.document.toString();

		this.emit('lint', this.#file.path, sourceCode, violations, fixedCode);
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

	async close() {
		this.removeAllListeners();
		await this.#watcher.close();
	}

	private async setup() {
		if (this.#core) {
			return this.#core;
		}
		const fabric = await this.provide(false);

		if (!fabric) {
			return null;
		}

		const core = this.cretateCore(fabric);
		return core;
	}

	private async provide(remerge: boolean): Promise<MLFabric | null> {
		const configSet = await this.resolveConfig(remerge);

		// Exclude
		const excludeFiles = configSet.config.excludeFiles || [];
		for (const excludeFile of excludeFiles) {
			if (this.#file.matches(excludeFile)) {
				this.emit('exclude', this.#file.path, excludeFile);
				return null;
			}
		}

		const { parser, parserOptions, matched } = await this.resolveParser(configSet);

		// Ext Matching
		if (this.#options?.extMatch && !matched && !this.#file.path.match(/\.html?$/i)) {
			this.emit('log', 'extension-matching', `${this.#file.path}`);
			return null;
		}

		const ruleset = this.resolveRuleset(configSet);
		const schemas = await this.resolveSchemas(configSet);
		const rules = await this.resolveRules(configSet, ruleset);
		const i18n = await this.i18n();

		return {
			parser,
			parserOptions,
			ruleset,
			schemas,
			rules,
			i18n,
		};
	}

	private async cretateCore(fabric: MLFabric) {
		const sourceCode = await this.#file.getCode();
		this.emit('code', this.#file.path, sourceCode);

		const core = new MLCore({
			sourceCode,
			filename: this.#file.path,
			...fabric,
		});

		this.#core = core;
		return core;
	}

	private async resolveConfig(remerge: boolean) {
		const configFilePathsFromTarget = this.#options?.noSearchConfig
			? null
			: await configProvider.search(this.#file);
		this.emit('log', 'configFilePathsFromTarget', configFilePathsFromTarget || 'null');
		const configKey = this.#options?.config && configProvider.set(this.#options.config);
		this.emit('log', 'configKey', configKey || 'null');
		const configSet = await configProvider.resolve(
			[configFilePathsFromTarget, this.#options?.configFile, configKey],
			remerge,
		);
		this.emit('config', this.#file.path, configSet);

		if (this.#options?.watch) {
			this.#watcher.add(Array.from(configSet.files));
		}

		return configSet;
	}

	private async resolveParser(configSet: ConfigSet) {
		const parser = await resolveParser(this.#file, configSet.config.parser, configSet.config.parserOptions);
		this.emit('parser', this.#file.path, parser.parserModName);
		return parser;
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

	private async resolveRules(configSet: ConfigSet, ruleset: Ruleset) {
		const rules = await resolveRules(configSet.config.importRules, this.#options?.importPresetRules);
		const autoLoad = this.#options?.autoLoad ?? true;
		// Additional rules
		if (autoLoad) {
			const { rules: additionalRules } = await moduleAutoLoader<RuleConfigValue, unknown>(ruleset);
			rules.push(...additionalRules);
		}
		if (this.#options?.rules) {
			rules.push(...this.#options.rules);
		}
		this.emit('rules', this.#file.path, rules);
		return rules;
	}

	private async i18n() {
		const i18nSettings = await i18n(this.#options?.locale);
		this.emit('i18n', this.#file.path, i18nSettings);
		return i18nSettings;
	}

	private async watch(type: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir', filePath: string) {
		this.emit('log', `watch:${type}`, filePath);

		const fabric = await this.provide(true);

		if (!fabric) {
			return;
		}

		this.emit('log', 'update:core', this.#file.path);
		this.#core?.update(fabric);
		this.exec();
	}
}
