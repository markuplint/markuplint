import { VerifiedResult } from '../rule';
export declare function standardReporter(targetPath: string, results: VerifiedResult[], rawSource: string, color?: boolean): Promise<void>;
export declare function simpleReporter(targetPath: string, results: VerifiedResult[], rawSource: string): Promise<void>;
