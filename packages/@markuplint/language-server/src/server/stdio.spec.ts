// Spawns the built binary, as Claude Code, OpenCode and Neovim do, to cover the `--stdio` path
// that `server.spec.ts` (in-memory streams) and the VS Code extension (IPC) never take.
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { InitializeResult, PublishDiagnosticsParams } from 'vscode-languageserver';

import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { afterEach, expect, onTestFailed, test } from 'vitest';

const binPath = path.resolve(import.meta.dirname, '../../bin/markuplint-language-server.mjs');

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

/**
 * Splits raw stdout into LSP frames and throws on any byte that is not part of one.
 */
function parseFrames(stdout: Buffer) {
	const bodies: unknown[] = [];
	let offset = 0;
	while (offset < stdout.length) {
		const headerEnd = stdout.indexOf('\r\n\r\n', offset);
		const header = stdout.subarray(offset, headerEnd === -1 ? stdout.length : headerEnd).toString('utf8');
		const length = /^Content-Length: (\d+)(?:\r\n[^\r\n]+)*$/.exec(header)?.[1];
		if (headerEnd === -1 || length === undefined) {
			throw new Error(`Not an LSP frame at byte ${offset}: ${JSON.stringify(header.slice(0, 200))}`);
		}
		const bodyStart = headerEnd + 4;
		const bodyEnd = bodyStart + Number(length);
		bodies.push(JSON.parse(stdout.subarray(bodyStart, bodyEnd).toString('utf8')));
		offset = bodyEnd;
	}
	return bodies;
}

test('--stdio answers initialize, publishes diagnostics, and writes nothing but LSP frames to stdout', async () => {
	const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'markuplint-language-server-stdio-')));
	cleanups.push(() => rmSync(root, { recursive: true, force: true }));
	const filePath = path.join(root, 'index.html');
	const text = '<div id="a" id="a"></div>\n';
	writeFileSync(filePath, text);
	const uri = pathToFileURL(filePath).href;

	const child: ChildProcessWithoutNullStreams = spawn(process.execPath, [binPath, '--stdio'], { cwd: root });
	cleanups.push(() => child.kill());

	const rawStdout: Buffer[] = [];
	child.stdout.on('data', (chunk: Buffer) => rawStdout.push(chunk));
	// Read so that a full pipe cannot block the server, and shown when the test fails (a crash on
	// start otherwise surfaces only as the timeout of `initialize`).
	const rawStderr: Buffer[] = [];
	child.stderr.on('data', (chunk: Buffer) => rawStderr.push(chunk));
	onTestFailed(() => {
		// eslint-disable-next-line no-console
		console.error(`server stderr:\n${Buffer.concat(rawStderr).toString('utf8')}`);
	});
	// 'close', not 'exit': the stdio streams may still hold output when 'exit' fires.
	const closed = new Promise<number | null>(resolve => child.on('close', resolve));

	const client = createMessageConnection(new StreamMessageReader(child.stdout), new StreamMessageWriter(child.stdin));
	const diagnostics = new Promise<PublishDiagnosticsParams>(resolve => {
		client.onNotification('textDocument/publishDiagnostics', (params: PublishDiagnosticsParams) => {
			if (params.uri === uri && params.diagnostics.length > 0) {
				resolve(params);
			}
		});
	});
	client.listen();
	cleanups.push(() => client.dispose());

	const initialized: InitializeResult = await client.sendRequest('initialize', {
		processId: process.pid,
		rootUri: pathToFileURL(root).href,
		workspaceFolders: [{ uri: pathToFileURL(root).href, name: 'root' }],
		capabilities: {},
	});
	expect(initialized.capabilities.textDocumentSync).toBeDefined();

	await client.sendNotification('initialized', {});
	await client.sendNotification('textDocument/didOpen', {
		textDocument: { uri, languageId: 'html', version: 1, text },
	});

	const published = await diagnostics;
	expect(published.diagnostics.map(d => ({ code: d.code, source: d.source, start: d.range.start }))).toContainEqual({
		code: 'html-standard/attr-duplication',
		source: 'Markuplint',
		start: { line: 0, character: 12 },
	});

	await client.sendRequest('shutdown');
	await client.sendNotification('exit');
	expect(await closed).toBe(0);

	const frames = parseFrames(Buffer.concat(rawStdout));
	expect(frames.length).toBeGreaterThanOrEqual(2);
}, 20_000);
