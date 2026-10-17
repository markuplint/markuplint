import debug from 'debug';

/**
 * Read `.enabled` at call time; never cache it at module load. `debug.enable()` (including via `verbosely()` /
 * `enableDebug()`) can switch a namespace on after import.
 */
export const log = debug('vscode:markuplint');

const NAMESPACES = 'vscode:markuplint*,markuplint*,ml-*';

export function verbosely() {
	debug.enable(NAMESPACES);
	log(`[Debug] Enable: "${NAMESPACES}"`);
}
