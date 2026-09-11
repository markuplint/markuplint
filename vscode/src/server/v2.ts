import type { SendDiagnostics } from './document-events.js';
import type { Config, Log } from '../types.js';
import type { WorkingDirectoryEntry } from '../utils/resolve-working-directory.js';
import type { MLEngine as _MLEngine } from 'markuplint';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import path from 'node:path';

import { getFilePath } from '../utils/get-file-path.js';
import { resolveWorkingDirectory } from '../utils/resolve-working-directory.js';

import { convertDiagnostics } from './convert-diagnostics.js';

const engines = new Map<string, _MLEngine>();

export async function onDidOpen(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: TextDocument,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	MLEngine: typeof _MLEngine,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	config: Config,
	locale: string,
	sendDiagnostics: SendDiagnostics,
	notFoundParserError: (e: unknown) => void,
	workingDirectories?: readonly WorkingDirectoryEntry[],
	workspaceFolders?: readonly string[],
	log?: Log,
) {
	const key = document.uri;
	console.log(`Opened: ${key}`);
	const currentEngine = engines.get(key);
	if (currentEngine) {
		return;
	}

	const filePath = getFilePath(document.uri, document.languageId);
	if (config.debug) {
		console.log(filePath);
	}

	const absoluteFilePath = `${filePath.dirname}/${filePath.basename}`;
	const resolved = resolveWorkingDirectory(absoluteFilePath, workspaceFolders ?? [], workingDirectories);
	const workspace = resolved?.directory ?? filePath.dirname;
	if (resolved) {
		log?.(`Resolved working directory: ${workspace} (for ${filePath.basename})`, 'debug');
	}

	const sourceCode = document.getText();
	// `name` must be the workspace-relative path (not just the basename), or
	// MLFile.path collapses subdirectory files to workspace-root + basename —
	// which breaks pretender import resolution, nested config discovery, and
	// excludeFiles/overrides glob matching for anything outside the workspace root.
	const relativeFilePath = path.relative(workspace, absoluteFilePath);
	const file = await MLEngine.toMLFile({ sourceCode, name: relativeFilePath, workspace });

	if (!file) {
		console.warn(`File not found: ${filePath.basename}`);
		return;
	}

	const engine = new MLEngine(file, {
		locale,
		debug: config.debug,
		defaultConfig: config.defaultConfig,
		watch: true,
	});

	engines.set(key, engine);

	engine.on('config', (filePath, configSet) => {
		if (config.debug) {
			console.log(`get config: ${filePath}`, configSet);
		}
	});

	engine.on('log', (phase, message) => {
		if (config.debug) {
			console.log(phase, message);
		}
	});

	engine.on('lint-error', (_filePath, _sourceCode, error) => {
		if (config.debug) {
			console.log('❌', { error });
		}
	});

	engine.on('lint', (filePath, sourceCode, violations, fixedCode, debug) => {
		if (config.debug && debug) {
			console.log(debug.join('\n'));
		}

		const date = new Date().toLocaleDateString();
		const time = new Date().toLocaleTimeString();

		console.log(`Linted(${date} ${time}): ${document.uri}`);

		const diagnostics = convertDiagnostics({ filePath, sourceCode, violations, fixedCode, status: 'processed' });
		sendDiagnostics({
			uri: document.uri,
			diagnostics,
		});

		console.log(`diagnostics: ${diagnostics.length}`);
	});

	console.log('exec (onDidOpen)');

	engine.exec().catch((error: unknown) => notFoundParserError(error));
}

let debounceTimer: ReturnType<typeof setTimeout>;

export function onDidChangeContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: TextDocument,
	notFoundParserError: (e: unknown) => void,
) {
	clearTimeout(debounceTimer);

	const key = document.uri;
	const engine = engines.get(key);

	debounceTimer = setTimeout(async () => {
		if (!engine) {
			return;
		}

		const code = document.getText();
		try {
			await engine.setCode(code);
			console.log('exec (onDidChangeContent)');
			engine.exec().catch((error: unknown) => notFoundParserError(error));
		} catch (error) {
			console.log(error);
			// continue;
		}
	}, 300);
}
