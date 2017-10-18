import {
	Document,
} from './parser';
import {
	Ruleset,
} from './ruleset';

export interface RuleInterface {
	name: string;
	verify (document: Document, ruleset: Ruleset): VerifiedReport[];
}

export interface VerifiedReport {
	message: string;
	line: number;
	col: number;
	raw: string;
}

export default abstract class Rule implements RuleInterface {
	public readonly name: string;

	constructor (name: string) {
		this.name = name;
	}

	public verify (document: Document, ruleset: Ruleset) {
		return [] as VerifiedReport[];
	}
}
