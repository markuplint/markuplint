import type { APIOptions, MLEngineEventMap } from './types.js';
import type { MLResultInfo } from '../types.js';
import type { WatchSubscription } from './shared-watcher.js';
import type { ConfigSet, MLFile, PretenderResolver, Target } from '@markuplint/file-resolver';
import type { PlainData, Pretender, RuleAliasWarning } from '@markuplint/ml-config';
import type { Ruleset, Plugin, Document, RuleConfigValue, MLFabric } from '@markuplint/ml-core';

import {
	ConfigProvider,
	createPretenderResolver,
	disambiguatePretendersForFile,
	invalidatePretenderResolutionCaches,
	resolveFiles,
	resolveParser,
	resolveRules,
	resolveSpecs,
} from '@markuplint/file-resolver';
import path from 'node:path';

import { applyRuleAliasesToConfig, mergeConfig } from '@markuplint/ml-config';
import { MLCore, convertRuleset } from '@markuplint/ml-core';
import { ruleAliasTable } from '@markuplint/rules';
import { isFatalError } from '@markuplint/shared';
import { Emitter } from 'strict-event-emitter';

import { log as coreLog, verbosely } from '../debug.js';
import { i18n } from '../i18n.js';

import { subscribe as subscribeToWatcher, toWatchKey } from './shared-watcher.js';

const log = coreLog.extend('ml-engine');
const fileLog = log.extend('file');
const configLog = log.extend('config');

type MLEngineOptions = {
	readonly debug?: boolean;
	readonly watch?: boolean;
	/**
	 * A pre-built {@link ConfigProvider} to resolve config through, instead of
	 * the one this instance would otherwise create for itself.
	 *
	 * `ConfigProvider` caches by the resolved config's `names` (file paths),
	 * not by target file — so a caller looping over many files (the CLI, or
	 * the `lint()` API) that constructs one `MLEngine` per file should share
	 * a single `ConfigProvider` across that loop; every file whose config
	 * resolves to the same `names` then reuses the same cached base config
	 * (merge/validate/plugin-resolution) instead of redoing that work once
	 * per file. See #3997.
	 *
	 * Optional and additive: omitted, each `MLEngine` still creates its own
	 * provider exactly as before.
	 *
	 * **Caveat — `watch: true`**: `resolveConfig()`'s cache-busting
	 * (`cache: false`, used internally on every watch-triggered re-resolve)
	 * calls `ConfigProvider#invalidate()`, which clears the *entire* shared
	 * provider, not anything scoped to one engine or file. `resolveConfig()`
	 * runs through `ConfigProvider#runExclusive()`, so an overlapping call
	 * from another engine can no longer interleave with — and corrupt — this
	 * one's in-flight resolve (see #4015); it can only run *before* or
	 * *after* it. Sharing one `configProvider` across multiple engines that
	 * also have `watch: true` still risks one engine's re-resolve evicting
	 * another's already-cached config, forcing an avoidable re-resolve on
	 * that engine's next lookup. Neither the CLI (which doesn't support
	 * `--watch`) nor `lint()` (which never sets `watch`) create this
	 * combination — it only arises if a direct API consumer builds it
	 * deliberately.
	 */
	readonly configProvider?: ConfigProvider;
};

/**
 * The config passed to {@link ConfigProvider.set} when no config was
 * discovered, requested, or provided by the caller. A module-level constant
 * (not rebuilt per call) so its object identity is stable — letting
 * `ConfigProvider.set`'s auto-key cache (keyed by identity) recognize repeat
 * calls across every file in a run sharing one `ConfigProvider`, the same
 * way a stable `options.config`/`defaultConfig` reference does. See #3997.
 */
const RECOMMENDED_CONFIG = { extends: ['markuplint:recommended'] };

/**
 * How long watch events are gathered before the engine re-resolves, so that
 * a change of many files at once (a `git checkout`, a formatter run) is one
 * re-resolution. Rollup's `watch.buildDelay` is 25ms; tsc waits 250ms and
 * webpack 20ms. A re-resolution is not interrupted by events that arrive
 * during it (see `#watchRerun`), so the delay only has to be long enough to
 * gather the burst, not to outlast the work.
 */
const WATCH_DEBOUNCE_MS = 25;

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
 * A {@link ConfigSet} widened with deprecated-rule-name notices found while
 * applying {@link applyRuleAliasesToConfig}. Kept structured (not folded
 * into `errs` as generic `Error`s) so `MLCore` can report them under their
 * own `rule-deprecation` ruleId instead of `config-error` — see
 * `packages/@markuplint/ml-core/src/ml-core.ts`'s `verify()`.
 */
type ResolvedConfigSet = ConfigSet & {
	readonly ruleDeprecations: readonly RuleAliasWarning[];
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
	/**
	 * The resolver of the latest config resolution, kept so `setCode()` can
	 * re-resolve the pretenders that depend on the source without re-reading
	 * the ones that depend on the config and the filesystem only. See #4064.
	 */
	#pretenderResolver: PretenderResolver | null = null;
	/**
	 * Counts `setCode()` calls so that, when they overlap, only the latest one
	 * reaches the file and the core — `setCode()` awaits the pretender
	 * re-resolution, and an earlier call finishing later must not put its
	 * older code back.
	 */
	#setCodeSeq = 0;
	/**
	 * The latest `setCode()` call's application, so that a superseded call can
	 * resolve only after it has taken effect.
	 */
	#latestSetCode: Promise<void> = Promise.resolve();
	/**
	 * What is running, so that the next piece of work starts when it is over:
	 * {@link exec}, the application of {@link setCode}, and the re-resolution a
	 * watched file triggers share one queue. They all read and replace the same
	 * state — the pretender resolver, the core's document — and `verify()` with
	 * `fix` rewrites the document while it runs; run side by side, a lint could
	 * see another's half-done state, and the one that finished last would put
	 * its older pretenders over a newer resolution.
	 */
	#queue: Promise<unknown> = Promise.resolve();
	/**
	 * This engine's view of the process-wide watcher (see `./shared-watcher.ts`);
	 * `null` unless watching.
	 */
	#watch: WatchSubscription | null = null;
	/** The config files of the latest resolution, as {@link ConfigSet.files} names them. */
	#configFiles: ReadonlySet<string> = new Set();
	/**
	 * The files the latest pretenders resolution read (see
	 * `ResolvePretendersOptions#dependencies`). `setCode()` replaces them, as
	 * the `auto` ones follow the source's imports.
	 */
	#pretenderDependencies: ReadonlySet<string> = new Set();
	/** The pending gathering of watch events into one re-resolution. */
	#watchDebounce: ReturnType<typeof setTimeout> | undefined;
	/** Whether the loop of re-resolutions is running, one at a time. */
	#rerunning = false;
	/** Set by an event that arrives while a re-resolution is running: it ran on state older than the event. */
	#rerunAgain = false;

	constructor(file: Readonly<MLFile>, options?: APIOptions & MLEngineOptions) {
		super();

		if (this.#options?.debug) {
			verbosely();
		}

		this.#file = file;
		this.#options = options;
		this.#configProvider = options?.configProvider ?? new ConfigProvider();
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
	 * Closes the engine, removing all event listeners and leaving the file
	 * watcher (the files no other engine watches are released with it).
	 */
	async close() {
		this.removeAllListeners();
		await this.#stopWatching();
	}

	/**
	 * Executes linting on the target file and returns the results.
	 *
	 * Sets up the engine on first call, then verifies the document against all rules.
	 *
	 * Runs after whatever the engine is already doing — an earlier `exec()`, a
	 * {@link setCode} call, a re-resolution a watched file triggered — and
	 * before whatever is asked for later. That also means that awaiting it from
	 * inside one of the engine's own event listeners waits on itself.
	 *
	 * @returns The lint result including violations and fixed code, or `null` if setup was skipped
	 */
	exec(): Promise<MLResultInfo | null> {
		return this.#enqueue(() => this.#exec());
	}

	async #exec(): Promise<MLResultInfo | null> {
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
	 * Updates the source code and re-parses the document without re-resolving
	 * configuration.
	 *
	 * The pretenders that depend on the source — `pretenders.auto`, which walks
	 * the file's own imports, and the disambiguation of same-selector entries,
	 * which reads them too — are re-resolved from the new code; the ones that
	 * depend on the config and the filesystem only are kept from the latest
	 * config resolution (see #4064 and {@link PretenderResolver}).
	 *
	 * When calls overlap, only the latest one takes effect, and every call
	 * settles only once that latest one has — so a host that runs
	 * {@link exec} right after awaiting any of them (the VS Code extension
	 * does) lints the document the file now holds, never the previous
	 * document against the newer file. For the same reason a superseded call
	 * rejects when the latest one fails: resolving would tell its caller the
	 * latest code is in place when it is not.
	 *
	 * @param code - The new markup source code
	 */
	async setCode(code: string) {
		// Numbered when called, not when its turn in the queue comes: a call that
		// a later one has overtaken by then steps aside without resolving anything.
		const seq = ++this.#setCodeSeq;
		const applied = this.#enqueue(() => this.#applyCode(code, seq));
		this.#latestSetCode = applied;
		await applied;

		let awaited = applied;
		while (this.#latestSetCode !== awaited) {
			awaited = this.#latestSetCode;
			await awaited;
		}
	}

	/**
	 * The body of one {@link setCode} call. Two checks against the sequence
	 * number: the one after setup spares a superseded call its resolution;
	 * the one after resolution keeps a superseded call that was already
	 * resolving from overwriting the newer result.
	 */
	async #applyCode(code: string, seq: number) {
		const core = await this.#setup();

		if (!core || seq !== this.#setCodeSeq) {
			return;
		}

		this.#file.setCode(code);
		const { pretenders, dependencies } = await this.#resolvePretendersForCurrentCode();

		if (seq !== this.#setCodeSeq) {
			return;
		}

		core.setCode(code, { pretenders });
		await this.#watchPretenderDependencies(dependencies);
	}

	/**
	 * Enables or disables watch mode. When enabled, the engine watches the
	 * files its result depends on — config files, and the component files
	 * `pretenders.scan` and `pretenders.auto` read — and re-lints automatically
	 * when one changes, is created, or is removed. Changes that arrive together
	 * are one re-lint, and the lint target itself is not watched: it may be
	 * watched and managed by a language server or text editor, which tells the
	 * engine through {@link setCode}.
	 *
	 * Not watched, so a change to them is picked up only by the next
	 * config-triggered re-lint: files that do not exist yet (a component that
	 * has not been created, a `scan` glob's new match), `node_modules`,
	 * `pretenders.files` and `pretenders.imports`. See
	 * `PretenderScanOptions#dependencies` in `@markuplint/ml-config`.
	 *
	 * @param enable - Whether to enable watch mode
	 */
	watchMode(enable: boolean) {
		this.#options = {
			...this.#options,
			watch: enable,
		};

		if (enable) {
			if (!this.#watch) {
				this.#watch = subscribeToWatcher(
					filePath => this.#watchOnChange(filePath),
					error => this.#emitWatchError(error),
				);
				// Whatever the engine already depends on; it resolves the rest as it goes.
				void this.#syncWatch();
			}
		} else {
			this.#stopWatching().catch((error: unknown) => {
				if (isFatalError(error)) {
					throw error;
				}
				this.#emitWatchError(error);
			});
		}
	}

	#emitWatchError(error: unknown) {
		this.emit('log', 'watch:error', error instanceof Error ? error.message : String(error));
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

	/**
	 * A watched file changed, was created, or was removed. Gathers the events
	 * of a burst, then asks for a re-resolution.
	 */
	#watchOnChange(filePath: string) {
		if (!this.#options?.watch) {
			return;
		}

		this.emit('log', 'watch:onChange', filePath);

		clearTimeout(this.#watchDebounce);
		this.#watchDebounce = setTimeout(() => {
			this.#watchDebounce = undefined;
			void this.#watchRerun();
		}, WATCH_DEBOUNCE_MS);
	}

	/**
	 * Re-resolves and lints, one at a time. An event that arrives while one is
	 * running means it ran on state older than the event, so it is followed by
	 * exactly one more — however many events came — rather than by one each,
	 * and never alongside it (the same way Rollup's watcher reruns, and webpack
	 * discards a compilation that a change has outdated).
	 */
	async #watchRerun() {
		if (this.#rerunning) {
			this.#rerunAgain = true;
			return;
		}

		this.#rerunning = true;
		try {
			do {
				this.#rerunAgain = false;
				try {
					await this.#enqueue(() => this.#resolveAgain());
				} catch (error: unknown) {
					if (isFatalError(error)) {
						throw error;
					}
					// Nobody awaits a re-resolution a file triggered; a failure of one (a
					// parser that cannot be found, say) must not become an unhandled
					// rejection, nor spare the event that arrived while it ran its rerun.
					this.#emitWatchError(error);
				}
			} while (this.#rerunAgain && this.#options?.watch);
		} finally {
			this.#rerunning = false;
			if (!this.#watchDebounce) {
				this.emit('log', 'watch:idle', this.#file.path);
			}
		}
	}

	/**
	 * A re-resolution is not only the config: it re-reads the files the pretenders
	 * depend on, which is what a change to one of them is for.
	 */
	async #resolveAgain() {
		if (!this.#options?.watch) {
			return;
		}

		const fabric = await this.#provide(false);

		if (!fabric || !this.#options?.watch) {
			return;
		}

		if (fabric.configErrors) {
			this.emit('config-errors', this.#file.path, fabric.configErrors);
		}

		this.emit('log', 'update:core', this.#file.path);
		this.#core?.update(fabric);
		await this.#exec();
	}

	#enqueue<T>(task: () => Promise<T>): Promise<T> {
		const result = this.#queue.then(task, task);
		// The queue goes on whether this task succeeded or not; its failure is the
		// caller's, through `result`.
		this.#queue = result.then(
			() => {},
			() => {},
		);
		return result;
	}

	/**
	 * Leaves the process-wide watcher. A later `watchMode(true)` subscribes anew.
	 */
	async #stopWatching() {
		clearTimeout(this.#watchDebounce);
		this.#watchDebounce = undefined;
		this.#options = { ...this.#options, watch: false };
		const watch = this.#watch;
		this.#watch = null;
		await watch?.close();
	}

	/**
	 * Points the process-wide watcher at what this engine depends on now: its
	 * config files and the files its pretenders were resolved from. Resolves
	 * once they are being watched, so that a change made after an `exec()` or
	 * `setCode()` has resolved is not missed.
	 *
	 * Left out: relative names (`markuplint:recommended`, the keys of inline
	 * configs, `extends` of an npm module) that {@link ConfigSet.files} also
	 * lists, and the lint target itself.
	 *
	 * Never rejects: a watcher that cannot be updated costs the engine its
	 * re-linting, not the `exec()` / `setCode()` whose result is already in hand.
	 */
	async #syncWatch() {
		try {
			await this.#updateWatch();
		} catch (error: unknown) {
			if (isFatalError(error)) {
				throw error;
			}
			this.#emitWatchError(error);
		}
	}

	async #updateWatch() {
		const watch = this.#watch;
		if (!watch) {
			return;
		}

		const targetKey = toWatchKey(this.#file.path);
		const filePaths = new Set<string>();
		for (const filePath of [...this.#configFiles, ...this.#pretenderDependencies]) {
			if (path.isAbsolute(filePath) && toWatchKey(filePath) !== targetKey) {
				filePaths.add(filePath);
			}
		}

		await watch.update(filePaths);
	}

	async #watchPretenderDependencies(dependencies: ReadonlySet<string>) {
		this.#pretenderDependencies = dependencies;
		await this.#syncWatch();
	}

	async #provide(cache = true): Promise<MLFabric | null> {
		let configSet: ResolvedConfigSet;

		try {
			configSet = await this.resolveConfig(cache);
		} catch (error: unknown) {
			if (error instanceof Error) {
				configSet = {
					config: {},
					plugins: [],
					files: new Set(),
					errs: [error],
					ruleDeprecations: [],
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
			ruleDeprecations: configSet.ruleDeprecations,
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
	async resolveConfig(cache: boolean): Promise<ResolvedConfigSet> {
		this.emit('log', 'resolveConfig', JSON.stringify(this.#configProvider, null, 2));
		configLog('configProvider: %s', this.#configProvider);

		// Runs the whole invalidate → set → search → resolve sequence as one
		// exclusive unit on the provider — an overlapping call on the same
		// (possibly shared, e.g. two watch-triggered re-resolves close
		// together) `ConfigProvider` must not interleave its own `invalidate()`
		// in the middle of this one's `set()`/`search()` calls, which would
		// wipe the keys just registered below before `resolve()` gets to use
		// them. See #4015.
		const resolvedConfigSet = await this.#configProvider.runExclusive(async () => {
			if (!cache) {
				// Must run before any `set()` call below — `ConfigProvider#resolve()`
				// no longer clears its own store on `cache: false`, so invalidating
				// after registering this call's inline config would discard it
				// again immediately. See #4015.
				this.#configProvider.invalidate();
			}

			const defaultConfigKey =
				this.#options?.defaultConfig &&
				this.#configProvider.set(
					mergeConfig(this.#options.defaultConfig),
					undefined,
					this.#options.defaultConfig,
				);
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

			const configKey =
				this.#options?.config &&
				this.#configProvider.set(mergeConfig(this.#options.config), undefined, this.#options.config);
			configLog('option.config: %s', configKey ?? 'N/A');
			this.emit('log', 'option.config', configFilePathsFromTarget ?? 'N/A');

			let defaultRecommended: string | null = null;
			if (!defaultConfigKey && !configFilePathsFromTarget && !configKey && !this.#options?.configFile) {
				// No configured
				// Default: set recommended
				defaultRecommended = this.#configProvider.set(RECOMMENDED_CONFIG);
			}
			configLog('defaultRecommended: %s', defaultRecommended ?? 'N/A');
			this.emit('log', 'defaultRecommended', defaultRecommended ?? 'N/A');

			return this.#configProvider.resolve(
				this.#file,
				[configFilePathsFromTarget, this.#options?.configFile, configKey, defaultRecommended],
				cache,
			);
		});

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
		// Kept structured (not folded into `errs` as generic `Error`s) so
		// `MLCore` can report these under their own `rule-deprecation` ruleId,
		// separate from genuine config-validation failures — see
		// `ResolvedConfigSet`'s doc comment.
		const configSet: ResolvedConfigSet =
			ruleAliasWarnings.length === 0
				? { ...resolvedConfigSet, ruleDeprecations: [] }
				: { ...resolvedConfigSet, config: aliasedConfig, ruleDeprecations: ruleAliasWarnings };

		this.emit('config', this.#file.path, configSet);

		// The main file is not watched (see `#syncWatch`): it may be watched and managed
		// by a language server or text editor or more.
		this.#configFiles = configSet.files;
		await this.#syncWatch();

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
		// One resolver per config resolution: this is the only place the
		// pretenders that depend on the config and the filesystem (files /
		// imports / data / scan) are read. `setCode()` reuses it.
		this.#pretenderResolver = createPretenderResolver(configSet.config.pretenders);
		const { pretenders, dependencies } = await this.#resolvePretendersForCurrentCode();
		await this.#watchPretenderDependencies(dependencies);
		return pretenders;
	}

	/**
	 * Disambiguation runs here, on every call, and not only at config
	 * resolution: it reads the target's import statements, so it is as
	 * source-dependent as `auto` is.
	 *
	 * @returns The pretenders, and the files they were resolved from, which the
	 *   caller watches once it has adopted this resolution (a superseded one is dropped).
	 */
	async #resolvePretendersForCurrentCode(): Promise<{
		readonly pretenders: readonly Pretender[];
		readonly dependencies: ReadonlySet<string>;
	}> {
		const resolver = this.#pretenderResolver;
		const dependencies = new Set<string>();
		if (!resolver) {
			return { pretenders: [], dependencies };
		}
		const sourceCode = await this.#file.getCode();
		const pretenders = await resolver.resolve({ filePath: this.#file.path, sourceCode }, { dependencies });
		const disambiguated = await disambiguatePretendersForFile(this.#file.path, sourceCode, pretenders, {
			dependencies,
		});
		fileLog('Resolved pretenders: %O', disambiguated);
		return { pretenders: disambiguated, dependencies };
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
