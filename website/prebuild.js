/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const util = require('util');
/* eslint-enable @typescript-eslint/no-var-requires */

const asyncGlob = util.promisify(glob);
const copyFile = util.promisify(fs.copyFile);
const ruleDir = path.resolve(process.cwd(), '../packages/@markuplint/rules/src/');
const globPath = path.resolve(ruleDir, '**/README.md');
const distDir = path.resolve(__dirname, './src/pages/rules');

async function copy() {
	const rulesMdList = await asyncGlob(globPath);

	await Promise.all(
		rulesMdList.map(async md => {
			const dirname = path.basename(path.dirname(md));
			const dist = path.resolve(distDir, dirname + '.mdx');
			await copyFile(md, dist);
		}),
	);
}

// Main
(async () => {
	copy();
})();
