import type { Module, ModuleResolver } from './get-module.js';
import type { Config, LangConfigs, Log } from '../types.js';
import type { WorkingDirectoryEntry } from '../utils/resolve-working-directory.js';
import type {
	CodeAction,
	CodeActionParams,
	PublishDiagnosticsParams,
	HoverParams,
} from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { isFatalError } from 'markuplint/suppressions';
import { satisfies, lt, gte } from 'semver';
import { MarkupKind } from 'vscode-languageserver/node.js';

import { t } from '../i18n.js';
import { getFilePath } from '../utils/get-file-path.js';
import { resolveWorkingDirectory } from '../utils/resolve-working-directory.js';

import { createParserErrorHandler } from './parser-load-failure.js';
import * as v2 from './v2.js';
import * as v3 from './v3.js';
import * as v4 from './v4.js';
import * as v5 from './v5.js';

/**
 * Callback for publishing diagnostics from the language server to the client.
 */
export type SendDiagnostics = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	params: PublishDiagnosticsParams,
) => void;

/**
 * Options for creating the document event handlers.
 */
export type EventHandlerOptions = {
	/** Loads the markuplint module for a document's working directory */
	resolveModule: ModuleResolver;
	/** The user's locale (e.g. `"en"`, `"ja"`) */
	locale: string;
	/** Per-language configuration from VS Code settings */
	langConfigs: LangConfigs;
	/** User-configured working directories for monorepo support */
	workingDirectories?: readonly WorkingDirectoryEntry[];
	/** Absolute paths of VS Code workspace folders */
	workspaceFolders: readonly string[];
	log: Log;
	diagnosticsLog: Log;
	errorLog: Log;
	sendDiagnostics: SendDiagnostics;
	/**
	 * Called on every document open with the module that document is linted with.
	 * The status bar therefore reflects the most recently opened document, not the active editor.
	 */
	reportStatus: (mod: Module) => void;
	/** Path to the git binary, from VS Code's `git.path` setting. */
	gitPath?: string;
};

/**
 * Determines the working directory a document belongs to.
 *
 * Both config discovery and markuplint module resolution are anchored here, so the two never
 * disagree about which installation governs the document.
 *
 * @param document - The text document
 * @param workspaceFolders - Absolute paths of VS Code workspace folders
 * @param workingDirectories - User-configured working directories
 * @param log - Logger for general messages
 * @returns The matched working directory, or the document's own directory when nothing matches
 */
export function resolveDocumentWorkspace(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: TextDocument,
	workspaceFolders: readonly string[],
	workingDirectories: readonly WorkingDirectoryEntry[] | undefined,
	log: Log,
): string {
	const filePath = getFilePath(document.uri, document.languageId);
	const absoluteFilePath = `${filePath.dirname}/${filePath.basename}`;
	const resolved = resolveWorkingDirectory(absoluteFilePath, workspaceFolders, workingDirectories);
	const workspace = resolved?.directory ?? filePath.dirname;
	if (resolved) {
		log(`Resolved working directory: ${workspace} (for ${filePath.basename})`, 'debug');
	}
	return workspace;
}

/**
 * Creates version-aware event handlers for document open, change, code action, and hover events.
 *
 * Each document is linted with the markuplint module resolved from its own working directory,
 * and dispatched to the handler (v2, v3, v4, or v5) matching that module's version.
 *
 * @param options - Configuration including the module resolver, locale, and settings
 * @returns An object containing `onDidOpen`, `onDidChangeContent`, `onCodeAction`, and `onHover` handlers
 */
export function createEventHandlers(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	options: EventHandlerOptions,
) {
	const documentModules = new Map<string, Module>();

	function parserErrorHandler(mod: Module, languageId: string) {
		return createParserErrorHandler(
			{
				languageId,
				isLocalModule: mod.isLocalModule,
				version: mod.version,
				workspace: mod.workspace,
				fallbackReason: mod.fallbackReason,
			},
			options.errorLog,
		);
	}

	function dispatchOpen(
		mod: Module,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: TextDocument,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		langConfig: Config,
		workspace: string,
	) {
		const onError = parserErrorHandler(mod, document.languageId);

		if (satisfies(mod.version, '2.x')) {
			void v2.onDidOpen(
				document,
				mod.markuplint.MLEngine,
				langConfig,
				options.locale,
				options.sendDiagnostics,
				onError,
				workspace,
				options.log,
			);
			return;
		}

		if (satisfies(mod.version, '3.x')) {
			void v3.onDidOpen(
				document,
				mod.markuplint.MLEngine,
				langConfig,
				options.locale,
				options.log,
				options.diagnosticsLog,
				options.sendDiagnostics,
				onError,
				workspace,
			);
			return;
		}

		if (satisfies(mod.version, '4.x')) {
			void v4.onDidOpen(
				document,
				mod.markuplint.MLEngine,
				langConfig,
				options.locale,
				options.log,
				options.diagnosticsLog,
				options.sendDiagnostics,
				onError,
				workspace,
			);
			return;
		}

		// v5+
		void v5.onDidOpen(
			document,
			mod.markuplint.MLEngine,
			langConfig,
			options.locale,
			options.log,
			options.diagnosticsLog,
			options.sendDiagnostics,
			onError,
			workspace,
		);
	}

	return {
		onDidOpen(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			document: TextDocument,
		) {
			const languageId = document.languageId;
			const langConfig = options.langConfigs[languageId] ?? null;

			if (!langConfig?.enable) {
				options.log(`Disabled for languageId:${languageId} according to VS Code settings.`, 'warn');
				return;
			}

			options.log(`Evaluate ${document.uri} from languageId:${languageId}`, 'info');

			const workspace = resolveDocumentWorkspace(
				document,
				options.workspaceFolders,
				options.workingDirectories,
				options.log,
			);

			void (async () => {
				const mod = documentModules.get(document.uri) ?? (await options.resolveModule(workspace));
				// Recorded before the engine exists so change events arriving during the
				// asynchronous engine setup are routed to the same version handler.
				documentModules.set(document.uri, mod);
				options.reportStatus(mod);
				dispatchOpen(mod, document, langConfig, workspace);
			})().catch((error: unknown) => {
				if (isFatalError(error)) {
					throw error;
				}
				options.errorLog(`Failed to load markuplint for ${workspace}: ${error}`);
			});
		},

		onDidChangeContent(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			document: TextDocument,
		) {
			const mod = documentModules.get(document.uri);
			if (!mod) {
				return;
			}

			const onError = parserErrorHandler(mod, document.languageId);

			if (satisfies(mod.version, '2.x')) {
				v2.onDidChangeContent(document, onError);
				return;
			}

			if (satisfies(mod.version, '3.x')) {
				v3.onDidChangeContent(document, options.log, onError);
				return;
			}

			if (satisfies(mod.version, '4.x')) {
				v4.onDidChangeContent(document, options.log, onError);
				return;
			}

			// v5+
			v5.onDidChangeContent(document, options.log, onError);
		},

		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		onCodeAction(params: CodeActionParams): CodeAction[] {
			const uri = params.textDocument.uri;
			const mod = documentModules.get(uri);
			if (!mod) {
				options.log(`Code Actions skipped: no module for ${uri}`, 'debug');
				return [];
			}
			// Code Actions require v5.0.0+ (Violation.fix data + lint event fixSummary)
			// Use '5.0.0-0' to include alpha/beta prereleases
			if (!gte(mod.version, '5.0.0-0')) {
				options.log(`Code Actions skipped: markuplint ${mod.version} < 5.0.0`, 'debug');
				return [];
			}
			const actions = v5.onCodeAction(params);
			options.log(`Code Actions: ${actions.length} for ${uri}`, 'debug');
			return actions;
		},

		async onHover(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			params: HoverParams,
		) {
			const enable = options.langConfigs['html']?.hover.accessibility.enable;

			if (!enable) {
				return;
			}

			const mod = documentModules.get(params.textDocument.uri);
			if (!mod) {
				return;
			}

			const ariaVersion =
				options.langConfigs['html']?.hover.accessibility.ariaVersion ?? mod.ariaRecommendedVersion;

			if (lt(mod.version, '4.0.0')) {
				const node = v3.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion);

				if (!node) {
					return;
				}

				const heading = `\`<${node.nodeName}>\` **${t('Computed Accessibility Properties')}**:\n`;

				const props = node.exposed
					? `${Object.entries(node.aria)
							.map(([key, value]) => `- ${key}: ${value}`)
							.join('\n')}`
					: `\n**${t('No exposed to accessibility tree')}** (${t('hidden element')})`;

				return {
					contents: {
						kind: MarkupKind.Markdown,
						value: heading + props,
					},
				};
			}

			const aria = satisfies(mod.version, '4.x')
				? await v4.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion)
				: await v5.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion);
			if (!aria) {
				return;
			}

			const heading = `\`<${aria.nodeName}>\` **${t('Computed Accessibility Properties')}**:\n`;

			const body =
				'unknown' in aria
					? `\n**${t('Unknown')}**`
					: aria.exposed
						? `${Object.entries(aria.labels)
								.map(([key, value]) => `- ${key}: ${value}`)
								.join('\n')}`
						: `\n**${t('No exposed to accessibility tree')}** (${t('hidden element')})`;

			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: heading + body,
				},
			};
		},
	};
}
