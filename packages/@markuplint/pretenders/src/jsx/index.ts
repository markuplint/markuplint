import type { Pretender, PretenderScanOptions } from '@markuplint/ml-config';

import path from 'node:path';

import { sliceFragment } from '@markuplint/parser-utils';
import * as ts from 'typescript';

import { createScanner } from '../create-scanner';
import { PretenderDirector } from '../pretender-director';

import { createIndentity } from './create-identify';
import { finder } from './finder';
import { getAttributes } from './get-attributes';

interface PretenderScanJSXOptions extends PretenderScanOptions {
	asFragment?: (RegExp | string)[];
	taggedStylingComponent?: (RegExp | string)[];
	extendingWrapper?: (string | RegExp | ExtendingWrapperCallerOptions)[];
}

type ExtendingWrapperCallerOptions = {
	identifier: string | RegExp;
	numberOfArgument: number;
};

const defaultOptions: Required<PretenderScanJSXOptions> = {
	cwd: process.cwd(),
	asFragment: [/(?:^|\.)Provider$/i] as (RegExp | string)[],
	ignoreComponentNames: [] as string[],
	taggedStylingComponent: [
		// PropertyAccessExpression: styled.button`css-prop: value;`
		/^styled\.(?<tagName>[a-z][a-z0-9]*)$/i,
		// CallExpression: styled(Button)`css-prop: value;`
		/^styled\s*\(\s*(?<tagName>[a-z][a-z0-9]*)\s*\)$/i,
	] as (RegExp | string)[],
	extendingWrapper: [] as (string | RegExp | ExtendingWrapperCallerOptions)[],
};

export const jsxScanner = createScanner((files, options = defaultOptions): Promise<Pretender[]> => {
	const {
		cwd = defaultOptions.cwd,
		asFragment = defaultOptions.asFragment,
		ignoreComponentNames = defaultOptions.ignoreComponentNames,
		taggedStylingComponent = defaultOptions.taggedStylingComponent,
		extendingWrapper = defaultOptions.extendingWrapper,
	} = options;

	const director = new PretenderDirector();

	const program = ts.createProgram(files, {
		jsx: ts.JsxEmit.ReactJSX,
		allowJs: true,
	});

	for (const sourceFile of program.getSourceFiles()) {
		if (!sourceFile.isDeclarationFile) {
			ts.forEachChild(sourceFile, node => visit(node, sourceFile));
		}
	}

	function visit(root: ts.Node, sourceFile: ts.SourceFile) {
		const find = finder(sourceFile);

		/**
		 * ```
		 * const Component = ...
		 * ------^
		 * ```
		 */
		find(root, ts.isVariableDeclaration, define);

		/**
		 * ```
		 * function Component (...) {...}
		 * ---------^
		 * ```
		 */
		find(root, ts.isFunctionDeclaration, define);
	}

	function define(dec: ts.VariableDeclaration | ts.FunctionDeclaration, sourceFile: ts.SourceFile) {
		if (!dec.name) {
			return;
		}
		const variableName = dec.name.getText(sourceFile);

		if (ignoreComponentNames.includes(variableName)) {
			return;
		}

		if ('jsDoc' in dec) {
			const jsDoc = dec.jsDoc as ts.JSDoc[];
			const pretendsTag = jsDoc
				.map(doc => doc.tags ?? [])
				.flat()
				.find(doc => doc.tagName.text.toLowerCase() === 'pretends');
			if (pretendsTag) {
				if (pretendsTag.comment === 'null') {
					return;
				}
			}
		}

		const { startLine, startCol } = sliceFragment(sourceFile.text, dec.name.pos, dec.name.end);

		/**
		 * ```
		 * const Component = ...
		 * ------------------^
		 *
		 * function Component (...) {...}
		 * --------------------------^
		 * ```
		 */
		findBody(dec, variableName, sourceFile, startLine, startCol);
	}

	function findBody(root: ts.Node, name: string, sourceFile: ts.SourceFile, startLine: number, startCol: number) {
		const fileName = path.relative(cwd, sourceFile.fileName);
		const find = finder(sourceFile);

		find(root, ts.isReturnStatement, node => {
			/**
			 * ```
			 * return <Foo></Foo>
			 * -------^
			 * ```
			 */
			find(node, ts.isJsxOpeningElement, foundElement);
			/**
			 * ```
			 * return <Foo />
			 * -------^
			 * ```
			 */
			find(node, ts.isJsxSelfClosingElement, foundElement);
			/**
			 * ```
			 * return <></>
			 * -------^
			 * ```
			 */
			find(node, ts.isJsxFragment, foundFragment);
		});

		find(root, ts.isArrowFunction, fn => {
			/**
			 * ```
			 * (...) => <Foo></Foo>
			 * ---------^
			 * ```
			 */
			find(fn, ts.isJsxOpeningElement, foundElement);
			/**
			 * ```
			 * (...) => <Foo />
			 * ---------^
			 * ```
			 */
			find(fn, ts.isJsxSelfClosingElement, foundElement);
			/**
			 * ```
			 * (...) => <></>
			 * ---------^
			 * ```
			 */
			find(fn, ts.isJsxFragment, foundFragment);
		});

		find(root, ts.isTaggedTemplateExpression, tagged => {
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
						inheritAttrs: true,
					},
					fileName,
					startLine,
					startCol,
				);
			}
		});

		find(root, ts.isCallExpression, method => {
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
						typeof _pattern.identifier === 'string' ? toRegexp(_pattern.identifier) : _pattern.identifier;
					numberOfArgument = _pattern.numberOfArgument;
				} else {
					pattern = _pattern;
				}

				if (!pattern.exec(caller)) {
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
						inheritAttrs: true,
					},
					fileName,
					startLine,
					startCol,
				);
			}
		});

		function foundFragment(fragment: ts.JsxFragment) {
			/**
			 * ```
			 * <>
			 *   <Foo></Foo>
			 * --^
			 * </>
			 * ```
			 */
			find(fragment, ts.isJsxOpeningElement, foundElement);
			/**
			 * ```
			 * <>
			 *   <Foo />
			 * --^
			 * </>
			 * ```
			 */
			find(fragment, ts.isJsxSelfClosingElement, foundElement);
		}

		function foundElement(el: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
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
					el.getChildren(sourceFile).forEach(child => {
						find(child, ts.isJsxOpeningElement, foundElement);
						find(child, ts.isJsxSelfClosingElement, foundElement);
					});
					return;
				}
			}

			const attrs = getAttributes(el, sourceFile);
			const identify = createIndentity(tagName, attrs);
			director.add(name, identify, fileName, startLine, startCol);
		}
	}

	return Promise.resolve(director.getPretenders());
});

function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
	if (matched) {
		return new RegExp(matched[1], matched[2]);
	}
	return new RegExp(pattern);
}
