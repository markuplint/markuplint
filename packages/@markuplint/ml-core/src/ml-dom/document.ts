import type { MLRule } from '../';
import type Ruleset from '../ruleset';
import type { Walker } from './helper/walkers';
import type { MLDOMComment, MLDOMElement, MLDOMElementCloseTag, MLDOMText } from './tokens';
import type { AnonymousNode, NodeType } from './types';
import type { MLASTDocument, MLASTNode } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { exchangeValueOnRule, mergeRule } from '@markuplint/ml-config';
import { getSpec } from '@markuplint/ml-spec';

import { log as coreLog } from '../debug';

import { NodeStore, createNode } from './helper';
import { nodeListToDebugMaps } from './helper/debug';
import { matchSelector } from './helper/match-selector';
import { syncWalk } from './helper/walkers';
import { MLDOMDoctype, MLDOMNode } from './tokens';

const log = coreLog.extend('ml-dom');
const docLog = log.extend('document');
const ruleLog = docLog.extend('rule');

/**
 * markuplint DOM Document
 */
export default class MLDOMDocument<T extends RuleConfigValue, O = null> {
	/**
	 * An array of markuplint DOM nodes
	 */
	nodeList: ReadonlyArray<AnonymousNode<T, O>>;

	/**
	 *
	 */
	currentRule: MLRule<T, O> | null = null;

	/**
	 *
	 */
	isFragment: boolean;

	/**
	 *
	 */
	specs: Readonly<MLMLSpec>;

	/**
	 *
	 */
	readonly nodeStore = new NodeStore();

	#filename?: string;

	/**
	 * It could be used in rule, make sure it is immutable
	 */
	get filename() {
		return this.#filename;
	}

	/**
	 *
	 * @param ast node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(
		ast: MLASTDocument,
		ruleset: Ruleset,
		schemas: readonly [MLMLSpec, ...ExtendedSpec[]],
		filename?: string,
	) {
		this.isFragment = ast.isFragment;
		this.specs = getSpec(schemas);
		this.#filename = filename;

		// console.log(ast.nodeList.map((n, i) => `${i}: ${n.uuid} "${n.raw.trim()}"(${n.type})`));
		this.nodeList = Object.freeze(
			ast.nodeList.map(astNode => {
				if (astNode.type === 'endtag') {
					return this.nodeStore.getNode(astNode);
				}
				return createNode<MLASTNode, T, O>(astNode, this);
			}),
		);

		this._init(ruleset);
	}

	get doctype() {
		for (const node of this.nodeList) {
			if (node instanceof MLDOMDoctype) {
				return node;
			}
		}
		return null;
	}

	get tree() {
		const treeRoots: AnonymousNode<T, O>[] = [];
		let traversalNode: AnonymousNode<T, O> | null = this.nodeList[0];
		while (traversalNode) {
			treeRoots.push(traversalNode);
			traversalNode = traversalNode.nextNode;
		}
		return treeRoots;
	}

	walk(walker: Walker<T, O>) {
		/**
		 * The following pattern is used to ensure that all rules run sequentially,
		 * no matter it runs asynchronously or synchronously.
		 */
		let _resolve: () => void;
		let _reject: (reason: unknown) => void;

		const promise = new Promise<void>((resolve, reject) => {
			_resolve = resolve;
			_reject = reject;
		});

		const loop = (index = 0) => {
			if (index >= this.nodeList.length) {
				_resolve();
				return;
			}

			const node = this.nodeList[index];
			const result = walker(node);
			if (result instanceof Promise) {
				result.then(() => loop(index + 1)).catch(_reject);
			} else {
				loop(index + 1);
			}
		};

		loop();

		return promise;
	}

	/**
	 *
	 * @param type
	 * @param walker
	 * @param skipWhenRuleIsDisabled
	 */
	walkOn(type: 'Element', walker: Walker<T, O, MLDOMElement<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Text', walker: Walker<T, O, MLDOMText<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Comment', walker: Walker<T, O, MLDOMComment<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(
		type: 'ElementCloseTag',
		walker: Walker<T, O, MLDOMElementCloseTag<T, O>>,
		skipWhenRuleIsDisabled?: boolean,
	): Promise<void>;
	walkOn(type: NodeType, walker: Walker<T, O, any>, skipWhenRuleIsDisabled: boolean = true): Promise<void> {
		return this.walk(node => {
			if (node instanceof MLDOMNode) {
				if (skipWhenRuleIsDisabled && node.rule.disabled) {
					return;
				}
				if (node.is(type)) {
					return walker(node);
				}
			}
		});
	}

	setRule(rule: MLRule<T, O> | null) {
		this.currentRule = rule;
	}

	matchNodes(query: string): MLDOMElement<T, O>[] {
		return this.nodeList.filter(
			(node: AnonymousNode<T, O>): node is MLDOMElement<T, O> => node.type === 'Element' && node.matches(query),
		);
	}

	toString() {
		const html: string[] = [];
		for (const node of this.nodeList) {
			html.push(node.raw);
		}
		return html.join('');
	}

	debugMap() {
		return nodeListToDebugMaps(this.nodeList, true);
	}

	private _init(ruleset: Ruleset) {
		docLog('Initialize');
		// add rules to node
		for (const node of this.nodeList) {
			docLog(
				'Add rules to node <%s%s>',
				node.type === 'ElementCloseTag' ? '/' : '',
				'nodeName' in node ? node.nodeName : `#${node.type}`,
			);
			// global rules
			for (const ruleName of Object.keys(ruleset.rules)) {
				const rule = ruleset.rules[ruleName];
				node.rules[ruleName] = {
					from: 'rules',
					index: -1,
					set: rule,
				};
			}

			if (node.type !== 'Element' && node.type !== 'ElementCloseTag') {
				continue;
			}

			const selectorTarget = node.type === 'Element' ? node : node.startTag;

			// node specs and special rules for node by selector
			ruleset.nodeRules.forEach((nodeRule, i) => {
				if (!nodeRule.rules) {
					return;
				}

				const selector = nodeRule.selector || nodeRule.tagName || nodeRule.regexSelector;
				if (!selector) {
					return;
				}

				const matched = matchSelector(selectorTarget, selector);

				if (!matched) {
					return;
				}

				docLog(
					'Matched nodeRule: <%s%s>(%s)',
					node.type === 'ElementCloseTag' ? '/' : '',
					node.nodeName,
					matched.__node || 'No Selector',
				);

				const ruleList = Object.keys(nodeRule.rules);

				// special rules
				for (const ruleName of ruleList) {
					const rule = nodeRule.rules[ruleName];
					const convertedRule = exchangeValueOnRule(rule, matched);
					if (convertedRule === undefined) {
						continue;
					}
					const globalRule = ruleset.rules[ruleName];
					const mergedRule = globalRule ? mergeRule(globalRule, convertedRule) : convertedRule;

					if (node.rules[ruleName] && node.rules[ruleName].index >= i) {
						continue;
					}

					ruleLog('↑ Rule (%s): %O', ruleName, mergedRule);

					node.rules[ruleName] = {
						from: 'nodeRules',
						index: i,
						set: mergedRule,
					};
				}
			});

			// overwrite rule to child node
			ruleset.childNodeRules.forEach((nodeRule, i) => {
				if (!nodeRule.rules) {
					return;
				}

				const selector = nodeRule.selector || nodeRule.tagName || nodeRule.regexSelector;
				if (!selector) {
					return;
				}

				const matched = matchSelector(selectorTarget, selector);
				if (!matched) {
					return;
				}

				docLog(
					'Matched childNodeRule: <%s%s>(%s), inheritance: %o',
					node.type === 'ElementCloseTag' ? '/' : '',
					node.nodeName,
					matched.__node || 'No Selector',
					!!nodeRule.inheritance,
				);

				const ruleList = Object.keys(nodeRule.rules);

				for (const ruleName of ruleList) {
					const rule = nodeRule.rules[ruleName];

					const convertedRule = exchangeValueOnRule(rule, matched);
					if (convertedRule === undefined) {
						continue;
					}
					const globalRule = ruleset.rules[ruleName];
					const mergedRule = globalRule ? mergeRule(globalRule, convertedRule) : convertedRule;

					const targetDescendants: AnonymousNode<T, O>[] = [];
					if (nodeRule.inheritance) {
						syncWalk(selectorTarget.childNodes, childNode => {
							if (childNode.rules[ruleName] && childNode.rules[ruleName].index >= i) {
								return;
							}
							targetDescendants.push(childNode);
						});
					} else {
						targetDescendants.push(
							...selectorTarget.childNodes.filter(
								childNode => childNode.rules[ruleName] && childNode.rules[ruleName].index < i,
							),
						);
					}

					if (targetDescendants.length <= 0) {
						return;
					}

					ruleLog('↑ Rule (%s): %O', ruleName, mergedRule);

					targetDescendants.forEach(descendant => {
						descendant.rules[ruleName] = {
							from: 'childNodeRules',
							index: i,
							set: mergedRule,
						};
					});
				}
			});
		}
	}
}
