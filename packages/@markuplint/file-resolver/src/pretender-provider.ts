import type {
	OptimizedConfig,
	Pretender,
	PretenderFileData,
	PretenderScanConfig,
	PretenderScanOptions,
} from '@markuplint/ml-config';
import type { PretenderScannerScanMethod } from '@markuplint/pretenders';

import { Cache } from '@markuplint/cache';

import { Watcher } from './watcher';

type PretendersConfig = OptimizedConfig['pretenders'];

const DIDNT_SPECIFY_CONFIG_ERROR_MSG =
	'Cannot return pretenders because it did not specify the configuration yet. It might be the wrong order to call this method';

type PretenderWatchCallback = (pretenders: Pretender[]) => void;

export class PretenderProvider {
	#staticData: Pretender[] | null = null;
	#scanners: Scanner[] = [];
	#watchCallback: PretenderWatchCallback | null = null;

	async getPretenders() {
		if (!this.#staticData) {
			throw new ReferenceError(DIDNT_SPECIFY_CONFIG_ERROR_MSG);
		}

		const result = [...this.#staticData];

		for (const scanner of this.#scanners) {
			const pretenders = await scanner.scan();
			result.push(...pretenders);
		}

		return result;
	}

	async setConfig(config: PretendersConfig) {
		const [data, scanConfig] = await resolvePretendersConfig(config);
		this.#staticData = data;

		if (scanConfig) {
			for (const scan of scanConfig) {
				if (scan.type === 'jsx') {
					const { jsxScanner } = await import('@markuplint/pretenders/lib/jsx');
					const scanner = new Scanner(scan.type, scan.files, jsxScanner, scan.options);
					this.#scanners.push(scanner);
				}
			}
		}

		// It regards to be enabled watch mode if it has `#watchCallback`.
		// And call the watch method then add the callback to each scanner.
		if (this.#watchCallback) {
			await this.watch(this.#watchCallback);
		}
	}

	/**
	 * Stops watching.
	 * It does nothing if it is not in watching mode or it doesn't have scanning files.
	 */
	async unwatch() {
		for (const scanner of this.#scanners) {
			await scanner.unwatch();
		}
	}

	/**
	 * Starts watching related files.
	 * It passes the results of pretenders to callback every file changed.
	 * It requires calling `setConfig` method in advance before calling this.
	 *
	 * @param callback
	 */
	async watch(callback: PretenderWatchCallback) {
		this.#watchCallback = callback;
		for (const scanner of this.#scanners) {
			await scanner.watch(async () => {
				if (!this.#staticData) {
					throw new ReferenceError(DIDNT_SPECIFY_CONFIG_ERROR_MSG);
				}
				const allPretenders = await this.getPretenders();
				this.#watchCallback?.(allPretenders);
			});
		}
	}
}

class Scanner<O extends PretenderScanOptions = PretenderScanOptions> {
	#cache: Cache<Pretender[]>;
	#options?: O;
	#watcher: Watcher | null = null;

	constructor(type: string, glob: string, method: PretenderScannerScanMethod<O>, options?: O) {
		this.#options = options;
		this.#cache = new Cache(type, glob, files => {
			return method(Array.from(files), options);
		});
	}

	/**
	 * Scans component files.
	 *
	 * @param newFileList
	 * @returns
	 */
	async scan() {
		const pretenders = await this.#cache.get();
		return pretenders;
	}

	/**
	 * Stops watching.
	 * It does nothing if it is not in watching mode.
	 */
	async unwatch() {
		await this.#watcher?.close();
	}

	/**
	 * Starts watching related files.
	 * It passes the results of pretenders to callback every file changed.
	 *
	 * @param callback
	 */
	async watch(callback: () => void) {
		this.#watcher = await Watcher.create(this.#cache.glob, this.#options);
		this.#watcher.addChangeListener(async (file, type) => {
			const pretenders = type === 'unlink' ? await this.#cache.delete(file) : await this.#cache.update(file);
			if (!pretenders) {
				return;
			}
			callback();
		});
	}
}

function resolvePretendersConfig(config: PretendersConfig): Promise<[data: Pretender[], scan?: PretenderScanConfig[]]> {
	if (!config) {
		return Promise.resolve([[], []]);
	}

	const data: Pretender[] = [];

	if (config.files) {
		for (const file of config.files) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const pretenderFile: PretenderFileData = require(file);
			data.push(...pretenderFile.data);
		}
	}

	// Experimental
	if (config.imports) {
		for (const module of config.imports) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const pretenderFile: PretenderFileData = require(`${module}/pretenders.json`);
			data.push(...pretenderFile.data);
		}
	}

	if (config.data) {
		data.push(...config.data);
	}

	return Promise.resolve([data, config.scan]);
}
