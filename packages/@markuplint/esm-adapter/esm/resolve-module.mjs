import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export function resolveModule(id) {
	/**
	 * @type {string}
	 */
	let modulePath;
	try {
		modulePath = require.resolve(id);
	} catch (error) {
		if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
			const message = error.message.replaceAll(path.sep, '/');

			const matched = /^no "exports" main defined in (.+)\/package\.json$/i.exec(message);

			if (!matched) {
				throw error;
			}

			modulePath = matched[1];
		} else {
			throw error;
		}
	}

	return modulePath;
}
