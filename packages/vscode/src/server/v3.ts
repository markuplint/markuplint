import type { Config, Log } from '../types';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { MLEngine as _MLEngine } from 'markuplint';
import type {
	TextDocumentChangeEvent,
	PublishDiagnosticsParams,
	Position,
	TextDocumentIdentifier,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getAccname, getComputedRole, mayBeFocusable, getComputedAriaProps, isExposed } from '@markuplint/ml-spec';

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
	log: Log,
	sendDiagnostics: (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		params: PublishDiagnosticsParams,
	) => void,
	notFoundParserError: (e: unknown) => void,
) {
	const key = opened.document.uri;
	log(`Opened: ${key}`);
	const currentEngine = engines.get(key);
	if (currentEngine) {
		return;
	}

	const filePath = getFilePath(opened.document.uri, opened.document.languageId);
	log(`${filePath.dirname}/${filePath.basename}`);

	const sourceCode = opened.document.getText();
	const file = await MLEngine.toMLFile({ sourceCode, name: filePath.basename, workspace: filePath.dirname });

	if (!file) {
		log(`File not found: ${filePath.basename}`);
		return;
	}

	const engine = new MLEngine(file, {
		debug: config.debug,
		defaultConfig: config.defaultConfig,
		watch: true,
	});

	engines.set(key, engine);

	engine.on('config', (filePath, configSet) => {
		log(`get config: ${filePath}` /*, configSet*/);
	});

	engine.on('log', (phase, message) => {
		log(`${phase}: ${message}`);
	});

	engine.on('lint-error', (_filePath, _sourceCode, error) => {
		log(`❌: ${error.message}`);
	});

	engine.on('lint', (filePath, sourceCode, violations, fixedCode, debug) => {
		if (debug) {
			log(debug.join('\n'));
		}

		const date = new Date().toLocaleDateString();
		const time = new Date().toLocaleTimeString();

		log(`Linted(${date} ${time}): ${opened.document.uri}`);

		const diagnostics = convertDiagnostics({ filePath, sourceCode, violations, fixedCode });
		sendDiagnostics({
			uri: opened.document.uri,
			diagnostics,
		});

		log(`diagnostics: ${diagnostics.length}`);
	});

	log('exec (onDidOpen)');

	engine.exec().catch((e: unknown) => notFoundParserError(e));
}

let debounceTimer: NodeJS.Timer;

export function onDidChangeContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	change: TextDocumentChangeEvent<TextDocument>,
	log: Log,
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
			log('exec (onDidChangeContent)');
			engine.exec().catch((e: unknown) => notFoundParserError(e));
		} catch (e: unknown) {
			if (e instanceof Error) {
				log(e.message);
				return;
			}
			log(`${e}`);
		}
	}, 300);
}

export function getNodeWithAccessibilityProps(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	textDocument: TextDocumentIdentifier,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	position: Position,
	ariaVersion: ARIAVersion,
): {
	nodeName: string;
	exposed: boolean;
	aria: Record<string, string>;
} | null {
	const key = textDocument.uri;
	const engine = engines.get(key);

	if (!engine || !engine.document) {
		return null;
	}

	const node = engine.document.searchNodeByLocation(position.line + 1, position.character);

	if (!node || !node.is(node.ELEMENT_NODE)) {
		return null;
	}

	const aria: Record<string, string> = {};

	const exposed = isExposed(node, node.ownerMLDocument.specs, ariaVersion);

	if (!exposed) {
		return {
			nodeName: node.localName,
			exposed: false,
			aria: {},
		};
	}

	const role = getComputedRole(node.ownerMLDocument.specs, node, ariaVersion);
	const name = getAccname(node).trim();
	const focusable = mayBeFocusable(node, node.ownerMLDocument.specs);

	const nameRequired = role.role?.accessibleNameRequired ?? false;
	const nameProhibited = role.role?.accessibleNameProhibited ?? false;

	const requiredLabel = '\u26A0\uFE0F**Required**';

	aria.role = role.role?.name ? `\`${role.role.name}\`` : 'No corresponding role';
	aria.name = nameProhibited
		? '**Prohibited**'
		: name
		? `\`${name}\``
		: `None${nameRequired ? ` ${requiredLabel}` : ''}`;
	aria.focusable = `\`${focusable}\``;

	Object.values(getComputedAriaProps(node.ownerMLDocument.specs, node, ariaVersion)).forEach(prop => {
		if (!prop.required) {
			if (prop.from === 'default') {
				return;
			}
		}
		aria[prop.name.replace('aria-', '')] =
			prop.value === undefined ? 'Undefined' + (prop.required ? ` ${requiredLabel}` : '') : `\`${prop.value}\``;
	});

	return {
		nodeName: node.localName,
		exposed: true,
		aria,
	};
}
