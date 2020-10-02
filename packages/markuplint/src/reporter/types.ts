import { MLResultInfo } from '../types';

export type ReportingData = MLResultInfo & {
	format: string;
	color: boolean;
	problemOnly: boolean;
	noStdOut: boolean;
	verbose: boolean;
};

export type Optional<C> = { [P in keyof C]?: C[P] };
