#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const rootDir = path.join(__dirname, '../..');
const packageJsonPath = path.join(rootDir, 'package.json');
const backupPath = path.join(rootDir, 'package.json.bak');
const vscodeDir = path.join(rootDir, 'vscode');

// Check if this is release mode
const isRelease = process.argv.includes('release');
const mode = isRelease ? 'release' : 'package';

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

	// 3. Clean vscode node_modules
	console.log('3. Cleaning vscode node_modules...');
	const nodeModulesPath = path.join(vscodeDir, 'node_modules');
	if (fs.existsSync(nodeModulesPath)) {
		execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'inherit' });
	}

	// 4. Install dependencies with npm
	console.log('4. Installing dependencies with npm...');
	execSync('npm install', { cwd: vscodeDir, stdio: 'inherit' });

	// 5. Run vscode command
	console.log(`5. Running vscode:${mode}...`);
	execSync(`npm run vscode:${mode}`, { cwd: vscodeDir, stdio: 'inherit' });

	// 6. Clean up package-lock.json
	console.log('6. Cleaning up package-lock.json...');
	const packageLockPath = path.join(vscodeDir, 'package-lock.json');
	if (fs.existsSync(packageLockPath)) {
		fs.unlinkSync(packageLockPath);
	}

	console.log('✅ VS Code extension build completed successfully!');
} catch (error) {
	console.error('❌ Build failed:', error.message);
	// Set exit code but don't exit immediately - let finally block run
	process.exitCode = 1;
} finally {
	// 7. Always restore package.json
	console.log('7. Restoring package.json...');
	if (fs.existsSync(backupPath)) {
		fs.copyFileSync(backupPath, packageJsonPath);
		fs.unlinkSync(backupPath);
		console.log('✅ package.json restored successfully');
	}
}
