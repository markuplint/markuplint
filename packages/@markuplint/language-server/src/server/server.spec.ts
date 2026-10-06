import type { InitializationOptions } from '../types.js';
import type { Diagnostic, InitializeResult } from 'vscode-languageserver/node.js';

import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { pathToFileURL } from 'node:url';

import {
	ErrorCodes,
	ResponseError,
	createMessageConnection,
	StreamMessageReader,
	StreamMessageWriter,
} from 'vscode-jsonrpc/node.js';
import { createConnection, DiagnosticSeverity, ProposedFeatures } from 'vscode-languageserver/node.js';
import { afterEach, describe, expect, test } from 'vitest';

import { bootServer } from './server.js';

const MARKUP_WITH_ERROR_AND_WARNING =
	'<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><title>t</title></head><body><img src="a.png" width="1" height="1"><p id=a>x</p></body></html>\n';

type Received = { readonly kind: 'notification' | 'request'; readonly method: string; readonly params: any };

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

/**
 * Wires the server to a JSON-RPC client over in-memory streams. The client answers no
 * server-to-client request, exactly like an LSP client that knows nothing about markuplint.
 */
function startServer() {
	const toServer = new PassThrough();
	const fromServer = new PassThrough();
	bootServer(createConnection(ProposedFeatures.all, toServer, fromServer));

	const client = createMessageConnection(new StreamMessageReader(fromServer), new StreamMessageWriter(toServer));
	const received: Received[] = [];
	client.onNotification((method, params) => {
		received.push({ kind: 'notification', method, params });
	});
	client.onRequest((method, params) => {
		received.push({ kind: 'request', method, params });
		throw new ResponseError(ErrorCodes.MethodNotFound, `Unhandled method ${method}`);
	});
	client.listen();
	cleanups.push(() => {
		client.dispose();
	});

	return { client, received };
}

function createWorkspace(files: Record<string, string>) {
	const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'markuplint-language-server-')));
	for (const [name, content] of Object.entries(files)) {
		const filePath = path.join(root, name);
		mkdirSync(path.dirname(filePath), { recursive: true });
		writeFileSync(filePath, content);
	}
	cleanups.push(() => {
		rmSync(root, { recursive: true, force: true });
	});
	return root;
}

async function waitFor<T>(find: () => T | undefined, description: string): Promise<T> {
	const deadline = Date.now() + 8000;
	let found = find();
	while (found === undefined) {
		if (Date.now() > deadline) {
			throw new Error(`Timed out waiting for ${description}`);
		}
		await new Promise(resolve => setTimeout(resolve, 20));
		found = find();
	}
	return found;
}

async function openDocument(
	options: {
		readonly initializationOptions?: InitializationOptions;
		readonly fileName?: string;
		readonly text?: string;
		readonly languageId?: string;
	},
	root: string,
) {
	const session = startServer();
	const result: InitializeResult = await session.client.sendRequest('initialize', {
		processId: null,
		locale: 'en',
		rootUri: pathToFileURL(root).href,
		capabilities: {},
		initializationOptions: options.initializationOptions,
	});
	void session.client.sendNotification('initialized', {});

	const uri = pathToFileURL(path.join(root, options.fileName ?? 'index.html')).href;
	void session.client.sendNotification('textDocument/didOpen', {
		textDocument: {
			uri,
			languageId: options.languageId ?? 'html',
			version: 1,
			text: options.text ?? MARKUP_WITH_ERROR_AND_WARNING,
		},
	});

	return { ...session, result, uri };
}

async function waitForDiagnostics(received: readonly Received[], uri: string): Promise<Diagnostic[]> {
	const published = await waitFor(
		() => received.find(m => m.method === 'textDocument/publishDiagnostics' && m.params.uri === uri),
		'publishDiagnostics',
	);
	return published.params.diagnostics;
}

describe('a client that sends no initializationOptions', () => {
	test('can initialize the server', async () => {
		const root = createWorkspace({});
		const { result } = await openDocument({}, root);
		expect(result.capabilities.hoverProvider).toBe(true);
	});

	test('receives diagnostics for any language it opens', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({ languageId: 'anything' }, root);
		const diagnostics = await waitForDiagnostics(received, uri);
		expect(diagnostics.map(d => d.code)).toContain('a11y/require-accessible-name');
	});

	test('lints with markuplint:recommended when no config file exists', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({}, root);
		const diagnostics = await waitForDiagnostics(received, uri);
		expect(diagnostics.map(d => d.code)).toStrictEqual(
			expect.arrayContaining(['a11y/require-accessible-name', 'a11y/required-h1']),
		);
	});

	test('lints with the config file next to the document', async () => {
		const root = createWorkspace({
			'.markuplintrc': JSON.stringify({ rules: { 'attr-value-quotes': true } }),
		});
		const { received, uri } = await openDocument({}, root);
		const diagnostics = await waitForDiagnostics(received, uri);
		expect(diagnostics.map(d => d.code)).toStrictEqual(['attr-value-quotes']);
	});

	test('sends no markuplint/* message', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({}, root);
		await waitForDiagnostics(received, uri);
		expect(received.filter(m => m.method.startsWith('markuplint/'))).toStrictEqual([]);
	});

	test('receives its logs as window/logMessage', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({}, root);
		await waitForDiagnostics(received, uri);
		expect(received.some(m => m.method === 'window/logMessage')).toBe(true);
	});
});

describe('a client that opts in to the extended protocol', () => {
	test('receives the markuplint/* messages', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({ initializationOptions: { extendedProtocol: true } }, root);
		await waitForDiagnostics(received, uri);
		expect(received.filter(m => m.method.startsWith('markuplint/')).map(m => m.method)).toStrictEqual(
			expect.arrayContaining(['markuplint/ready', 'markuplint/log-primary-channel']),
		);
	});

	test('receives no window/logMessage', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({ initializationOptions: { extendedProtocol: true } }, root);
		await waitForDiagnostics(received, uri);
		expect(received.some(m => m.method === 'window/logMessage')).toBe(false);
	});
});

describe('a client that lists languages in langConfigs', () => {
	const hover = { accessibility: { enable: true } };

	test('lints a language that is enabled', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument(
			{
				initializationOptions: {
					langConfigs: { html: { enable: true, debug: false, hover } },
				},
			},
			root,
		);
		const diagnostics = await waitForDiagnostics(received, uri);
		expect(diagnostics.map(d => d.code)).toContain('a11y/require-accessible-name');
	});

	test('does not lint a language that is disabled', async () => {
		const root = createWorkspace({});
		const { received } = await openDocument(
			{
				initializationOptions: {
					langConfigs: { html: { enable: false, debug: false, hover } },
				},
			},
			root,
		);
		await waitFor(
			() =>
				received.find(
					m => m.method === 'window/logMessage' && /Disabled for languageId:html/.test(m.params.message),
				),
			'the disabled notice',
		);
		expect(received.some(m => m.method === 'textDocument/publishDiagnostics')).toBe(false);
	});

	test('does not lint a language that is not listed', async () => {
		const root = createWorkspace({});
		const { received } = await openDocument(
			{
				initializationOptions: {
					langConfigs: { vue: { enable: true, debug: false, hover } },
				},
			},
			root,
		);
		await waitFor(
			() =>
				received.find(
					m => m.method === 'window/logMessage' && /Disabled for languageId:html/.test(m.params.message),
				),
			'the disabled notice',
		);
		expect(received.some(m => m.method === 'textDocument/publishDiagnostics')).toBe(false);
	});
});

describe('severityMap', () => {
	test('reports markuplint warnings with their own severity by default', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument({}, root);
		const diagnostics = await waitForDiagnostics(received, uri);
		expect(diagnostics.find(d => d.code === 'a11y/required-h1')?.severity).toBe(DiagnosticSeverity.Warning);
	});

	test('re-reports warnings as errors', async () => {
		const root = createWorkspace({});
		const { received, uri } = await openDocument(
			{ initializationOptions: { severityMap: { warning: 'error' } } },
			root,
		);
		const diagnostics = await waitForDiagnostics(received, uri);
		expect(diagnostics.find(d => d.code === 'a11y/required-h1')?.severity).toBe(DiagnosticSeverity.Error);
	});
});

describe('hover and code actions for a client that sends no settings', () => {
	// `<button>` starts at the 51st character of the second line.
	const BUTTON_MARKUP =
		'<!doctype html>\n<html lang="en"><head><title>t</title></head><body><button>Go</button></body></html>\n';

	test('answers a hover with the accessibility properties of the element', async () => {
		const root = createWorkspace({});
		const { client, received, uri } = await openDocument({ text: BUTTON_MARKUP }, root);
		await waitForDiagnostics(received, uri);

		const hover = await client.sendRequest<{ contents: { value: string } } | null>('textDocument/hover', {
			textDocument: { uri },
			position: { line: 1, character: 53 },
		});

		expect(hover?.contents.value).toContain('`<button>`');
	});

	test('offers the fixes of the violations', async () => {
		const root = createWorkspace({
			'.markuplintrc': JSON.stringify({ rules: { 'attr-value-quotes': true } }),
		});
		const { client, received, uri } = await openDocument({}, root);
		const diagnostics = await waitForDiagnostics(received, uri);

		const actions = await client.sendRequest<{ title: string; kind: string; edit: { changes: object } }[]>(
			'textDocument/codeAction',
			{
				textDocument: { uri },
				range: diagnostics[0]!.range,
				context: { diagnostics },
			},
		);

		expect(actions.map(action => action.kind)).toStrictEqual(['quickfix', 'source.fixAll.markuplint']);
		expect(Object.keys(actions[0]!.edit.changes)).toStrictEqual([uri]);
	});
});
