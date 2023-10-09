import { createRequire } from 'node:module';
import { sep } from 'node:path';

const require = createRequire(import.meta.url);

export function resolveModule(id) {
	/**
	 * @type {string}
	 */
	let modulePath;
	try {
		modulePath = require.resolve(id);
	} catch (err) {
		if (err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
			const message = err.message.replaceAll(sep, '/');

			const matched = /^No "exports" main defined in (.+)\/package\.json$/i.exec(message);

			if (!matched) {
				throw err;
			}

			modulePath = matched[1];
		} else {
			throw err;
		}
	}

	return modulePath;
}
