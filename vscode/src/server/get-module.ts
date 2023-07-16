import type { Log } from '../types';

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
		};
	} catch (_e) {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const esmAdapter = require('@markuplint/esm-adapter');
		const adapterVersion = esmAdapter.version;
		const version = await esmAdapter.getVersion();
		return {
			type: 'v4',
			version,
			adapter: esmAdapter,
			adapterVersion,
		};
	}
}

type OldModule = {
	type: 'v1';
	version: string;
	markuplint: any;
	modPath: string;
};

type Module = {
	type: 'v4';
	version: string;
	adapter: any;
	adapterVersion: string;
};
