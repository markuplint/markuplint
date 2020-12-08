import { ARIAAttribute, ARIAAttributeValue, ARIRRoleAttribute } from '@markuplint/ml-spec';
import fetch from './fetch';
import { nameCompare } from './utils';

export async function getAria() {
	const $ = await fetch('https://www.w3.org/TR/wai-aria-1.2/');
	const $roleList = $('#role_definitions section.role');
	const roles: ARIRRoleAttribute[] = [];
	$roleList.each((_, el) => {
		const $el = $(el);
		const name = $el.find('.role-name').attr('title')?.trim() || '';
		const description = $el
			.find('.role-description p')
			.toArray()
			.map(p => $(p).text().trim().replace(/\s+/g, ' ').replace(/\t+/g, ''))
			.join('\n\n');
		const $feaures = $el.find('.role-features tr');
		const generalization = $feaures
			.find('.role-parent a')
			.toArray()
			.map(a => $(a).text().trim());
		const isAbstract = $feaures.find('.role-abstract').text().trim().toLowerCase() === 'true' || undefined;
		const ownedAttribute = Array.from(
			new Set([
				...$feaures
					.find('.role-inherited a')
					.toArray()
					.map(a =>
						$(a)
							.text()
							.trim()
							.replace(/\s*\(state\)\s*/, ''),
					),
				...$feaures
					.find('.role-properties a')
					.toArray()
					.map(a =>
						$(a)
							.text()
							.trim()
							.replace(/\s*\(state\)\s*/, ''),
					),
			]),
		).sort();
		roles.push({
			name,
			description,
			isAbstract,
			generalization,
			ownedAttribute,
		});
	});

	roles.sort(nameCompare);

	const ariaNameList: Set<string> = new Set();
	for (const role of roles) {
		role.ownedAttribute.map(attr => ariaNameList.add(attr));
	}

	const globalStatesAndProperties = $('#global_states li a')
		.toArray()
		.map(el => $(el).attr('href')?.replace('#', ''))
		.filter((s): s is string => !!s);
	const arias = Array.from(ariaNameList)
		.sort()
		.map(
			(name): ARIAAttribute => {
				const $section = $(`#${name}`);
				const className = $section.attr('class');
				const type = className && /property/i.test(className) ? 'property' : 'state';
				const deprecated = (className && /deprecated/i.test(className)) || undefined;
				const $value = $section.find(`table.${type}-features .${type}-value`);
				const value = $value.text().trim() as ARIAAttributeValue;
				const $defaultValue = $section.find('table.value-descriptions .value-name .default');
				const defaultValue =
					$defaultValue
						.text()
						.replace(/\(default\)/gi, '')
						.trim() || undefined;
				const isGlobal = globalStatesAndProperties.includes(name) || undefined;
				return {
					name,
					type,
					deprecated,
					value,
					defaultValue,
					isGlobal,
				};
			},
		);

	return {
		roles,
		arias,
	};
}
