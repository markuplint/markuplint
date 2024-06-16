import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fsExists } from './fs-exists.js';
import { transfer } from './transfer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function installScaffold(
	scaffoldType: 'core' | 'project' | 'package',
	dest: string,
	params: CreateRuleCreatorParams & {
		readonly packageJson?: boolean;
	},
): Promise<CreateRuleHelperResult> {
	const exists = await fsExists(dest);
	if (!exists) {
		await fs.mkdir(dest);
	}

	const scaffoldDir = path.resolve(__dirname, '..', 'scaffold', scaffoldType);

	const transferred = await transfer(scaffoldType, scaffoldDir, dest, {
		transpile: params.lang === 'JAVASCRIPT',
		test: params.needTest,
		replacer: {
			pluginName: params.pluginName,
			ruleName: params.ruleName,
			description: params.core?.description,
			category: params.core?.category,
			severity: params.core?.severity,
		},
	});

	const packageJson = params.packageJson ? path.resolve(dest, 'package.json') : null;
	const dependencies: string[] = [];
	const devDependencies: string[] = [];

	if (packageJson) {
		// const ext = params.lang === 'JAVASCRIPT' ? 'js' : 'ts';

		const packageContent: any = {
			name: params.ruleName,
			scripts: {},
		};

		if (params.lang === 'TYPESCRIPT') {
			packageContent.scripts.build = 'tsc';
		}

		dependencies.push('@markuplint/ml-core');
		devDependencies.push('markuplint');

		if (params.needTest) {
			packageContent.scripts.test = 'vitest';
			devDependencies.push('vitest');
		}

		if (params.lang === 'TYPESCRIPT') {
			devDependencies.push('typescript');
		}

		await fs.writeFile(packageJson, JSON.stringify(packageContent, null, 2), { encoding: 'utf8' });

		transferred.push({
			ext: '.json',
			name: 'package',
			fileName: 'package',
			test: false,
			destDir: dest,
			filePath: packageJson,
		});
	}

	return {
		files: transferred,
		dependencies,
		devDependencies,
	};
}
