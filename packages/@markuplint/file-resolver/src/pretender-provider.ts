import type {
	OptimizedConfig,
	Pretender,
	PretenderFileData,
	PretenderScanConfig,
	PretenderScanOptions,
} from '@markuplint/ml-config';
import type { PretenderScannerScanMethod } from '@markuplint/pretenders';

import { Cache } from '@markuplint/cache';

type PretendersConfig = OptimizedConfig['pretenders'];

const DIDNT_SPECIFY_CONFIG_ERROR_MSG =
	'Cannot return pretenders because it did not specify the configuration yet. It might be the wrong order to call this method';

export class PretenderProvider {
	#staticData: Pretender[] | null = null;
	#scanners: Scanner[] = [];

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
	}
}

class Scanner<O extends PretenderScanOptions = PretenderScanOptions> {
	#cache: Cache<Pretender[]>;

	constructor(type: string, glob: string, options: O, method: PretenderScannerScanMethod<O>) {
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
