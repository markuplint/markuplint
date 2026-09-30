/**
 * @module @markuplint/pretenders/jsx
 *
 * JSX/TSX scanner for discovering pretender mappings. Analyzes component source
 * files using the TypeScript compiler API to determine which native HTML elements
 * each component renders, including support for styled-components, HOC wrappers,
 * and fragment providers.
 */

import type { Root } from './collect-roots.js';
import type { Draft } from './create-identify.js';
import type { PretenderScanJSXOptions } from './types.js';
import type { Pretender } from '@markuplint/ml-config';
import type { FunctionDeclaration, JSDoc, Node, SourceFile, VariableDeclaration } from 'typescript';

import path from 'node:path';

import { getPosition } from '@markuplint/parser-utils/location';
import ts from 'typescript';

import { createScanner } from '../create-scanner.js';
import { collectImportBindings } from '../import-resolver/analyze-jsx-imports.js';
import { normalizePath } from '../import-resolver/resolve-module-file.js';
import { PretenderDirector } from '../pretender-director.js';

import { collectReturnExpressions, findComponentFunction, resolveRoots } from './collect-roots.js';
import { createCachingCompilerHost } from './compiler-host.js';
import { createIdentity, mergeDrafts } from './create-identify.js';
import { finder } from './finder.js';
import { getAttributes, toPretenderAttrs } from './get-attributes.js';
import { getSlotInfo } from './get-contents.js';

const {
	createProgram,
	forEachChild,
	isCallExpression,
	isFunctionDeclaration,
	isTaggedTemplateExpression,
	isVariableDeclaration,
	JsxEmit,
} = ts;

// `noLib`/`types: []` skip loading lib.d.ts and @types packages, which this
// scanner never needs (it only walks JSX syntax, never type-checks).
const COMPILER_OPTIONS: ts.CompilerOptions = {
	jsx: JsxEmit.ReactJSX,
	allowJs: true,
	noLib: true,
	types: [],
};

// `sources` has no meaningful default (it's a per-call override), so it's
// excluded from the Required<> defaults and read straight off `options`.
const defaultOptions: Required<Omit<PretenderScanJSXOptions, 'sources'>> = {
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

/**
 * A scanner function that analyzes JSX/TSX source files to discover pretender mappings.
 * Uses the TypeScript compiler API to parse and traverse the AST, identifying component
 * definitions and the native HTML elements they render.
 *
 * Which element a component is decided by the values its own `return` points can
 * produce. A nested function such as `items.map(i => <li />)` is not one of them, and
 * a result that is not statically known (`return children`) is ignored rather than
 * guessed. Branches rendering different elements produce no pretender, because any
 * single choice would be a false positive for the other branch. Branches rendering the
 * same element keep only what all of them agree on.
 *
 * What surrounds the children is recorded as `slots` (the element that directly wraps
 * `{children}`) and `contents` (the static children of that element), so that the children
 * given at the usage site are evaluated as the component renders them. Known limitation:
 * a component that renders another component takes the mapping of the latter, and its own
 * `slots` / `contents` are dropped (see `dependencyMapper`).
 *
 * Supports:
 * - Function components (function declarations and arrow functions)
 * - Styled-components (`styled.element` tagged templates)
 * - HOC / wrapper function patterns
 * - Fragment and provider component transparency
 * - `@pretends null` JSDoc tag to opt out a component
 *
 * @param files - Absolute file paths to scan (relative paths cause a `ReferenceError`)
 * @param options - JSX scanner configuration (fragment patterns, styled-components, wrappers, etc.)
 * @returns Discovered pretender mappings for all components found in the given files
 */
export const jsxScanner = createScanner<PretenderScanJSXOptions>(
	(files, options = defaultOptions): Promise<Pretender[]> => {
		const {
			cwd = defaultOptions.cwd,
			ignoreComponentNames = defaultOptions.ignoreComponentNames,
			asFragment = defaultOptions.asFragment,
			taggedStylingComponent = defaultOptions.taggedStylingComponent,
			extendingWrapper = defaultOptions.extendingWrapper,
			sources,
		} = options;

		const director = new PretenderDirector();

		// A `g` / `y` flag makes `test()` stateful (`lastIndex`), so the results would
		// depend on how many elements were tested before.
		const fragmentPatterns = asFragment.map(frag => {
			const pattern = typeof frag === 'string' ? toRegexp(frag) : frag;
			return new RegExp(pattern.source, pattern.flags.replaceAll(/[gy]/g, ''));
		});

		const host = createCachingCompilerHost(COMPILER_OPTIONS, sources);
		const program = createProgram(files, COMPILER_OPTIONS, host);

		for (const sourceFile of program.getSourceFiles()) {
			if (!sourceFile.isDeclarationFile) {
				const relFilePath = normalizePath(path.relative(cwd, sourceFile.fileName));
				director.addImports(relFilePath, collectImportBindings(sourceFile));
				forEachChild(sourceFile, node => visit(node, sourceFile));
			}
		}

		function isFragmentTag(tag: string) {
			return fragmentPatterns.some(pattern => pattern.test(tag));
		}

		/**
		 * Describes what a component renders in one branch, or `undefined` when a
		 * pretender cannot express it.
		 */
		function toDraft(
			root: Root,
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			sourceFile: SourceFile,
		): Draft | undefined {
			const info = getSlotInfo(root, sourceFile, isFragmentTag);
			if (!info) {
				return undefined;
			}

			/**
			 * ```
			 * return <><Foo /><Bar /></>
			 * -------^
			 * ```
			 */
			if (root.type === 'fragment') {
				return { element: '#fragment', attrs: [], hasSpread: false, ...info };
			}

			const attrs = getAttributes(root.element, sourceFile);
			return {
				element: root.element.tagName.getText(sourceFile),
				attrs: toPretenderAttrs(attrs),
				hasSpread: attrs.some(attr => attr.nodeType === 'spread'),
				...info,
			};
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
			const filePath = normalizePath(path.relative(cwd, sourceFile.fileName));
			const find = finder(sourceFile);

			/**
			 * ```
			 * const Component = () => <Foo />
			 * ---------------------------^
			 * ```
			 *
			 * Only the component's own return points decide which element it is, so
			 * a nested function (`items.map(i => <li />)`) is not one of them.
			 */
			const fn = findComponentFunction(isVariableDeclaration(root) ? root.initializer : root);
			if (fn) {
				const drafts: Draft[] = [];
				let representable = true;

				for (const expression of collectReturnExpressions(fn)) {
					for (const branch of resolveRoots(expression, sourceFile, isFragmentTag)) {
						const draft = toDraft(branch, sourceFile);
						if (draft) {
							drafts.push(draft);
						} else {
							representable = false;
						}
					}
				}

				const merged = representable ? mergeDrafts(drafts) : undefined;
				if (merged) {
					director.add(name, createIdentity(merged), filePath, line, col, `${filePath}#${name}`);
				}
			}

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
						`${filePath}#${name}`,
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
						`${filePath}#${name}`,
					);
				}
			});
		}

		return Promise.resolve(director.getPretenders(cwd, sources));
	},
);

function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([gi]*)$/i);
	if (matched?.[1]) {
		return new RegExp(matched[1], matched[2]);
	}
	return new RegExp(pattern);
}
