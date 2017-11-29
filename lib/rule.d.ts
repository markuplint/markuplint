import { Document } from './parser';
import { Ruleset } from './ruleset';
export interface VerifiedReport {
    level: 'error' | 'warning';
    message: string;
    line: number;
    col: number;
    raw: string;
}
export default abstract class Rule {
    readonly name: string;
    defaultLevel: 'error' | 'warning';
    abstract verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
