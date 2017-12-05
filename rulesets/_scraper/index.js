const fs = require('fs');
const path = require('path');
const util = require('util');
const fetch = require('node-fetch');
const jsdom = require('jsdom');

const writeFile = util.promisify(fs.writeFile);

// MAIN
(async () => {
	const URL_LIST_PAGE = 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element';
	const urlList = await getList(URL_LIST_PAGE);
	process.stdout.write(`\nDone: Getting list.\n`);
	const p = [];
	for (const url of urlList) {
		p.push(getElementMetadata(url));
	}
	await Promise.all(...p);
	// for (const url of urlList) {
	// 	await getElementMetadata(url);
	// }
	console.log(`🎉 DONE: Scraped.`);
})();

// SUB
async function getElementMetadata (url) {
	const OUT_DIR = 'rulesets/html-ls/elements/';
	const outDir = path.resolve(OUT_DIR);
	const document = await getDocumentfromURL(url);
	const tagName = url.replace(/^.+\/([a-z][a-z0-1_-]*)\s*$/i, '$1');
	const resultObj = {
		tagName,
		citeFrom: url,
		attr: [],
	};
	const obsolete = document.querySelector('#wikiArticle .obsolete.obsoleteHeader');
	if (obsolete) {
		resultObj.obsolete = true;
	} else {
		const table = document.querySelector('.properties');
		if (!table) {
			resultObj.obsolete = true;
		} else {
			const rows = table.querySelectorAll('tr');
			if (!rows) {
				resultObj.obsolete = true;
			} else {
				for (const row of Array.from(rows)) {
					const th = row.querySelector('th');
					const td = row.querySelector('td');
					if (!th || !td) {
						continue;
					}
					const text = td.textContent;
					switch (th.textContent.trim()) {
						case 'Content categories': {
							resultObj.categories = Array.from(text.match(/[a-z]+\scontent/ig) || []).map(s => '#' + s.replace(' content', ''));
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
							resultObj.roles = text.split(/\s*,\s*/).map(s => s.trim());
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
					const dd = nextElementSibling(dt);
					if (dd) {
						resultObj.attr.push({
							name: attrName,
							description: dd.textContent,
						});
					} else {
						resultObj.attr.push(attrName);
					}
				}
			}
		}
		const obsoleteAttrHeading = document.getElementById('Obsolete');
		if (obsoleteAttrHeading) {
			let obsoleteAttrNextEl = nextElementSibling(obsoleteAttrHeading);
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
	const jsonPath = `${outDir}/${tagName}.json`;
	const current = require(jsonPath);
	const outputObj = Object.assign(current, resultObj);
	await writeFile(jsonPath, JSON.stringify(outputObj, null, '\t'));
	process.stdout.write(` => ${outDir}/${tagName}.json\n`);
}

async function getList (url) {
	const document = await getDocumentfromURL(url);
	const listHeading = document.querySelector('li a[href="/en-US/docs/Web/HTML/Element"]');
	const list = nextElementSibling(listHeading);
	const linkList = Array.from(list.querySelectorAll('a')).map((a) => `https://developer.mozilla.org${a.href}`);
	return linkList;
}

async function getDocumentfromURL (url) {
	process.stdout.write(`🔗 ${url}`);
	const res = await fetch(url);
	process.stdout.write(` resolve...`);
	const html = await res.text();
	process.stdout.write(` OK`);
	const dom = new jsdom.JSDOM(html);
	return dom.window.document;
}

function nextElementSibling (el) {
	var e = el.nextSibling;
	while (e && 1 !== e.nodeType)
		e = e.nextSibling;
	return e;
}
