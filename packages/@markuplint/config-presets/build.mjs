import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { glob } from 'glob';
import { stripComments, visit } from 'jsonc-parser';
import mustache from 'mustache';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(dirname, 'src');

const currents = await glob('preset.*.json,!preset.___json');
await Promise.all(currents.map(current => rm(current)));

const files = await glob('*.json', { cwd: srcDir });
const md = await readFile(path.resolve(srcDir, 'README.md'), { encoding: 'utf8' });

files.sort();

const presets = [];
const rules = {};
const extended = {};

for (const file of files) {
	const filename = path.basename(file);
	const code = await readFile(path.resolve(srcDir, filename), { encoding: 'utf8' });
	const json = JSON.parse(stripComments(code));
	const compressed = JSON.stringify(json);
	await writeFile(path.resolve(dirname, filename), compressed, { encoding: 'utf8' });

	const name = filename.replaceAll(/^preset\.|\.json/g, '');
	presets.push(name);
	extended[name] = (json['extends'] ?? []).map(name => name.replace('markuplint:', ''));

	visit(
		code,
		{
			onComment(offset, length) {
				const comment = code.slice(offset, offset + length);
				const line = comment.split('\n');
				const [heading = '', desc = ''] = comment
					.split(/\n\s*\*\s*\n/g)
					.map(section => cleanComment(section))
					.filter(s => !/^@see\s/.test(s));
				const text = line.map(line => cleanComment(line)).filter(Boolean);
				const url = (text.find(t => /^@see\s/i.test(t)) ?? '').replace(/^@see\s/i, '');

				if (!heading) {
					return;
				}

				if (rules[heading]?.config) {
					rules[heading].config.push(name);
				} else {
					rules[heading] = {
						desc,
						url,
						config: [name],
					};
				}
			},
		},
		{ disallowComments: false },
	);
}

presets.sort((a, b) => {
	if (a.includes('recommended')) {
		return -1;
	}
	return a - b;
});

const renderMd = mustache.render(md, {
	presets: () => {
		const line = [];
		line.push(
			`Ruleset|Description|${presets.map(p => `\`${p}\``).join('|')}|`,
			`---|---|${'---|'.repeat(presets.length)}`,
		);

		for (const [name, context] of Object.entries(rules)) {
			const title = context.url ? `[${name}](${context.url})` : name;
			const checks = presets.map(preset => {
				const configs = [preset, ...extended[preset]];
				const has = configs.some(config => context.config?.includes(config));
				return has ? '✅' : '❌';
			});
			line.push(`${title}|${context.desc || ' '}|${checks.join('|')}|`);
		}

		return line.join('\n');
	},
});

/**
 *
 * @param {string} text
 * @returns
 */
function cleanComment(text) {
	const t1 = text.trim();
	const t2 = t1.replaceAll(/^\/\*{2}(?:\s*\*\s*)?|^\*\/|^\*|\s*\*\/$/g, '');
	const t3 = t2.replaceAll(/\s*\n\s*(?:\*\s*)?/g, ' ');
	const t4 = t3.trim();
	return t4;
}

await writeFile('README.md', renderMd, { encoding: 'utf8' });
