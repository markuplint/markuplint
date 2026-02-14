import assert from 'node:assert';

import { suite, test } from 'mocha';
import * as vscode from 'vscode';

suite('Config Tests', () => {
	test('config', () => {
		const config = vscode.workspace.getConfiguration('markuplint');

		assert.strictEqual(config.get('debug'), true);
		assert.strictEqual(config.get('enable'), true);
		assert.deepStrictEqual(config.get('defaultConfig'), {
			extends: ['markuplint:recommended'],
		});
		assert.deepStrictEqual(config.get('hover.accessibility.enable'), true);
		assert.deepStrictEqual(config.get('hover.accessibility.ariaVersion'), '1.2');
		assert.deepStrictEqual(config.get('targetLanguages'), [
			'astro',
			'ejs',
			'haml',
			'handlebars',
			'html',
			'jade',
			'javascript',
			'javascriptreact',
			'jstl',
			'liquid',
			'mustache',
			'nunjucks',
			'php',
			'ruby',
			'smarty',
			'svelte',
			'typescript',
			'typescriptreact',
			'vue',
		]);
	});
});
