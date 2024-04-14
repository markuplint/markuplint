import type { SendDiagnostics } from './document-events';
import type { Config } from '../types';
import type { MLEngine as _MLEngine } from 'markuplint';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getFilePath } from '../utils/get-file-path';

import { convertDiagnostics } from './convert-diagnostics';

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

	const sourceCode = document.getText();
	const file = await MLEngine.toMLFile({ sourceCode, name: filePath.basename, workspace: filePath.dirname });

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

		const diagnostics = convertDiagnostics({ filePath, sourceCode, violations, fixedCode });
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
