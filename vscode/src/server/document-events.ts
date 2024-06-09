import type { Module, OldModule } from './get-module.js';
import type { LangConfigs, Log } from '../types.js';
import type { PublishDiagnosticsParams, HoverParams } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { satisfies } from 'semver';
import { MarkupKind } from 'vscode-languageserver/node.js';

import { t } from '../i18n.js';

import * as v1 from './v1.js';
import * as v2 from './v2.js';
import * as v3 from './v3.js';
import * as v4 from './v4.js';

export type SendDiagnostics = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	params: PublishDiagnosticsParams,
) => void;

export type EventHandlerOptions = {
	mod: OldModule | Module;
	locale: string;
	langConfigs: LangConfigs;
	log: Log;
	diagnosticsLog: Log;
	errorLog: Log;
	sendDiagnostics: SendDiagnostics;
	initUI: () => void;
};

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

			if (options.mod.type === 'v4') {
				void v4.onDidOpen(
					document,
					options.mod.fromCode,
					langConfig,
					options.locale,
					options.log,
					options.diagnosticsLog,
					options.sendDiagnostics,
					notFoundParserError(languageId, options.errorLog),
				);
			} else {
				if (satisfies(options.mod.version, '1.x')) {
					return;
				}

				if (satisfies(options.mod.version, '2.x')) {
					void v2.onDidOpen(
						document,
						options.mod.markuplint.MLEngine,
						langConfig,
						options.locale,
						options.sendDiagnostics,
						notFoundParserError(languageId, options.errorLog),
					);
					return;
				}

				void v3.onDidOpen(
					document,
					options.mod.markuplint.MLEngine,
					langConfig,
					options.locale,
					options.log,
					options.diagnosticsLog,
					options.sendDiagnostics,
					notFoundParserError(languageId, options.errorLog),
				);
			}
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

			if (options.mod.type === 'v4') {
				v4.onDidChangeContent(document, options.log, notFoundParserError(languageId, options.errorLog));
			} else {
				if (satisfies(options.mod.version, '1.x')) {
					void v1.onDidChangeContent(document, options.mod.markuplint, langConfig, options.sendDiagnostics);
					return;
				}

				if (satisfies(options.mod.version, '2.x')) {
					v2.onDidChangeContent(document, notFoundParserError(languageId, options.errorLog));
					return;
				}

				v3.onDidChangeContent(document, options.log, notFoundParserError(languageId, options.errorLog));
			}
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

			if (options.mod.type === 'v4') {
				const aria = await v4.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion);
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
			} else {
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
