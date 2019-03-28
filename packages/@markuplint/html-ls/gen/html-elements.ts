import { ElementSpec, ElementCategories, AttributeSpec } from './types';
import fetch from './fetch';
import { nameCompare } from './utils';

export async function getHTMLElements() {
	const links = await getHTMLElementLinks();
	const specs = await Promise.all(links.map(getHTMLElement));
	return specs.sort(nameCompare);
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
		.replace(/\r?\n/gi, ' ');
	const categories: ElementCategories = [];

	const cat = getProperty($, 'Content categories');
	if (/transparent/i.test(cat)) categories.push('transparent');
	if (/metadata content/i.test(cat)) categories.push('metadata');
	if (/flow content/i.test(cat)) categories.push('flow');
	if (/sectioning content/i.test(cat)) categories.push('sectioning');
	if (/heading content/i.test(cat)) categories.push('heading');
	if (/phrasing content/i.test(cat)) categories.push('phrasing');
	if (/embedded content/i.test(cat)) categories.push('embedded');
	if (/interactive content/i.test(cat)) categories.push('interactive');
	if (/palpable content/i.test(cat)) categories.push('palpable');
	if (/script-supporting/i.test(cat)) categories.push('script-supporting');

	const attrs = getAttributes($);
	const obsAttrs = getAttributes($, true);

	const allAttrs = [...attrs, ...obsAttrs];
	allAttrs.sort(nameCompare);

	const spec: ElementSpec = {
		name,
		cite: link,
		description,
		categories,
		contentModel: [],
		omittion: false,
		attributes: ['#globalAttrs', '#ariaAttrs', ...allAttrs],
	};

	return spec;
}

function getAttributes($: CheerioStatic, obsolete?: true) {
	const $heading = $(obsolete ? '#Obsolete_attributes' : '#Attributes');
	const $outline = getThisOutline($heading, obsolete ? 'h3' : 'h2');
	return $outline
		.find('dt')
		.toArray()
		.map(
			(dt): AttributeSpec => {
				const $dt = $(dt);
				const name = $dt.find('code').text();
				const experimental = !!$dt.find('.icon-beaker').length || undefined;
				const description = 'WIP';
				const required = undefined; // WIP
				const category = 'particular';
				const value = 'WIP';
				return {
					name,
					experimental,
					description,
					required,
					obsolete,
					category,
					// @ts-ignore
					value,
				};
			},
		);
}

function getProperty($: CheerioStatic, prop: string) {
	const $tr = $('#wikiArticle table.properties tr');
	const $th = $(
		$tr
			.find('th')
			.toArray()
			.filter(el => new RegExp(prop, 'i').test($(el).text())),
	);
	return $th.siblings('td').text();
}

function getThisOutline($start: Cheerio, nextOutlineHeading: 'h2' | 'h3') {
	let $next = $start.next();
	let $els = $start;
	while (!!$next.length && !$next.filter(nextOutlineHeading).length) {
		$els = $els.add($next);
		$next = $next.siblings().eq(0);
	}
	return $els;
}

async function getHTMLElementLinks() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Element');
	const $listHeading = $(
		$('#quick-links details summary')
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
