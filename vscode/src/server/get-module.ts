import type { Log } from '../types';
import type { FromCodeFunction } from '@markuplint/esm-adapter';
import type { ARIAVersion } from '@markuplint/ml-spec';

import path from 'node:path';

import { Files } from 'vscode-languageserver/node';

export async function getModule(log: Log): Promise<OldModule | Module> {
	try {
		const modPath = await Files.resolve('markuplint', process.cwd(), process.cwd(), message => log(message));
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const markuplint = require(modPath);
		const packageJsonPath = path.resolve(path.dirname(modPath), '..', 'package.json');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const version: string = require(packageJsonPath).version;
		return {
			type: 'v1',
			version,
			markuplint,
			modPath,
			ariaRecommendedVersion: '1.2',
		};
	} catch (_e) {
		let isESM = false;
		try {
			// eslint-disable-next-line import/no-extraneous-dependencies
			require('markuplint');
		} catch (e) {
			if (e && typeof e === 'object' && 'code' in e) {
				switch (e.code) {
					case 'ERR_PACKAGE_PATH_NOT_EXPORTED': {
						isESM = true;
						break;
					}
				}
			} else {
				throw e;
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { MLEngine } = require('@markuplint/esm-adapter');
		const fromCode: FromCodeFunction = async (sourceCode, options) => {
			const engine = await MLEngine.fromCode(sourceCode, {
				...options,
				moduleName: isESM ? 'markuplint' : undefined,
			});
			return engine;
		};
		const engine = await fromCode('');
		const version = await engine.getVersion();
		return {
			type: 'v4',
			version,
			fromCode,
			ariaRecommendedVersion: '1.2',
		};
	}
}

type OldModule = {
	type: 'v1';
	version: string;
	markuplint: any;
	modPath: string;
	ariaRecommendedVersion: '1.2';
};

type Module = {
	type: 'v4';
	version: string;
	fromCode: FromCodeFunction;
	ariaRecommendedVersion: ARIAVersion;
};
