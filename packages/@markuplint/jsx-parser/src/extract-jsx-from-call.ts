import type { TSESTree } from '@typescript-eslint/types';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { JSXNode } from './jsx.js';

export function extractJSXFromCall(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	astNode: JSXNode,
	methodName: 'map' | 'filter',
): TSESTree.JSXElement | TSESTree.JSXFragment | null {
	if (astNode.type !== AST_NODE_TYPES.JSXExpressionContainer) {
		return null;
	}

	const expression = astNode.expression;

	if (expression.type !== AST_NODE_TYPES.CallExpression) {
		return null;
	}

	if (
		expression.callee.type !== AST_NODE_TYPES.MemberExpression ||
		expression.callee.property.type !== AST_NODE_TYPES.Identifier ||
		expression.callee.property.name !== methodName
	) {
		return null;
	}

	const callback = expression.arguments[0];

	if (!callback) {
		return null;
	}

	if (
		callback.type === AST_NODE_TYPES.ArrowFunctionExpression &&
		(callback.body.type === AST_NODE_TYPES.JSXElement || callback.body.type === AST_NODE_TYPES.JSXFragment)
	) {
		return callback.body;
	}

	return null;
}
