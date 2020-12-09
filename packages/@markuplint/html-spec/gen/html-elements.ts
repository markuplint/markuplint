import { Attribute, ContentModel, ElementSpec } from '@markuplint/ml-spec';
import fetch from './fetch';
import { getAriaInHtml } from './get-aria-in-html';
import { getAttribute } from './get-attribute';
import { getPermittedStructures } from './get-permitted-structures';
import { nameCompare } from './utils';

export async function getHTMLElements() {
	const links = await getHTMLElementLinks();
	const specs = await Promise.all(links.map(getHTMLElement));
	// h1-h6
	const headingElementSpec = specs.find(spec => spec.name === 'h1-h6');
	if (headingElementSpec) {
		for (let i = 1; i < 6; i++) {
			const h = { ...headingElementSpec };
			const name = `h${i}`;
			const ariaInHtml = getAriaInHtml(name);
			h.name = name;
			h.permittedStructures = { ...h.permittedStructures, ...getPermittedStructures(name) };
			h.permittedRoles = { ...h.permittedRoles, ...ariaInHtml.permittedRoles };
			h.implicitRole = { ...h.implicitRole, ...ariaInHtml.implicitRole };
			specs.push(h);
		}
	}
	return specs.sort(nameCompare).filter(spec => spec.name !== 'h1-h6');
}

export async function getHTMLElement(link: string) {
	const $ = await fetch(link);
	let name = link.replace(/.+\/([a-z0-9_-]+)$/i, '$1').toLowerCase();
	if (name === 'heading_elements') {
		name = 'h1-h6';
	}
	const $article = $('#wikiArticle');
	const description = $article
		.find('.seoSummary')
		.closest('p')
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
		experimental = !!$article.find('.blockIndicator.experimental').length || undefined;
		obsolete =
			!!$article.find('.obsoleteHeader').length ||
			!!$('h1')
				.text()
				.match(/obsolete/i) ||
			undefined;
		deprecated = !!$article.find('.deprecatedHeader').length || undefined;
		nonStandard = !!$article.find('.nonStandardHeader').length || undefined;
	}

	const categories: ContentModel[] = [];
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

	const permittedContent = getProperty($, 'Permitted content');
	const permittedRoles = getProperty($, 'Permitted ARIA roles');
	const implicitRole = getProperty($, 'Implicit ARIA role');

	const attrs = getAttributes($, '#Attributes', name);
	attrs.sort(nameCompare);

	const ariaInHtml = getAriaInHtml(name);

	const spec: ElementSpec = {
		name,
		cite: link,
		description,
		experimental,
		obsolete,
		deprecated,
		nonStandard,
		categories,
		permittedStructures: {
			summary: permittedContent,
			...getPermittedStructures(name),
		},
		permittedRoles: {
			summary: permittedRoles,
			...ariaInHtml.permittedRoles,
		},
		implicitRole: {
			summary: implicitRole,
			...ariaInHtml.implicitRole,
		},
		omittion: false,
		attributes: ['#globalAttrs', '#ariaAttrs', ...attrs],
	};

	return spec;
}

export function getAttributes($: cheerio.Root, heading: string, tagName: string): Attribute[] {
	const $heading = $(heading);
	const $outline = getThisOutline($, $heading);
	const { attributes } = getAttribute(tagName);
	const result: Attribute[] = attributes.map(a => ({ ...a, description: '' }));
	$outline
		.find('> dl > dt')
		.toArray()
		.forEach(dt => {
			const $dt = $(dt);
			const name = $dt.find('code').text().trim();
			if (!name) {
				return null;
			}
			const $myHeading = getItsHeading($dt);
			const experimental = !!$dt.find('.icon-beaker').length || undefined;
			const obsolete = !!$dt.find('.icon-trash').length || !!$dt.find('.obsolete').length || undefined;
			const deprecated =
				!!$dt.find('.icon-thumbs-down-alt').length ||
				!!$dt.find('.deprecated').length ||
				$myHeading?.attr('id') === 'Deprecated_attributes' ||
				undefined;
			const nonStandard = !!$dt.find('.icon-warning-sign').length || undefined;
			const description = $dt
				.nextAll('dd')
				.toArray()
				.map(el => $(el).text())
				.join('')
				.trim()
				.replace(/(?:\r?\n|\s)+/gi, ' ');

			const specIndex = result.findIndex(attr => attr.name === name);
			if (specIndex === -1) {
				result.push({
					name,
					type: 'String',
					description,
					experimental,
					obsolete,
					deprecated,
					nonStandard,
				});
				return;
			}
			result[specIndex] = {
				// @ts-ignore for key order that "name" is first
				name,
				description,
				experimental,
				obsolete,
				deprecated,
				nonStandard,
				...attributes[specIndex],
			};
		});
	return result;
}

function getProperty($: cheerio.Root, prop: string) {
	const $tr = $('#wikiArticle table.properties tr') || $('#Technical_summary').next('table tr');
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

function getThisOutline($: cheerio.Root, $start: cheerio.Cheerio) {
	const $container = $('<div></div>');
	let $next = $start.next();
	const els = [$start.clone()];
	while (!!$next.length && !$next.filter('h2').length) {
		els.push($next.clone());
		$next = $next.next();
	}
	els.forEach(el => $container.append(el));
	return $container;
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

async function getHTMLElementLinks() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Element');
	const $listHeading = $(
		$('.sidebar .quick-links details summary')
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
