import { exec, execSync } from './';
import { MarkupLintOptions } from './types';
import { VerifiedResult } from '@markuplint/ml-config';

export async function testAsyncAndSyncExec(options: MarkupLintOptions, result?: VerifiedResult[]): Promise<void>;
// eslint-disable-next-line no-redeclare
export async function testAsyncAndSyncExec<T>(
	options: MarkupLintOptions,
	result: T,
	mapper: (results: VerifiedResult[]) => T,
): Promise<void>;
// eslint-disable-next-line no-redeclare
export async function testAsyncAndSyncExec<T = VerifiedResult[]>(
	options: MarkupLintOptions,
	result: T = ([] as unknown) as T,
	mapper?: (results: VerifiedResult[]) => T,
): Promise<void> {
	[await exec(options), execSync(options)].forEach(([{ results }]) => {
		expect(mapper ? mapper(results) : results).toStrictEqual(result);
	});
}
