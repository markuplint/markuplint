import debug from 'debug';

const CLI_NS = 'markuplint-cli';

/** Debug logger instance for the `selector` namespace. */
export const log = debug('selector');

/**
 * Enables debug logging for the selector and markuplint-cli namespaces.
 * Once enabled, logs are output via the `debug` package.
 */
export function enableDebug() {
	if (!log.enabled) {
		debug.enable(`${log.namespace}*`);
		log(`Debug enable: ${log.namespace}`);

		if (!debug.enabled(CLI_NS)) {
			debug.enable(`${log.namespace}*,${CLI_NS}*`);
			log(`Debug enable: ${log.namespace}, ${CLI_NS}`);
		}
	}
}
