import debug from 'debug';

const CLI_NS = 'markuplint-cli';
/**
 * Read `.enabled` at call time; never cache it at module load. `debug.enable()` (including via `verbosely()` /
 * `enableDebug()`) can switch a namespace on after import.
 */
export const log = debug('ml-core');

/**
 * Enables debug logging for the `ml-core` namespace and the CLI namespace.
 * No-op if debug logging is already enabled.
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
