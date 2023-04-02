import type { LangConfigs } from './types';
import type { ExtensionContext } from 'vscode';
import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

import path from 'node:path';

import { window, workspace, StatusBarAlignment, commands } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

import {
	COMMAND_NAME_OPEN_LOG_COMMAND,
	ID,
	LANGUAGE_LIST,
	NAME,
	OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME,
	WATCHING_CONFIGURATION_GLOB,
} from './const';
import { configs, errorToPopup, infoToPopup, ready, warningToPopup } from './lsp';

let client: LanguageClient;

export function activate(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	context: ExtensionContext,
) {
	const serverModule = context.asAbsolutePath(path.join('out', 'server', 'index.js'));

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

	const langConfigs: LangConfigs = {};
	LANGUAGE_LIST.forEach(languageId => {
		langConfigs[languageId] = JSON.parse(JSON.stringify(workspace.getConfiguration('', { languageId }).get(ID)));
	});

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			...LANGUAGE_LIST.map(language => ({ language, scheme: 'file' })),
			...LANGUAGE_LIST.map(language => ({ language, scheme: 'untitled' })),
		],
		synchronize: {
			configurationSection: ID,
			fileEvents: workspace.createFileSystemWatcher(WATCHING_CONFIGURATION_GLOB),
		},
	};

	client = new LanguageClient(ID, OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME, serverOptions, clientOptions);
	void client.start().then(() => {
		void client.sendRequest(configs, langConfigs);

		const statusBar = window.createStatusBarItem(StatusBarAlignment.Right, 0);

		client.onRequest(ready, data => {
			statusBar.show();
			statusBar.text = `$(check)${NAME}[v${data.version}]`;
			statusBar.command = COMMAND_NAME_OPEN_LOG_COMMAND;
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
		client.outputChannel.show();
	});
	context.subscriptions.push(openLogCommand);
}

export function deactivate() {
	return client.stop();
}
