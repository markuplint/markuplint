import type { PretenderScanOptions, Pretender } from '@markuplint/ml-config';

export type PretenderScannerScanMethod<O extends PretenderScanOptions = PretenderScanOptions> =
	/**
	 * @param files Absolute file paths. If it includes a relative path, throw an error.
	 * @param options
	 */
	(files: readonly string[], options?: Readonly<O>) => Promise<Pretender[]>;

export type Identifier = Pretender['selector'];
export type Identity = Pretender['as'];

export type Attr = {
	readonly nodeType: 'static' | 'boolean' | 'dynamic' | 'spread';
	readonly name: string;
	readonly value: string;
	readonly type?: string;
};
