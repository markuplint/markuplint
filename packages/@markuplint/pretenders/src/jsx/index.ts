import type { Pretender } from '@markuplint/ml-config';

import path from 'node:path';

import { sliceFragment } from '@markuplint/parser-utils';
import * as ts from 'typescript';

import { PretenderDirector } from '../pretender-director';

import { createIndentity } from './create-identify';
import { finder } from './finder';
import { getAttributes } from './get-attributes';

const jsxOptions = {
	cwd: process.cwd(),
	asFragment: [/(?:^|\.)Provider$/i] as (RegExp | string)[],
	ignoreComponentNames: [] as string[],
	taggedStylingComponent: [
		// PropertyAccessExpression: styled.button`css-prop: value;`
		/^styled\.(?<tagName>[a-z][a-z0-9]*)$/i,
		// CallExpression: styled(Button)`css-prop: value;`
		/^styled\s*\(\s*(?<tagName>[a-z][a-z0-9]*)\s*\)$/i,
	] as (RegExp | string)[],
};

export function fromJSX(filePath: string[], options: Partial<typeof jsxOptions> = jsxOptions): Pretender[] {
	const {
		cwd = jsxOptions.cwd,
		asFragment = jsxOptions.asFragment,
		ignoreComponentNames = jsxOptions.ignoreComponentNames,
		taggedStylingComponent = jsxOptions.taggedStylingComponent,
	} = options;

	const director = new PretenderDirector();

	const program = ts.createProgram(filePath, {
		jsx: ts.JsxEmit.ReactJSX,
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

	return director.getPretenders();
}

function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
	if (matched) {
		return new RegExp(matched[1], matched[2]);
	}
	return new RegExp(pattern);
}
