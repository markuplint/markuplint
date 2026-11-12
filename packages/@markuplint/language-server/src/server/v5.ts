import type { SendDiagnostics } from './document-events.js';
import type { Config, Log } from '../types.js';
import type { ConfigSet } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { FixSummary, MLEngine as _MLEngine } from 'markuplint';
import type { CodeActionParams, Position, TextDocumentIdentifier, CodeAction } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import path from 'node:path';

import { isFatalError } from 'markuplint/suppressions';

import { t } from '../i18n.js';
import { getFilePath } from '../utils/get-file-path.js';

import { createQuickFixActions, createFixAllAction } from './code-actions.js';
import { convertDiagnostics } from './convert-diagnostics.js';
import { getAccessibilityByLocation, hasAccessibilityAt } from './get-accessibility-by-location.js';
import { isPretendersNotInstalled } from './parser-load-failure.js';
import { applySuppressionsToViolations, loadSuppressions } from './suppression-support.js';

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
 * Sets up linting, diagnostics, fix-state tracking, and bulk suppression
 * severity downgrade for the opened document.
 *
 * @param document - The opened text document
 * @param MLEngine - The MLEngine constructor
 * @param config - The language configuration
 * @param locale - The locale for diagnostic messages
 * @param log - Logger for general messages
 * @param diagnosticsLog - Logger for diagnostic-specific messages
 * @param sendDiagnostics - Callback to publish diagnostics to the client
 * @param notFoundParserError - Callback invoked when a parser is not found
 * @param workspace - The working directory the document belongs to; the base for config discovery
 * @param experimentalRustCore - Lint with the Rust engine, if the markuplint of the document has it
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
	workspace: string,
	experimentalRustCore = false,
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

	// The option is passed to the markuplint that has what the hover reads of the Rust engine
	// (`accessibilityAt`), whatever its version number says: the Rust engine builds no `Document`, so a
	// markuplint that has the engine without the method would lose the hover, and one that has neither
	// ignores the option without a word.
	const rustCore = experimentalRustCore && hasAccessibilityAt(MLEngine.prototype);
	if (experimentalRustCore && !rustCore) {
		log(
			`experimentalRustCore is on, but the markuplint of ${key} has no Rust engine for the language server: it lints with the TypeScript engine`,
			'info',
		);
	}

	const engine = new MLEngine(file, {
		locale,
		debug: config.debug,
		defaultConfig: config.defaultConfig,
		watch: true,
		fix: true,
		...(rustCore ? { experimentalRustCore: true } : {}),
	});
	log(`Engine created: ${key}`);

	let configSet: ConfigSet | null = null;

	engines.set(key, engine);

	engine.on('config', (_, _configSet) => {
		configSet = _configSet;
	});

	// The Rust engine lints the document again on every edit, and tells every time that it left for the
	// TypeScript engine, for the same reason: once for a document is enough.
	let fallbackWarned = false;

	engine.on('log', (phase, message) => {
		if (phase === 'experimental-rust-core:fallback' && !fallbackWarned) {
			fallbackWarned = true;
			log(message, 'warn');
		}
		log(`[${phase}]: ${message}`, 'trace');
	});

	// The lint fails again on every edit of the document, with the same cause until the package is installed
	// and the server restarted (which the popup says), so the popup is shown once per document.
	let pretendersPopupShown = false;

	engine.on('lint-error', (_filePath, _sourceCode, error) => {
		diagnosticsLog(error.message, 'error');
		// A configuration that needs `@markuplint/pretenders` is a `config-error` diagnostic, not a rejection of
		// `exec()`, so the popup that a missing parser gets has to be asked for here: the diagnostic tells to
		// install it in the project, which does not fix it for the markuplint bundled with the language server.
		if (!pretendersPopupShown && isPretendersNotInstalled(error)) {
			pretendersPopupShown = true;
			notFoundParserError(error);
		}
	});

	engine.on('config-errors', (_filePath, errors) => {
		for (const error of errors) {
			diagnosticsLog('ConfigError: ' + error.message, 'error');
			log('ConfigError: ' + error.message, 'warn');
		}
	});

	engine.on('lint', (lintFilePath, lintSourceCode, violations, fixedCode, debug, fixSummary) => {
		clearTimeout(debounceTimers.get(key));
		diagnosticsLog('', 'clear');

		// Execute after 300ms from the last change.
		debounceTimers.set(
			key,
			setTimeout(() => {
				lint().catch((error: unknown) => {
					log(String(error), 'error');
				});
			}, 300),
		);

		async function lint() {
			diagnosticsLog(`Lint: ${document.uri}`);

			// Apply bulk suppression severity downgrade and prefix suppressed messages
			const suppressedPrefix = t('[suppressed] this warning is suppressed but should be fixed:');
			const downgraded = await applyBulkSuppressions(absoluteFilePath, violations, workspace, log);
			// The document may have been closed while the suppressions were loading; publishing
			// now would resurrect the diagnostics `onDidClose` cleared and re-add the fix state.
			if (engines.get(key) !== engine) {
				return;
			}
			const effectiveViolations = downgraded.map(v =>
				'originalSeverity' in v && v.originalSeverity
					? { ...v, message: `${suppressedPrefix} ${v.message}` }
					: v,
			);

			const errors = effectiveViolations.filter(v => v.severity === 'error');
			const warns = effectiveViolations.filter(v => v.severity === 'warning');
			const suppressed = effectiveViolations.filter(v => v.severity === 'info');

			log(`Errors: ${errors.length}`, 'debug');
			log(`Warnings: ${warns.length}`, 'debug');
			if (suppressed.length > 0) {
				log(`Suppressed (info): ${suppressed.length}`, 'debug');
			}

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
				filePath: lintFilePath,
				sourceCode: lintSourceCode,
				violations: effectiveViolations,
				fixedCode,
				status: 'processed',
			});

			fixStates.set(key, {
				sourceCode: lintSourceCode,
				violations: effectiveViolations,
				fixedCode,
				fixSummary,
			});

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

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
	const key = document.uri;
	clearTimeout(debounceTimers.get(key));

	const engine = engines.get(key);

	debounceTimers.set(
		key,
		setTimeout(async () => {
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
		}, 300),
	);
}

/**
 * Handles the `textDocument/didClose` event by releasing everything kept for the document.
 *
 * Without it every document opened during a session would keep its engine, its DOM and
 * its config watcher (`watch: true`) until the server exits.
 *
 * @param uri - The URI of the closed document
 */
export async function onDidClose(uri: string) {
	clearTimeout(debounceTimers.get(uri));
	debounceTimers.delete(uri);
	fixStates.delete(uri);

	const engine = engines.get(uri);
	if (!engine) {
		return;
	}
	engines.delete(uri);
	await engine.close();
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

	// LSP counts the character from 0, the node list the column from 1.
	const a11y = await getAccessibilityByLocation(engine, position.line + 1, position.character + 1, ariaVersion);

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
 * Handles `textDocument/codeAction` requests for markuplint v5.
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

/**
 * Applies bulk suppression to violations, downgrading severity to 'info'
 * for suppressed violations. Uses git blame for count-exceeded cases.
 */
async function applyBulkSuppressions(
	absoluteFilePath: string,
	violations: readonly Violation[],
	workspace: string,
	log: Log,
): Promise<readonly Violation[]> {
	try {
		const cache = await loadSuppressions(workspace, log);
		if (!cache) {
			return violations;
		}

		return await applySuppressionsToViolations(absoluteFilePath, violations, cache, log);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		log(`Bulk suppression failed: ${error instanceof Error ? error.message : String(error)}`, 'warn');
		return violations;
	}
}
