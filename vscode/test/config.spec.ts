import assert from 'node:assert';

import { suite, test } from 'mocha';
import * as vscode from 'vscode';

suite('Config Tests', () => {
	test('config', () => {
		const config = vscode.workspace.getConfiguration();

		const mlConfig = config.get('markuplint');

		assert.deepStrictEqual(mlConfig, {
			debug: true,
			defaultConfig: {
				extends: ['markuplint:recommended'],
			},
			enable: true,
			hover: {
				accessibility: {
					ariaVersion: '1.2',
					enable: true,
				},
			},
			targetLanguages: [
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
			],
		});
	});
});
