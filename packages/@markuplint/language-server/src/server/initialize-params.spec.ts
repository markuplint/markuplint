import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, test } from 'vitest';

import { resolveInitialization } from './initialize-params.js';

// Resolved so the paths are absolute on Windows too, where `/workspace/a` is relative to a drive.
const folderA = path.resolve('/workspace/a');
const folderB = path.resolve('/workspace/b');

describe('resolveInitialization', () => {
	test('accepts an initialize request without initializationOptions', () => {
		expect(resolveInitialization({ initializationOptions: undefined })).toStrictEqual({
			locale: 'en',
			options: {},
			workspaceFolders: [],
		});
	});

	test('accepts a null initializationOptions', () => {
		expect(resolveInitialization({ initializationOptions: null })).toStrictEqual({
			locale: 'en',
			options: {},
			workspaceFolders: [],
		});
	});

	test('reads the locale of the client', () => {
		expect(resolveInitialization({ locale: 'ja' }).locale).toBe('ja');
	});

	test('prefers workspaceFolders of initializationOptions', () => {
		const { workspaceFolders } = resolveInitialization({
			initializationOptions: { workspaceFolders: [folderA] },
			workspaceFolders: [{ uri: pathToFileURL(folderB).href, name: 'b' }],
			rootUri: pathToFileURL(folderB).href,
		});
		expect(workspaceFolders).toStrictEqual([folderA]);
	});

	test('falls back to the LSP workspaceFolders', () => {
		const { workspaceFolders } = resolveInitialization({
			workspaceFolders: [
				{ uri: pathToFileURL(folderA).href, name: 'a' },
				{ uri: pathToFileURL(folderB).href, name: 'b' },
			],
			rootUri: pathToFileURL('/ignored').href,
		});
		expect(workspaceFolders).toStrictEqual([folderA, folderB]);
	});

	test('falls back to rootUri when the client has no workspaceFolders', () => {
		const { workspaceFolders } = resolveInitialization({
			workspaceFolders: null,
			rootUri: pathToFileURL(folderA).href,
		});
		expect(workspaceFolders).toStrictEqual([folderA]);
	});

	test('ignores a workspace folder that is not a file URI', () => {
		const { workspaceFolders } = resolveInitialization({
			workspaceFolders: [{ uri: 'untitled:Workspace', name: 'w' }],
		});
		expect(workspaceFolders).toStrictEqual([]);
	});

	test('passes the other options through', () => {
		const { options } = resolveInitialization({
			initializationOptions: {
				extendedProtocol: true,
				severityMap: { warning: 'error' },
				gitPath: '/usr/bin/git',
			},
		});
		expect(options).toStrictEqual({
			extendedProtocol: true,
			severityMap: { warning: 'error' },
			gitPath: '/usr/bin/git',
		});
	});
});
