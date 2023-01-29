import type { Pretender } from '@markuplint/ml-config';

import fs from 'node:fs';
import path from 'node:path';

import { PretenderProvider } from './pretender-provider';

/**
 * From @markuplint/pretenders test
 */
const TEST_DIR = path.resolve(__dirname, '..', '__test__', 'pretenders');
const TEST_WILL_REWRITE_FILE = path.resolve(TEST_DIR, 'a.jsx');
const TEST_ORIGINAL_TEXT = 'const ComponentA = () => <div className="a"></div>;';
const TEST_WILL_ADD_FILE = path.resolve(TEST_DIR, 'e.tsx');

beforeAll(() => {
	fs.writeFileSync(TEST_WILL_REWRITE_FILE, TEST_ORIGINAL_TEXT, { encoding: 'utf-8' });
	fs.existsSync(TEST_WILL_ADD_FILE) && fs.rmSync(TEST_WILL_ADD_FILE);
});

afterEach(() => {
	fs.writeFileSync(TEST_WILL_REWRITE_FILE, TEST_ORIGINAL_TEXT, { encoding: 'utf-8' });
	fs.existsSync(TEST_WILL_ADD_FILE) && fs.rmSync(TEST_WILL_ADD_FILE);
});

describe('Error', () => {
	test('Throw ReferenceError', () => {
		const providerA = new PretenderProvider();
		return expect(providerA.getPretenders()).rejects.toThrow(
			'Cannot return pretenders because it did not specify the configuration yet. It might be the wrong order to call this method',
		);
	});
});

describe('Basic', () => {
	test('Scan components', async () => {
		const provider = new PretenderProvider();
		await provider.setConfig({
			scan: [
				{
					type: 'jsx',
					files: path.resolve(TEST_DIR, '*.{js,mjs,jsx,tsx}'),
				},
			],
		});
		const pretenders = await provider.getPretenders();
		expect(pretenders.map(p => p.selector)).toStrictEqual(['ComponentA', 'ComponentB', 'ComponentC', 'ComponentD']);
	});
});

describe('Watch mode', () => {
	test('Add a component', async () => {
		const provider = new PretenderProvider();
		await provider.setConfig({
			scan: [
				{
					type: 'jsx',
					files: path.resolve(TEST_DIR, '*.{js,mjs,jsx,tsx}'),
				},
			],
		});
		const pretenders = await new Promise<Pretender[]>(resolve => {
			void provider
				.watch(async pretenders => {
					await provider.unwatch();
					resolve(pretenders);
				})
				.then(() => {
					fs.appendFileSync(
						TEST_WILL_REWRITE_FILE,
						'const ComponentAdded = () => <div className="added"></div>',
					);
				});
		});

		expect(pretenders.map(p => p.selector)).toStrictEqual([
			'ComponentA',
			'ComponentAdded',
			'ComponentB',
			'ComponentC',
			'ComponentD',
		]);
	});

	test('Delete a component', async () => {
		const provider = new PretenderProvider();
		await provider.setConfig({
			scan: [
				{
					type: 'jsx',
					files: path.resolve(TEST_DIR, '*.{js,mjs,jsx,tsx}'),
				},
			],
		});
		const pretenders = await new Promise<Pretender[]>(resolve => {
			void provider
				.watch(async pretenders => {
					await provider.unwatch();
					resolve(pretenders);
				})
				.then(() => {
					fs.writeFileSync(TEST_WILL_REWRITE_FILE, '');
				});
		});

		expect(pretenders.map(p => p.selector)).toStrictEqual(['ComponentB', 'ComponentC', 'ComponentD']);
	});

	test('Rename a component', async () => {
		const provider = new PretenderProvider();
		await provider.setConfig({
			scan: [
				{
					type: 'jsx',
					files: path.resolve(TEST_DIR, '*.{js,mjs,jsx,tsx}'),
				},
			],
		});
		const pretenders = await new Promise<Pretender[]>(resolve => {
			void provider
				.watch(async pretenders => {
					await provider.unwatch();
					resolve(pretenders);
				})
				.then(() => {
					const current = fs.readFileSync(TEST_WILL_REWRITE_FILE, { encoding: 'utf-8' });
					fs.writeFileSync(TEST_WILL_REWRITE_FILE, current.replace('ComponentA', 'RenamedComponentA'));
				});
		});

		expect(pretenders.map(p => p.selector)).toStrictEqual([
			'ComponentB',
			'ComponentC',
			'ComponentD',
			'RenamedComponentA',
		]);
	});

	test('Add a file', async () => {
		const provider = new PretenderProvider();
		await provider.setConfig({
			scan: [
				{
					type: 'jsx',
					files: path.resolve(TEST_DIR, '*.{js,mjs,jsx,tsx}'),
				},
			],
		});
		const pretenders = await new Promise<Pretender[]>(resolve => {
			void provider
				.watch(async pretenders => {
					await provider.unwatch();
					resolve(pretenders);
				})
				.then(() => {
					fs.writeFileSync(TEST_WILL_ADD_FILE, 'const ComponentE = () => <div className="e"></div>;');
				});
		});

		expect(pretenders.map(p => p.selector)).toStrictEqual([
			'ComponentA',
			'ComponentB',
			'ComponentC',
			'ComponentD',
			'ComponentE',
		]);
	});

	test('Delete a file', async () => {
		const provider = new PretenderProvider();
		await provider.setConfig({
			scan: [
				{
					type: 'jsx',
					files: path.resolve(TEST_DIR, '*.{js,mjs,jsx,tsx}'),
				},
			],
		});
		const pretenders = await new Promise<Pretender[]>(resolve => {
			void provider
				.watch(async pretenders => {
					await provider.unwatch();
					resolve(pretenders);
				})
				.then(() => {
					fs.rmSync(TEST_WILL_REWRITE_FILE);
				});
		});

		expect(pretenders.map(p => p.selector)).toStrictEqual(['ComponentB', 'ComponentC', 'ComponentD']);
	});
});
