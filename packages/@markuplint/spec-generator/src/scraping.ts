/* global cheerio */

import type { ElementSpec, ExtendedElementSpec, Category, Attribute } from '@markuplint/ml-spec';

import { fetch } from './fetch.js';
import { getThisOutline, sortObjectByKey } from './utils.js';

const MAIN_ARTICLE_SELECTOR = 'article.main-page-content, article.article';

export async function fetchHTMLElementLinks() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Element');
	const $listHeading = $(
		$('#sidebar-quicklinks summary')
			.toArray()
			.find(el => /html elements/i.test($(el).text())),
	);
	const $list = $listHeading.siblings('ol,ul');
	const lists = $list
		.find('li a')
		.toArray()
		.map(el => `https://developer.mozilla.org${$(el).attr('href')}`);

	return lists;
}

export function fetchObsoleteElements(
	obsoleteList: readonly string[],
	specs: readonly ExtendedElementSpec[],
): ExtendedElementSpec[] {
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
				omission: false,
				globalAttrs: {},
				attributes: {},
			};
		})
		.filter((e): e is ElementSpec => !!e);
}

export async function fetchHTMLElement(link: string) {
	const $ = await fetch(link);
	let name = link.replace(/.+\/([\w-]+)$/, '$1').toLowerCase();
	if (name === 'heading_elements') {
		name = 'h1-h6';
	}
	const $article = $(MAIN_ARTICLE_SELECTOR);
	$article.find('p:empty').remove();
	const description =
		$article.find('h2#summary').next('div').find('> p:first-of-type').text().trim().replaceAll(/\s+/g, ' ') ||
		$article.find('.seoSummary').closest('p').text().trim().replaceAll(/\s+/g, ' ') ||
		$article.find('h1').next('div').find('> p:first-of-type').text().trim().replaceAll(/\s+/g, ' ') ||
		$article.find('.section-content:eq(0)').find('> p:eq(0)').text().trim().replaceAll(/\s+/g, ' ');

	const $bcTable = $article.find('.bc-table');
	const $bcTableFirstRow = $bcTable.find('tbody tr:first-child th');
	const isBcTableIsAvailable = $bcTableFirstRow.find('code').text().trim() === name;

	let experimental: true | undefined;
	let obsolete: true | undefined;
	let deprecated: true | undefined;
	let nonStandard: true | undefined;

	if (isBcTableIsAvailable) {
		experimental = $bcTableFirstRow.find('.ic-experimental').length > 0 || undefined;
		obsolete = $bcTableFirstRow.find('.ic-obsolete').length > 0 || undefined;
		deprecated = $bcTableFirstRow.find('.ic-deprecated').length > 0 || undefined;
		nonStandard = $bcTableFirstRow.find('.ic-non-standard').length > 0 || undefined;
	} else {
		experimental =
			$article.find('.blockIndicator.experimental, > div .notecard.experimental').length > 0 || undefined;
		obsolete =
			$article.find('.obsoleteHeader').length > 0 ||
			!!/obsolete/i.test($('h1').text()) ||
			$article.find('> div:first-child .notecard.obsolete').length > 0 ||
			undefined;
		deprecated =
			$article.find('.deprecatedHeader, > div:first-child .notecard.deprecated').length > 0 ||
			$article.find('h1').next().find('.notecard.deprecated').length > 0 ||
			undefined;
		nonStandard = $article.find('.nonStandardHeader, h4#Non-standard').length > 0 || undefined;
	}

	const categories: Category[] = [];
	const cat = getProperty($, 'Content categories');
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
		omission: false,
		attributes,
	};

	return spec;
}

function getProperty(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$: cheerio.Root,
	prop: string,
) {
	const $tr = $(MAIN_ARTICLE_SELECTOR).find('table.properties tr') ?? $('#Technical_summary').next('table tr');
	const $th = $(
		$tr
			.find('th')
			.toArray()
			.filter(el => new RegExp(prop, 'i').test($(el).text())),
	);
	return $th.siblings('td').text().trim().replaceAll(/\s+/g, ' ');
}

function getAttributes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$: cheerio.Root,
	heading: string,
	tagName: string,
) {
	const $heading = $(heading);
	const $outline = getThisOutline($, $heading);
	const attributes: Record<string, Attribute> = {};
	for (const dt of $outline.find('> div > dl > dt').toArray()) {
		const $dt = $(dt);
		const name = $dt.find('code').text().trim();
		if (!name) {
			continue;
		}

		const $myHeading = getItsHeading($dt);
		const experimental =
			$dt.find('.icon-beaker, .icon.experimental, .icon.icon-experimental').length > 0 || undefined;
		const obsolete =
			$dt.find('.icon-trash, .icon.obsolete, .icon.icon-obsolete').length > 0 ||
			$dt.find('.obsolete').length > 0 ||
			$myHeading?.attr('id') === 'obsolete_attributes' ||
			undefined;
		const deprecated =
			$dt.find('.icon-thumbs-down-alt, .icon.deprecated, .icon.icon-deprecated').length > 0 ||
			$myHeading?.attr('id') === 'deprecated_attributes' ||
			undefined;
		const nonStandard =
			$dt.find('.icon-warning-sign, .icon.non-standard, .icon.icon-nonstandard').length > 0 || undefined;
		const description = $dt
			.next('dd')
			.toArray()
			.map(el => $(el).text())
			.join('')
			.trim()
			.replaceAll(/\s+/g, ' ');

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
			continue;
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
	}
	return { attributes };
}

function getItsHeading(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$start: cheerio.Cheerio,
) {
	let $needle = upToPrevOrParent($start);
	while ($needle.length > 0) {
		if (isHeading($needle)) {
			return $needle;
		}
		$needle = upToPrevOrParent($needle);
	}
	return null;
}

function upToPrevOrParent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$start: cheerio.Cheerio,
) {
	let $needle = $start.prev();
	if ($needle.length === 0) {
		$needle = $start.parent();
	}
	return $needle;
}

function isHeading(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$el: cheerio.Cheerio,
) {
	// @ts-ignore
	return /^h[1-6]$/i.test($el[0].tagName);
}
