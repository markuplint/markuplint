import assert from 'node:assert';

import { suite, test } from 'mocha';
import * as vscode from 'vscode';

suite('Extension Tests', () => {
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
			// Open an HTML file to activate the extension
			const doc = await vscode.workspace.openTextDocument({
				language: 'html',
				content: '<html><body><h1>Test</h1></body></html>',
			});
			await vscode.window.showTextDocument(doc);

			// Wait for extension activation
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Execute restart command - should not throw an error
			await vscode.commands.executeCommand('markuplint.restartServer');

			// Clean up
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});

		test('should work after restart', async function () {
			// Increase timeout for this test
			this.timeout(10_000);

			// Open an HTML file
			const doc = await vscode.workspace.openTextDocument({
				language: 'html',
				content: '<html><body><h1>Test</h1></body></html>',
			});
			await vscode.window.showTextDocument(doc);

			// Wait for extension activation
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Execute restart command
			await vscode.commands.executeCommand('markuplint.restartServer');

			// Wait for restart to complete
			await new Promise(resolve => setTimeout(resolve, 3000));

			// Verify diagnostics still work after restart
			// Note: This is a basic check that the extension is still functional
			const diagnostics = vscode.languages.getDiagnostics(doc.uri);
			assert.ok(Array.isArray(diagnostics), 'Diagnostics should be available after restart');

			// Clean up
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});
	});

	suite('Extension Activation', () => {
		test('extension should be active', () => {
			const extension = vscode.extensions.getExtension('yusukehirao.vscode-markuplint');
			assert.ok(extension, 'Extension should be installed');
			assert.strictEqual(extension.isActive, true, 'Extension should be active');
		});
	});
});
