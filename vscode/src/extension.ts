import type { Config, InitializationOptions, LangConfigs } from './types.js';
import type { ExtensionContext } from 'vscode';
import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node.js';

import path from 'node:path';

import { window, workspace, StatusBarAlignment, commands } from 'vscode';
import { RevealOutputChannelOn, LanguageClient, TransportKind } from 'vscode-languageclient/node.js';

import {
	COMMAND_NAME_OPEN_LOG_COMMAND,
	COMMAND_NAME_RESTART_SERVER,
	ID,
	OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME,
	OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME,
	WATCHING_CONFIGURATION_GLOB,
} from './const.js';
import { Logger } from './logger.js';
import {
	errorToPopup,
	infoToPopup,
	logToDiagnosticsChannel,
	logToPrimaryChannel,
	status,
	warningToPopup,
} from './lsp.js';
import { StatusBar } from './status-bar.js';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

let client: LanguageClient;
let logger: Logger;
let diagnosticsLogger: Logger;

/**
 * Activates the markuplint VS Code extension.
 *
 * Registers commands, reads user configuration (including `workingDirectories`),
 * starts the language server, and sets up event handlers.
 *
 * @param context - The VS Code extension context
 */
export function activate(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	context: ExtensionContext,
) {
	const openLogCommand = commands.registerCommand(COMMAND_NAME_OPEN_LOG_COMMAND, () => {
		logger?.show();
	});
	context.subscriptions.push(openLogCommand);

	const restartServerCommand = commands.registerCommand(COMMAND_NAME_RESTART_SERVER, async () => {
		if (client === undefined) {
			return;
		}
		try {
			void window.showInformationMessage('Restarting Markuplint language server...');
			await client.stop();
			await client.start();
			void window.showInformationMessage('Markuplint language server restarted successfully.');
		} catch (error) {
			void window.showErrorMessage(`Failed to restart Markuplint language server: ${String(error)}`);
		}
	});
	context.subscriptions.push(restartServerCommand);

	const config = workspace.getConfiguration(ID);

	if (config.get('enable') === false) {
		return;
	}

	logger = new Logger(window.createOutputChannel(OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME, { log: true }));
	diagnosticsLogger = new Logger(window.createOutputChannel(OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME, { log: true }));

	const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));

	const debugOptions = {
		execArgv: ['--nolazy', '--inspect=6009'],
	};

	const serverOptions: ServerOptions = {
		run: {
			module: serverModule,
			transport: TransportKind.ipc,
		},
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions,
		},
	};

	const customLanguageList: string[] = config.get('targetLanguages') ?? ['html'];
	const languageList = [...new Set(customLanguageList)];

	const langConfigs: LangConfigs = {};
	for (const languageId of languageList) {
		const langConfig = workspace.getConfiguration(ID, { languageId });

		const defaultConfig = langConfig.get('defaultConfig') ?? { extends: ['markuplint:recommended'] };

		langConfigs[languageId] = {
			enable: langConfig.get('enable') ?? true,
			debug: langConfig.get('debug') ?? false,
			// eslint-disable-next-line unicorn/prefer-structured-clone
			defaultConfig: JSON.parse(JSON.stringify(defaultConfig)),
			hover: {
				accessibility: {
					enable: langConfig.get('hover.accessibility.enable') ?? true,
					ariaVersion:
						langConfig.get<Config['hover']['accessibility']['ariaVersion']>(
							'hover.accessibility.ariaVersion',
						) || ARIA_RECOMMENDED_VERSION,
				},
			},
		};
	}

	const workingDirectories: InitializationOptions['workingDirectories'] =
		config.get('workingDirectories') ?? undefined;
	const workspaceFolders = (workspace.workspaceFolders ?? []).map(f => f.uri.fsPath);

	const gitConfig = workspace.getConfiguration('git');
	const gitPath: string | undefined = gitConfig.get('path') || undefined;

	const initializationOptions: InitializationOptions = {
		langConfigs,
		workingDirectories,
		workspaceFolders,
		gitPath,
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			...languageList.map(language => ({ language, scheme: 'file' })),
			...languageList.map(language => ({ language, scheme: 'untitled' })),
		],
		synchronize: {
			configurationSection: ID,
			fileEvents: workspace.createFileSystemWatcher(WATCHING_CONFIGURATION_GLOB),
		},
		outputChannel: logger.outputChannel,
		revealOutputChannelOn: RevealOutputChannelOn.Error,
		initializationOptions,
	};

	client = new LanguageClient(ID, OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME, serverOptions, clientOptions);

	void client.start().then(() => {
		const statusBar = new StatusBar(
			window.createStatusBarItem(StatusBarAlignment.Right, 0),
			COMMAND_NAME_OPEN_LOG_COMMAND,
		);

		client.onRequest(status, data => {
			statusBar.set(data);
		});

		client.onNotification(logToPrimaryChannel, ([message, type]) => {
			logger.log(message, type);
		});

		client.onNotification(logToDiagnosticsChannel, ([message, type]) => {
			diagnosticsLogger.log(message, type);
		});

		client.onNotification(errorToPopup, message => {
			void window.showErrorMessage(message);
		});

		client.onNotification(warningToPopup, message => {
			void window.showWarningMessage(message);
		});

		client.onNotification(infoToPopup, message => {
			void window.showInformationMessage(message);
		});
	});
}

/**
 * Deactivates the markuplint VS Code extension by stopping the language client.
 *
 * @returns A promise that resolves when the client has stopped
 */
export function deactivate() {
	return client.stop();
}
