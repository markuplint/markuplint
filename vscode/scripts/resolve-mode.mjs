/**
 * Valid modes for the VS Code extension build script.
 *
 * - `package`      — build a stable .vsix
 * - `release`      — publish a stable version to Marketplace
 * - `pre-package`  — build a prerelease .vsix (passes --pre-release to vsce)
 * - `pre-release`  — publish a prerelease version to Marketplace
 *
 * Each mode maps 1:1 to the matching `npm run vscode:<mode>` script in
 * `vscode/package.json`. To add a new mode, update both `validModes` below
 * AND the corresponding script entry.
 *
 * SEE: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
 */
export const validModes = ['package', 'release', 'pre-package', 'pre-release'];

/**
 * Resolve the build mode from process.argv.
 *
 * @param {readonly string[]} argv — the full `process.argv` array
 * @returns {string} the resolved mode (defaults to `'package'` when no arg is given)
 * @throws {Error} when the third arg is a non-empty string not in `validModes`
 */
export function resolveMode(argv) {
	const arg = argv[2];
	if (arg !== undefined && !validModes.includes(arg)) {
		throw new Error(`Invalid mode: ${arg}. Valid: ${validModes.join(', ')}`);
	}
	return arg ?? 'package';
}
