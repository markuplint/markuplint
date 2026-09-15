import type { SendDiagnostics } from './document-events.js';
import type { Config, Log } from '../types.js';
import type { WorkingDirectoryEntry } from '../utils/resolve-working-directory.js';
import type { ConfigSet } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { FixSummary, MLEngine as _MLEngine } from 'markuplint';
import type { CodeActionParams, Position, TextDocumentIdentifier, CodeAction } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import path from 'node:path';

import { t } from '../i18n.js';
import { getFilePath } from '../utils/get-file-path.js';
import { resolveWorkingDirectory } from '../utils/resolve-working-directory.js';

import { createQuickFixActions, createFixAllAction } from './code-actions.js';
import { convertDiagnostics } from './convert-diagnostics.js';
import { getAccessibilityByLocation } from './get-accessibility-by-location.js';

/**
 * Snapshot of the latest lint result for a document, used to produce Code Actions.
 */
export type FixState = {
	readonly sourceCode: string;
	readonly violations: readonly Violation[];
	readonly fixedCode: string;
	readonly fixSummary: FixSummary | null;
};

const engines = new Map<string, _MLEngine>();
const fixStates = new Map<string, FixState>();
let moduleLog: Log | undefined;

/**
 * Returns the latest fix state for a document.
 *
 * @param uri - The document URI
 * @returns The fix state, or `undefined` if the document has not been linted yet
 */
export function getFixState(uri: string): FixState | undefined {
	return fixStates.get(uri);
}

/**
 * Handles the `textDocument/didOpen` event by creating an MLEngine for the document.
 *
 * Sets up linting, diagnostics, and fix-state tracking for the opened document.
 *
 * @param document - The opened text document
 * @param MLEngine - The MLEngine constructor
 * @param config - The extension configuration
 * @param locale - The locale for diagnostic messages
 * @param log - Logger for general messages
 * @param diagnosticsLog - Logger for diagnostic-specific messages
 * @param sendDiagnostics - Callback to publish diagnostics to the client
 * @param notFoundParserError - Callback invoked when a parser is not found
 * @param workingDirectories - Optional list of configured working directories
 * @param workspaceFolders - Optional list of workspace folder paths
 */
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
	workingDirectories?: readonly WorkingDirectoryEntry[],
	workspaceFolders?: readonly string[],
) {
	moduleLog = log;
	const key = document.uri;
	log(`Opened: ${key}`, 'debug');
	const currentEngine = engines.get(key);
	if (currentEngine) {
		return;
	}

	const filePath = getFilePath(document.uri, document.languageId);
	log(`${filePath.dirname}/${filePath.basename}`, 'debug');

	const absoluteFilePath = `${filePath.dirname}/${filePath.basename}`;
	const resolved = resolveWorkingDirectory(absoluteFilePath, workspaceFolders ?? [], workingDirectories);
	const workspace = resolved?.directory ?? filePath.dirname;
	if (resolved) {
		log(`Resolved working directory: ${workspace} (for ${filePath.basename})`, 'debug');
	}

	const sourceCode = document.getText();
	// `name` must be the workspace-relative path (not just the basename), or
	// MLFile.path collapses subdirectory files to workspace-root + basename —
	// which breaks pretender import resolution, nested config discovery, and
	// excludeFiles/overrides glob matching for anything outside the workspace root.
	const relativeFilePath = path.relative(workspace, absoluteFilePath);
	const file = await MLEngine.toMLFile({ sourceCode, name: relativeFilePath, workspace });

	if (!file) {
		log(`File not found: ${filePath.basename}`, 'warn');
		return;
	}

	const engine = new MLEngine(file, {
		locale,
		debug: config.debug,
		defaultConfig: config.defaultConfig,
		watch: true,
		fix: true,
	});
	log(`Engine created: ${key}`);

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

	engine.on('lint', (filePath, sourceCode, violations, fixedCode, debug, fixSummary) => {
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

			const diagnostics = convertDiagnostics({
				filePath,
				sourceCode,
				violations,
				fixedCode,
				status: 'processed',
			});

			fixStates.set(key, { sourceCode, violations, fixedCode, fixSummary });

			if (diagnostics.length > 0) {
				diagnosticsLog(`  Violations(${diagnostics.length}):`);
				for (const d of diagnostics) {
					diagnosticsLog(`    [${d.line}:${d.col}] ${d.code}`);
				}
			} else {
				diagnosticsLog('  ✔ No violations');
			}

			sendDiagnostics({
				uri: document.uri,
				diagnostics,
			});
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

/**
 * Handles the `textDocument/didChangeContent` event by re-running the lint engine.
 *
 * Debounces execution so that rapid successive changes do not trigger
 * multiple lint passes.
 *
 * @param document - The changed text document
 * @param log - Logger for messages
 * @param notFoundParserError - Callback invoked when a parser is not found
 */
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

/**
 * Retrieves the ARIA accessibility properties of the element at the given position.
 *
 * Used by the hover provider to display accessibility information such as
 * role, exposed state, and ARIA property labels.
 *
 * @param textDocument - The text document identifier
 * @param position - The cursor position within the document
 * @param ariaVersion - The ARIA specification version to use
 * @returns The node's accessibility properties, or null if unavailable
 */
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

	const a11y = await getAccessibilityByLocation(engine, position.line + 1, position.character, ariaVersion);

	if (!a11y) {
		return null;
	}

	const { node, aria } = a11y;

	if (!aria) {
		return null;
	}

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

/**
 * Handles `textDocument/codeAction` requests for markuplint v4+.
 *
 * Returns per-violation QuickFix actions and a SourceFixAll action
 * (`source.fixAll.markuplint`) when fixable violations exist.
 *
 * @param params - The LSP Code Action request parameters
 * @returns An array of Code Actions (QuickFix and/or SourceFixAll)
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function onCodeAction(params: CodeActionParams): CodeAction[] {
	const uri = params.textDocument.uri;
	const fixState = getFixState(uri);
	if (!fixState) {
		moduleLog?.(`onCodeAction: no fixState for ${uri}`, 'debug');
		return [];
	}

	const fixableCount = fixState.violations.filter(v => v.fix).length;
	moduleLog?.(
		`onCodeAction: ${fixState.violations.length} violations (${fixableCount} fixable), ${params.context.diagnostics.length} diagnostics`,
		'debug',
	);

	const quickFixes = createQuickFixActions(uri, params.context.diagnostics, fixState);
	const fixAll = createFixAllAction(uri, params.context.diagnostics, fixState);

	return fixAll ? [...quickFixes, fixAll] : quickFixes;
}
