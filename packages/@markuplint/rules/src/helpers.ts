import { ARIRRoleAttribute, Attribute, ElementSpec, ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import { Element, RuleConfigValue } from '@markuplint/ml-core';
import html from '@markuplint/html-spec';

/**
 * Merging HTML-spec schema and extended spec schemas
 *
 * Ex: `@markuplint/html-spec` + `{ specs: ["@markuplint/vue-spec"] }` in cofigure files.
 *
 * @param schemas `MLDocument.schemas`
 */
export function getSpec(schemas: readonly [MLMLSpec, ...ExtendedSpec[]]) {
	const [main, ...extendedSpecs] = schemas;
	const result = { ...main };
	for (const extendedSpec of extendedSpecs) {
		if (extendedSpec.cites) {
			result.cites = [...result.cites, ...extendedSpec.cites];
		}
		if (extendedSpec.def) {
			if (extendedSpec.def['#ariaAttrs']) {
				result.def['#ariaAttrs'] = [...result.def['#ariaAttrs'], ...extendedSpec.def['#ariaAttrs']];
			}
			if (extendedSpec.def['#globalAttrs']) {
				result.def['#globalAttrs'] = [...result.def['#globalAttrs'], ...extendedSpec.def['#globalAttrs']];
			}
			if (extendedSpec.def['#roles']) {
				result.def['#roles'] = [...result.def['#roles'], ...extendedSpec.def['#roles']];
			}
			if (extendedSpec.def['#contentModels']) {
				const keys = new Set([
					...Object.keys(result.def['#contentModels']),
					...Object.keys(extendedSpec.def['#contentModels']),
				]) as Set<keyof typeof result.def['#contentModels']>;
				for (const modelName of keys) {
					const mainModel = result.def['#contentModels'][modelName];
					const exModel = extendedSpec.def['#contentModels'][modelName];
					result.def['#contentModels'][modelName] = [...(mainModel || []), ...(exModel || [])];
				}
			}
		}
		if (extendedSpec.specs) {
			const specs: ElementSpec[] = [];
			for (const elSpec of result.specs) {
				const tagName = elSpec.name.toLowerCase();
				const index = extendedSpec.specs.findIndex(spec => spec.name.toLowerCase() === tagName);
				if (index === -1) {
					specs.push(elSpec);
					continue;
				}
				const exSpec = extendedSpec.specs.splice(index, 1)[0];
				specs.push({
					...elSpec,
					...exSpec,
					attributes: [...elSpec.attributes, ...exSpec.attributes],
					categories: [...elSpec.categories, ...exSpec.categories],
				});
			}
		}
	}

	return result;
}

export function attrSpecs(tag: string, { specs, def }: MLMLSpec) {
	tag = tag.toLowerCase();
	const spec = specs.find(spec => spec.name === tag);
	if (!spec) {
		return null;
	}
	const hasGlobalAttr = spec.attributes.some(attr => attr === '#globalAttrs');

	const attrs: Attribute[] = [];

	if (hasGlobalAttr) {
		attrs.push(...def['#globalAttrs']);
	}

	for (const attr of spec.attributes) {
		if (typeof attr === 'string') {
			continue;
		}

		const definedIndex = attrs.findIndex(a => a.name === attr.name);
		if (definedIndex !== -1) {
			attrs[definedIndex] = {
				...attrs[definedIndex],
				...attr,
			};
			continue;
		}

		attrs.push(attr);
	}

	return attrs;
}

export function attrMatches<T extends RuleConfigValue, R>(node: Element<T, R>, condition: Attribute['condition']) {
	if (!condition) {
		return true;
	}

	let matched = false;
	if (condition.self) {
		const condSelector = Array.isArray(condition.self) ? condition.self.join(',') : condition.self;
		matched = node.matches(condSelector);
	}
	if (condition.ancestor) {
		let _node = node.parentNode;
		while (_node) {
			if (_node.type === 'Element') {
				if (_node.matches(condition.ancestor)) {
					matched = true;
					break;
				}
			}
			_node = _node.parentNode;
		}
	}
	return matched;
}

export function match(needle: string, pattern: string) {
	const matches = pattern.match(/^\/(.*)\/(i|g|m)*$/);
	if (matches && matches[1]) {
		const re = matches[1];
		const flag = matches[2];
		return new RegExp(re, flag).test(needle);
	}
	return needle === pattern;
}

/**
 * PotentialCustomElementName
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 */
export const rePCENChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');

const reCostomElement = new RegExp(`^(?:[a-z](?:${rePCENChar})*\\-(?:${rePCENChar})*)$`, 'i');

export function isCustomElement(nodeName: string) {
	return reCostomElement.test(nodeName);
}

export function htmlSpec(tag: string) {
	tag = tag.toLowerCase();
	const spec = html.specs.find(spec => spec.name === tag);
	return spec || null;
}

export function ariaSpec() {
	const roles = html.def['#roles'];
	return {
		roles,
	};
}

export function getRoleSpec(roleName: string) {
	const role = getRoleByName(roleName);
	if (!role) {
		return null;
	}
	const superClassRoles = recursiveTraverseSuperClassRoles(roleName);
	return {
		name: role.name,
		isAbstract: !!role.isAbstract,
		statesAndProps: role.ownedAttribute,
		superClassRoles,
	};
}

function getRoleByName(roleName: string) {
	const roles = html.def['#roles'];
	const role = roles.find(r => r.name === roleName);
	return role;
}

function getSuperClassRoles(roleName: string) {
	const role = getRoleByName(roleName);
	return (
		role?.generalization
			.map(roleName => getRoleByName(roleName))
			.filter((role): role is ARIRRoleAttribute => !!role) || null
	);
}

function recursiveTraverseSuperClassRoles(roleName: string) {
	const roles: ARIRRoleAttribute[] = [];
	const superClassRoles = getSuperClassRoles(roleName);
	if (superClassRoles) {
		roles.push(...superClassRoles);
		for (const superClassRole of superClassRoles) {
			const ancestorRoles = recursiveTraverseSuperClassRoles(superClassRole.name);
			roles.push(...ancestorRoles);
		}
	}
	return roles;
}

/**
 * Getting permitted ARIA roles.
 *
 * - If an array, it is role list.
 * - If `true`, this mean is "Any".
 * - If `false`, this mean is "No".
 */
export function getRermittedRoles(el: Element<any, any>) {
	const spec = htmlSpec(el.nodeName)?.permittedRoles;
	if (!spec) {
		return true;
	}
	if (spec.conditions) {
		for (const { condition, roles } of spec.conditions) {
			if (el.matches(condition)) {
				return roles;
			}
		}
	}
	return spec.roles;
}
