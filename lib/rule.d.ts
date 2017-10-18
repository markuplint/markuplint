import { Document } from './parser';
import { Ruleset } from './ruleset';
export interface RuleInterface {
    name: string;
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
export interface VerifiedReport {
    message: string;
    line: number;
    col: number;
    raw: string;
}
export default abstract class Rule implements RuleInterface {
    readonly name: string;
    constructor(name: string);
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
