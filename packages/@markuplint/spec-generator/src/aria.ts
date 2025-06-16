import type * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

import type {
	ARIAProperty,
	ARIAAttributeValue,
	ARIARoleOwnedProperties,
	ARIAVersion,
	ARIARoleInSchema,
	EquivalentHtmlAttr,
} from '@markuplint/ml-spec';
import type { WritableDeep } from 'type-fest';

import { fetch } from './fetch.js';
import { arrayUnique, nameCompare } from './utils.js';

export async function getAria() {
	const roles13 = await getRoles('1.3');
	const roles12 = await getRoles('1.2');
	const roles11 = await getRoles('1.1');

	return {
		'1.3': {
			roles: roles13,
			props: await getProps('1.3', roles13),
			graphicsRoles: await getRoles('1.3', true),
		},
		'1.2': {
			roles: roles12,
			props: await getProps('1.2', roles12),
			graphicsRoles: await getRoles('1.2', true),
		},
		'1.1': {
			roles: roles11,
			props: await getProps('1.1', roles11),
			graphicsRoles: await getRoles('1.1', true),
		},
	};
}

function getARIASpecURLByVersion(version: ARIAVersion, graphicsAria = false) {
	switch (version) {
		case '1.3': {
			if (!graphicsAria) {
				return 'https://w3c.github.io/aria/';
			}
			return 'https://w3c.github.io/graphics-aria/';
		}
		case '1.2': {
			if (!graphicsAria) {
				return 'https://www.w3.org/TR/wai-aria-1.2/';
			}
			return 'https://w3c.github.io/graphics-aria/';
		}
		case '1.1': {
			if (!graphicsAria) {
				return 'https://www.w3.org/TR/wai-aria-1.1/';
			}
			return 'https://www.w3.org/TR/graphics-aria-1.0/';
		}
	}
}

async function getRoles(version: ARIAVersion, graphicsAria = false) {
	const $ = await fetch(getARIASpecURLByVersion(version, graphicsAria));
	const $roleList = $('#role_definitions section.role');
	const roles: ARIARoleInSchema[] = [];
	const getAttr = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		li: Element,
	): ARIARoleOwnedProperties => {
		const $li = $(li);
		const text = $li.text();
		const isDeprecated = /deprecated/i.test(text) || undefined;
		const $a = $li.find('a');
		const name =
			$a.length > 0
				? $a
						.text()
						.replace(/\s*\(\s*state\s*\)\s*/i, '')
						.trim()
				: text.trim();
		return {
			name,
			deprecated: isDeprecated,
		};
	};

	$roleList.each((_, el) => {
		const $el = $(el);
		const name = $el.find('.role-name').attr('title')?.trim() ?? '';
		const description = $el
			.find('.role-description p')
			.toArray()
			.map(p => $(p).text().trim().replaceAll(/\s+/g, ' ').replaceAll(/\t+/g, ''))
			.join('\n\n');
		const deprecated =
			description.toLowerCase().search(
				// eslint-disable-next-line regexp/strict
				/\[deprecated in aria 1\.\d]/i,
			) === -1
				? undefined
				: true;
		const $features = $el.find('.role-features tr, table.def');
		const generalization = $features
			.find('.role-parent a')
			.toArray()
			.map(a => $(a).text().trim());
		const isAbstract = $features.find('.role-abstract').text().trim().toLowerCase() === 'true' || undefined;
		let $ownedRequiredProps = $features.find('.role-required-properties li').toArray();
		if ($ownedRequiredProps.length === 0) {
			$ownedRequiredProps = $features.find('.role-required-properties').toArray();
		}
		const ownedRequiredProps = $ownedRequiredProps.map(getAttr).map(p => ({ ...p, required: true as const }));
		const ownedInheritedProps = $features
			.find('.role-inherited li')
			.toArray()
			.map(getAttr)
			.map(p => ({ ...p, inherited: true as const }));
		const ownedProps = $features.find('.role-properties li, .role-properties > a').toArray().map(getAttr);
		const requiredContextRole = $$($features, ['.role-scope li', '.role-scope a'])
			.toArray()
			.map(el => {
				const text = $(el).text().trim();
				if (/owned\s+by|with\s+parent|with\s+accessibility\s+parent/i.test(text)) {
					return text.replaceAll(
						/([a-z]+)\s+(?:owned\s+by|with\s+parent|with\s+accessibility\s+parent)\s+([a-z]+)/gi,
						'$2 > $1',
					);
				}
				return text;
			});
		const requiredOwnedElements = $$($features, ['.role-mustcontain li', '.role-mustcontain a'])
			.toArray()
			.map(el =>
				$(el)
					.text()
					.trim()
					.replaceAll(/\s+(?:owning|→|with\s+child|with\s+accessibility\s+child)\s+/gi, ' > '),
			);
		const accessibleNameRequired = !!/true/i.test($features.find('.role-namerequired').text());
		const accessibleNameFromAuthor = !!/author/i.test($features.find('.role-namefrom').text());
		const accessibleNameFromContent = !!/content/i.test($features.find('.role-namefrom').text());
		const accessibleNameProhibited = !!/prohibited/i.test($features.find('.role-namefrom').text());
		const $childrenPresentational = $features.find('.role-childpresentational').text();
		const childrenPresentational = /true/i.test($childrenPresentational)
			? true
			: /false/i.test($childrenPresentational)
				? false
				: undefined;
		const ownedProperties = arrayUnique(
			[...ownedRequiredProps, ...ownedInheritedProps, ...ownedProps].toSorted(nameCompare),
		);
		const prohibitedProperties = $features
			.find('.role-disallowed li code')
			.toArray()
			.map(el => $(el).text().trim());
		roles.push({
			name,
			description,
			isAbstract,
			deprecated,
			generalization,
			requiredContextRole,
			requiredOwnedElements,
			accessibleNameRequired,
			accessibleNameFromAuthor,
			accessibleNameFromContent,
			accessibleNameProhibited,
			childrenPresentational,
			ownedProperties,
			prohibitedProperties,
		});
	});

	// Synonym
	if (version === '1.1' || version === '1.2') {
		const presentationRole = roles.find(role => role.name === 'presentation');
		if (presentationRole) {
			const noneRoleIndex = roles.findIndex(role => role.name === 'none');
			roles[noneRoleIndex] = {
				...presentationRole,
				name: 'none',
				description: roles[noneRoleIndex]?.description,
			};
		}
	} else {
		const noneRole = roles.find(role => role.name === 'none');
		if (noneRole) {
			const noneRoleIndex = roles.findIndex(role => role.name === 'presentation');
			roles[noneRoleIndex] = {
				...noneRole,
				name: 'presentation',
				description: roles[noneRoleIndex]?.description,
			};
		}

		const imageRole = roles.find(role => role.name === 'image');
		if (imageRole) {
			const imgRoleIndex = roles.findIndex(role => role.name === 'img');
			roles[imgRoleIndex] = {
				...imageRole,
				name: 'img',
				description: roles[imgRoleIndex]?.description,
			};
		}
	}

	return roles.toSorted(nameCompare);
}

async function getProps(version: ARIAVersion, roles: readonly ARIARoleInSchema[]) {
	const $ = await fetch(getARIASpecURLByVersion(version));

	const ariaNameList: Set<string> = new Set();
	for (const role of roles) {
		if (role.ownedProperties)
			for (const prop of role.ownedProperties) {
				ariaNameList.add(prop.name);
			}
	}

	const { implicitProps } = await getAriaInHtml();

	const globalStatesAndProperties = new Set(
		$('#global_states li a')
			.toArray()
			.map(el => {
				const href = $(el).prop('href');
				const hashIndex = href?.indexOf('#');
				const hash = hashIndex === -1 ? undefined : href?.slice(hashIndex);
				return hash?.slice(1);
			})
			.filter((s): s is string => !!s),
	);
	const arias = [...ariaNameList].toSorted().map((name): ARIAProperty => {
		const $section = $(`#${name}`);
		const className = $section.attr('class');
		const type = className && /property/i.test(className) ? 'property' : 'state';
		const deprecated = (className && /deprecated/i.test(className)) || undefined;
		const $value = $section.find(`table .${type}-value, table .property-value, .state-features .property-value`);
		const value = $value.text().trim() as ARIAAttributeValue;
		const $valueDescriptions = $section.find(
			'table:is(.value-descriptions, .def:has(.value-description)) tbody tr',
		);
		const valueDescriptions: Record<string, string> = {};
		$valueDescriptions.each((_, $tr) => {
			const name = $($tr)
				.find('.value-name')
				.text()
				.replaceAll(/\(default\)\s*:?/gi, '')
				.trim();
			const desc = $($tr).find('.value-description').text().trim().replaceAll(/\s+/g, ' ');
			valueDescriptions[name] = desc;
		});
		const enumValues: string[] = [];
		if (value === 'token' || value === 'token list') {
			const values = $valueDescriptions
				.find('.value-name')
				.toArray()
				.map(el =>
					$(el)
						.text()
						.replaceAll(/\(default\)\s*:?/gi, '')
						.trim(),
				);
			enumValues.push(...values);
		}
		const $defaultValue = $section.find(
			'table:is(.value-descriptions, .def:has(.value-description)) .value-name .default',
		);
		const defaultValue =
			$defaultValue
				.text()
				.replaceAll(/\(default\)/gi, '')
				.trim() || undefined;
		const isGlobal = globalStatesAndProperties.has(name) || undefined;

		let equivalentHtmlAttrs: EquivalentHtmlAttr[] | undefined;
		const implicitOwnProps = implicitProps.filter(p => p.name === name);
		if (implicitOwnProps.length > 0) {
			equivalentHtmlAttrs = implicitOwnProps.map(attr => ({
				htmlAttrName: attr.htmlAttrName,
				value: attr.value,
			}));
		}

		const aria: WritableDeep<ARIAProperty> = {
			name,
			type,
			deprecated,
			value,
			enum: enumValues,
			defaultValue,
			isGlobal,
			equivalentHtmlAttrs,
			valueDescriptions: Object.keys(valueDescriptions).length > 0 ? valueDescriptions : undefined,
		};

		// Conditional Value
		switch (name) {
			case 'aria-checked': {
				aria.value = 'true/false';
				aria.conditionalValue = [
					{
						role: ['checkbox', 'menuitemcheckbox'],
						value: 'tristate',
					},
				];
				break;
			}
			case 'aria-hidden': {
				if (aria.equivalentHtmlAttrs)
					for (const attr of aria.equivalentHtmlAttrs) {
						if (attr.htmlAttrName === 'hidden') {
							attr.isNotStrictEquivalent = true;
						}
					}
				break;
			}
		}

		return aria;
	});

	return arias.toSorted(nameCompare);
}

async function getAriaInHtml() {
	const $ = await fetch('https://www.w3.org/TR/html-aria/');
	const implicitProps: { name: string; value: string | null; htmlAttrName: string }[] = [];
	const $implicitProps = $(
		'#requirements-for-use-of-aria-attributes-in-place-of-equivalent-html-attributes table tbody tr',
	).toArray();
	for (const $implicitProp of $implicitProps) {
		const htmlAttrName = $($implicitProp).find('th:nth-of-type(1) a').eq(0).text();
		if (htmlAttrName === 'contenteditable') {
			// FIXME:
			// Cannot design yet because the contenteditable attribute is evaluated with ancestors.
			continue;
		}
		const implicitProp = $($implicitProp).find('td:nth-of-type(1) code').eq(0).text();
		const [name, _value] = implicitProp.split('=');
		if (!name) {
			continue;
		}

		const value = _value?.replace(/"|'/g, '').trim() ?? null;
		const data = {
			name: name,
			value: value === '...' ? null : value,
			htmlAttrName,
		};
		implicitProps.push(data);
	}
	return {
		implicitProps,
	};
}

function $$(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$el: cheerio.Cheerio<Element>,
	selectors: readonly string[],
) {
	let $found = $el;
	for (const selector of selectors) {
		$found = $el.find(selector);
		if ($found.length > 0) {
			return $found;
		}
	}
	return $found;
}
