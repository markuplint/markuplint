import fs from 'node:fs';
import path from 'node:path';

import { runTests } from '@vscode/test-electron';

function createSettings() {
	const userDataDirectory = path.resolve(process.cwd(), '.tmp', 'vscode-test');
	const settingsFile = path.join(userDataDirectory, 'User', 'settings.json');
	const defaultSettings = {
		'markuplint.debug': true,
		'security.workspace.trust.enabled': false,
	};

	fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
	fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, undefined, 4));
	return userDataDirectory;
}

async function main() {
	try {
		const userDataDirectory = createSettings();
		const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
		const extensionTestsPath = path.resolve(__dirname, 'index.js');
		const workspacePath = path.resolve(process.cwd(), 'test', 'test.code-workspace');

		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				workspacePath,
				'--skip-welcome',
				'--disable-extensions',
				'--skip-release-notes',
				'--user-data-dir',
				userDataDirectory,
			],
		});
	} catch (error) {
		/* eslint-disable no-console */
		console.error('Failed to run tests');
		if (error instanceof Error) {
			console.error('error message: ' + error.message);
			console.error('error name: ' + error.name);
			console.error('error stack: ' + error.stack);
		} else {
			console.error('No error object: ' + JSON.stringify(error));
		}
		/* eslint-enable no-console */

		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	}
}

// eslint-disable-next-line no-console
main().catch(error => console.error(error));
