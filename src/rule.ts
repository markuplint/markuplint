import {
	Document,
} from './parser';
import {
	Ruleset,
} from './ruleset';

export interface VerifiedReport {
	level: 'error' | 'warning';
	message: string;
	line: number;
	col: number;
	raw: string;
}

export default abstract class Rule {
	public readonly name: string;
	public defaultLevel: 'error' | 'warning' = 'error';

	public abstract verify (document: Document, ruleset: Ruleset): VerifiedReport[];
}
