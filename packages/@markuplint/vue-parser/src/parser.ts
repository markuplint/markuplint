import type { ASTNode, ASTComment, VElement } from './vue-parser/index.js';
import type { MLASTParentNode, MLASTNodeTreeItem, MLASTParseError } from '@markuplint/ml-ast';

import { ParserError, Parser, isPotentialCustomElementName, isSVGElement } from '@markuplint/parser-utils';
import { isHTMLTag, isMathMLTag, isSVGTag } from '@vue/shared';

import { vueParse } from './vue-parser/index.js';

type State = {
	comments: readonly ASTComment[];
};

/**
 * The built-in components, as written or in kebab-case: `isBuiltInType(tag, name)` of Vue is
 * `tag === name || tag === hyphenate(name)`.
 *
 * @see https://vuejs.org/api/built-in-components.html#built-in-components
 */
const BUILT_IN_COMPONENTS: readonly string[] = [
	'Transition',
	'transition',
	'TransitionGroup',
	'transition-group',
	'KeepAlive',
	'keep-alive',
	'Teleport',
	'teleport',
	'Suspense',
	'suspense',
];

/**
 * Whether the element is a `<style>` or a `<script>` that Vue's compiler removes from a client template.
 *
 * > Tags with side effect (<script> and <style>) are ignored in client component templates.
 *
 * `ignoreSideEffectTags` of `@vue/compiler-dom` removes the element whose `tag` is `script` or `style`
 * and whose `tagType` is `ELEMENT`: a name with a capital letter (`<Style>`) is a component
 * (`isComponent` of `@vue/compiler-core`). The parser of `vue-eslint-parser` lower-cases `name` and
 * keeps `rawName`, so `rawName` is what tells them apart.
 *
 * @see https://github.com/vuejs/core/blob/main/packages/compiler-dom/src/transforms/ignoreSideEffectTags.ts#ignoreSideEffectTags
 * @see https://github.com/vuejs/core/blob/main/packages/compiler-dom/src/errors.ts#DOMErrorMessages
 * @param element - The element of the template
 * @returns `true` if the compiler removes the element
 */
function isIgnoredSideEffectTag(element: VElement): boolean {
	return element.rawName === 'style' || element.rawName === 'script';
}

/**
 * Collects the non-fatal parse errors for the elements that the compiler removes, in the order of the source.
 * It does not look inside one: the compiler removes it with its content.
 *
 * @param nodes - The nodes of a level of the template
 * @param rawCode - The source that the ranges of `nodes` are positions in
 * @returns The parse errors, whose positions cover the whole element
 */
function collectIgnoredSideEffectTags(nodes: readonly ASTNode[], rawCode: string): readonly MLASTParseError[] {
	const errors: MLASTParseError[] = [];
	for (const node of nodes) {
		if (node.type !== 'VElement') {
			continue;
		}
		if (isIgnoredSideEffectTag(node)) {
			errors.push({
				code: 'vue-ignored-side-effect-tag',
				startOffset: node.range[0],
				startLine: node.loc.start.line,
				startCol: node.loc.start.column + 1,
				endOffset: node.range[1],
				endLine: node.loc.end.line,
				endCol: node.loc.end.column + 1,
				raw: rawCode.slice(node.range[0], node.range[1]),
			});
			continue;
		}
		errors.push(...collectIgnoredSideEffectTags(node.children, rawCode));
	}
	return errors;
}

/**
 * Directive resolution is intentionally not performed by this parser:
 * `directivePatterns` declared in `@markuplint/vue-spec` are applied later by
 * `ml-core`'s `MLAttr` constructor. Consequently, parser-level output (and
 * `index.spec.ts`) shows unresolved attribute metadata, while the final
 * `potentialName`/`isDirective`/`isDynamicValue` values only appear at the
 * core level.
 *
 * Known limitation: `v-if`/`v-for`/`v-else`/`v-else-if` do not set
 * `blockBehavior`, so content-model rules such as `permitted-contents` cannot
 * enumerate conditional branches via `conditionalChildNodes()` as they can for
 * Svelte, Pug, Alpine, JSX, and Astro. Unlike Alpine's fixed
 * `<template x-if="...">` wrapper, which converts cleanly into a PSBlock, Vue
 * directives attach to arbitrary elements that must remain valid HTML elements
 * for attribute validation while also acting as blocks for content-model
 * analysis, and `v-else`/`v-else-if` branch across sibling elements — both
 * beyond the per-node `nodeize()` model. These directives are handled at the
 * attribute level only (`isDirective: true`), which suppresses attribute
 * validation errors but provides no structural block information to the core
 * engine.
 */
class VueParser extends Parser<ASTNode, State> {
	constructor() {
		super(
			{
				// Vue SFC is a compiled format that uses explicit XML-style
				// closing tags (including `/>`), not HTML void-element rules.
				endTagType: 'xml',
				// Vue resolves `<FooBar>`, `<fooBar>` and `<foo-bar>` to the same component.
				componentNameVariants: true,
				// The compiler of Vue makes an element by `setAttribute` unless it can put the whole static tree into
				// an HTML string, which it does only for a name it knows by its exact spelling.
				attrNameRoute: 'dom-api',
			},
			{
				comments: [],
			},
		);
	}

	tokenize(): {
		readonly ast: ASTNode[];
		readonly isFragment: boolean;
		readonly parseErrors?: readonly MLASTParseError[];
	} {
		const ast = vueParse(this.rawCode);
		if (ast.templateBody?.comments) {
			this.state.comments = ast.templateBody.comments;
		}
		const children = ast.templateBody?.children ?? [];
		const parseErrors = collectIgnoredSideEffectTags(children, this.rawCode);
		return {
			ast: children,
			isFragment: true,
			...(parseErrors.length > 0 ? { parseErrors } : {}),
		};
	}

	parseError(error: any) {
		// vue-eslint-parser syntax errors carry `lineNumber` (1-based) and
		// `column` (0-based); non-SyntaxError cases fall back to the base handler.
		if (error instanceof SyntaxError && 'lineNumber' in error && 'column' in error) {
			throw new ParserError(error.message, {
				line: error.lineNumber as number,
				col: error.column as number,
				raw: '',
			});
		}
		return super.parseError(error);
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: ASTNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const token = this.sliceFragment(originNode.range[0], originNode.range[1]);

		// The compiler removes it, so neither its content nor where it is written reaches the DOM:
		// it is a block of code that no rule reads, and `tokenize` reports it as a parse error.
		if (originNode.type === 'VElement' && isIgnoredSideEffectTag(originNode)) {
			return this.visitPsBlock({
				...token,
				depth,
				parentNode,
				nodeName: originNode.rawName,
				isFragment: false,
			});
		}

		switch (originNode.type) {
			case 'VText': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case 'VExpressionContainer': {
				// Template expressions (`{{ ... }}`) are treated as opaque
				// pseudo-blocks; their JavaScript content is intentionally not parsed.
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: 'vue-expression-container',
					isFragment: false,
				});
			}
			default: {
				const token = this.sliceFragment(originNode.startTag.range[0], originNode.startTag.range[1]);

				return this.visitElement(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.name,
					},
					originNode.children,
					{
						createEndTagToken: () => {
							if (!originNode.endTag) {
								return null;
							}
							const token = this.sliceFragment(originNode.endTag.range[0], originNode.endTag.range[1]);
							return {
								...token,
								depth,
								parentNode,
							};
						},
					},
				);
			}
		}
	}

	/**
	 * This second pass that interleaves comments is required because
	 * vue-eslint-parser provides comments separately (`templateBody.comments`)
	 * from the main node tree, so they cannot be emitted during `nodeize()`.
	 */
	flattenNodes(nodeTree: readonly MLASTNodeTreeItem[]) {
		const nodeList = super.flattenNodes(nodeTree);
		const newNodeList: MLASTNodeTreeItem[] = [];

		let prevNode: MLASTNodeTreeItem | null = null;
		for (const node of nodeList) {
			const lastOffset = prevNode
				? prevNode.offset + prevNode.raw.length
				: node.parentNode
					? node.parentNode.offset + node.parentNode.raw.length
					: 0;

			const betweenComment = this.state.comments.find(comment => {
				return lastOffset <= comment.range[0] && comment.range[1] <= node.offset;
			});

			if (betweenComment) {
				const token = this.sliceFragment(betweenComment.range[0], betweenComment.range[1]);

				const comment = this.visitComment(
					{
						...token,
						depth: node.depth,
						parentNode: node.parentNode ?? null,
					},
					{
						isBogus: betweenComment.type === 'HTMLBogusComment',
					},
				)[0];

				if (comment && comment.type === 'comment') {
					newNodeList.push(comment);

					if (node.parentNode) {
						this.appendChild(node.parentNode, comment);
					}
				}
			}

			newNodeList.push(node);

			prevNode = node;
		}

		return newNodeList;
	}

	afterFlattenNodes(nodeList: readonly MLASTNodeTreeItem[]) {
		// All base post-processing is disabled because Vue's template parser
		// handles whitespace and node validity differently from raw HTML parsing.
		return super.afterFlattenNodes(nodeList, {
			exposeInvalidNode: false,
			exposeWhiteSpace: false,
			concatText: false,
		});
	}

	/**
	 * > In SFCs, it's recommended to use `PascalCase` tag names
	 * > for child components to differentiate from native HTML elements.
	 * > Although native HTML tag names are case-insensitive,
	 * > Vue SFC is a compiled format so we are able to use case-sensitive tag names in it.
	 * > We are also able to use `/>` to close a tag.
	 *
	 * A tag that is not a native one is a component to Vue, however it is written: Vue resolves
	 * the tag `T` to a component registered as `T`, `camelize(T)` or `capitalize(camelize(T))`,
	 * so `<fooBar>` and `<foo-bar>` are the component `FooBar`, and `<foobar>` is not. Here
	 * a name is a component, `authored`, when it
	 *
	 * - is a built-in component, as written (`Transition`) or in kebab-case (`transition-group`),
	 * - is a special element that renders what it is given (`component`, `slot`), which is `authored`
	 *   but is no component's name for {@link isComponentName},
	 * - has a capital initial (`FooBar`), a capital letter after a lowercase letter or a digit
	 *   (`fooBar`), or a `.` (`ui.Item`, a member of a namespace import of `<script setup>`).
	 *
	 * `foo-bar` is a `web-component`: the name of a custom element is also the kebab-case of a component,
	 * and markuplint does not know `compilerOptions.isCustomElement` of the project. Like the others it is
	 * matched by `FooBar` (see `MLParser.componentNameVariants`).
	 *
	 * A camelCase name of SVG (`clipPath`, `foreignObject`) is an element: Vue's `isNativeTag` takes
	 * it, and `isSVGElement` is case-sensitive.
	 *
	 * The user's `authoredElementName` replaces all of this, as it replaces any default of a parser.
	 *
	 * @see https://vuejs.org/guide/essentials/component-basics#using-a-component
	 * @see https://vuejs.org/api/built-in-components.html#built-in-components
	 * @see https://vuejs.org/api/built-in-special-elements.html#built-in-special-elements
	 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/parser.ts#isComponent
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, [
			// Built-in components
			...BUILT_IN_COMPONENTS,
			// Special elements
			'component',
			'slot',
			// Backward compatibility
			/^[A-Z]/,
			// A member of a namespace import
			/\./,
			// camelCase
			name => /[a-z\d][A-Z]/.test(name) && !isSVGElement(name),
		]);
	}

	/**
	 * Whether Vue takes a tag name for a native element: the lists of the HTML, SVG and MathML elements
	 * of `@vue/shared` that `isNativeTag` of `@vue/compiler-dom` is made of. Vue resolves any other tag to a
	 * component (`<card>` is the component `Card`), unless `compilerOptions.isCustomElement` of the project
	 * says it is a custom element, which markuplint does not know.
	 *
	 * The lists are Vue's own and the names are case-sensitive, as Vue's: an obsolete element that they
	 * do not hold (`marquee`) is no native tag to Vue, though markuplint has a specification for it.
	 *
	 * It is `MLParser#isNativeTag`, so what Vue resolves is what the document takes for native. The type
	 * selector (`Marquee` stands for `<marquee>`) reads it, and so does the guard that keeps a pretender off
	 * a native element, as `@markuplint/pretenders` does. The rules keyed on the specification still see
	 * `<marquee>`.
	 *
	 * It is not the rule of {@link isComponentName}, which tells by the form of a name alone whether it is
	 * a component's, for the target of a pretender and the root a scanner reads: `as: 'marquee'` is meant
	 * as the element there.
	 *
	 * @param name - A tag name as written, case kept
	 * @returns Whether the name is a native tag
	 */
	isNativeTag(name: string): boolean {
		return isHTMLTag(name) || isSVGTag(name) || isMathMLTag(name);
	}

	/**
	 * A name that Vue takes for a component (see {@link detectElementType}) and that names no special
	 * element: a built-in component as written or in kebab-case (`Transition`, `transition-group`), a capital
	 * initial (`FooBar`), a capital letter after a lowercase letter or a digit (`fooBar`), or a `.`
	 * (`ui.Item`). `foo-bar` is not one, as it may be a custom element, nor are `component` and `slot`, which render
	 * what they are given: they have no element to pretend to be.
	 *
	 * @param name - A tag name as written, case kept
	 * @returns Whether the name is a component's
	 */
	isComponentName(name: string): boolean {
		// `<transition>` is `<Transition>`, and a tag with a `.` is resolved by the name before it (`my-widget.v2` by
		// `my-widget`): a component by Vue, whatever a custom element name would say of it
		if (BUILT_IN_COMPONENTS.includes(name) || name.includes('.')) {
			return true;
		}
		if (isPotentialCustomElementName(name)) {
			return false;
		}
		return /^[A-Z]/.test(name) || (/[a-z\d][A-Z]/.test(name) && !isSVGElement(name));
	}
}

export const parser = new VueParser();
