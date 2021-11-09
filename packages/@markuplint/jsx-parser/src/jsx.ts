import { AST_NODE_TYPES, parse } from '@typescript-eslint/typescript-estree';
import type {
	JSXAttribute,
	JSXChild,
	JSXElement,
	JSXFragment,
	JSXIdentifier,
	JSXNamespacedName,
	JSXSpreadAttribute,
	JSXTagNameExpression,
	Node,
} from '@typescript-eslint/types/dist/ast-spec';

export type { JSXAttribute } from '@typescript-eslint/types/dist/ast-spec';

export type JSXNode = (JSXChild | JSXElementHasSpreadAttribute) & { __alreadyNodeized?: true };

export type JSXElementHasSpreadAttribute = JSXElement & { __hasSpreadAttribute?: true };

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

function recursiveSearchJSXElements(tree: (Node | null)[]) {
	const jsxList: (JSXElement | JSXFragment)[] = [];
	for (const node of tree) {
		if (!node) {
			continue;
		}
		switch (node.type) {
			case AST_NODE_TYPES.Literal:
			case AST_NODE_TYPES.Identifier:
			case AST_NODE_TYPES.ArrayPattern:
			case AST_NODE_TYPES.ObjectPattern:
			case AST_NODE_TYPES.AssignmentPattern:
			case AST_NODE_TYPES.MetaProperty:
			case AST_NODE_TYPES.ThisExpression:
			case AST_NODE_TYPES.Super:
			case AST_NODE_TYPES.EmptyStatement:
			case AST_NODE_TYPES.TemplateElement:
			case AST_NODE_TYPES.BreakStatement:
			case AST_NODE_TYPES.ContinueStatement:
			case AST_NODE_TYPES.DebuggerStatement:
			case AST_NODE_TYPES.ExportAllDeclaration:
			case AST_NODE_TYPES.ExportSpecifier:
			case AST_NODE_TYPES.ImportDefaultSpecifier:
			case AST_NODE_TYPES.ImportExpression:
			case AST_NODE_TYPES.ImportNamespaceSpecifier:
			case AST_NODE_TYPES.ImportSpecifier:
			case AST_NODE_TYPES.JSXIdentifier:
			case AST_NODE_TYPES.JSXText:
			case AST_NODE_TYPES.JSXOpeningElement:
			case AST_NODE_TYPES.JSXClosingElement:
			case AST_NODE_TYPES.JSXOpeningFragment:
			case AST_NODE_TYPES.JSXClosingFragment:
			case AST_NODE_TYPES.JSXNamespacedName:
			case AST_NODE_TYPES.JSXEmptyExpression:
			case AST_NODE_TYPES.JSXMemberExpression:
			case AST_NODE_TYPES.TSInterfaceBody:
			case AST_NODE_TYPES.TSInterfaceDeclaration:
			case AST_NODE_TYPES.TSInterfaceHeritage:
			case AST_NODE_TYPES.TSNamedTupleMember:
			case AST_NODE_TYPES.TSNamespaceExportDeclaration:
			case AST_NODE_TYPES.TSTypeAliasDeclaration:
			case AST_NODE_TYPES.TSTypeAnnotation:
			case AST_NODE_TYPES.TSTypeOperator:
			case AST_NODE_TYPES.TSTypeParameter:
			case AST_NODE_TYPES.TSTypePredicate:
			case AST_NODE_TYPES.TSTypeQuery:
			case AST_NODE_TYPES.TSTypeReference:
			case AST_NODE_TYPES.TSArrayType:
			case AST_NODE_TYPES.TSIndexedAccessType:
			case AST_NODE_TYPES.TSInferType:
			case AST_NODE_TYPES.TSConditionalType:
			case AST_NODE_TYPES.TSTemplateLiteralType:
			case AST_NODE_TYPES.TSThisType:
			case AST_NODE_TYPES.TSTupleType:
			case AST_NODE_TYPES.TSRestType:
			case AST_NODE_TYPES.TSImportType:
			case AST_NODE_TYPES.TSLiteralType:
			case AST_NODE_TYPES.TSMappedType:
			case AST_NODE_TYPES.TSIntersectionType:
			case AST_NODE_TYPES.TSOptionalType:
			case AST_NODE_TYPES.TSParenthesizedType:
			case AST_NODE_TYPES.TSUnionType:
			case AST_NODE_TYPES.TSAbstractKeyword:
			case AST_NODE_TYPES.TSAnyKeyword:
			case AST_NODE_TYPES.TSAsyncKeyword:
			case AST_NODE_TYPES.TSBigIntKeyword:
			case AST_NODE_TYPES.TSBooleanKeyword:
			case AST_NODE_TYPES.TSDeclareKeyword:
			case AST_NODE_TYPES.TSExportKeyword:
			case AST_NODE_TYPES.TSIntrinsicKeyword:
			case AST_NODE_TYPES.TSPrivateKeyword:
			case AST_NODE_TYPES.TSNullKeyword:
			case AST_NODE_TYPES.TSNumberKeyword:
			case AST_NODE_TYPES.TSObjectKeyword:
			case AST_NODE_TYPES.TSProtectedKeyword:
			case AST_NODE_TYPES.TSPublicKeyword:
			case AST_NODE_TYPES.TSReadonlyKeyword:
			case AST_NODE_TYPES.TSStaticKeyword:
			case AST_NODE_TYPES.TSUnknownKeyword:
			case AST_NODE_TYPES.TSStringKeyword:
			case AST_NODE_TYPES.TSSymbolKeyword:
			case AST_NODE_TYPES.TSUndefinedKeyword:
			case AST_NODE_TYPES.TSVoidKeyword:
			case AST_NODE_TYPES.TSNeverKeyword: {
				continue;
			}
			case AST_NODE_TYPES.JSXElement: {
				jsxList.push(node);
				jsxList.push(...recursiveSearchJSXElements(node.children));
				if (node.openingElement) {
					const hasSpreadAttr = node.openingElement.attributes.some(
						attr => attr.type === AST_NODE_TYPES.JSXSpreadAttribute,
					);
					if (hasSpreadAttr) {
						(node as JSXElementHasSpreadAttribute).__hasSpreadAttribute = true;
					}
					jsxList.push(...recursiveSearchJSXElements(node.openingElement.attributes));
				}
				continue;
			}
			case AST_NODE_TYPES.JSXFragment: {
				jsxList.push(node);
				jsxList.push(...recursiveSearchJSXElements(node.children));
				continue;
			}
			case AST_NODE_TYPES.VariableDeclarator: {
				jsxList.push(...recursiveSearchJSXElements([node.init]));
				continue;
			}
			case AST_NODE_TYPES.VariableDeclaration: {
				jsxList.push(...recursiveSearchJSXElements(node.declarations));
				continue;
			}
			case AST_NODE_TYPES.Program:
			case AST_NODE_TYPES.BlockStatement:
			case AST_NODE_TYPES.ClassBody:
			case AST_NODE_TYPES.TSModuleBlock: {
				jsxList.push(...recursiveSearchJSXElements(node.body));
				continue;
			}
			case AST_NODE_TYPES.FunctionDeclaration:
			case AST_NODE_TYPES.FunctionExpression:
			case AST_NODE_TYPES.ArrowFunctionExpression:
			case AST_NODE_TYPES.ClassDeclaration:
			case AST_NODE_TYPES.ClassExpression:
			case AST_NODE_TYPES.CatchClause:
			case AST_NODE_TYPES.LabeledStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.body]));
				continue;
			}
			case AST_NODE_TYPES.ExportDefaultDeclaration:
			case AST_NODE_TYPES.ExportNamedDeclaration: {
				jsxList.push(...recursiveSearchJSXElements([node.declaration]));
				continue;
			}
			case AST_NODE_TYPES.ArrayExpression: {
				jsxList.push(...recursiveSearchJSXElements(node.elements));
				continue;
			}
			case AST_NODE_TYPES.ObjectExpression: {
				jsxList.push(...recursiveSearchJSXElements(node.properties));
				continue;
			}
			case AST_NODE_TYPES.CallExpression: {
				jsxList.push(...recursiveSearchJSXElements(node.arguments));
				continue;
			}
			case AST_NODE_TYPES.UpdateExpression:
			case AST_NODE_TYPES.UnaryExpression:
			case AST_NODE_TYPES.ReturnStatement:
			case AST_NODE_TYPES.AwaitExpression:
			case AST_NODE_TYPES.JSXSpreadAttribute:
			case AST_NODE_TYPES.SpreadElement:
			case AST_NODE_TYPES.ThrowStatement:
			case AST_NODE_TYPES.YieldExpression: {
				jsxList.push(...recursiveSearchJSXElements([node.argument || null]));
				continue;
			}
			case AST_NODE_TYPES.TemplateLiteral: {
				jsxList.push(...recursiveSearchJSXElements(node.expressions));
				jsxList.push(...recursiveSearchJSXElements(node.quasis));
				continue;
			}
			case AST_NODE_TYPES.TaggedTemplateExpression: {
				jsxList.push(...recursiveSearchJSXElements([node.tag, node.quasi]));
				continue;
			}
			case AST_NODE_TYPES.SequenceExpression: {
				jsxList.push(...recursiveSearchJSXElements(node.expressions));
				continue;
			}
			case AST_NODE_TYPES.ExpressionStatement:
			case AST_NODE_TYPES.ChainExpression:
			case AST_NODE_TYPES.Decorator:
			case AST_NODE_TYPES.JSXExpressionContainer:
			case AST_NODE_TYPES.JSXSpreadChild:
			case AST_NODE_TYPES.TSAsExpression:
			case AST_NODE_TYPES.TSClassImplements:
			case AST_NODE_TYPES.TSExportAssignment:
			case AST_NODE_TYPES.TSExternalModuleReference:
			case AST_NODE_TYPES.TSNonNullExpression:
			case AST_NODE_TYPES.TSTypeAssertion: {
				jsxList.push(...recursiveSearchJSXElements([node.expression]));
				continue;
			}
			case AST_NODE_TYPES.AssignmentExpression:
			case AST_NODE_TYPES.BinaryExpression:
			case AST_NODE_TYPES.LogicalExpression:
			case AST_NODE_TYPES.TSQualifiedName: {
				jsxList.push(...recursiveSearchJSXElements([node.left, node.right]));
				continue;
			}
			case AST_NODE_TYPES.Property:
			case AST_NODE_TYPES.JSXAttribute: {
				jsxList.push(...recursiveSearchJSXElements([node.value]));
				continue;
			}
			case AST_NODE_TYPES.ClassProperty:
			case AST_NODE_TYPES.MethodDefinition:
			case AST_NODE_TYPES.TSAbstractClassProperty: {
				if (node.decorators) {
					jsxList.push(...recursiveSearchJSXElements(node.decorators));
				}
				jsxList.push(...recursiveSearchJSXElements([node.value]));
				continue;
			}
			case AST_NODE_TYPES.TSAbstractMethodDefinition: {
				if (node.decorators) {
					jsxList.push(...recursiveSearchJSXElements(node.decorators));
				}
				jsxList.push(...recursiveSearchJSXElements([node.key, node.value]));
				continue;
			}
			case AST_NODE_TYPES.MemberExpression: {
				jsxList.push(...recursiveSearchJSXElements([node.object, node.property]));
				continue;
			}
			case AST_NODE_TYPES.ConditionalExpression:
			case AST_NODE_TYPES.IfStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.test, node.consequent, node.alternate]));
				continue;
			}
			case AST_NODE_TYPES.SwitchStatement: {
				jsxList.push(...recursiveSearchJSXElements(node.cases));
				jsxList.push(...recursiveSearchJSXElements([node.discriminant]));
				continue;
			}
			case AST_NODE_TYPES.SwitchCase: {
				jsxList.push(...recursiveSearchJSXElements([node.test, ...node.consequent]));
				continue;
			}
			case AST_NODE_TYPES.ForStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.init, node.test, node.update, node.body]));
				continue;
			}
			case AST_NODE_TYPES.ForInStatement:
			case AST_NODE_TYPES.ForOfStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.right, node.body]));
				continue;
			}
			case AST_NODE_TYPES.WhileStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.test, node.body]));
				continue;
			}
			case AST_NODE_TYPES.DoWhileStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.body, node.test]));
				continue;
			}
			case AST_NODE_TYPES.ImportDeclaration: {
				jsxList.push(...recursiveSearchJSXElements(node.specifiers));
				continue;
			}
			case AST_NODE_TYPES.NewExpression: {
				jsxList.push(...recursiveSearchJSXElements([node.callee, ...node.arguments]));
				continue;
			}
			case AST_NODE_TYPES.RestElement: {
				jsxList.push(...recursiveSearchJSXElements([node.argument]));
				if (node.decorators) {
					jsxList.push(...recursiveSearchJSXElements(node.decorators));
				}
				if (node.value) {
					jsxList.push(...recursiveSearchJSXElements([node.value]));
				}
				continue;
			}
			case AST_NODE_TYPES.TryStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.block, node.handler, node.finalizer]));
				continue;
			}
			case AST_NODE_TYPES.WithStatement: {
				jsxList.push(...recursiveSearchJSXElements([node.object, node.body]));
				continue;
			}
			case AST_NODE_TYPES.TSEnumDeclaration: {
				jsxList.push(...recursiveSearchJSXElements(node.members));
				if (node.modifiers) {
					jsxList.push(...recursiveSearchJSXElements(node.modifiers));
				}
				continue;
			}
			case AST_NODE_TYPES.TSEnumMember: {
				jsxList.push(...recursiveSearchJSXElements([node.id, node.initializer || null]));
				continue;
			}
			case AST_NODE_TYPES.TSCallSignatureDeclaration:
			case AST_NODE_TYPES.TSConstructorType:
			case AST_NODE_TYPES.TSConstructSignatureDeclaration:
			case AST_NODE_TYPES.TSEmptyBodyFunctionExpression:
			case AST_NODE_TYPES.TSFunctionType:
			case AST_NODE_TYPES.TSTypeParameterDeclaration:
			case AST_NODE_TYPES.TSTypeParameterInstantiation: {
				jsxList.push(...recursiveSearchJSXElements(node.params));
				continue;
			}
			case AST_NODE_TYPES.TSIndexSignature: {
				jsxList.push(...recursiveSearchJSXElements(node.parameters));
				continue;
			}
			case AST_NODE_TYPES.TSDeclareFunction: {
				jsxList.push(...recursiveSearchJSXElements(node.params));
				jsxList.push(...recursiveSearchJSXElements([node.body || null]));
				continue;
			}
			case AST_NODE_TYPES.TSImportEqualsDeclaration: {
				jsxList.push(...recursiveSearchJSXElements([node.moduleReference]));
				continue;
			}
			case AST_NODE_TYPES.TSMethodSignature: {
				jsxList.push(...recursiveSearchJSXElements([node.key]));
				jsxList.push(...recursiveSearchJSXElements(node.params));
				continue;
			}
			case AST_NODE_TYPES.TSModuleDeclaration: {
				jsxList.push(...recursiveSearchJSXElements([node.body || null]));
				if (node.modifiers) {
					jsxList.push(...recursiveSearchJSXElements(node.modifiers));
				}
				continue;
			}
			case AST_NODE_TYPES.TSParameterProperty: {
				if (node.decorators) {
					jsxList.push(...recursiveSearchJSXElements(node.decorators));
				}
				jsxList.push(...recursiveSearchJSXElements([node.parameter]));
				continue;
			}
			case AST_NODE_TYPES.TSPropertySignature: {
				jsxList.push(...recursiveSearchJSXElements([node.key, node.initializer || null]));
				continue;
			}
			case AST_NODE_TYPES.TSTypeLiteral: {
				jsxList.push(...recursiveSearchJSXElements(node.members));
				continue;
			}
		}
		if (node) {
			throw new Error('Unsupprted node');
		}
	}
	return jsxList;
}
