/* global cheerio */

import type { ElementSpec, ExtendedElementSpec, Category, Attribute } from '@markuplint/ml-spec';

import fetch from './fetch';
import { getThisOutline, sortObjectByKey } from './utils';

const MAIN_ARTICLE_SELECTOR = 'article.main-page-content, article.article';

export async function fetchHTMLElementLinks() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Element');
	const $listHeading = $(
		$('#sidebar-quicklinks summary')
			.toArray()
			.filter(el => /html elements/i.test($(el).text()))[0],
	);
	const $list = $listHeading.siblings('ol,ul');
	const lists = $list
		.find('li a')
		.toArray()
		.map(el => `https://developer.mozilla.org${$(el).attr('href')}`);

	return lists;
}

export function fetchObsoleteElements(obsoleteList: string[], specs: ExtendedElementSpec[]): ExtendedElementSpec[] {
	return obsoleteList
		.map<ElementSpec | null>(name => {
			const found = specs.find(e => e.name === name);
			if (found) {
				return null;
			}
			return {
				name,
				cite: 'https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features',
				obsolete: true,
				categories: [],
				contentModel: {
					contents: true,
				},
				aria: {
					permittedRoles: true,
					implicitRole: false,
				},
				omittion: false,
				globalAttrs: {},
				attributes: {},
			};
		})
		.filter((e): e is ElementSpec => !!e);
}

export async function fetchHTMLElement(link: string) {
	const $ = await fetch(link);
	let name = link.replace(/.+\/([a-z0-9_-]+)$/i, '$1').toLowerCase();
	if (name === 'heading_elements') {
		name = 'h1-h6';
	}
	const $article = $(MAIN_ARTICLE_SELECTOR);
	$article.find('p:empty').remove();
	const description =
		$article
			.find('h2#summary')
			.next('div')
			.find('> p:first-of-type')
			.text()
			.trim()
			.replace(/(?:\r?\n|\s)+/gi, ' ') ||
		$article
			.find('.seoSummary')
			.closest('p')
			.text()
			.trim()
			.replace(/(?:\r?\n|\s)+/gi, ' ') ||
		$article
			.find('h1')
			.next('div')
			.find('> p:first-of-type')
			.text()
			.trim()
			.replace(/(?:\r?\n|\s)+/gi, ' ');

	const $bcTable = $article.find('.bc-table');
	const $bcTableFirstRow = $bcTable.find('tbody tr:first-child th');
	const isBcTableIsAvailabled = $bcTableFirstRow.find('code').text().trim() === name;

	let experimental: true | undefined;
	let obsolete: true | undefined;
	let deprecated: true | undefined;
	let nonStandard: true | undefined;

	if (isBcTableIsAvailabled) {
		experimental = !!$bcTableFirstRow.find('.ic-experimental').length || undefined;
		obsolete = !!$bcTableFirstRow.find('.ic-obsolete').length || undefined;
		deprecated = !!$bcTableFirstRow.find('.ic-deprecated').length || undefined;
		nonStandard = !!$bcTableFirstRow.find('.ic-non-standard').length || undefined;
	} else {
		experimental =
			!!$article.find('.blockIndicator.experimental, > div .notecard.experimental').length || undefined;
		obsolete =
			!!$article.find('.obsoleteHeader').length ||
			!!$('h1')
				.text()
				.match(/obsolete/i) ||
			!!$article.find('> div:first-child .notecard.obsolete').length ||
			undefined;
		deprecated =
			!!$article.find('.deprecatedHeader, > div:first-child .notecard.deprecated').length ||
			!!$article.find('h1').next().find('.notecard.deprecated').length ||
			undefined;
		nonStandard = !!$article.find('.nonStandardHeader, h4#Non-standard').length || undefined;
	}

	const categories: Category[] = [];
	const cat = getProperty($, 'Content categories');
	if (/transparent/i.test(cat)) categories.push('#transparent');
	if (/metadata content/i.test(cat)) categories.push('#metadata');
	if (/flow content/i.test(cat)) categories.push('#flow');
	if (/sectioning content/i.test(cat)) categories.push('#sectioning');
	if (/heading content/i.test(cat)) categories.push('#heading');
	if (/phrasing content/i.test(cat)) categories.push('#phrasing');
	if (/embedded content/i.test(cat)) categories.push('#embedded');
	if (/interactive content/i.test(cat)) categories.push('#interactive');
	if (/palpable content/i.test(cat)) categories.push('#palpable');
	if (/script-supporting/i.test(cat)) categories.push('#script-supporting');

	let { attributes } = getAttributes($, '#attributes', name);
	const { attributes: deprecatedAttributes } = getAttributes($, '#deprecated_attributes', name);
	const { attributes: individualAttributes } = getAttributes($, '#individual_attributes', name);
	const { attributes: nonStandardAttributes } = getAttributes($, '#non-standard_attributes', name);
	const { attributes: obsoleteAttributes } = getAttributes($, '#obsolete_attributes', name);
	attributes = sortObjectByKey({
		...attributes,
		...deprecatedAttributes,
		...individualAttributes,
		...nonStandardAttributes,
		...obsoleteAttributes,
	});

	const spec: ExtendedElementSpec = {
		name,
		cite: link,
		description,
		experimental,
		obsolete,
		deprecated,
		nonStandard,
		categories,
		contentModel: {
			contents: false,
		},
		aria: {
			implicitRole: false,
			permittedRoles: true,
		},
		omittion: false,
		attributes,
	};

	return spec;
}

function getProperty($: cheerio.Root, prop: string) {
	const $tr = $(MAIN_ARTICLE_SELECTOR).find('table.properties tr') || $('#Technical_summary').next('table tr');
	const $th = $(
		$tr
			.find('th')
			.toArray()
			.filter(el => new RegExp(prop, 'i').test($(el).text())),
	);
	return $th
		.siblings('td')
		.text()
		.trim()
		.replace(/(?:\r?\n|\s)+/gi, ' ');
}

function getAttributes($: cheerio.Root, heading: string, tagName: string) {
	const $heading = $(heading);
	const $outline = getThisOutline($, $heading);
	const attributes: Record<string, Attribute> = {};
	$outline
		.find('> div > dl > dt')
		.toArray()
		.forEach(dt => {
			const $dt = $(dt);
			const name = $dt.find('code').text().trim();
			if (!name) {
				return null;
			}
			const $myHeading = getItsHeading($dt);
			const experimental =
				!!$dt.find('.icon-beaker, .icon.experimental, .icon.icon-experimental').length || undefined;
			const obsolete =
				!!$dt.find('.icon-trash, .icon.obsolete, .icon.icon-obsolete').length ||
				!!$dt.find('.obsolete').length ||
				$myHeading?.attr('id') === 'obsolete_attributes' ||
				undefined;
			const deprecated =
				!!$dt.find('.icon-thumbs-down-alt, .icon.deprecated, .icon.icon-deprecated').length ||
				$myHeading?.attr('id') === 'deprecated_attributes' ||
				undefined;
			const nonStandard =
				!!$dt.find('.icon-warning-sign, .icon.non-standard, .icon.icon-nonstandard').length || undefined;
			const description = $dt
				.next('dd')
				.toArray()
				.map(el => $(el).text())
				.join('')
				.trim()
				.replace(/(?:\r?\n|\s)+/gi, ' ');

			const current = attributes[name];
			if (!current) {
				attributes[name] = {
					name,
					type: 'Any',
					// @ts-ignore
					description,
					experimental,
					obsolete,
					deprecated,
					nonStandard,
				};
				return;
			}

			if (typeof current === 'object' && 'name' in current) {
				attributes[name] = {
					// @ts-ignore for key order that "name" is first
					name,
					// @ts-ignore for key order that "description" is second
					description,
					experimental,
					obsolete,
					deprecated,
					nonStandard,
					// @ts-ignore
					...current,
				};
			}
		});
	return { attributes };
}

function getItsHeading($start: cheerio.Cheerio) {
	let $needle = upToPrevOrParent($start);
	while ($needle.length) {
		if (isHeading($needle)) {
			return $needle;
		}
		$needle = upToPrevOrParent($needle);
	}
	return null;
}

function upToPrevOrParent($start: cheerio.Cheerio) {
	let $needle = $start.prev();
	if (!$needle.length) {
		$needle = $start.parent();
	}
	return $needle;
}

function isHeading($el: cheerio.Cheerio) {
	// @ts-ignore
	return /^h[1-6]$/i.test($el[0].tagName);
}
