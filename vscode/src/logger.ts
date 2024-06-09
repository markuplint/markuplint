import type { LogType } from './types.js';
import type { LogOutputChannel } from 'vscode';

export class Logger {
	#channel: LogOutputChannel;

	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		channel: LogOutputChannel,
	) {
		this.#channel = channel;
		this.#channel.debug(`${channel.name} channel is available (Log level: ${channel.logLevel})`);
	}

	get outputChannel() {
		return this.#channel;
	}

	log(message: string, type?: LogType) {
		switch (type) {
			case 'trace': {
				this.#channel.trace(message);
				break;
			}
			case 'debug': {
				this.#channel.debug(message);
				break;
			}
			case 'warn': {
				this.#channel.warn(message);
				break;
			}
			case 'error': {
				this.#channel.error(message);
				break;
			}
			case 'clear': {
				this.#channel.clear();
				break;
			}
			// eslint-disable-next-line unicorn/no-useless-switch-case
			case 'info':
			default: {
				this.#channel.info(message);
				break;
			}
		}
	}

	show() {
		this.#channel.show();
	}
}
