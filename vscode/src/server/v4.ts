import type { SendDiagnostics } from './document-events.js';
import type { Config, Log } from '../types.js';
import type { MLEngine as ESMAdapterMLEngine, FromCodeFunction } from '@markuplint/esm-adapter';
import type { ConfigSet } from '@markuplint/file-resolver';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { Position, TextDocumentIdentifier } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { t } from '../i18n.js';
import { getFilePath } from '../utils/get-file-path.js';

import { convertDiagnostics } from './convert-diagnostics.js';

const engines = new Map<string, ESMAdapterMLEngine>();

export async function onDidOpen(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: TextDocument,
	fromCode: FromCodeFunction,
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

	const engine = await fromCode(sourceCode, {
		name: filePath.basename,
		dirname: filePath.dirname,
		locale,
		debug: config.debug,
		defaultConfig: config.defaultConfig,
		watch: true,
	});

	let configSet: ConfigSet | null = null;

	engines.set(key, engine);

	engine.on('config', (_, _configSet) => {
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
		clearTimeout(debounceTimer);
		diagnosticsLog('', 'clear');

		// Execute after 300ms from the last change.
		debounceTimer = setTimeout(lint, 300);

		function lint() {
			diagnosticsLog(`Lint: ${document.uri}`);

			const errors = violations.filter(v => v.severity === 'error');
			const warns = violations.filter(v => v.severity === 'warning');

			log(`Errors: ${errors.length}`, 'debug');
			log(`Warnings: ${warns.length}`, 'debug');

			if (debug) {
				diagnosticsLog(
					'  Tracing AST Mapping:\n' +
						debug
							.map(
								// @ts-ignore
								line => `  ${line}`,
							)
							.join('\n'),
					'trace',
				);
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
		}
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

export async function getNodeWithAccessibilityProps(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	textDocument: TextDocumentIdentifier,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	position: Position,
	ariaVersion: ARIAVersion,
): Promise<
	| {
			nodeName: string;
			exposed: boolean;
			labels: Record<string, string>;
	  }
	| {
			nodeName: string;
			unknown: true;
	  }
	| null
> {
	const key = textDocument.uri;
	const engine = engines.get(key);

	if (!engine) {
		return null;
	}

	const a11y = await engine.getAccessibilityByLocation(position.line + 1, position.character, ariaVersion);

	if (!a11y) {
		return null;
	}

	const { node, aria } = a11y;

	if (aria.unknown) {
		return {
			nodeName: node,
			unknown: true,
		};
	}

	if (!aria.exposedToTree) {
		return {
			nodeName: node,
			exposed: false,
			labels: {},
		};
	}

	const labels: Record<string, string> = {};

	const requiredLabel = `\u26A0\uFE0F**${t('Required')}**`;

	labels.role = aria.role ? `\`${aria.role}\`` : t('No corresponding role');
	labels.name = aria.nameProhibited
		? `**${t('Prohibited')}**`
		: // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			aria.name
			? typeof aria.name === 'string'
				? `\`"${aria.name}"\``
				: `**${t('Unknown')}**`
			: `${t('None')}${aria.nameRequired ? ` ${requiredLabel}` : ''}`;
	labels.focusable = `\`${aria.focusable}\``;

	for (const [propName, { value, required }] of Object.entries(aria.props ?? {})) {
		labels[propName] =
			value === undefined ? t('Undefined') + (required ? ` ${requiredLabel}` : '') : `\`${value}\``;
	}

	return {
		nodeName: node,
		exposed: true,
		labels,
	};
}
