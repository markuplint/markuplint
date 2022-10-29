/* global cheerio */

import type { ContentModel, ElementSpec, ExtendedElementSpec } from '@markuplint/ml-spec';

import fetch from './fetch';
import { getAttribute } from './get-attribute';
import { getPermittedStructures } from './get-permitted-structures';
import { getThisOutline, nameCompare } from './utils';

type SVGElementCategory = ContentModel & `#SVG${string}`;

const BASE_URL = 'https://developer.mozilla.org';

export async function getSVG() {
	const [linkList, deprecatedList] = await getSVGElementList();
	const data: ExtendedElementSpec[] = [];
	for (const elUrl of linkList) {
		const el = await getSVGElement(elUrl);
		if (el) {
			data.push(el);
		}
	}
	data.push(
		...deprecatedList.map<ElementSpec>(name => ({
			name: `svg:${name}`,
			namespace: 'http://www.w3.org/2000/svg',
			cite: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Element#obsolete_and_deprecated_elements',
			categories: [],
			permittedStructures: {
				summary: '',
				tag: name,
				contents: false,
			},
			permittedRoles: {
				summary: '',
				roles: [],
			},
			implicitRole: {
				summary: '',
				role: false,
			},
			omittion: false,
			globalAttrs: {},
			attributes: {},
			deprecated: true,
		})),
	);

	return data.sort(nameCompare);
}

async function getSVGElementList() {
	const index = 'https://developer.mozilla.org/en-US/docs/Web/SVG/Element';
	const $ = await fetch(index);
	$('section').each((_, sec) => {
		const $sec = $(sec);
		const children = $sec.children();
		$sec.before(children);
		$sec.remove();
	});
	const $index = getThisOutline($, $('#svg_elements_a_to_z'));
	const $linkList = $index.find('ul code');
	const linkList = $linkList.toArray().map(el => ({
		name: $(el).text().trim().replace(/<|>/g, ''),
		url: $(el).closest('a').hasClass('page-not-created') ? null : $(el).closest('a').attr('href')?.trim() || null,
	}));
	const $deprecatedIndex = getThisOutline($, $('#obsolete_and_deprecated_elements'));
	const deprecatedList = $deprecatedIndex
		.find('div > a')
		.toArray()
		.map(el => $(el).text().trim().replace(/<|>/g, ''));
	return [linkList, deprecatedList] as const;
}

async function getSVGElement({ name, url }: { name: string; url: string | null }) {
	if (!url) {
		return null;
	}
	url = `${BASE_URL}${url}`;
	const $ = await fetch(url);

	const { attributes, global } = getAttribute(name, 'svg');

	getThisOutline($, $('#attributes'))
		.find('dt')
		.toArray()
		.forEach(dt => {
			const $dt = $(dt);
			const name = $dt.find('code').text().trim();
			if (!name) {
				return;
			}
			const experimental = !!$dt.find('.icon.icon-experimental').length || undefined;
			const description = $dt
				.next('dd')
				.toArray()
				.map(el => $(el).text())
				.join('')
				.trim()
				.replace(/(?:\r?\n|\s)+/gi, ' ');
			const current = attributes[name];
			if (typeof current === 'object' && 'type' in current) {
				attributes[name] = {
					// @ts-ignore
					ref: current.ref,
					// @ts-ignore
					description,
					...current,
					experimental,
				};
				return;
			}
			// @ts-ignore
			attributes[name] = {
				// @ts-ignore
				description,
				experimental,
			};
		});

	const $table = getThisOutline($, $('#usage_notes')).find('table.properties');
	const categories: SVGElementCategory[] = contains($, $table.find('th'), 'Categories')
		.next('td')
		.text()
		.trim()
		.split(',')
		.map<SVGElementCategory | null>(s => {
			const cat = s.trim();
			if (/^animation element$/i.test(cat)) return '#SVGAnimation';
			if (/^basic element$/i.test(cat)) return '#SVGBasicShapes';
			if (/^container element$/i.test(cat)) return '#SVGContainer';
			if (/^descriptive element$/i.test(cat)) return '#SVGDescriptive';
			if (/^filter primitive element$/i.test(cat)) return '#SVGFilterPrimitive';
			if (/^font element$/i.test(cat)) return '#SVGFont';
			if (/^gradient element$/i.test(cat)) return '#SVGGradient';
			if (/^graphics element$/i.test(cat)) return '#SVGGraphics';
			if (/^graphics referencing element$/i.test(cat)) return '#SVGGraphicsReferencing';
			if (/^light source element$/i.test(cat)) return '#SVGLightSource';
			if (/^never rendered element$/i.test(cat)) return '#SVGNeverRendered';
			if (/^none$/i.test(cat)) return '#SVGNone';
			if (/^paint server element$/i.test(cat)) return '#SVGPaintServer';
			if (/^renderable element$/i.test(cat)) return '#SVGRenderable';
			if (/^shape element$/i.test(cat)) return '#SVGShape';
			if (/^structural element$/i.test(cat)) return '#SVGStructural';
			if (/^structurally external element$/i.test(cat)) return '#SVGStructurallyExternal';
			if (/^text content element$/i.test(cat)) return '#SVGTextContent';
			if (/^text content child element$/i.test(cat)) return '#SVGTextContentChild';
			return null;
		})
		.filter((c): c is SVGElementCategory => !!c);
	const permittedStructuresSummary = contains($, $table.find('th'), 'Permitted content').next('td').text().trim();
	const structures = getPermittedStructures(name, 'svg');

	const data: ExtendedElementSpec = {
		name: `svg:${name}`,
		namespace: 'http://www.w3.org/2000/svg',
		cite: url,
		categories: categories,
		permittedStructures: {
			summary: permittedStructuresSummary,
			...structures,
		},
		implicitRole: {
			summary: 'WIP',
			role: false,
		},
		permittedRoles: {
			summary: 'WIP',
			roles: [],
		},
		omittion: false,
		globalAttrs: global || {},
		attributes,
	};
	return data;
}

function contains($: cheerio.Root, $el: cheerio.Cheerio, text: string) {
	text = text.trim();
	for (const item of $el.toArray()) {
		const $item = $(item);
		const elText = $item.text().trim();
		if (text === elText) {
			return $item;
		}
	}
	return $el.filter('empty');
}
