import type { Config, LangConfigs } from './types.js';
import type { ExtensionContext } from 'vscode';
import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node.js';

import path from 'node:path';

import { window, workspace, StatusBarAlignment, commands } from 'vscode';
import { RevealOutputChannelOn, LanguageClient, TransportKind } from 'vscode-languageclient/node.js';

import {
	COMMAND_NAME_OPEN_LOG_COMMAND,
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

export function activate(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	context: ExtensionContext,
) {
	const config = workspace.getConfiguration(ID);

	if (!config.get('enable')) {
		return;
	}

	const logger = new Logger(window.createOutputChannel(OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME, { log: true }));
	const dignosticslogger = new Logger(
		window.createOutputChannel(OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME, { log: true }),
	);

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

	const customLanguageList: string[] = config.get('targetLanguages') ?? [];
	const languageList = [...new Set(customLanguageList)];

	const langConfigs: LangConfigs = {};
	for (const languageId of languageList) {
		const workspaceConfig = workspace.getConfiguration('', { languageId }).get(ID);
		// eslint-disable-next-line unicorn/prefer-structured-clone
		const config: Config = JSON.parse(JSON.stringify(workspaceConfig));

		langConfigs[languageId] = config ?? {
			enable: true,
			debug: false,
			defaultConfig: {},
			hover: {
				accessibility: {
					enable: true,
					ariaVersion: ARIA_RECOMMENDED_VERSION,
				},
			},
		};
	}

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
		initializationOptions: {
			langConfigs,
		},
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
			dignosticslogger.log(message, type);
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

	const openLogCommand = commands.registerCommand(COMMAND_NAME_OPEN_LOG_COMMAND, () => {
		logger.show();
	});
	context.subscriptions.push(openLogCommand);
}

export function deactivate() {
	return client.stop();
}
