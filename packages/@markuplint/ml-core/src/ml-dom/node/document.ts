import type { MLAttr } from './attr.js';
import type { MLComment } from './comment.js';
import type { MLDocumentType } from './document-type.js';
import type { MLElement } from './element.js';
import type { MLNode } from './node.js';
import type { MLText } from './text.js';
import type { AccessibilityProperties, DocumentNodeType } from './types.js';
import type { MLRule } from '../../ml-rule/index.js';
import type { Ruleset } from '../../ruleset/index.js';
import type { MLSchema } from '../../types.js';
import type { Walker } from '../helper/walkers.js';
import type { MLToken } from '../token/token.js';
import type {
	AttrNameRoute,
	EndTagType,
	ExpressionLanguage,
	LiteralValueDeclaration,
	MLASTDocument,
	MLASTNodeTreeItem,
	MLASTParseError,
} from '@markuplint/ml-ast';
import type { PlainData, Pretender, RuleCommonSettings, RuleConfigValue } from '@markuplint/ml-config';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { exchangeValueOnRule, mergeRule } from '@markuplint/ml-config';
import {
	schemaToSpec,
	getComputedRole,
	mayBeFocusable,
	getComputedAriaProps,
	isExposed,
	isShadowRoot,
	getSpecByTagName,
	ARIA_RECOMMENDED_VERSION,
} from '@markuplint/ml-spec';

import { ConfigParserError, isComponentName } from '@markuplint/parser-utils';
import { InvalidSelectorError } from '@markuplint/selector';

import { log as coreLog } from '../../debug.js';
import { searchNodeAtLocation } from '../../utils/search-node-at-location.js';
import { createNode } from '../helper/create-node.js';
import { nodeListToDebugMaps } from '../helper/debug.js';
import { sequentialWalker, syncWalk } from '../helper/walkers.js';

import { MLParentNode } from './parent-node.js';
import { RuleMapper } from './rule-mapper.js';

const log = coreLog.extend('ml-dom');
const docLog = log.extend('document');
const ruleLog = docLog.extend('rule');

/**
 * Represents a DOM Document node wrapper in the markuplint DOM tree.
 * Serves as the root node of the parsed document, managing the node list,
 * rule mappings, pretender initialization, accessibility computation,
 * and document-level configuration (end tag handling, booleanish values, etc.).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLDocument<T extends RuleConfigValue, O extends PlainData = undefined> extends MLParentNode<T, O> {
	/**
	 * Detect value as a true if its attribute is booleanish value and omitted.
	 *
	 * Ex:
	 * ```jsx
	 * <Component aria-hidden />
	 * ```
	 *
	 * In the above, the `aria-hidden` is `true`.
	 *
	 * @default false
	 */
	readonly booleanish: boolean;

	/**
	 * The language of the code that an attribute value is written in when it is written as code
	 * (`MLParser#attrExpressionLanguage`). Absent when the parser does not say; then no attribute
	 * value of the document is read as a literal (a pretender's attribute is, whatever it says).
	 */
	readonly attrExpressionLanguage?: ExpressionLanguage;

	/**
	 * How the framework of the parser renders a literal in an attribute value, where it differs from
	 * the default (`MLParser#literalValues`). What the spec says (`MLMLSpec#literalValues`) wins over
	 * this.
	 */
	readonly literalValues?: LiteralValueDeclaration;

	/**
	 * What the `slot` element is in the language of the document (`MLParser#slotElement`): the HTML
	 * element, or the placeholder of a framework's component, whose slot assignment is not computed.
	 */
	readonly slotElement: 'html' | 'framework';

	/**
	 * The rule currently being evaluated during a lint pass.
	 * Set by the linting engine before rule evaluation begins and used by nodes
	 * to retrieve their rule configuration. Null when no rule is being evaluated.
	 */
	currentRule: Readonly<MLRule<T, O>> | null = null;

	/**
	 * This is defined by the parser.
	 *
	 * @default "omittable"
	 */
	readonly endTag: EndTagType;

	readonly #astNodeMap: ReadonlyMap<string, MLASTNodeTreeItem>;

	readonly #filename?: string;

	readonly #isNativeTagRule?: (name: string) => boolean;

	/**
	 * Whether this document represents a fragment rather than a complete document.
	 * Fragment documents may lack root-level elements like `<html>`, `<head>`, or `<body>`.
	 */
	readonly isFragment: boolean;

	/**
	 * A flat, ordered array of all markuplint DOM nodes in the document,
	 * used for sequential traversal and token-level operations.
	 */
	readonly nodeList: ReadonlyArray<MLNode<T, O>>;

	readonly ontouchcancel?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchend?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchmove?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchstart?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	/**
	 * The ML specification data used for element/attribute lookups, ARIA role resolution,
	 * and other spec-driven computations.
	 */
	readonly specs: MLMLSpec;

	/**
	 * Whether tag name comparisons should be case-sensitive.
	 * When false (default for HTML), tag names are compared case-insensitively.
	 */
	readonly tagNameCaseSensitive: boolean;

	/**
	 * Whether a component is referred to by any spelling of its name: `<FooBar>`, `<fooBar>` and
	 * `<foo-bar>` are one component (Vue). A type selector reads it through
	 * {@link MLElement.tagNameKind}.
	 */
	readonly componentNameVariants: boolean;

	/**
	 * Whether a name is a reference to a component, not the name of an element, judged by its form
	 * alone in the language of the parser (`Tabs.Root` is, `div` is not). The target of a pretender
	 * is typed by it. It is the rule of the parser (`MLParser#isComponentName`, a method of the parser's
	 * class, not of this one); the form that most languages share (`isComponentName` of
	 * `@markuplint/parser-utils`) when the parser has none.
	 */
	readonly isComponentName: (name: string) => boolean;

	/**
	 * Whether a tag is a native element: the rule of the parser (`MLParser#isNativeTag`) when it has one, which
	 * takes the name as written and knows no namespace, else the specification (`getSpecByTagName`) of the
	 * name in its namespace. {@link MLElement.tagNameKind} and the guard of {@link MLElement.pretending}
	 * read it, so that a type selector and a pretender agree on what a tag is.
	 *
	 * Rules keyed on the specification (deprecated / obsolete elements) do not read it. Nor does the
	 * element that a pretender stands for (`as`): the name is the element itself there, not a tag to resolve,
	 * so it is judged by the specification and never passes through this method.
	 *
	 * @param localName - The name of the tag as the author wrote it, never the `as` of a pretender
	 * @param namespaceURI - The namespace of the element; not read when the parser has a rule, as Vue's is the same for every namespace
	 * @returns Whether the document takes the tag for a native element
	 */
	isNativeTag(localName: string, namespaceURI: string): boolean {
		if (this.#isNativeTagRule) {
			return this.#isNativeTagRule(localName);
		}
		return getSpecByTagName(this.specs.specs, localName, namespaceURI) != null;
	}

	/**
	 * Whether attribute names are JavaScript identifiers in the source language (JSX props such as
	 * `onClick`), which the `case-sensitive-attr-name` rule does not ask to be lower case.
	 *
	 * It says nothing about whether two spellings of a name are one attribute: that is up to how the
	 * name gets into the DOM ({@link MLDocument.attrNameRoute}) and to the element, and is decided by
	 * {@link MLAttr.nameKey}. Svelte and Astro tell the case of a tag name apart but not of an
	 * attribute name, and Vue sets its attributes through the DOM API though a template is still
	 * checked for the case of a name.
	 */
	readonly attrNameCaseSensitive: boolean;

	/**
	 * How the name of an attribute gets into the DOM of the browser (`MLParser#attrNameRoute`, see
	 * `AttrNameRoute`). It decides whether `VIEWBOX` and `viewBox` are one attribute, which is a matter of the
	 * DOM and so of the element and the attribute as well; this is what the parser says about its language.
	 * `"html-parser"` when the parser does not say.
	 */
	readonly attrNameRoute: AttrNameRoute;

	/**
	 * Common settings applied globally to all rules, such as the ARIA version.
	 * Rules use this as a fallback when their own options do not specify a value.
	 */
	readonly ruleCommonSettings: RuleCommonSettings;

	/**
	 * @param ast node list of markuplint AST
	 * @param ruleset ruleset object
	 * @param schemas base HTML/ARIA spec with optional framework-specific extensions
	 * @param ruleCommonSettings common settings applied globally to all rules
	 * @param options optional configuration for document behavior
	 */
	constructor(
		ast: MLASTDocument,
		ruleset: Ruleset,
		schemas: MLSchema,
		ruleCommonSettings: RuleCommonSettings,
		options?: {
			readonly filename?: string;
			readonly endTag?: 'xml' | 'omittable' | 'never';
			readonly booleanish?: boolean;
			readonly attrExpressionLanguage?: ExpressionLanguage;
			readonly literalValues?: LiteralValueDeclaration;
			readonly slotElement?: 'html' | 'framework';
			readonly tagNameCaseSensitive?: boolean;
			readonly componentNameVariants?: boolean;
			readonly isComponentName?: (name: string) => boolean;
			readonly isNativeTag?: (name: string) => boolean;
			readonly attrNameCaseSensitive?: boolean;
			readonly attrNameRoute?: AttrNameRoute;
			readonly pretenders?: readonly Pretender[];
		},
	) {
		// @ts-ignore
		super(ast, null);

		this.isFragment = ast.isFragment;
		this.specs = schemaToSpec(schemas);
		this.booleanish = options?.booleanish ?? false;
		this.attrExpressionLanguage = options?.attrExpressionLanguage;
		this.literalValues = options?.literalValues;
		this.slotElement = options?.slotElement ?? 'html';
		this.endTag = options?.endTag ?? 'omittable';
		this.#filename = options?.filename;
		this.tagNameCaseSensitive = options?.tagNameCaseSensitive ?? false;
		this.componentNameVariants = options?.componentNameVariants ?? false;
		this.isComponentName = options?.isComponentName ?? isComponentName;
		this.#isNativeTagRule = options?.isNativeTag;
		this.attrNameCaseSensitive = options?.attrNameCaseSensitive ?? false;
		this.attrNameRoute = options?.attrNameRoute ?? 'html-parser';
		this.ruleCommonSettings = ruleCommonSettings;

		// Build UUID → AST node map for cross-reference lookups (e.g., pairNodeUuid)
		this.#astNodeMap = new Map(ast.nodeList.map(n => [n.uuid, n]));

		// console.log(ast.nodeList.map((n, i) => `${i}: ${n.uuid} "${n.raw.trim()}"(${n.type})`));
		this.nodeList = Object.freeze(
			ast.nodeList
				.map(astNode => {
					if (astNode.type === 'endtag') {
						return;
					}
					return createNode<MLASTNodeTreeItem, T, O>(astNode, this);
				})
				.filter((n): n is MLNode<T, O> => !!n),
		);

		// A selector of the configuration is matched here, by a pretender and by a rule, so an
		// invalid one is the fault of the configuration in both.
		try {
			this.#pretending(options?.pretenders);
			this.#ruleMapping(ruleset);
		} catch (error: unknown) {
			if (error instanceof InvalidSelectorError) {
				throw new ConfigParserError(error.message, {
					filePath: 'the configuration',
				});
			}
			throw error;
		}
	}

	/**
	 * Looks up an AST node by its UUID from the parsed document's node list.
	 *
	 * @param uuid - The UUID of the AST node to find
	 * @returns The AST node, or `undefined` if not found
	 */
	getAstNodeByUuid(uuid: string): MLASTNodeTreeItem | undefined {
		return this.#astNodeMap.get(uuid);
	}

	/**
	 * Non-fatal parser conformance errors collected during tokenisation by
	 * the underlying parser (currently `@markuplint/html-parser` and the
	 * template-engine parsers that delegate to it). Empty array when the
	 * parser does not produce events or the source had none.
	 *
	 * Rules that have claimed responsibility for parse5 events via
	 * `meta.mirrorsParseErrorCodes` typically read this array to surface
	 * the corresponding violations themselves. `character-reference` is the
	 * canonical example: its self-detection covers unescaped `<`, `>`, `&`,
	 * `"` (the "missed escape" direction), and reading `parseErrors` adds
	 * coverage for parse5's malformed-reference codes (`&xyz;`, etc.) under
	 * the same rule id.
	 *
	 * ml-core's built-in parse-error channel suppresses the mirrored codes
	 * unconditionally — so the rule that reads them here is the only place
	 * the user sees the violation.
	 */
	get parseErrors(): readonly MLASTParseError[] {
		return (this._astToken as unknown as MLASTDocument).parseErrors ?? [];
	}

	/**
	 * @implements DOM API: `Document`
	 */
	get doctype(): MLDocumentType<T, O> | null {
		for (const node of this.nodeList) {
			if (node.is(node.DOCUMENT_TYPE_NODE)) {
				return node;
			}
		}
		return null;
	}

	/**
	 * It could be used in rule, make sure it is immutable
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMDocument`
	 */
	get filename() {
		return this.#filename;
	}

	/**
	 * Returns a string appropriate for the type of node as `Document`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-document%E2%91%A8
	 */
	get nodeName() {
		return '#document' as const;
	}

	/**
	 * Returns a number appropriate for the type of `Document`
	 */
	get nodeType(): DocumentNodeType {
		return this.DOCUMENT_NODE;
	}

	get ownerDocument(): null {
		return null;
	}

	get ownerMLDocument(): MLDocument<T, O> {
		return this;
	}

	/**
	 * @implements DOM API: `Document`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-parentnode%E2%91%A0
	 */
	get parent() {
		return null;
	}

	/**
	 * @implements DOM API: `Document`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): null {
		return null;
	}

	/**
	 * Returns a debug-friendly string array representing the structure of the document's
	 * node list, useful for debugging and test assertions.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 * @returns An array of strings describing each node in the document
	 */
	debugMap(): string[] {
		return nodeListToDebugMaps(this.nodeList, true);
	}

	/**
	 * Computes the accessibility properties for the given node, including its
	 * ARIA role, accessible name, focusability, and ARIA property values.
	 * Returns null for non-element nodes.
	 *
	 * The accessible name is obtained via `node.getAccessibleName()` so that
	 * the per-element memoization cache is shared with other consumers
	 * (rules, selectors). See {@link MLElement.getAccessibleName}.
	 *
	 * @param node - The node to compute accessibility properties for
	 * @param ariaVersion - The ARIA specification version to use for computation
	 * @returns The computed accessibility properties, or null for non-element nodes
	 */
	getAccessibilityProp(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: MLNode<T, O>,
		ariaVersion: ARIAVersion = ARIA_RECOMMENDED_VERSION,
	): AccessibilityProperties | null {
		if (!node.is(node.ELEMENT_NODE)) {
			return null;
		}

		if (['slot'].includes(node.localName)) {
			return {
				unknown: true,
			};
		}

		const exposed = isExposed(node, node.ownerMLDocument.specs, ariaVersion);

		if (!exposed) {
			return {
				unknown: false,
				exposedToTree: false,
			};
		}

		const aria: AccessibilityProperties = {
			unknown: false,
			exposedToTree: true,
		};

		const role = getComputedRole(node.ownerMLDocument.specs, node, ariaVersion);
		const name = node.getAccessibleName(ariaVersion).trim();
		const focusable = mayBeFocusable(node, node.ownerMLDocument.specs);

		const nameRequired = role.role?.accessibleNameRequired ?? false;
		const nameProhibited = role.role?.accessibleNameProhibited ?? false;

		// A slot whose assignment is known is read by `getAccessibleName` above. The slot of a shadow root is in
		// a tree of its own, so every tree is searched, except the content of an ordinary `template` element,
		// which is not rendered where it is written.
		const hasSlot = node.deepQuerySelectorAll('slot').some(slot => {
			if (slot.getAssignedNodes() !== null) {
				return false;
			}
			const root = slot.getRootNode();
			return isShadowRoot(root) || !root.is(root.DOCUMENT_FRAGMENT_NODE);
		});

		aria.role = role.role?.name;
		aria.nameRequired = nameRequired;
		aria.nameProhibited = nameProhibited;
		aria.name =
			name ||
			(hasSlot
				? {
						unknown: true,
					}
				: '');
		aria.focusable = focusable;

		for (const prop of Object.values(getComputedAriaProps(node.ownerMLDocument.specs, node, ariaVersion))) {
			if (!prop.required && prop.from === 'default') {
				continue;
			}
			aria.props = aria.props || {};

			const propName = prop.name.replace('aria-', '');

			aria.props[propName] = {
				value: prop.value ?? null,
				required: prop.required,
			};
		}

		return aria;
	}

	/**
	 * The first element of the tree of the document whose id is `elementId`, with the character
	 * references in the markup resolved: not in the content of an HTML `template` element, which is a
	 * tree of its own.
	 *
	 * @implements DOM API: `Document`
	 * @see https://dom.spec.whatwg.org/#dom-nonelementparentnode-getelementbyid
	 */
	findElementById(elementId: string) {
		return this._getElementById(elementId);
	}

	/**
	 * Searches for a node at the given source location (line and column).
	 *
	 * The node is the innermost one whose source range, from its start, included,
	 * to its end, excluded, holds the position; a position in an end tag is its
	 * element. The rule is `searchNodeAtLocation`'s.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 * @param line - The 1-based line number to search at
	 * @param col - The 1-based column number to search at
	 * @returns The node at the given location, or null if not found
	 */
	searchNodeByLocation(line: number, col: number): MLNode<T, O> | null {
		return searchNodeAtLocation(this.nodeList, line, col);
	}

	/**
	 * Sets the currently active rule for this document. Called by the linting engine
	 * before each rule evaluation pass.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 * @param rule - The rule to set as current, or null to clear
	 */
	setRule(rule: Readonly<MLRule<T, O>> | null) {
		this.currentRule = rule;
	}

	/**
	 * Returns the raw string representation of the document.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 * @returns The string content of the document
	 */
	toString() {
		return this.raw;
	}

	/**
	 * Walks the document tree, visiting nodes of the specified type and invoking
	 * the walker callback for each one. Supports walking Element, Text, Comment,
	 * Attr, and ElementCloseTag node types.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 * @param type - The node type to walk over
	 * @param walker - The callback to invoke for each matching node
	 * @param skipWhenRuleIsDisabled - When true, skips nodes where the current rule is disabled
	 * @returns A promise that resolves when all matching nodes have been visited
	 */
	walkOn(type: 'Element', walker: Walker<T, O, MLElement<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Text', walker: Walker<T, O, MLText<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Comment', walker: Walker<T, O, MLComment<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Attr', walker: Walker<T, O, MLAttr<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'ElementCloseTag', walker: Walker<T, O, MLToken>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(
		type: 'Element' | 'Text' | 'Comment' | 'Attr' | 'ElementCloseTag',
		walker: Walker<T, O, any>,
		skipWhenRuleIsDisabled: boolean = true,
	): Promise<void> {
		return sequentialWalker(this.nodeList, node => {
			if (skipWhenRuleIsDisabled && node.rule.disabled) {
				return;
			}
			if (type === 'Element' && node.is(node.ELEMENT_NODE)) {
				return walker(node);
			}
			if (type === 'Text' && node.is(node.TEXT_NODE)) {
				return walker(node);
			}
			if (type === 'Comment' && node.is(node.COMMENT_NODE)) {
				return walker(node);
			}
			if (type === 'Attr' && node.is(node.ELEMENT_NODE)) {
				return sequentialWalker([...node.attributes], attr => walker(attr));
			}
			if (type === 'ElementCloseTag' && node.is(node.ELEMENT_NODE) && node.closeTag) {
				return walker(node.closeTag);
			}
		});
	}

	/**
	 * Must run before `#ruleMapping`: rule selectors (e.g. a `nodeRules`
	 * entry targeting `button`) are matched against the pretender identity,
	 * so the pretender link has to exist when rules are mapped.
	 */
	#pretending(pretenders?: readonly Pretender[]) {
		if (docLog.enabled) {
			docLog('Pretending: %O', pretenders);
		}
		for (const node of this.nodeList) {
			if (node.is(node.ELEMENT_NODE)) {
				node.pretending(pretenders);
			}
		}
	}

	#ruleMapping(ruleset: Ruleset) {
		// Read once: the per-node loop below would otherwise hit the `enabled` getter for every node.
		const docEnabled = docLog.enabled;
		const ruleEnabled = ruleLog.enabled;
		if (docEnabled) {
			docLog('Rule Mapping: %O', Object.keys(ruleset.rules));
		}

		const ruleMapper = new RuleMapper(this);

		// global rules to #document
		for (const ruleName of Object.keys(ruleset.rules)) {
			const rule = ruleset.rules[ruleName];
			if (rule == null) {
				continue;
			}

			ruleMapper.set(this, ruleName, {
				from: 'rules',
				specificity: [0, 0, 0],
				rule,
			});
		}

		// add rules to node
		for (const node of this.nodeList) {
			if (docEnabled) {
				docLog('Add rules to node <%s>', node.nodeName);
			}

			// global rules to each element
			for (const ruleName of Object.keys(ruleset.rules)) {
				const rule = ruleset.rules[ruleName];
				if (rule == null) {
					continue;
				}

				ruleMapper.set(node, ruleName, {
					from: 'rules',
					specificity: [0, 0, 0],
					rule,
				});
			}

			if (!node.is(node.ELEMENT_NODE) && !node.is(node.TEXT_NODE)) {
				continue;
			}

			const selectorTarget = node.is(node.ELEMENT_NODE) ? node : null;

			// node specs and special rules for node by selector
			for (const nodeRule of ruleset.nodeRules) {
				if (!nodeRule.rules) {
					continue;
				}

				if (!selectorTarget) {
					continue;
				}

				const selector = nodeRule.selector ?? nodeRule.regexSelector;

				const matches = selectorTarget.matchMLSelector(selector);

				if (!matches.matched) {
					continue;
				}

				if (docEnabled) {
					docLog('Matched nodeRule: <%s>(%s)', node.nodeName, matches.selector || '*');
				}

				const ruleList = Object.keys(nodeRule.rules);

				for (const ruleName of ruleList) {
					const rule = nodeRule.rules[ruleName];
					if (rule == null) {
						continue;
					}

					// Namespace wildcard (e.g., "a11y/*": false)
					if (ruleName.endsWith('/*')) {
						if (rule !== false) {
							ruleset.mappingErrors.push(
								new Error(
									`Namespace wildcard "${ruleName}" only accepts false; use a specific rule name for options`,
								),
							);
							continue;
						}
						const nsPrefix = ruleName.slice(0, -1); // "a11y/*" → "a11y/"
						for (const key of Object.keys(ruleset.rules)) {
							if (key.startsWith(nsPrefix)) {
								ruleMapper.set(node, key, {
									from: 'nodeRules',
									specificity: matches.specificity,
									rule: false,
								});
							}
						}
						continue;
					}

					const convertedRule = exchangeValueOnRule(rule, matches.data ?? {});
					if (convertedRule === undefined) {
						continue;
					}
					const globalRule = ruleset.rules[ruleName];
					const mergedRule = globalRule == null ? convertedRule : mergeRule(globalRule, convertedRule);

					if (ruleEnabled) {
						ruleLog('↑ nodeRule (%s): %O', ruleName, mergedRule);
					}

					ruleMapper.set(node, ruleName, {
						from: 'nodeRules',
						specificity: matches.specificity,
						rule: mergedRule,
					});

					// Propagate to top-level-group virtual rules that wrap this base rule. These
					// wrappers have no selector scope of their own (they mirror the base rule
					// globally), so any matched value is safe to forward.
					const virtualNames = ruleset.baseRuleToVirtualNames.get(ruleName);
					if (virtualNames) {
						for (const vName of virtualNames) {
							const vGlobalRule = ruleset.rules[vName];
							const vMergedRule =
								vGlobalRule == null ? convertedRule : mergeRule(vGlobalRule, convertedRule);
							ruleMapper.set(node, vName, {
								from: 'nodeRules',
								specificity: matches.specificity,
								rule: vMergedRule,
							});
						}
					}

					// Propagate a disable to selector-scoped (nodeRules/childNodeRules-named) virtual
					// rules that wrap this base rule. Limited to `false`: unlike the top-level-group
					// case above, these wrappers DO have their own selector scope, so forwarding a
					// non-false value would apply their semantics (e.g. a required attribute name) to
					// every node this (unrelated) nodeRule matches, even where the virtual rule's own
					// selector never matched — see issue #4023's fix history for the regression this caused.
					if (convertedRule === false) {
						const scopedVirtualNames = ruleset.baseRuleToScopedVirtualNames.get(ruleName);
						if (scopedVirtualNames) {
							for (const vName of scopedVirtualNames) {
								// No merge needed: mergeRule(_, false) always returns false, so the
								// disable is unconditional regardless of any global config for vName.
								ruleMapper.set(node, vName, {
									from: 'nodeRules',
									specificity: matches.specificity,
									rule: false,
								});
							}
						}
					}
				}
			}

			// overwrite rule to child node
			if (selectorTarget && ruleset.childNodeRules.length > 0) {
				const descendants: MLNode<T, O>[] = [];
				const children = [...selectorTarget.childNodes];
				syncWalk(children, childNode => {
					descendants.push(childNode);
				});

				for (const nodeRule of ruleset.childNodeRules) {
					if (!nodeRule.rules) {
						continue;
					}
					const nodeRuleRules = nodeRule.rules;

					const selector = nodeRule.selector ?? nodeRule.regexSelector;

					if (selector == null) {
						continue;
					}

					const matches = selectorTarget.matchMLSelector(selector);
					if (!matches.matched) {
						continue;
					}

					if (docEnabled) {
						docLog(
							'Matched childNodeRule: <%s>(%s), inheritance: %o',
							selectorTarget.nodeName,
							matches.selector || '*',
							!!nodeRule.inheritance,
						);
					}

					const targetDescendants = nodeRule.inheritance ? descendants : children;

					for (const ruleName of Object.keys(nodeRuleRules)) {
						const rule = nodeRuleRules[ruleName];
						if (rule == null) {
							continue;
						}

						// Namespace wildcard (e.g., "a11y/*": false)
						if (ruleName.endsWith('/*')) {
							if (rule !== false) {
								ruleset.mappingErrors.push(
									new Error(
										`Namespace wildcard "${ruleName}" only accepts false; use a specific rule name for options`,
									),
								);
								continue;
							}
							const nsPrefix = ruleName.slice(0, -1); // "a11y/*" → "a11y/"
							for (const key of Object.keys(ruleset.rules)) {
								if (key.startsWith(nsPrefix)) {
									for (const descendant of targetDescendants) {
										ruleMapper.set(descendant, key, {
											from: 'childNodeRules',
											specificity: matches.specificity,
											rule: false,
										});
									}
								}
							}
							continue;
						}

						const convertedRule = exchangeValueOnRule(rule, matches.data ?? {});
						if (convertedRule === undefined) {
							continue;
						}
						const globalRule = ruleset.rules[ruleName];
						const mergedRule = globalRule == null ? convertedRule : mergeRule(globalRule, convertedRule);

						if (ruleEnabled) {
							ruleLog('↑ childNodeRule (%s): %O', ruleName, mergedRule);
						}

						for (const descendant of targetDescendants) {
							ruleMapper.set(descendant, ruleName, {
								from: 'childNodeRules',
								specificity: matches.specificity,
								rule: mergedRule,
							});
						}

						// Propagate to top-level-group virtual rules — see the matching nodeRules
						// propagation above for why any value is safe to forward here.
						const virtualNames = ruleset.baseRuleToVirtualNames.get(ruleName);
						if (virtualNames) {
							for (const vName of virtualNames) {
								const vGlobalRule = ruleset.rules[vName];
								const vMergedRule =
									vGlobalRule == null ? convertedRule : mergeRule(vGlobalRule, convertedRule);
								for (const descendant of targetDescendants) {
									ruleMapper.set(descendant, vName, {
										from: 'childNodeRules',
										specificity: matches.specificity,
										rule: vMergedRule,
									});
								}
							}
						}

						// Propagate a disable to selector-scoped virtual rules. Limited to `false` —
						// see the matching nodeRules propagation above for why a non-false value must
						// not be forwarded to a virtual rule whose own selector didn't match.
						if (convertedRule === false) {
							const scopedVirtualNames = ruleset.baseRuleToScopedVirtualNames.get(ruleName);
							if (scopedVirtualNames) {
								for (const vName of scopedVirtualNames) {
									// No merge needed: mergeRule(_, false) always returns false, so the
									// disable is unconditional regardless of any global config for vName.
									for (const descendant of targetDescendants) {
										ruleMapper.set(descendant, vName, {
											from: 'childNodeRules',
											specificity: matches.specificity,
											rule: false,
										});
									}
								}
							}
						}
					}
				}
			}
		}

		ruleMapper.apply();
	}
}
