const fs = require('fs');
const path = require('path');
const util = require('util');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const deepAssign = require('deep-assign');

const cliColor = require('cli-color');

const writeFile = util.promisify(fs.writeFile);

const OUT_DIR = 'rulesets/_scraper/html-ls/elements';
const PARALLEL = true;

/**
 * main
 */
(async () => {
	const URL_LIST_PAGE = 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element';
	const urlList = await getList(URL_LIST_PAGE);
	process.stdout.write('\nDone: Getting list.\n');
	if (PARALLEL) {
		const p = [];
		for (const url of urlList) {
			p.push(getElementMetadata(url));
		}
		await Promise.all(p);
	} else {
		for (const url of urlList) {
			await getElementMetadata(url);
		}
	}
	process.stdout.write('🎉 DONE: Scraped.\n');
})();

/**
 * sub
 *
 * @param {string} url
 */
async function getElementMetadata (url) {
	const outDir = path.resolve(OUT_DIR);
	const tagName = url.replace(/^.+\/([a-z][a-z0-1_-]*)\s*$/i, '$1');
	const document = await getDocumentfromURL(url);
	const resultObj = {
		tagName,
		citeFrom: url,
		attr: [],
	};
	const obsolete = document.querySelector('#wikiArticle .obsolete.obsoleteHeader');
	if (obsolete) {
		resultObj.obsolete = true;
		process.stdout.write(cliColor.red(tagName) + '(');
	} else {
		const table = document.querySelector('.properties');
		if (!table) {
			resultObj.obsolete = true;
			process.stdout.write(cliColor.red(tagName) + '(');
		} else {
			const rows = table.querySelectorAll('tr');
			if (!rows) {
				resultObj.obsolete = true;
				process.stdout.write(cliColor.red(tagName) + '(');
			} else {
				process.stdout.write(cliColor.green(tagName) + '(');
				for (const row of Array.from(rows)) {
					const th = row.querySelector('th');
					const td = row.querySelector('td');
					if (!th || !td) {
						continue;
					}
					const text = td.textContent;
					switch (th.textContent.trim()) {
						case 'Content categories': {
							resultObj.categories = Array.from(text.match(/[a-z]+\scontent/ig) || []).map((s) => '#' + s.replace(' content', ''));
							break;
						}
						case 'Permitted content': {
							resultObj.content = {
								description: text.trim(),
							};
							break;
						}
						case 'Tag omission': {
							resultObj.omission = {
								description: text.trim(),
							};
							break;
						}
						case 'Permitted parents': {
							resultObj.parents = {
								description: text.trim(),
							};
							break;
						}
						case 'Permitted ARIA roles': {
							resultObj.roles = text.split(/\s*,\s*/).map((s) => s.trim());
							break;
						}
						case 'DOM Interface': {
							resultObj.interface = text.trim();
							break;
						}
					}
				}
			}
		}
		const attrHeading = document.getElementById('Attributes');
		if (attrHeading) {
			let attrNextEl = nextElementSibling(attrHeading);
			if (attrNextEl && attrNextEl.nodeName === 'P') {
				if (/global attributes/i.test(attrNextEl.textContent)) {
					resultObj.attr.push('#global');
				}
				attrNextEl = nextElementSibling(attrNextEl);
			}
			if (attrNextEl && attrNextEl.nodeName === 'DL') {
				const dtList = attrNextEl.querySelectorAll('dt');
				for (const dt of dtList) {
					const attrName = dt.querySelector('code').textContent;
					const obsolete = !!dt.querySelector('.obsoleteInline');
					if (!obsolete) {
						process.stdout.write(cliColor.cyan(attrName) + ' ');
					} else {
						process.stdout.write(cliColor.red(attrName) + ' ');
					}
					const dd = nextElementSibling(dt);
					if (dd) {
						resultObj.attr.push({
							name: attrName,
							description: dd.textContent,
							obsolete,
						});
					} else {
						resultObj.attr.push(attrName);
					}
				}
			}
		}
		const obsoleteAttrHeading = document.getElementById('Obsolete');
		if (obsoleteAttrHeading) {
			const obsoleteAttrNextEl = nextElementSibling(obsoleteAttrHeading);
			if (obsoleteAttrNextEl && obsoleteAttrNextEl.nodeName === 'DL') {
				const dtList = obsoleteAttrNextEl.querySelectorAll('dt');
				for (const dt of dtList) {
					const attrName = dt.querySelector('code').textContent;
					const dd = nextElementSibling(dt);
					if (dd) {
						resultObj.attr.push({
							name: attrName,
							obsolete: true,
							description: dd.textContent,
						});
					} else {
						resultObj.attr.push(attrName);
					}
				}
			}
		}
	}
	process.stdout.write(') ');
	await mergeJSON(`${outDir}/${tagName}.json`, resultObj);
	// process.stdout.write(` => ${outDir}/${tagName}.json\n`);
}

/**
 *
 * @param {string} filepath
 * @param {Object} data
 */
async function mergeJSON (filepath, data) {
	let current = {};
	try {
		current = require(filepath);
	} catch (e) {
		//
	}
	const outputObj = deepAssign(current, data);
	await writeFile(filepath, JSON.stringify(outputObj, null, '\t'));
}

/**
 *
 * @param {string} url
 */
async function getList (url) {
	const document = await getDocumentfromURL(url);
	const listHeading = document.querySelector('li a[href="/en-US/docs/Web/HTML/Element"]');
	const list = nextElementSibling(listHeading);
	const linkList = Array.from(list.querySelectorAll('a')).map((a) => `https://developer.mozilla.org${a.href}`);
	return linkList;
}

/**
 *
 * @param {string} url
 */
async function getDocumentfromURL (url) {
	// process.stdout.write(`🔗 ${url}`);
	const res = await fetch(url);
	// process.stdout.write(' resolve...');
	const html = await res.text();
	// process.stdout.write(' OK');
	const dom = new jsdom.JSDOM(html);
	return dom.window.document;
}

/**
 *
 * @param {HTMLElement} el
 */
function nextElementSibling (el) {
	var e = el.nextSibling;
	while (e && 1 !== e.nodeType)
		e = e.nextSibling;
	return e;
}
