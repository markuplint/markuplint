import type { SendDiagnostics } from './document-events.js';
import type { Config, Log } from '../types.js';
import type { ConfigSet } from '@markuplint/file-resolver';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { MLEngine as _MLEngine } from 'markuplint';
import type { Position, TextDocumentIdentifier } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getFilePath } from '../utils/get-file-path.js';

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
	log: Log,
	diagnosticsLog: Log,
	sendDiagnostics: SendDiagnostics,
	notFoundParserError: (e: unknown) => void,
) {
	const key = document.uri;
	log(`Opened: ${key}`, 'debug');
	const currentEngine = engines.get(key);
	if (currentEngine) {
		return;
	}

	const filePath = getFilePath(document.uri, document.languageId);
	log(`${filePath.dirname}/${filePath.basename}`, 'debug');

	const sourceCode = document.getText();
	const file = await MLEngine.toMLFile({ sourceCode, name: filePath.basename, workspace: filePath.dirname });

	if (!file) {
		log(`File not found: ${filePath.basename}`, 'warn');
		return;
	}

	const engine = new MLEngine(file, {
		locale,
		debug: config.debug,
		defaultConfig: config.defaultConfig,
		watch: true,
	});

	let configSet: ConfigSet | null = null;

	engines.set(key, engine);

	engine.on('config', (_, _configSet) => {
		// @ts-ignore
		configSet = _configSet;
	});

	engine.on('log', (phase, message) => {
		log(`[${phase}]: ${message}`, 'trace');
	});

	engine.on('lint-error', (_filePath, _sourceCode, error) => {
		diagnosticsLog(error.message, 'error');
	});

	engine.on('config-errors', (_filePath, errors) => {
		for (const error of errors) {
			diagnosticsLog('ConfigError: ' + error.message, 'error');
			log('ConfigError: ' + error.message, 'warn');
		}
	});

	engine.on('lint', (filePath, sourceCode, violations, fixedCode, debug) => {
		diagnosticsLog('', 'clear');

		debounceTimer = setTimeout(() => {
			diagnosticsLog(`Lint: ${document.uri}`);
			if (debug) {
				diagnosticsLog('  Tracing AST Mapping:\n' + debug.map(line => `  ${line}`).join('\n'), 'trace');
			}
			if (configSet) {
				if (configSet.files.size > 0) {
					diagnosticsLog('  Used configs:');
					for (const files of configSet.files.values()) {
						diagnosticsLog(`    ${files}`);
					}
				} else {
					diagnosticsLog('  No use configs');
				}
				if (configSet.plugins.length > 0) {
					diagnosticsLog('  Used plugins:');
					for (const plugin of configSet.plugins.values()) {
						diagnosticsLog(`    ${plugin.name}`);
					}
				} else {
					diagnosticsLog('  No use plugins');
				}
			}

			const diagnostics = convertDiagnostics({ filePath, sourceCode, violations, fixedCode });
			sendDiagnostics({
				uri: document.uri,
				diagnostics,
			});

			if (diagnostics.length > 0) {
				diagnosticsLog(`  Violations(${diagnostics.length}):`);
				for (const d of diagnostics) {
					diagnosticsLog(`    [${d.line}:${d.col}] ${d.code}`);
				}
			} else {
				diagnosticsLog('  ✔ No violations');
			}
		}, 300);
	});

	log('Run `engine.exec()` in `onDidOpen`', 'debug');

	engine.exec().catch((error: unknown) => {
		log(String(error), 'error');
		notFoundParserError(error);
		throw error;
	});
}

let debounceTimer: ReturnType<typeof setTimeout>;

export function onDidChangeContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: TextDocument,
	log: Log,
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
			log('Run `engine.exec()` in `onDidChangeContent`', 'debug');
			engine.exec().catch((error: unknown) => notFoundParserError(error));
		} catch (error: unknown) {
			if (error instanceof Error) {
				log(error.message, 'error');
				return;
			}
			log(`UnknownError: ${error}`, 'error');
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

	// const exposed = isExposed(node, node.ownerMLDocument.specs, ariaVersion);

	// if (!exposed) {
	// 	return {
	// 		nodeName: node.localName,
	// 		exposed: false,
	// 		aria: {},
	// 	};
	// }

	// const role = getComputedRole(node.ownerMLDocument.specs, node, ariaVersion);
	// const name = getAccname(node).trim();
	// const focusable = mayBeFocusable(node, node.ownerMLDocument.specs);

	// const nameRequired = role.role?.accessibleNameRequired ?? false;
	// const nameProhibited = role.role?.accessibleNameProhibited ?? false;

	// const requiredLabel = `\u26A0\uFE0F**${t('Required')}**`;

	// aria.role = role.role?.name ? `\`${role.role.name}\`` : t('No corresponding role');
	// aria.name = nameProhibited
	// 	? `**${t('Prohibited')}**`
	// 	: name
	// 	? `\`"${name}"\``
	// 	: `${t('None')}${nameRequired ? ` ${requiredLabel}` : ''}`;
	// aria.focusable = `\`${focusable}\``;

	// Object.values(getComputedAriaProps(node.ownerMLDocument.specs, node, ariaVersion)).forEach(prop => {
	// 	if (!prop.required) {
	// 		if (prop.from === 'default') {
	// 			return;
	// 		}
	// 	}
	// 	aria[prop.name.replace('aria-', '')] =
	// 		prop.value === undefined
	// 			? t('Undefined') + (prop.required ? ` ${requiredLabel}` : '')
	// 			: `\`${prop.value}\``;
	// });

	return {
		nodeName: node.localName,
		exposed: true,
		aria,
	};
}
