import type { Module } from './get-module.js';
import type { LangConfigs, Log } from '../types.js';
import type { WorkingDirectoryEntry } from '../utils/resolve-working-directory.js';
import type {
	CodeAction,
	CodeActionParams,
	PublishDiagnosticsParams,
	HoverParams,
} from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { satisfies, lt, gte } from 'semver';
import { MarkupKind } from 'vscode-languageserver/node.js';

import { t } from '../i18n.js';

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
	/** The resolved markuplint module (local or bundled) */
	mod: Module;
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
	initUI: () => void;
	/** Path to the git binary, from VS Code's `git.path` setting. */
	gitPath?: string;
};

/**
 * Creates version-aware event handlers for document open, change, and hover events.
 *
 * Dispatches to the appropriate version handler (v2, v3, or v4) based on the
 * resolved markuplint module version.
 *
 * @param options - Configuration including the markuplint module, locale, and settings
 * @returns An object containing `onDidOpen`, `onDidChangeContent`, and `onHover` handlers
 */
export function createEventHandlers(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	options: EventHandlerOptions,
) {
	let uiInitialized = false;

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

			if (!uiInitialized) {
				options.initUI();
				uiInitialized = true;
			}

			if (satisfies(options.mod.version, '2.x')) {
				void v2.onDidOpen(
					document,
					options.mod.markuplint.MLEngine,
					langConfig,
					options.locale,
					options.sendDiagnostics,
					notFoundParserError(languageId, options.errorLog),
					options.workingDirectories,
					options.workspaceFolders,
					options.log,
				);
				return;
			}

			if (satisfies(options.mod.version, '3.x')) {
				void v3.onDidOpen(
					document,
					options.mod.markuplint.MLEngine,
					langConfig,
					options.locale,
					options.log,
					options.diagnosticsLog,
					options.sendDiagnostics,
					notFoundParserError(languageId, options.errorLog),
					options.workingDirectories,
					options.workspaceFolders,
				);
				return;
			}

			if (satisfies(options.mod.version, '4.x')) {
				void v4.onDidOpen(
					document,
					options.mod.markuplint.MLEngine,
					langConfig,
					options.locale,
					options.log,
					options.diagnosticsLog,
					options.sendDiagnostics,
					notFoundParserError(languageId, options.errorLog),
					options.workingDirectories,
					options.workspaceFolders,
				);
				return;
			}

			// v5+
			void v5.onDidOpen(
				document,
				options.mod.markuplint.MLEngine,
				langConfig,
				options.locale,
				options.log,
				options.diagnosticsLog,
				options.sendDiagnostics,
				notFoundParserError(languageId, options.errorLog),
				options.workingDirectories,
				options.workspaceFolders,
			);
		},

		onDidChangeContent(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			document: TextDocument,
		) {
			const languageId = document.languageId;
			const langConfig = options.langConfigs[languageId] ?? null;

			if (!langConfig?.enable) {
				return;
			}

			if (satisfies(options.mod.version, '2.x')) {
				v2.onDidChangeContent(document, notFoundParserError(languageId, options.errorLog));
				return;
			}

			if (satisfies(options.mod.version, '3.x')) {
				v3.onDidChangeContent(document, options.log, notFoundParserError(languageId, options.errorLog));
				return;
			}

			if (satisfies(options.mod.version, '4.x')) {
				v4.onDidChangeContent(document, options.log, notFoundParserError(languageId, options.errorLog));
				return;
			}

			// v5+
			v5.onDidChangeContent(document, options.log, notFoundParserError(languageId, options.errorLog));
		},

		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		onCodeAction(params: CodeActionParams): CodeAction[] {
			// Code Actions require v5.0.0+ (Violation.fix data + lint event fixSummary)
			// Use '5.0.0-0' to include alpha/beta prereleases
			if (!gte(options.mod.version, '5.0.0-0')) {
				options.log(`Code Actions skipped: markuplint ${options.mod.version} < 5.0.0`, 'debug');
				return [];
			}
			const actions = v5.onCodeAction(params);
			options.log(`Code Actions: ${actions.length} for ${params.textDocument.uri}`, 'debug');
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

			const ariaVersion =
				options.langConfigs['html']?.hover.accessibility.ariaVersion ?? options.mod.ariaRecommendedVersion;

			if (lt(options.mod.version, '4.0.0')) {
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

			const aria = satisfies(options.mod.version, '4.x')
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

function notFoundParserError(languageId: string, errorLog: Log) {
	return (e: unknown) => {
		if (e instanceof Error) {
			const { groups } = /Cannot find module.+(?<parser>@markuplint\/[a-z]+-parser)/.exec(e.message) || {};
			const parser = groups?.parser;
			errorLog(
				`Parser not found. You probably need to install ${parser} because it detected languageId: ${languageId}.`,
			);
			return;
		}
		throw e;
	};
}
