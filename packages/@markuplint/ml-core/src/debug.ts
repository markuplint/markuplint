import debug from 'debug';

export const log = debug('ml-core');

export function enableDebug() {
	if (!debug.enabled('ml-core')) {
		debug.enable('ml-core*');
	}
}
