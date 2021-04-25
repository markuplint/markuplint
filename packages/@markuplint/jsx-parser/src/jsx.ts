import { AST_NODE_TYPES, parse } from '@typescript-eslint/typescript-estree';
import type {
	Expression,
	JSXAttribute,
	JSXChild,
	JSXElement,
	JSXExpressionContainer,
	JSXFragment,
	JSXIdentifier,
	JSXNamespacedName,
	JSXSpreadAttribute,
	JSXTagNameExpression,
	Statement,
	VariableDeclarator,
} from '@typescript-eslint/types/dist/ts-estree';

export type { JSXAttribute } from '@typescript-eslint/types/dist/ts-estree';

export type JSXNode = JSXChild;

export default function jsxParser(jsxCode: string): JSXNode[] {
	const ast = parse(jsxCode, {
		comment: true,
		errorOnUnknownASTType: false,
		jsx: true,
		loc: true,
		// loggerFn: undefined,
		range: true,
		tokens: false,
		useJSXTextNode: true,
	});

	return recursiveSearchJSXElements(ast.body);
}

export function getName(tagName: JSXTagNameExpression): string {
	switch (tagName.type) {
		case 'JSXIdentifier': {
			return tagName.name;
		}
		case 'JSXMemberExpression': {
			let name = tagName.property.name;
			if (tagName.object) {
				const parentName = getName(tagName.object);
				name = parentName + '.' + name;
			}
			return name;
		}
		case 'JSXNamespacedName': {
			return `${tagName.namespace.name}:${tagName.name.name}`;
		}
		default: {
			return '';
		}
	}
}

export function getAttr(attributes: (JSXAttribute | JSXSpreadAttribute)[]) {
	let hasSpreadAttr = false;
	const attrs: JSXAttribute[] = [];
	for (const attr of attributes) {
		if (attr.type === 'JSXAttribute') {
			attrs.push(attr);
		} else {
			hasSpreadAttr = true;
		}
	}

	return {
		attrs,
		hasSpreadAttr,
	};
}

export function getAttrName(name: JSXIdentifier | JSXNamespacedName): string {
	if (typeof name.name === 'string') {
		return name.name;
	}
	return name.name.name;
}

function recursiveSearchJSXElements(tree: (Statement | VariableDeclarator | Expression | JSXChild)[]) {
	const jsxList: (JSXElement | JSXFragment)[] = [];
	for (const node of tree) {
		// console.log(node);
		if (node.type === AST_NODE_TYPES.JSXElement) {
			jsxList.push(node);
			jsxList.push(...recursiveSearchJSXElements(node.children));
			if (node.openingElement) {
				const expressions = node.openingElement.attributes
					.map(attr => {
						if (
							attr.type === AST_NODE_TYPES.JSXAttribute &&
							attr.value?.type === AST_NODE_TYPES.JSXExpressionContainer
						) {
							return attr.value;
						}
					})
					.filter((e): e is JSXExpressionContainer => !!e);
				jsxList.push(...recursiveSearchJSXElements(expressions));
			}
			continue;
		}
		if (node.type === AST_NODE_TYPES.JSXFragment) {
			jsxList.push(node);
			continue;
		}
		if (node.type === AST_NODE_TYPES.VariableDeclarator && node.init) {
			jsxList.push(...recursiveSearchJSXElements([node.init]));
			continue;
		}
		if (node.type === AST_NODE_TYPES.VariableDeclaration && node.declarations) {
			jsxList.push(...recursiveSearchJSXElements(node.declarations));
			continue;
		}
		if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
			const body = Array.isArray(node.body) ? node.body : [node.body];
			jsxList.push(...recursiveSearchJSXElements(body));
		}
		if (node.type === AST_NODE_TYPES.BlockStatement) {
			jsxList.push(...recursiveSearchJSXElements(node.body));
		}
		if (node.type === AST_NODE_TYPES.ReturnStatement) {
			if (node.argument) {
				jsxList.push(...recursiveSearchJSXElements([node.argument]));
			}
		}
		if (node.type === AST_NODE_TYPES.JSXExpressionContainer) {
			if (node.expression && node.expression.type === AST_NODE_TYPES.CallExpression) {
				jsxList.push(...recursiveSearchJSXElements(node.expression.arguments));
			}
		}
		if ('expression' in node && typeof node.expression !== 'boolean') {
			// console.log(node);
			if (node.expression.type === AST_NODE_TYPES.JSXElement) {
				jsxList.push(node.expression);
			}
			if (node.expression.type === AST_NODE_TYPES.JSXFragment) {
				jsxList.push(node.expression);
			}
		}
		if ('declarations' in node) {
			jsxList.push(...recursiveSearchJSXElements(node.declarations));
		}
	}
	return jsxList;
}
