import path from 'node:path';

export function getModule() {
	let modPath: string | undefined;
	let markuplint: any;
	let version: string;
	let isLocalModule = true;
	try {
		modPath = path.resolve(process.cwd(), 'node_modules', 'markuplint');
		markuplint = require(modPath);
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		version = require(`${modPath}/package.json`).version;
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
