import type { Status } from './types.js';
import type { StatusBarItem } from 'vscode';

import { ThemeColor } from 'vscode';

import { NAME } from './const.js';

export class StatusBar {
	#item: StatusBarItem;
	#version: string | null = null;
	#isLocalModule: boolean | null = null;
	#message: string | null = null;
	#warningBg = new ThemeColor('statusBarItem.warningBackground');

	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		item: StatusBarItem,
		openCommandName: string,
	) {
		this.#item = item;

		item.command = openCommandName;
	}

	set({ version, isLocalModule, message }: Status) {
		this.#version = version;
		this.#isLocalModule = isLocalModule;
		this.#message = message;
		this.#item.show();
		this.#update();
	}

	/**
	 * Text format with status
	 *
	 * Icon reference
	 * @see https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
	 *
	 * @returns
	 */
	#update() {
		const warn = this.#isLocalModule ? '' : '$(warning)';
		this.#item.backgroundColor = warn ? this.#warningBg : undefined;
		this.#item.text = `$(check)${NAME}[v${this.#version}${warn}]`;
		this.#item.tooltip = this.#message ?? undefined;
	}
}
