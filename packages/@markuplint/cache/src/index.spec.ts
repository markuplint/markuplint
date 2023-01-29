import fs from 'node:fs';
import path from 'node:path';

import { Cache } from '.';

const TEST_DIR = path.resolve(__dirname, '..', '__test__');
const TEST_WILL_ADD_FILE = path.resolve(TEST_DIR, 'f');
const TEST_WILL_DELETE_FILE = path.resolve(TEST_DIR, 'a');

beforeAll(() => {
	fs.existsSync(TEST_WILL_ADD_FILE) && fs.rmSync(TEST_WILL_ADD_FILE);
	fs.writeFileSync(TEST_WILL_DELETE_FILE, '');
});

afterEach(() => {
	fs.existsSync(TEST_WILL_ADD_FILE) && fs.rmSync(TEST_WILL_ADD_FILE);
	fs.writeFileSync(TEST_WILL_DELETE_FILE, '');
});

describe('Basic', () => {
	test('Cache::get', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		const result = await cache.get();

		expect(result).toBe(['a', 'b', 'c', 'd'].map(item => path.resolve(TEST_DIR, item)).join());
	});

	test('Cache::update', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		const result = await cache.update(path.resolve(TEST_DIR, 'a'));

		expect(result).toBe(['a', 'b', 'c', 'd'].map(item => path.resolve(TEST_DIR, item)).join());
		expect(result).toBe(await cache.get());
	});

	test('Cache::update (non-existence)', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		const result = await cache.update(path.resolve(TEST_DIR, 'e'));

		expect(result).toBe(null);
	});

	test('Cache::update (out of glob pattern)', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		const result = await cache.update(path.resolve(TEST_DIR, '..', 'out-of-glob'));

		expect(result).toBe(null);
	});

	test('Cache::update (added new file)', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		fs.writeFileSync(TEST_WILL_ADD_FILE, 'EOF');
		const result = await cache.update(TEST_WILL_ADD_FILE);

		expect(result).toBe(['a', 'b', 'c', 'd', 'f'].map(item => path.resolve(TEST_DIR, item)).join());
		expect(result).toBe(await cache.get());
	});

	test('Cache::delete', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		fs.rmSync(TEST_WILL_DELETE_FILE);
		const result = await cache.delete(TEST_WILL_DELETE_FILE);

		expect(result).toBe(['b', 'c', 'd'].map(item => path.resolve(TEST_DIR, item)).join());
	});

	test('Cache::delete (a file was not deleted)', async () => {
		const cache = new Cache('A', path.resolve(TEST_DIR, '*'), files => {
			return Promise.resolve(Array.from(files).join());
		});
		const result = await cache.delete(TEST_WILL_DELETE_FILE);

		expect(result).toBe(null);
	});
});
