import type { Config } from '../types.js';
import type { MLEngine } from 'markuplint';

import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { loadSuppressions } from './suppression-support.js';
import * as v2 from './v2.js';
import * as v3 from './v3.js';
import * as v4 from './v4.js';
import * as v5 from './v5.js';

vi.mock('./suppression-support.js', () => ({
	loadSuppressions: vi.fn(() => Promise.resolve(null)),
	applySuppressionsToViolations: vi.fn(),
}));

type Listener = (...args: readonly unknown[]) => void;

class FakeEngine {
	static instances: FakeEngine[] = [];

	static toMLFile() {
		return Promise.resolve({});
	}

	readonly listeners = new Map<string, Listener>();
	readonly close = vi.fn(() => Promise.resolve());
	readonly setCode = vi.fn(() => Promise.resolve());

	constructor() {
		FakeEngine.instances.push(this);
	}

	on(event: string, listener: Listener) {
		this.listeners.set(event, listener);
	}

	exec() {
		return Promise.resolve();
	}
}

const FakeMLEngine = FakeEngine as unknown as typeof MLEngine;

const root = path.join(os.tmpdir(), 'markuplint-language-server-close');
const doc = TextDocument.create(pathToFileURL(path.join(root, 'index.html')).href, 'html', 1, '<html></html>');
const config: Config = { enable: true, debug: false, hover: { accessibility: { enable: true } } };

const noop = vi.fn();

const handlers = [
	{
		version: 2,
		open: () => v2.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, root, noop),
		close: () => v2.onDidClose(doc.uri),
	},
	{
		version: 3,
		open: () => v3.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root),
		close: () => v3.onDidClose(doc.uri),
	},
	{
		version: 4,
		open: () => v4.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root),
		close: () => v4.onDidClose(doc.uri),
	},
	{
		version: 5,
		open: () => v5.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root),
		close: () => v5.onDidClose(doc.uri),
	},
] as const;

beforeEach(() => {
	FakeEngine.instances = [];
});

describe.each(handlers)('v$version onDidClose', ({ open, close }) => {
	test('closes the engine of the closed document', async () => {
		await open();
		expect(FakeEngine.instances).toHaveLength(1);

		await close();

		expect(FakeEngine.instances[0]!.close).toHaveBeenCalledTimes(1);
	});

	test('drops the engine so that reopening the document creates a new one', async () => {
		await open();
		await open();
		expect(FakeEngine.instances).toHaveLength(1);

		await close();
		await open();

		expect(FakeEngine.instances).toHaveLength(2);

		await close();
	});

	test('does nothing for a document that was never opened', async () => {
		await expect(close()).resolves.toBeUndefined();
		expect(FakeEngine.instances).toHaveLength(0);
	});
});

describe('lints pending at close and the fix state', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('v4 drops the fix state of the closed document', async () => {
		await v4.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root);
		FakeEngine.instances[0]!.listeners.get('lint')!(root, '<html></html>', [], '<html></html>', undefined, null);
		await vi.advanceTimersByTimeAsync(300);
		expect(v4.getFixState(doc.uri)).toBeDefined();

		await v4.onDidClose(doc.uri);

		expect(v4.getFixState(doc.uri)).toBeUndefined();
	});

	test('v2, v3 and v4 do not touch the engine for a change still pending when the document is closed', async () => {
		await v2.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, root, noop);
		await v3.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root);
		await v4.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root);

		v2.onDidChangeContent(doc, noop);
		await v2.onDidClose(doc.uri);
		await vi.advanceTimersByTimeAsync(300);
		v3.onDidChangeContent(doc, noop, noop);
		await v3.onDidClose(doc.uri);
		await vi.advanceTimersByTimeAsync(300);
		v4.onDidChangeContent(doc, noop, noop);
		await v4.onDidClose(doc.uri);
		await vi.advanceTimersByTimeAsync(300);

		expect(FakeEngine.instances).toHaveLength(3);
		for (const engine of FakeEngine.instances) {
			expect(engine.setCode).not.toHaveBeenCalled();
		}
	});

	test('v3 and v4 publish no diagnostics for a lint still pending when the document is closed', async () => {
		const sendV3 = vi.fn();
		const sendV4 = vi.fn();
		await v3.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, sendV3, noop, root);
		await v4.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, sendV4, noop, root);
		FakeEngine.instances[0]!.listeners.get('lint')!(root, '<html></html>', [], '<html></html>');
		FakeEngine.instances[1]!.listeners.get('lint')!(root, '<html></html>', [], '<html></html>', undefined, null);

		await v3.onDidClose(doc.uri);
		await v4.onDidClose(doc.uri);
		await vi.advanceTimersByTimeAsync(300);

		expect(sendV3).not.toHaveBeenCalled();
		expect(sendV4).not.toHaveBeenCalled();
		expect(v4.getFixState(doc.uri)).toBeUndefined();
	});

	test('v5 drops the fix state of the closed document', async () => {
		await v5.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, noop, noop, root);
		FakeEngine.instances[0]!.listeners.get('lint')!(root, '<html></html>', [], '<html></html>', undefined, null);
		await vi.advanceTimersByTimeAsync(300);
		expect(v5.getFixState(doc.uri)).toBeDefined();

		await v5.onDidClose(doc.uri);

		expect(v5.getFixState(doc.uri)).toBeUndefined();
	});

	test('v5 publishes no diagnostics for a lint still pending when the document is closed', async () => {
		const sendDiagnostics = vi.fn();
		await v5.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, sendDiagnostics, noop, root);
		FakeEngine.instances[0]!.listeners.get('lint')!(root, '<html></html>', [], '<html></html>', undefined, null);

		await v5.onDidClose(doc.uri);
		await vi.advanceTimersByTimeAsync(300);

		expect(sendDiagnostics).not.toHaveBeenCalled();
		expect(v5.getFixState(doc.uri)).toBeUndefined();
	});

	test('v5 publishes no diagnostics for a lint that was waiting for the suppressions when the document is closed', async () => {
		const sendDiagnostics = vi.fn();
		let finishLoading: (cache: null) => void = () => {};
		vi.mocked(loadSuppressions).mockReturnValueOnce(
			new Promise<null>(resolve => {
				finishLoading = resolve;
			}),
		);
		await v5.onDidOpen(doc, FakeMLEngine, config, 'en', noop, noop, sendDiagnostics, noop, root);
		FakeEngine.instances[0]!.listeners.get('lint')!(root, '<html></html>', [], '<html></html>', undefined, null);
		await vi.advanceTimersByTimeAsync(300);

		await v5.onDidClose(doc.uri);
		finishLoading(null);
		await vi.advanceTimersByTimeAsync(0);

		expect(sendDiagnostics).not.toHaveBeenCalled();
		expect(v5.getFixState(doc.uri)).toBeUndefined();
	});
});
