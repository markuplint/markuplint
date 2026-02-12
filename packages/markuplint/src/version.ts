import pkg from '../package.json' with { type: 'json' };

/**
 * The current version string of the markuplint package, read from `package.json`.
 */
export const version: string = pkg.version;
