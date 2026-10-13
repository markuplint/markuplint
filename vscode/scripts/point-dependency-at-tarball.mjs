/**
 * Points a dependency of a `package.json` at a local tarball.
 *
 * `install.mjs` builds the VSIX outside the workspaces, so a dependency is installed from the
 * registry. A package that is not published yet (the language server of a release that is still
 * being prepared) is not there, and a published one is an older build than the source of the
 * commit. Packing the workspace package and installing the tarball gives the VSIX the source
 * that the commit holds, as the bundled `out/server.js` used to.
 *
 * @param {string} packageJsonText — the content of the `package.json`
 * @param {string} name — the name of the dependency
 * @param {string} tarballPath — the absolute path of the tarball; backslashes are written as `/`
 * @returns {string} the content with the dependency pointing at the tarball, indented with tabs
 *   and ending with a newline
 * @throws {Error} when the `package.json` does not list the dependency, which would leave the
 *   registry version in place without telling
 */
export function pointDependencyAtTarball(packageJsonText, name, tarballPath) {
	const manifest = JSON.parse(packageJsonText);
	if (!manifest.dependencies?.[name]) {
		throw new Error(`${name} is not a dependency of ${manifest.name}`);
	}
	manifest.dependencies[name] = `file:${tarballPath.replaceAll('\\', '/')}`;
	return JSON.stringify(manifest, null, '\t') + '\n';
}
