import type {
	OptimizedConfig,
	Pretender,
	PretenderFileData,
	PretenderScanConfig,
	PretenderScanOptions,
} from '@markuplint/ml-config';
import type { PretenderScannerScanMethod } from '@markuplint/pretenders';

import { asyncGlob } from './utils';

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
					const scanner = new Scanner(scan.files, scan.options, jsxScanner);
					this.#scanners.push(scanner);
				}
			}
		}
	}
}

class Scanner<O extends PretenderScanOptions = PretenderScanOptions> {
	#glob: string;
	readonly #options: O;
	readonly #method: PretenderScannerScanMethod<O>;

	constructor(glob: string, options: O, method: PretenderScannerScanMethod<O>) {
		this.#glob = glob;
		this.#options = options;
		this.#method = method;
	}

	/**
	 * Scans component files.
	 *
	 * @param newFileList
	 * @returns
	 */
	async scan() {
		const files = await asyncGlob(this.#glob);
		const pretenders = await this.#method(files, this.#options);
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
