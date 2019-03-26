import { ARIRRoleAttribute, ARIAAttribute, ARIAAttributeValue } from './types';
import fetch, { fetchText } from './fetch';
import xml from 'fast-xml-parser';

export async function getAria() {
	const uml = await fetchText('https://www.w3.org/WAI/ARIA/schemata/aria-1.uml');
	const dom = xml.getTraversalObj(uml, {
		ignoreNameSpace: true,
		ignoreAttributes: false,
		attributeNamePrefix: '',
		parseNodeValue: true,
		parseAttributeValue: true,
		trimValues: true,
	});

	const $ = await fetch('https://www.w3.org/TR/wai-aria-1.1/');
	const $indexRole = $('#index_role');

	const roles: ARIRRoleAttribute[] = dom.child.XMI[0].child.Package[0].child.packagedElement.map(
		(pkgEl: any): ARIRRoleAttribute => {
			const name = pkgEl.attrsMap.name;
			const $ref = $indexRole.find(`.role-reference[href="#${name}"]`);
			const $dt = $ref.closest('dt');
			const $dd = $dt.next('dd');
			const description = $dd.text().trim();
			return {
				name,
				description,
				isAbstract: !!pkgEl.attrsMap.isAbstract || undefined,
				generalization: pkgEl.child.generalization
					? pkgEl.child.generalization.map((gen: any) => gen.attrsMap.general)
					: [],
				ownedAttribute: pkgEl.child.ownedAttribute
					? pkgEl.child.ownedAttribute.map((attr: any) => attr.attrsMap.name)
					: [],
			};
		},
	);

	const ariaNameList: Set<string> = new Set();
	for (const role of roles) {
		role.ownedAttribute.map(attr => ariaNameList.add(attr));
	}

	const arias = Array.from(ariaNameList).map(
		(name): ARIAAttribute => {
			const $section = $(`#${name}`);
			const className = $section.attr('class');
			const type = /property/i.test(className) ? 'property' : 'state';
			const deprecated = /deprecated/i.test(className) || undefined;
			const $value = $section.find(`table.${type}-features .${type}-value`);
			const value = $value.text().trim() as ARIAAttributeValue;
			const $defaultValue = $section.find(`table.value-descriptions .value-name .default`);
			const defaultValue =
				$defaultValue
					.text()
					.replace(/\(default\)/gi, '')
					.trim() || undefined;
			return {
				name,
				type,
				deprecated,
				value,
				defaultValue,
			};
		},
	);

	return {
		roles,
		arias,
	};
}
