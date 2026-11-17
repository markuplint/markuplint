import { describe, expect, test } from 'vitest';

import { run } from './cli.ts';

describe('run', () => {
	test('prints the usage for a command that it does not know, and for none', async () => {
		expect(await run([])).toContain('Usage: yarn spec-baseline');
		expect(await run(['unknown'])).toContain('size');
	});

	test.each([
		[['size', '--every', 'abc'], '--every'],
		[['size', '--every', '0'], '--every'],
		[['duplication', '--top', '1.5'], '--top'],
		[['duplication', '--top=-3'], '--top'],
		[['mutation', '--count', 'many'], '--count'],
		[['mutation', '--seed=-1'], '--seed'],
	])('stops for an option that is not a count: %j', async (argv, option) => {
		await expect(Promise.resolve().then(() => run(argv))).rejects.toThrow(new RegExp(`${option} takes an integer`));
	});

	test('reads the duplication of the data at a revision of git', async () => {
		const report = await run(['duplication', '--ref', 'HEAD', '--top', '2']);
		expect(report).toContain('HEAD:');
		expect(report).toContain('the DAG that shares identical subtrees');
	});

	test('reads the duplication of the current data', async () => {
		const report = await run(['duplication', '--top', '3']);
		expect(report).toContain('strings:');
		expect(report).toContain('the DAG that shares identical subtrees');
	});
});
