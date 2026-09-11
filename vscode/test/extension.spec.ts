import assert from 'node:assert';

import { suite, suiteSetup, test } from 'mocha';
import * as vscode from 'vscode';

const EXTENSION_ID = 'markuplint.vscode-markuplint';

async function waitForExtension(timeout = 5000): Promise<vscode.Extension<unknown>> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		if (extension) {
			if (!extension.isActive) {
				await extension.activate();
			}
			return extension;
		}
		await new Promise(resolve => setTimeout(resolve, 100));
	}
	throw new Error(`Extension ${EXTENSION_ID} not found within ${timeout}ms`);
}

suite('Extension Tests', () => {
	suiteSetup(async function () {
		this.timeout(10_000);
		await waitForExtension();
	});

	suite('Command Registration', () => {
		test('markuplint.restartServer command should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('markuplint.restartServer'), 'Restart server command should be registered');
		});

		test('markuplint.openLog command should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('markuplint.openLog'), 'Open log command should be registered');
		});
	});

	suite('Restart Server Command', () => {
		test('should execute without throwing error', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'html',
				content: '<html><body><h1>Test</h1></body></html>',
			});
			await vscode.window.showTextDocument(doc);

			await new Promise(resolve => setTimeout(resolve, 1000));

			await vscode.commands.executeCommand('markuplint.restartServer');

			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});

		test('should work after restart', async function () {
			this.timeout(10_000);

			const doc = await vscode.workspace.openTextDocument({
				language: 'html',
				content: '<html><body><h1>Test</h1></body></html>',
			});
			await vscode.window.showTextDocument(doc);

			await new Promise(resolve => setTimeout(resolve, 1000));

			await vscode.commands.executeCommand('markuplint.restartServer');

			await new Promise(resolve => setTimeout(resolve, 3000));

			const diagnostics = vscode.languages.getDiagnostics(doc.uri);
			assert.ok(Array.isArray(diagnostics), 'Diagnostics should be available after restart');

			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});
	});

	suite('Extension Activation', () => {
		test('extension should be active', () => {
			const extension = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(extension, 'Extension should be installed');
			assert.strictEqual(extension.isActive, true, 'Extension should be active');
		});
	});
});
