import { VerifiedResult } from '../rule';
export interface ReporterConfig {
    color: boolean;
    problemOnly: boolean;
    noStdOut: boolean;
}
export declare type Optional<C> = {
    [P in keyof C]?: C[P];
};
export declare function standardReporter(targetPath: string, results: VerifiedResult[], rawSource: string, options: Optional<ReporterConfig>): Promise<string[]>;
export declare function simpleReporter(targetPath: string, results: VerifiedResult[], rawSource: string, options: Optional<ReporterConfig>): Promise<string[]>;
