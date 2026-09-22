import type { Module } from './get-module.js';
import type { Config, LangConfigs } from '../types.js';
import type { CodeActionParams } from 'vscode-languageserver/node.js';

import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { createEventHandlers } from './document-events.js';
import * as v2 from './v2.js';
import * as v3 from './v3.js';
import * as v4 from './v4.js';
import * as v5 from './v5.js';

vi.mock('./v2.js', () => ({ onDidOpen: vi.fn(), onDidChangeContent: vi.fn() }));
vi.mock('./v3.js', () => ({
	onDidOpen: vi.fn(),
	onDidChangeContent: vi.fn(),
	getNodeWithAccessibilityProps: vi.fn(),
}));
vi.mock('./v4.js', () => ({
	onDidOpen: vi.fn(),
	onDidChangeContent: vi.fn(),
	getNodeWithAccessibilityProps: vi.fn(),
}));
vi.mock('./v5.js', () => ({
	onDidOpen: vi.fn(),
	onDidChangeContent: vi.fn(),
	getNodeWithAccessibilityProps: vi.fn(),
	onCodeAction: vi.fn(() => []),
}));
vi.mock('../i18n.js', () => ({ t: (template: string) => template }));

const root = path.join(os.tmpdir(), 'markuplint-4048');
const appDir = path.join(root, 'applications', 'app');
const libDir = path.join(root, 'packages', 'lib');
const fourDir = path.join(root, 'packages', 'four');
const legacyDir = path.join(root, 'packages', 'legacy');
const brokenDir = path.join(root, 'packages', 'broken');

const moduleVersions = new Map([
	[appDir, '5.0.0'],
	[libDir, '3.5.0'],
	[fourDir, '4.5.0'],
	[legacyDir, '2.9.0'],
]);

function htmlDoc(dir: string) {
	return TextDocument.create(pathToFileURL(path.join(dir, 'index.html')).href, 'html', 1, '<html></html>');
}

const appDoc = TextDocument.create(
	pathToFileURL(path.join(appDir, 'src', 'Foo.tsx')).href,
	'typescriptreact',
	1,
	'<div />',
);
const libDoc = htmlDoc(libDir);
const fourDoc = htmlDoc(fourDir);
const legacyDoc = htmlDoc(legacyDir);
const brokenDoc = htmlDoc(brokenDir);
const vueDoc = TextDocument.create(pathToFileURL(path.join(appDir, 'App.vue')).href, 'vue', 1, '<template />');

const config: Config = {
	enable: true,
	debug: false,
	defaultConfig: {},
	hover: { accessibility: { enable: true, ariaVersion: '1.2' } },
};
const langConfigs: LangConfigs = { html: config, typescriptreact: config };

function fakeModule(version: string, workspace: string): Module {
	return {
		isLocalModule: true,
		version,
		moduleType: 'module',
		markuplint: { MLEngine: class {} },
		ariaRecommendedVersion: '1.2',
		workspace,
	};
}

function codeActionParams(uri: string): CodeActionParams {
	return {
		textDocument: { uri },
		range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
		context: { diagnostics: [] },
	};
}

function setup(withWorkingDirectories = true) {
	const resolveModule = vi.fn((workspace: string) => {
		const key = path.resolve(workspace);
		if (key === brokenDir) {
			return Promise.reject(new Error('boom'));
		}
		return Promise.resolve(fakeModule(moduleVersions.get(key) ?? '3.5.0', key));
	});
	const reportStatus = vi.fn();
	const log = vi.fn();
	const errorLog = vi.fn();
	const handlers = createEventHandlers({
		resolveModule,
		locale: 'en',
		langConfigs,
		workingDirectories: withWorkingDirectories
			? [{ pattern: './applications/*/' }, { pattern: './packages/*/' }]
			: undefined,
		workspaceFolders: [root],
		log,
		diagnosticsLog: vi.fn(),
		errorLog,
		sendDiagnostics: vi.fn(),
		reportStatus,
	});
	return { handlers, resolveModule, reportStatus, log, errorLog };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('createEventHandlers', () => {
	test('resolves the module from the working directory the document maps to', async () => {
		const { handlers, resolveModule, reportStatus } = setup();
		handlers.onDidOpen(appDoc);
		await vi.waitFor(() => expect(v5.onDidOpen).toHaveBeenCalledTimes(1));

		expect(resolveModule).toHaveBeenCalledTimes(1);
		expect(path.resolve(resolveModule.mock.calls[0]![0])).toBe(appDir);

		const mod = await resolveModule.mock.results[0]!.value;
		const args = vi.mocked(v5.onDidOpen).mock.calls[0]!;
		expect(args[0]).toBe(appDoc);
		expect(args[1]).toBe(mod.markuplint.MLEngine);
		expect(path.resolve(args[8])).toBe(appDir);
		expect(reportStatus).toHaveBeenCalledWith(mod);
	});

	test('falls back to the document directory when workingDirectories is unset', async () => {
		const { handlers, resolveModule } = setup(false);
		handlers.onDidOpen(appDoc);
		await vi.waitFor(() => expect(resolveModule).toHaveBeenCalledTimes(1));
		expect(path.resolve(resolveModule.mock.calls[0]![0])).toBe(path.join(appDir, 'src'));
	});

	test('dispatches each document to the handler for its own module version', async () => {
		const { handlers } = setup();
		handlers.onDidOpen(appDoc);
		handlers.onDidOpen(libDoc);
		await vi.waitFor(() => {
			expect(v5.onDidOpen).toHaveBeenCalledTimes(1);
			expect(v3.onDidOpen).toHaveBeenCalledTimes(1);
		});
		expect(vi.mocked(v5.onDidOpen).mock.calls[0]![0]).toBe(appDoc);
		expect(vi.mocked(v3.onDidOpen).mock.calls[0]![0]).toBe(libDoc);
	});

	test('passes the workspace to v4 in the same position as v3 and v5', async () => {
		const { handlers } = setup();
		handlers.onDidOpen(fourDoc);
		await vi.waitFor(() => expect(v4.onDidOpen).toHaveBeenCalledTimes(1));
		const args = vi.mocked(v4.onDidOpen).mock.calls[0]!;
		expect(args[0]).toBe(fourDoc);
		expect(path.resolve(args[8])).toBe(fourDir);
	});

	test('passes the workspace to v2 before its trailing log parameter', async () => {
		const { handlers, log } = setup();
		handlers.onDidOpen(legacyDoc);
		await vi.waitFor(() => expect(v2.onDidOpen).toHaveBeenCalledTimes(1));
		const args = vi.mocked(v2.onDidOpen).mock.calls[0]!;
		expect(args[0]).toBe(legacyDoc);
		expect(path.resolve(args[6])).toBe(legacyDir);
		expect(args[7]).toBe(log);
	});

	test('reports a module load failure as a popup and runs no handler', async () => {
		const { handlers, errorLog } = setup();
		handlers.onDidOpen(brokenDoc);
		await vi.waitFor(() => expect(errorLog).toHaveBeenCalledTimes(1));
		expect(errorLog.mock.calls[0]![0]).toBe(`Failed to load markuplint for ${brokenDir}: Error: boom`);
		expect(v2.onDidOpen).not.toHaveBeenCalled();
		expect(v3.onDidOpen).not.toHaveBeenCalled();
		expect(v4.onDidOpen).not.toHaveBeenCalled();
		expect(v5.onDidOpen).not.toHaveBeenCalled();
	});

	test('does not resolve a module for a language that is disabled', async () => {
		const { handlers, resolveModule } = setup();
		handlers.onDidOpen(vueDoc);
		await Promise.resolve();
		expect(resolveModule).not.toHaveBeenCalled();
	});

	test('reuses the recorded module when a document is opened again and refreshes the status', async () => {
		const { handlers, resolveModule, reportStatus } = setup();
		handlers.onDidOpen(appDoc);
		await vi.waitFor(() => expect(v5.onDidOpen).toHaveBeenCalledTimes(1));
		handlers.onDidOpen(appDoc);
		await vi.waitFor(() => expect(v5.onDidOpen).toHaveBeenCalledTimes(2));
		expect(resolveModule).toHaveBeenCalledTimes(1);
		expect(reportStatus).toHaveBeenCalledTimes(2);
	});

	test('ignores change events for documents that have not been opened', async () => {
		const { handlers } = setup();
		handlers.onDidChangeContent(appDoc);
		await Promise.resolve();
		expect(v2.onDidChangeContent).not.toHaveBeenCalled();
		expect(v3.onDidChangeContent).not.toHaveBeenCalled();
		expect(v4.onDidChangeContent).not.toHaveBeenCalled();
		expect(v5.onDidChangeContent).not.toHaveBeenCalled();
	});

	test('routes change events to the version handler the document was opened with', async () => {
		const { handlers } = setup();
		handlers.onDidOpen(appDoc);
		handlers.onDidOpen(libDoc);
		await vi.waitFor(() => {
			expect(v5.onDidOpen).toHaveBeenCalledTimes(1);
			expect(v3.onDidOpen).toHaveBeenCalledTimes(1);
		});

		handlers.onDidChangeContent(appDoc);
		handlers.onDidChangeContent(libDoc);

		expect(v5.onDidChangeContent).toHaveBeenCalledTimes(1);
		expect(vi.mocked(v5.onDidChangeContent).mock.calls[0]![0]).toBe(appDoc);
		expect(v3.onDidChangeContent).toHaveBeenCalledTimes(1);
		expect(vi.mocked(v3.onDidChangeContent).mock.calls[0]![0]).toBe(libDoc);
	});

	test('returns no code actions for an unknown document or a pre-v5 module', async () => {
		const { handlers } = setup();
		expect(handlers.onCodeAction(codeActionParams(appDoc.uri))).toEqual([]);

		handlers.onDidOpen(libDoc);
		await vi.waitFor(() => expect(v3.onDidOpen).toHaveBeenCalledTimes(1));
		expect(handlers.onCodeAction(codeActionParams(libDoc.uri))).toEqual([]);
		expect(v5.onCodeAction).not.toHaveBeenCalled();
	});

	test('delegates code actions to v5 for documents opened with a v5 module', async () => {
		const { handlers } = setup();
		handlers.onDidOpen(appDoc);
		await vi.waitFor(() => expect(v5.onDidOpen).toHaveBeenCalledTimes(1));
		handlers.onCodeAction(codeActionParams(appDoc.uri));
		expect(v5.onCodeAction).toHaveBeenCalledTimes(1);
	});

	test('returns nothing on hover for a document that has not been opened', async () => {
		const { handlers } = setup();
		const hover = await handlers.onHover({
			textDocument: { uri: appDoc.uri },
			position: { line: 0, character: 0 },
		});
		expect(hover).toBeUndefined();
		expect(v3.getNodeWithAccessibilityProps).not.toHaveBeenCalled();
		expect(v4.getNodeWithAccessibilityProps).not.toHaveBeenCalled();
		expect(v5.getNodeWithAccessibilityProps).not.toHaveBeenCalled();
	});
});
