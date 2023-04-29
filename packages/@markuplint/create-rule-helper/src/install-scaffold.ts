import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import fs from 'node:fs/promises';
import { resolve } from 'node:path';

import { fsExists } from './fs-exists';
import { transfer } from './transfer';

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

	const scaffoldDir = resolve(__dirname, '..', 'scaffold', scaffoldType);

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

	const packageJson = params.packageJson ? resolve(dest, 'package.json') : null;
	const dependencies: string[] = [];
	const devDependencies: string[] = [];

	if (packageJson) {
		const ext = params.lang === 'JAVASCRIPT' ? 'js' : 'ts';

		const packageContent: any = {
			name: params.ruleName,
			scripts: {},
			jest: {
				moduleFileExtensions: ['js', ...(params.lang === 'TYPESCRIPT' ? ['ts'] : [])],
				testRegex: `(\\.|/)(spec|test)\\.${ext}$`,
				testEnvironment: 'node',
				transform:
					params.lang === 'TYPESCRIPT'
						? {
								'^.+\\.ts$': 'ts-jest',
						  }
						: undefined,
			},
			babel:
				params.needTest && params.lang === 'JAVASCRIPT'
					? {
							presets: [
								[
									'@babel/preset-env',
									{
										targets: {
											node: 'current',
										},
									},
								],
							],
					  }
					: undefined,
		};

		if (params.lang === 'TYPESCRIPT') {
			packageContent.scripts.build = 'tsc';
		}

		dependencies.push('@markuplint/ml-core');
		devDependencies.push('markuplint');

		if (params.needTest) {
			packageContent.scripts.test = 'jest';
			devDependencies.push('jest');

			if (params.lang === 'TYPESCRIPT') {
				devDependencies.push('@types/jest');
				devDependencies.push('ts-jest');
			} else {
				devDependencies.push('babel-jest');
				devDependencies.push('@babel/core');
				devDependencies.push('@babel/preset-env');
			}
		}

		if (params.lang === 'TYPESCRIPT') {
			devDependencies.push('typescript');
		}

		await fs.writeFile(packageJson, JSON.stringify(packageContent, null, 2), { encoding: 'utf-8' });

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
