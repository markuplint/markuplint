const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

const EL_DIR = 'rulesets/_scraper/html-ls/elements';
const OUT_FILE = 'rulesets/html-ls.json';

/**
 * main
 */
(async () => {
	const dir = path.resolve(EL_DIR);
	const list = await readdir(dir);

	const result = {
		nodeRules: [],
	};

	for (const fileName of list) {
		if (!/\.json$/i.test(fileName)) {
			continue;
		}
		const filePath = path.resolve(dir, fileName);
		const tagFile = await readFile(filePath, { encoding: 'utf-8' });
		const tag = JSON.parse(tagFile);
		const nodeRule = {
			tagName: tag.tagName,
			categories: tag.categories,
			roles: tag.roles,
			obsolete: !!tag.obsolete,
		};
		result.nodeRules.push(nodeRule);
	}

	const out = path.resolve(OUT_FILE);
	await writeFile(out, JSON.stringify(result, null, 2));
	process.stdout.write(`✨ Done ${out}.`);
})();
