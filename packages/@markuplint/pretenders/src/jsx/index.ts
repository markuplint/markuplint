import type { PretenderScanJSXOptions } from './types.js';
import type { Pretender } from '@markuplint/ml-config';
import type {
	FunctionDeclaration,
	JSDoc,
	JsxFragment,
	JsxOpeningElement,
	JsxSelfClosingElement,
	Node,
	SourceFile,
	VariableDeclaration,
} from 'typescript';

import path from 'node:path';

import { getPosition } from '@markuplint/parser-utils/location';
import ts from 'typescript';

import { createScanner } from '../create-scanner.js';
import { PretenderDirector } from '../pretender-director.js';

import { createIndentity } from './create-identify.js';
import { finder } from './finder.js';
import { getAttributes } from './get-attributes.js';
import { getChildren } from './get-children.js';

const {
	createProgram,
	forEachChild,
	isArrowFunction,
	isCallExpression,
	isFunctionDeclaration,
	isJsxFragment,
	isJsxOpeningElement,
	isJsxSelfClosingElement,
	isReturnStatement,
	isTaggedTemplateExpression,
	isVariableDeclaration,
	JsxEmit,
} = ts;

const defaultOptions: Required<PretenderScanJSXOptions> = {
	cwd: process.cwd(),
	asFragment: [/(?:^|\.)provider$/i],
	ignoreComponentNames: [],
	taggedStylingComponent: [
		// PropertyAccessExpression: styled.button`css-prop: value;`
		/^styled\.(?<tagName>[a-z][\da-z]*)$/i,
		// CallExpression: styled(Button)`css-prop: value;`
		/^styled\s*\(\s*(?<tagName>[a-z][\da-z]*)\s*\)$/i,
	],
	extendingWrapper: [],
};

export const jsxScanner = createScanner<PretenderScanJSXOptions>(
	(files, options = defaultOptions): Promise<Pretender[]> => {
		const {
			cwd = defaultOptions.cwd,
			ignoreComponentNames = defaultOptions.ignoreComponentNames,
			asFragment = defaultOptions.asFragment,
			taggedStylingComponent = defaultOptions.taggedStylingComponent,
			extendingWrapper = defaultOptions.extendingWrapper,
		} = options;

		const director = new PretenderDirector();

		const program = createProgram(files, {
			jsx: JsxEmit.ReactJSX,
			allowJs: true,
		});

		for (const sourceFile of program.getSourceFiles()) {
			if (!sourceFile.isDeclarationFile) {
				forEachChild(sourceFile, node => visit(node, sourceFile));
			}
		}

		function visit(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			root: Node,
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			sourceFile: SourceFile,
		) {
			const find = finder(sourceFile);

			/**
			 * ```
			 * const Component = ...
			 * ------^
			 * ```
			 */
			find(root, isVariableDeclaration, define);

			/**
			 * ```
			 * function Component (...) {...}
			 * ---------^
			 * ```
			 */
			find(root, isFunctionDeclaration, define);
		}

		function define(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			dec: VariableDeclaration | FunctionDeclaration,
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			sourceFile: SourceFile,
		) {
			if (!dec.name) {
				return;
			}
			const variableName = dec.name.getText(sourceFile);

			if (ignoreComponentNames.includes(variableName)) {
				return;
			}

			if ('jsDoc' in dec && dec.jsDoc) {
				const jsDoc = dec.jsDoc as JSDoc[];
				const pretendsTag = jsDoc
					.flatMap(doc => doc.tags ?? [])
					.find(doc => doc.tagName.text.toLowerCase() === 'pretends');
				if (pretendsTag && pretendsTag.comment === 'null') {
					return;
				}
			}

			const { line, column } = getPosition(sourceFile.text, dec.name.pos);

			/**
			 * ```
			 * const Component = ...
			 * ------------------^
			 *
			 * function Component (...) {...}
			 * --------------------------^
			 * ```
			 */
			findBody(dec, variableName, sourceFile, line, column);
		}

		function findBody(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			root: Node,
			name: string,
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			sourceFile: SourceFile,
			line: number,
			col: number,
		) {
			const filePath = path.relative(cwd, sourceFile.fileName);
			const find = finder(sourceFile);

			find(root, isReturnStatement, node => {
				/**
				 * ```
				 * return <Foo></Foo>
				 * -------^
				 * ```
				 */
				find(node, isJsxOpeningElement, foundElement);
				/**
				 * ```
				 * return <Foo />
				 * -------^
				 * ```
				 */
				find(node, isJsxSelfClosingElement, foundElement);
				/**
				 * ```
				 * return <></>
				 * -------^
				 * ```
				 */
				find(node, isJsxFragment, foundFragment);
			});

			find(root, isArrowFunction, fn => {
				/**
				 * ```
				 * (...) => <Foo></Foo>
				 * ---------^
				 * ```
				 */
				find(fn, isJsxOpeningElement, foundElement);
				/**
				 * ```
				 * (...) => <Foo />
				 * ---------^
				 * ```
				 */
				find(fn, isJsxSelfClosingElement, foundElement);
				/**
				 * ```
				 * (...) => <></>
				 * ---------^
				 * ```
				 */
				find(fn, isJsxFragment, foundFragment);
			});

			find(root, isTaggedTemplateExpression, tagged => {
				const tag = tagged.tag.getText(sourceFile);

				/**
				 * ```
				 * styled.button`
				 * -------^
				 *  margin: ${margin};
				 *  padding: ${padding};
				 * `
				 * ```
				 */
				for (const _pattern of taggedStylingComponent) {
					const pattern = typeof _pattern === 'string' ? toRegexp(_pattern) : _pattern;
					const tagName = pattern.exec(tag)?.groups?.tagName;
					if (!tagName) {
						continue;
					}
					director.add(
						name,
						{
							element: tagName,
							slots: true,
							inheritAttrs: true,
						},
						filePath,
						line,
						col,
					);
				}
			});

			find(root, isCallExpression, method => {
				const caller = method.expression.getText(sourceFile);

				/**
				 * ```
				 * functionCaller(Button)
				 * ---------------^
				 * ```
				 *
				 * Options: `{ numberOfArgument: 2 }`
				 * ```
				 * namespace.functionCaller(true, Button)
				 * -------------------------------^
				 * ```
				 */
				for (const _pattern of extendingWrapper) {
					let pattern: RegExp;
					let numberOfArgument = 1;
					if (typeof _pattern === 'string') {
						pattern = toRegexp(_pattern);
					} else if ('identifier' in _pattern) {
						pattern =
							typeof _pattern.identifier === 'string'
								? toRegexp(_pattern.identifier)
								: _pattern.identifier;
						numberOfArgument = _pattern.numberOfArgument;
					} else {
						pattern = _pattern;
					}

					if (!pattern.test(caller)) {
						continue;
					}

					const arg = method.arguments[numberOfArgument - 1];
					const tagName = arg?.getText(sourceFile);

					if (!tagName) {
						continue;
					}

					director.add(
						name,
						{
							element: tagName,
							slots: true,
							inheritAttrs: true,
						},
						filePath,
						line,
						col,
					);
				}
			});

			function foundFragment(
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				fragment: JsxFragment,
			) {
				/**
				 * ```
				 * <>
				 *   <Foo></Foo>
				 * --^
				 * </>
				 * ```
				 */
				find(fragment, isJsxOpeningElement, foundElement);
				/**
				 * ```
				 * <>
				 *   <Foo />
				 * --^
				 * </>
				 * ```
				 */
				find(fragment, isJsxSelfClosingElement, foundElement);
			}

			function foundElement(
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				el: JsxOpeningElement | JsxSelfClosingElement,
			) {
				const tagName = el.tagName.getText(sourceFile);

				for (const frag of asFragment) {
					const pattern = typeof frag === 'string' ? toRegexp(frag) : frag;
					/**
					 * ```
					 * <Provider>
					 *   <Foo></Foo>
					 * --^
					 * </Provider>
					 *
					 * <Namespace.Provider>
					 *   <Foo></Foo>
					 * --^
					 * </Namespace.Provider>
					 * ```
					 */
					if (pattern.test(tagName)) {
						for (const child of el.getChildren(sourceFile)) {
							find(child, isJsxOpeningElement, foundElement);
							find(child, isJsxSelfClosingElement, foundElement);
						}
						return;
					}
				}

				const attrs = getAttributes(el, sourceFile);
				const children = getChildren(el, sourceFile);
				const identity = createIndentity(tagName, attrs, children);
				director.add(name, identity, filePath, line, col);
			}
		}

		return Promise.resolve(director.getPretenders());
	},
);

function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([gi]*)$/i);
	if (matched?.[1]) {
		return new RegExp(matched[1], matched[2]);
	}
	return new RegExp(pattern);
}
