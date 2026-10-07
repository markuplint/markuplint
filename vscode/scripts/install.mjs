#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * VS Code extension build driver.
 *
 * Usage: `node vscode/scripts/install.mjs [mode]`
 *
 * Accepted modes (see `./resolve-mode.mjs` for the authoritative list):
 *
 * | Mode      | Effect                                              |
 * | --------- | --------------------------------------------------- |
 * | `package` | Build a stable .vsix (default when no arg is given) |
 * | `release` | Publish a stable version to Marketplace             |
 *
 * Any other argument exits with code 1. Prereleases are distributed only as
 * `.vsix` attached to GitHub Releases (see `vscode/CLAUDE.md`).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { pointDependencyAtTarball } from './point-dependency-at-tarball.mjs';
import { resolveMode } from './resolve-mode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const rootDir = path.join(__dirname, '../..');
const packageJsonPath = path.join(rootDir, 'package.json');
const backupPath = path.join(rootDir, 'package.json.bak');
const vscodeDir = path.join(rootDir, 'vscode');
const vscodePackageJsonPath = path.join(vscodeDir, 'package.json');
const languageServerDir = path.join(rootDir, 'packages', '@markuplint', 'language-server');

// State that the `finally` block restores
let vscodePackageJsonOriginal = null;
let packDir = null;

let mode;
try {
	mode = resolveMode(process.argv);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}

console.log(`Starting VS Code extension ${mode} process...`);

try {
	// 1. Backup package.json
	console.log('1. Backing up package.json...');
	fs.copyFileSync(packageJsonPath, backupPath);

	// 2. Remove 'vscode' from workspaces
	console.log('2. Removing vscode from workspaces...');
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	packageJson.workspaces = packageJson.workspaces.filter(ws => ws !== 'vscode');
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

	// 3. Pack the language server of this checkout and point the extension at the tarball.
	// Installed from the registry it would be the published build, or nothing at all while the
	// version is still being prepared, so what the commit holds would never reach the VSIX.
	console.log('3. Packing the language server...');
	if (!fs.existsSync(path.join(languageServerDir, 'lib', 'server', 'index.js'))) {
		throw new Error('@markuplint/language-server is not built. Run `yarn build` first.');
	}
	packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'markuplint-vscode-pack-'));
	const [packed] = JSON.parse(
		execFileSync('npm', ['pack', '--json', '--pack-destination', packDir], {
			cwd: languageServerDir,
			encoding: 'utf8',
			shell: process.platform === 'win32',
		}),
	);
	const packedPaths = packed.files.map(file => file.path);
	if (!packedPaths.includes('lib/server/index.js')) {
		throw new Error(
			`The tarball of @markuplint/language-server has no lib/server/index.js. It holds: ${packedPaths.join(', ')}`,
		);
	}
	vscodePackageJsonOriginal = fs.readFileSync(vscodePackageJsonPath, 'utf8');
	fs.writeFileSync(
		vscodePackageJsonPath,
		pointDependencyAtTarball(
			vscodePackageJsonOriginal,
			'@markuplint/language-server',
			path.join(packDir, packed.filename),
		),
	);

	// 4. Clean vscode node_modules
	console.log('4. Cleaning vscode node_modules...');
	const nodeModulesPath = path.join(vscodeDir, 'node_modules');
	if (fs.existsSync(nodeModulesPath)) {
		execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'inherit' });
	}

	// 5. Install dependencies
	console.log('5. Installing dependencies...');
	// Try yarn first, fallback to npm
	try {
		console.log('Trying yarn install...');
		execSync('yarn install --no-immutable', { cwd: vscodeDir, stdio: 'inherit' });
	} catch {
		console.log('Yarn failed, trying npm install...');
		execSync('npm install', { cwd: vscodeDir, stdio: 'inherit' });
	}

	// 6. Build extension
	console.log('6. Building extension...');
	execSync('npm run vscode:build', { cwd: vscodeDir, stdio: 'inherit' });

	// 7. Run vscode command
	console.log(`7. Running vscode:${mode}...`);
	execSync(`npm run vscode:${mode}`, { cwd: vscodeDir, stdio: 'inherit' });

	// 8. Clean up package-lock.json
	console.log('8. Cleaning up package-lock.json...');
	const packageLockPath = path.join(vscodeDir, 'package-lock.json');
	if (fs.existsSync(packageLockPath)) {
		fs.unlinkSync(packageLockPath);
	}

	console.log('✅ VS Code extension build completed successfully!');
} catch (error) {
	console.error('❌ Build failed:', error.message);
	if (error.stdout) console.error('STDOUT:', error.stdout.toString());
	if (error.stderr) console.error('STDERR:', error.stderr.toString());
	console.error('Full error:', error);
	// Set exit code but don't exit immediately - let finally block run
	process.exitCode = 1;
} finally {
	// 9. Always restore package.json and remove the tarball
	console.log('9. Restoring package.json...');
	if (fs.existsSync(backupPath)) {
		fs.copyFileSync(backupPath, packageJsonPath);
		fs.unlinkSync(backupPath);
		console.log('✅ package.json restored successfully');
	}
	if (vscodePackageJsonOriginal !== null) {
		fs.writeFileSync(vscodePackageJsonPath, vscodePackageJsonOriginal);
		console.log('✅ vscode/package.json restored successfully');
	}
	if (packDir !== null) {
		fs.rmSync(packDir, { recursive: true, force: true });
	}
}
