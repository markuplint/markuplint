import { Messenger } from './locale';

/**
 * [WIP] use Node.js API
 */
export function getMessenger() {
	return Messenger.create({
		locale: 'ja',
		keywords: {},
	});
}
