import type { PretenderScanOptions } from '@markuplint/ml-config';

export interface PretenderScanJSXOptions extends PretenderScanOptions {
	asFragment?: readonly (Readonly<RegExp> | string)[];
	taggedStylingComponent?: readonly (Readonly<RegExp> | string)[];
	extendingWrapper?: readonly (string | Readonly<RegExp> | ExtendingWrapperCallerOptions)[];
}

export type ExtendingWrapperCallerOptions = {
	readonly identifier: string | Readonly<RegExp>;
	readonly numberOfArgument: number;
};
