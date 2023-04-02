import type { Config } from '../types';
import type { MLEngine as _MLEngine } from 'markuplint';
import type { TextDocumentChangeEvent, PublishDiagnosticsParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getFilePath } from '../utils/get-file-path';

import { convertDiagnostics } from './convert-diagnostics';

const engines = new Map<string, _MLEngine>();

export async function onDidOpen(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	opened: TextDocumentChangeEvent<TextDocument>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	MLEngine: typeof _MLEngine,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	config: Config,
	sendDiagnostics: (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		params: PublishDiagnosticsParams,
	) => void,
	notFoundParserError: (e: unknown) => void,
) {
	const key = opened.document.uri;
	console.log(`Opened: ${key}`);
	const currentEngine = engines.get(key);
	if (currentEngine) {
		return;
	}

	const filePath = getFilePath(opened.document.uri, opened.document.languageId);
	if (config.debug) {
		console.log(filePath);
	}

	const sourceCode = opened.document.getText();
	const file = await MLEngine.toMLFile({ sourceCode, name: filePath.basename, workspace: filePath.dirname });

	if (!file) {
		console.warn(`File not found: ${filePath.basename}`);
		return;
	}

	const engine = new MLEngine(file, {
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

		console.log(`Linted(${date} ${time}): ${opened.document.uri}`);

		const diagnostics = convertDiagnostics({ filePath, sourceCode, violations, fixedCode });
		sendDiagnostics({
			uri: opened.document.uri,
			diagnostics,
		});

		console.log(`diagnostics: ${diagnostics.length}`);
	});

	console.log('exec (onDidOpen)');

	engine.exec().catch((e: unknown) => notFoundParserError(e));
}

let debounceTimer: NodeJS.Timer;

export function onDidChangeContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	change: TextDocumentChangeEvent<TextDocument>,
	notFoundParserError: (e: unknown) => void,
) {
	clearTimeout(debounceTimer);

	const key = change.document.uri;
	const engine = engines.get(key);

	debounceTimer = setTimeout(async () => {
		if (!engine) {
			return;
		}

		const code = change.document.getText();
		try {
			await engine.setCode(code);
			console.log('exec (onDidChangeContent)');
			engine.exec().catch((e: unknown) => notFoundParserError(e));
		} catch (e) {
			console.log(e);
			// continue;
		}
	}, 300);
}
