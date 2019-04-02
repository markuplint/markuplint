import { AttributeSpec, AttributeValue, ElementCategories, ElementSpec } from '@markuplint/ml-spec';
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

	const experimental = !!$article.find('.blockIndicator.experimental').length || undefined;
	const obsolete = !!$article.find('.obsoleteHeader').length || undefined;
	const deprecated = !!$article.find('.deprecatedHeader').length || undefined;
	const nonStandard = !!$article.find('.nonStandardHeader').length || undefined;

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

	const permittedContent = getProperty($, 'Permitted content');
	const permittedRoles = getProperty($, 'Permitted ARIA roles');

	const attrs = getAttributes($, '#Attributes');
	attrs.sort(nameCompare);

	const spec: ElementSpec = {
		name,
		cite: link,
		description,
		experimental,
		obsolete,
		deprecated,
		nonStandard,
		categories,
		permittedContent: {
			summary: permittedContent,
			content: false,
		},
		permittedRoles: {
			summary: permittedRoles,
			roles: {},
		},
		omittion: false,
		attributes: ['#globalAttrs', '#ariaAttrs', ...attrs],
	};

	return spec;
}

function getAttributes($: CheerioStatic, heading: string): AttributeSpec[] {
	const $heading = $(heading);
	const $outline = getThisOutline($heading);
	return $outline
		.find('>dt')
		.toArray()
		.map(
			(dt): AttributeSpec | null => {
				const $dt = $(dt);
				const name = $dt
					.find('code')
					.text()
					.trim();
				if (!name) {
					return null;
				}
				const experimental = !!$dt.find('.icon-beaker').length || undefined;
				const obsolete = !!$dt.find('.icon-trash').length || !!$dt.find('.obsolete').length || undefined;
				const deprecated =
					!!$dt.find('.icon-thumbs-down-alt').length || !!$dt.find('.deprecated').length || undefined;
				const nonStandard = !!$dt.find('.icon-warning-sign').length || undefined;
				const description = 'WIP';
				const required = undefined; // WIP
				const category = 'particular';
				// @ts-ignore
				const value: AttributeValue = 'WIP';
				return {
					name,
					experimental,
					description,
					required,
					obsolete,
					deprecated,
					nonStandard,
					category,
					value,
				};
			},
		)
		.filter((attr): attr is AttributeSpec => !!attr);
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

function getThisOutline($start: Cheerio) {
	let $next = $start.next();
	let $els = $start;
	while (!!$next.length && !$next.filter('h2').length) {
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
