import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import fs from 'node:fs/promises';
import path from 'node:path';

import { fsExists } from './fs-exists';
import { transfer } from './transfer';

export async function installScaffold(
	scaffoldDir: string,
	dest: string,
	sourceDir: string,
	params: CreateRuleCreatorParams & {
		packageJson?: boolean;
		schemaJson?: boolean;
	},
): Promise<CreateRuleHelperResult> {
	const exists = await fsExists(dest);
	if (!exists) {
		await fs.mkdir(dest);
	}

	const scaffoldReadmeFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'README.md');
	const scaffoldMainFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'index.ts');
	const scaffoldTestFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'index.spec.ts');
	const scaffoldSchemaFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'schema.json');

	const transpile = params.lang === 'JAVASCRIPT';
	const readme = await transfer(scaffoldReadmeFile, dest, { name: params.name });
	const main = await transfer(scaffoldMainFile, path.resolve(dest, sourceDir), { name: params.name }, { transpile });
	const test = params.needTest
		? await transfer(scaffoldTestFile, path.resolve(dest, sourceDir), { name: params.name }, { transpile })
		: null;
	const schemaJson = params.schemaJson ? await transfer(scaffoldSchemaFile, dest, { name: params.name }) : null;

	if (!readme) {
		throw new ReferenceError(`File is not found: ${scaffoldReadmeFile}`);
	}
	if (!main) {
		throw new ReferenceError(`File is not found: ${scaffoldMainFile}`);
	}

	const packageJson = params.packageJson ? path.resolve(dest, 'package.json') : null;
	const dependencies: string[] = [];
	const devDependencies: string[] = [];

	const tsConfig = params.packageJson && params.lang === 'TYPESCRIPT' ? path.resolve(dest, 'tsconfig.json') : null;
	const ext = params.lang === 'JAVASCRIPT' ? 'js' : 'ts';

	if (packageJson) {
		const packageContent: any = {
			name: params.name,
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

		dependencies.push('@markuplint/ml-core@next');
		devDependencies.push('markuplint@next');

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
	}

	if (tsConfig) {
		const config = {
			compilerOptions: {
				module: 'commonjs',
				target: 'es2019',
				strict: true,
				strictNullChecks: true,
				strictPropertyInitialization: true,
				allowSyntheticDefaultImports: true,
				experimentalDecorators: true,
				esModuleInterop: true,
				noImplicitAny: true,
				declaration: true,
				lib: ['dom', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'esnext'],
				skipLibCheck: true,
				outDir: './lib',
				rootDir: './src',
			},
			include: ['./src/**/*'],
			exclude: ['node_modules', 'lib', './src/**/*.spec.ts'],
		};

		await fs.writeFile(tsConfig, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
	}

	return {
		...params,
		readme,
		main,
		test,
		packageJson,
		tsConfig,
		schemaJson,
		dependencies,
		devDependencies,
	};
}
