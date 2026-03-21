/**
 * Generate MLAST JSON fixtures for Rust serde tests.
 *
 * Usage: node crates/markuplint-core/tests/generate-fixtures.mjs
 *
 * Requires: built @markuplint/html-parser (run `yarn build` first)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');

mkdirSync(fixturesDir, { recursive: true });

// Dynamic import of the HTML parser
const { parser } = await import('@markuplint/html-parser');

const fixtures = [
	{
		name: 'simple',
		html: '<div class="foo">text</div>',
	},
	{
		name: 'empty-document',
		html: '',
	},
	{
		name: 'full-attributes',
		html: '<input type="text" disabled required="required" data-value=unquoted data-single=\'single\'>',
	},
	{
		name: 'nested',
		html: '<div><span>text</span></div>',
	},
	{
		name: 'namespace-svg',
		html: '<svg><circle cx="50" cy="50" r="40"/></svg>',
	},
	{
		name: 'doctype',
		html: '<!DOCTYPE html><html><head></head><body></body></html>',
	},
	{
		name: 'comment',
		html: '<!-- comment --><div>text</div>',
	},
	{
		name: 'multiple-elements',
		html: '<p>first</p><p>second</p><p>third</p>',
	},
];

for (const { name, html } of fixtures) {
	const doc = parser.parse(html);
	const json = JSON.stringify(doc, null, '\t');
	const outPath = resolve(fixturesDir, `${name}.json`);
	writeFileSync(outPath, json + '\n', 'utf-8');
	console.log(`Generated: ${outPath}`);
}

// Generate nested-deep fixture (130 depth — exceeds serde_json's default 128 limit)
function generateDeepNest(depth) {
	let open = '';
	let close = '';
	for (let i = 0; i < depth; i++) {
		open += '<div>';
		close += '</div>';
	}
	return open + 'leaf' + close;
}

const deepHtml = generateDeepNest(130);
const deepDoc = parser.parse(deepHtml);
const deepJson = JSON.stringify(deepDoc, null, '\t');
writeFileSync(resolve(fixturesDir, 'nested-deep.json'), deepJson + '\n', 'utf-8');
console.log(`Generated: ${resolve(fixturesDir, 'nested-deep.json')}`);

console.log('Done.');
