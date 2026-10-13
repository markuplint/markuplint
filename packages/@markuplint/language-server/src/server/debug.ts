import debug from 'debug';

export const log = debug('vscode:markuplint');

const NAMESPACES = 'vscode:markuplint*,markuplint*,ml-*';

export function verbosely() {
	debug.enable(NAMESPACES);
	log(`[Debug] Enable: "${NAMESPACES}"`);
}
