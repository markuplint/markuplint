import { readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';
import { promisify } from 'util';
import { stripComments, visit } from 'jsonc-parser';
import mustache from 'mustache';

const asyncGlob = promisify(glob);

const dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(dirname, 'src');

const currents = await asyncGlob('preset.*.json,!preset.___json');
await Promise.all(currents.map(current => rm(current)));

const files = await asyncGlob(path.resolve(srcDir, '*.json'));
const md = await readFile(path.resolve(srcDir, 'README.md'), { encoding: 'utf-8' });

const presets = [];
const rules = {};
const extended = {};

for (const file of files) {
	const filename = path.basename(file);
	const code = await readFile(path.resolve(dirname, 'src', filename), { encoding: 'utf-8' });
	const json = JSON.parse(stripComments(code));
	const compressed = JSON.stringify(json);
	await writeFile(path.resolve(dirname, filename), compressed, { encoding: 'utf-8' });

	const name = filename.replace(/^preset\.|\.json/g, '');
	presets.push(name);
	extended[name] = (json['extends'] || []).map(name => name.replace('markuplint:', ''));

	visit(
		code,
		{
			onComment(offset, length) {
				const comment = code.substring(offset, offset + length);
				const line = comment.split('\n');
				const [heading = '', desc = ''] = comment
					.split(/\n\s*\*\s*\n/g)
					.map(section => cleanComment(section))
					.filter(s => !/^@see\s/.test(s));
				const text = line.map(line => cleanComment(line)).filter(s => s);
				const url = (text.find(t => /^@see\s/i.test(t)) || '').replace(/^@see\s/i, '');

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
		line.push(`Ruleset|Description|${presets.map(p => `\`${p}\``).join('|')}|`);
		line.push(`---|---|${'---|'.repeat(presets.length)}`);

		Object.entries(rules).forEach(([name, context]) => {
			const title = context.url ? `[${name}](${context.url})` : name;
			const checks = presets.map(preset => {
				const configs = [preset, ...extended[preset]];
				const has = configs.some(config => context.config?.includes(config));
				return has ? '✅' : '❌';
			});
			line.push(`${title}|${context.desc || ' '}|${checks.join('|')}|`);
		});

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
	const t2 = t1.replace(/^\/\*\*(?:[\n\s]*\*[\n\s]*)?|^\*\/|^\*|^\*[\s\n]*|[\s\n]*\*\/$/g, '');
	const t3 = t2.trim();
	return t3;
}

await writeFile('README.md', renderMd, { encoding: 'utf-8' });
