import debug from 'debug';

const CLI_NS = 'markuplint-cli';

/**
 * Read `.enabled` at call time; never cache it at module load. `debug.enable()` (including via `verbosely()` /
 * `enableDebug()`) can switch a namespace on after import.
 */
export const log = debug('selector');

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
