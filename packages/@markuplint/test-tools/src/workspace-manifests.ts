import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The fields of a `package.json` that the dependency policy specs read.
 */
export interface WorkspaceManifest {
	readonly name: string;
	readonly version: string;
	readonly private?: boolean;
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly optionalDependencies?: Readonly<Record<string, string>>;
	readonly devDependencies?: Readonly<Record<string, string>>;
	readonly peerDependencies?: Readonly<Record<string, string>>;
	readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>;
}

const packagesDir = path.resolve(import.meta.dirname, '../../..');

/**
 * Whether a package name is one of this repository's own packages.
 *
 * @param name - The name of a dependency
 * @returns `true` for `markuplint` and the `@markuplint/*` packages
 */
export function isInternal(name: string): boolean {
	return name === 'markuplint' || name.startsWith('@markuplint/');
}

/**
 * Reads the `package.json` of `markuplint` and of every package under `packages/@markuplint`, the
 * private ones included.
 *
 * @returns The manifests
 */
export function readWorkspaceManifests(): readonly WorkspaceManifest[] {
	return [
		path.join(packagesDir, 'markuplint', 'package.json'),
		...readdirSync(path.join(packagesDir, '@markuplint')).map(dir =>
			path.join(packagesDir, '@markuplint', dir, 'package.json'),
		),
	]
		.filter(p => existsSync(p))
		.map(p => JSON.parse(readFileSync(p, 'utf8')) as WorkspaceManifest);
}
