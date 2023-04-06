import type { Log } from '../types';

import path from 'node:path';

import { Files } from 'vscode-languageserver/node';

export async function getModule(log: Log) {
	let modPath: string | undefined;
	let markuplint: any;
	let version: string;
	let isLocalModule = true;
	try {
		modPath = await Files.resolve('markuplint', process.cwd(), process.cwd(), message => log(message));
		markuplint = require(modPath);
		const packageJsonPath = path.resolve(path.dirname(modPath), '..', 'package.json');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		version = require(packageJsonPath).version;
	} catch (_e) {
		markuplint = require('markuplint');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		version = require('markuplint/package.json').version;
		isLocalModule = false;
	}
	return {
		modPath,
		markuplint,
		version,
		isLocalModule,
	};
}
