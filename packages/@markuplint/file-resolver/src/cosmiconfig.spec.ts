import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, test, expect } from 'vitest';

import { stackLocation } from './cosmiconfig.js';

describe('stackLocation', () => {
	// Paths and URLs are made with `path` and `pathToFileURL`, so on Windows (`vitest.cross-os.config.ts`)
	// the frames are the ones Node.js prints there: `C:\p\…` and `file:///C:/p/…`.
	const configFile = path.resolve('/p', '.markuplintrc.js');

	test('the frame of an ES module, which names the file by its URL', () => {
		const stack = [
			'Error: x',
			`    at ${pathToFileURL(configFile).href}:2:31`,
			'    at ModuleJob.run (node:internal/modules/esm/module_job:569:25)',
		].join('\n');
		expect(stackLocation(stack, [configFile])).toBe(':2:31');
	});

	test('the frame of a CommonJS module, which names the file by its path', () => {
		const stack = ['Error: x', `    at Object.<anonymous> (${configFile}:3:9)`, '    at Module._compile'].join(
			'\n',
		);
		expect(stackLocation(stack, [configFile])).toBe(':3:9');
	});

	test('the frame nearest the throw when the file appears more than once', () => {
		const href = pathToFileURL(configFile).href;
		const stack = ['Error: x', `    at helper (${href}:5:3)`, `    at ${href}:9:1`].join('\n');
		expect(stackLocation(stack, [configFile])).toBe(':5:3');
	});

	test('the frame of any of the paths given, such as the real path of a symbolic link', () => {
		const realFile = path.resolve('/real', '.markuplintrc.js');
		const stack = ['Error: x', `    at ${pathToFileURL(realFile).href}:1:7`].join('\n');
		expect(stackLocation(stack, [configFile, realFile])).toBe(':1:7');
	});

	test('the line alone from the header of a syntax error in a CommonJS module', () => {
		const stack = [
			`${configFile}:3`,
			'export default {,};',
			'^^^^^^',
			'',
			"SyntaxError: Unexpected token 'export'",
		].join('\n');
		expect(stackLocation(stack, [configFile])).toBe(':3');
	});

	test('a Windows path written with forward slashes, as a module runner such as Vitest names it', () => {
		const stack = ['Error: x', '    at C:/q/p/.markuplintrc.js:1:7'].join('\n');
		expect(stackLocation(stack, [String.raw`C:\q\p\.markuplintrc.js`])).toBe(':1:7');
	});

	test('a path whose URL is percent-encoded', () => {
		const spaced = path.resolve('/p q', '.markuplintrc.js');
		const stack = ['Error: x', `    at ${pathToFileURL(spaced).href}:4:2`].join('\n');
		expect(stackLocation(stack, [spaced])).toBe(':4:2');
	});

	test('no location for a file that only ends with the same path', () => {
		const stack = ['Error: x', `    at /q${configFile}:1:1`].join('\n');
		expect(stackLocation(stack, [configFile])).toBe('');
	});

	test('no location for a stack without a frame of the file, as of a syntax error in an ES module', () => {
		const stack = [
			"SyntaxError: Unexpected token ','",
			'    at compileSourceTextModule (node:internal/modules/esm/utils:355:16)',
		].join('\n');
		expect(stackLocation(stack, [configFile])).toBe('');
	});
});
