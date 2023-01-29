import fs from 'node:fs';
import path from 'node:path';

import { Watcher } from './watcher';

const TEST_DIR = path.resolve(__dirname, '..');
const TEST_WILL_ADD_DIR = path.resolve(TEST_DIR, '__WATCHER__');
const TEST_WILL_ADD_FILE = path.resolve(TEST_WILL_ADD_DIR, 'TEST.txt');

beforeAll(() => {
	fs.existsSync(TEST_WILL_ADD_FILE) && fs.rmSync(TEST_WILL_ADD_FILE);
	fs.existsSync(TEST_WILL_ADD_DIR) && fs.rmdirSync(TEST_WILL_ADD_DIR);
});

afterEach(() => {
	fs.existsSync(TEST_WILL_ADD_FILE) && fs.rmSync(TEST_WILL_ADD_FILE);
	fs.existsSync(TEST_WILL_ADD_DIR) && fs.rmdirSync(TEST_WILL_ADD_DIR);
});

describe('Basic', () => {
	test('file list', async () => {
		const watcher = await Watcher.create(path.resolve(TEST_DIR, '*'));
		const files = watcher.files.map(file => path.relative(TEST_DIR, file));
		await watcher.close();
		expect(files).toStrictEqual([
			'.npmignore',
			'README.md',
			'__mocks__',
			'lib',
			'node_modules',
			'package.json',
			'src',
			'test',
			'tsconfig.json',
			'tsconfig.test.json',
			'tsconfig.tsbuildinfo',
		]);
	});

	test('Add file', done => {
		void Watcher.create(path.resolve(TEST_DIR, '**', '*')).then(watcher => {
			watcher.addChangeListener(async filePath => {
				if (filePath === TEST_WILL_ADD_FILE) {
					await watcher.close();
					done();
				}
			});

			fs.mkdirSync(TEST_WILL_ADD_DIR, { mode: 0o777 });
			fs.writeFileSync(TEST_WILL_ADD_FILE, '', { mode: 0o777 });
		});
	});

	test('Add file; Matched extetsion', done => {
		void Watcher.create(path.resolve(TEST_DIR, '**', '*.txt')).then(watcher => {
			watcher.addChangeListener(async filePath => {
				if (filePath === TEST_WILL_ADD_FILE) {
					await watcher.close();
					done();
				}
			});

			fs.mkdirSync(TEST_WILL_ADD_DIR, { mode: 0o777 });
			fs.writeFileSync(TEST_WILL_ADD_FILE, '', { mode: 0o777 });
		});
	});

	test('Add file; Unmatched extetsion', async () => {
		const watcher = await Watcher.create(path.resolve(TEST_DIR, '**', '*.ts'));

		const result = await Promise.race([
			new Promise<false>(resolve => {
				watcher.addChangeListener(async filePath => {
					if (filePath === TEST_WILL_ADD_FILE) {
						await watcher.close();
						resolve(false);
					}
				});

				fs.mkdirSync(TEST_WILL_ADD_DIR, { mode: 0o777 });
				fs.writeFileSync(TEST_WILL_ADD_FILE, '', { mode: 0o777 });
			}),
			new Promise<true>(resolve => {
				setTimeout(async () => {
					await watcher.close();
					resolve(true);
				}, 3000);
			}),
		]);

		expect(result).toBe(true);
	});
});
