import { AnonymousNode, NodeType } from './types';
import { ContentModel, SpecOM } from '@markuplint/ml-spec';
import { MLASTDocument, MLASTNode, MLASTNodeType } from '@markuplint/ml-ast';
import { MLDOMComment, MLDOMDoctype, MLDOMElement, MLDOMElementCloseTag, MLDOMNode, MLDOMText } from './tokens';
import { Walker, syncWalk } from './helper/walkers';
import { createNode, getNode } from './helper';
import HTMLLS from '@markuplint/html-ls';
import { MLRule } from '../';
import { RuleConfigValue } from '@markuplint/ml-config';
import Ruleset from '../ruleset';

const models: { name: ContentModel; contents: string[] }[] = Object.keys(HTMLLS.def['#contentModels']).map(model => ({
	name: model as ContentModel,
	contents: HTMLLS.def['#contentModels'][model],
}));

/**
 * markuplint DOM Document
 */
export default class MLDOMDocument<T extends RuleConfigValue, O = null> {
	/**
	 * An array of markuplint DOM nodes
	 */
	public nodeList: ReadonlyArray<AnonymousNode<T, O>>;

	/**
	 * Specs
	 */
	public specs: SpecOM;

	/**
	 *
	 */
	public currentRule: MLRule<T, O> | null = null;

	/**
	 *
	 */
	public isFragment: boolean;

	/**
	 *
	 * @param ast node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(ast: MLASTDocument, specs: SpecOM, ruleset: Ruleset) {
		// console.log(ast.nodeList.map((n, i) => `${i}: ${n.uuid} "${n.raw.trim()}"(${n.type})`));
		this.nodeList = Object.freeze(
			ast.nodeList.map(astNode => {
				if (astNode.type === MLASTNodeType.EndTag) {
					return getNode(astNode);
				}
				return createNode<MLASTNode, T, O>(astNode, this);
			}),
		);
		this.specs = specs;
		this.isFragment = ast.isFragment;

		// add rules to node
		for (const node of this.nodeList) {
			// global rules
			for (const ruleName of Object.keys(ruleset.rules)) {
				const rule = ruleset.rules[ruleName];
				node.rules[ruleName] = rule;
			}

			if (!(node instanceof MLDOMElement)) {
				continue;
			}

			// node specs and special rules for node by selector
			for (const nodeRule of ruleset.nodeRules) {
				const selector = nodeRule.selector || nodeRule.tagName;
				if (!selector) {
					continue;
				}

				const matched = node.matches(selector);

				if (!matched) {
					continue;
				}

				if (!nodeRule.rules) {
					continue;
				}

				// special rules
				for (const ruleName of Object.keys(nodeRule.rules)) {
					const rule = nodeRule.rules[ruleName];
					if (rule) {
						node.rules[ruleName] = rule;
					}
				}
			}
		}

		// overwrite rule to child node
		for (const nodeRule of ruleset.childNodeRules) {
			if (!nodeRule.rules || !nodeRule.selector) {
				return;
			}
			for (const ruleName of Object.keys(nodeRule.rules)) {
				const rule = nodeRule.rules[ruleName];
				for (const node of this.nodeList) {
					if (!(node instanceof MLDOMElement)) {
						continue;
					}
					if (node.matches(nodeRule.selector)) {
						if (nodeRule.inheritance) {
							syncWalk(node.childNodes, childNode => {
								childNode.rules[ruleName] = rule;
							});
						} else {
							for (const childNode of node.childNodes) {
								childNode.rules[ruleName] = rule;
							}
						}
					}
				}
			}
		}

		for (const node of this.tree) {
			recursiveResolveCategories(node);
		}
	}

	public get doctype() {
		for (const node of this.nodeList) {
			if (node instanceof MLDOMDoctype) {
				return node;
			}
		}
		return null;
	}

	public get tree() {
		const treeRoots: AnonymousNode<T, O>[] = [];
		let traversalNode: AnonymousNode<T, O> | null = this.nodeList[0];
		while (traversalNode) {
			treeRoots.push(traversalNode);
			traversalNode = traversalNode.nextNode;
		}
		return treeRoots;
	}

	public async walk(walker: Walker<T, O>) {
		for (const node of this.nodeList) {
			await walker(node);
		}
	}

	public async walkOn(type: 'Element', walker: Walker<T, O, MLDOMElement<T, O>>): Promise<void>;
	public async walkOn(type: 'Text', walker: Walker<T, O, MLDOMText<T, O>>): Promise<void>;
	public async walkOn(type: 'Comment', walker: Walker<T, O, MLDOMComment<T, O>>): Promise<void>;
	public async walkOn(type: 'ElementCloseTag', walker: Walker<T, O, MLDOMElementCloseTag<T, O>>): Promise<void>;
	public async walkOn(type: NodeType, walker: Walker<T, O, any>): Promise<void> {
		for (const node of this.nodeList) {
			if (node instanceof MLDOMNode) {
				if (node.is(type)) {
					await walker(node);
				}
			}
		}
	}

	public setRule(rule: MLRule<T, O> | null) {
		this.currentRule = rule;
	}

	public toString() {
		const html: string[] = [];
		for (const node of this.nodeList) {
			html.push(node.raw);
		}
		return html.join('');
	}
}

function getCategories<T extends RuleConfigValue, O = null>(node: AnonymousNode<T, O>) {
	const categories: ContentModel[] = [];
	switch (node.type) {
		case 'Text': {
			for (const model of models) {
				if (model.contents.includes('#text')) {
					categories.push(model.name);
				}
			}
			break;
		}
		case 'Element': {
			for (const model of models) {
				for (const selector of model.contents) {
					if (/@/.test(selector)) {
						// TODO:
						continue;
					}
					if (node.matches(selector)) {
						categories.push(model.name);
					}
				}
			}
			break;
		}
	}
	return categories;
}

function resolveCategories<T extends RuleConfigValue, O = null>(node: AnonymousNode<T, O>) {
	switch (node.type) {
		case 'Text': {
			const ownCategories = getCategories(node);
			ownCategories.forEach(model => node.ownModels.add(model));
			break;
		}
		case 'Element': {
			/**
			 * @see https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
			 * @revision 2019-10-21
			 *
			 * > Most elements that are categorized as phrasing content can only contain elements that are themselves categorized as phrasing content, not any flow content.
			 */
			let isPhrasingContent = true;
			const childModels = node.childNodes.map(getCategories);
			for (const models of childModels) {
				if (!models.includes('#phrasing')) {
					isPhrasingContent = false;
					break;
				}
			}
			const childCategories = childModels.flat();
			const ownCategories = getCategories(node);
			ownCategories.forEach(model => node.ownModels.add(model));
			childCategories.forEach(model => node.childModels.add(model));
			if (!isPhrasingContent) {
				node.ownModels.delete('#phrasing');
			}
			break;
		}
	}
}

function recursiveResolveCategories<T extends RuleConfigValue, O = null>(node: AnonymousNode<T, O>) {
	if (node.type === 'Element') {
		for (const child of node.childNodes) {
			recursiveResolveCategories(child);
		}
	}
	resolveCategories(node);
	if (node.type === 'Element') {
		for (const child of node.childNodes) {
			if (child.type === 'Element') {
				child.descendantModels.forEach(model => node.descendantModels.add(model));
				child.childModels.forEach(model => node.descendantModels.add(model));
			}
		}
	}
}

// function resolveCategories<T extends RuleConfigValue, O = null>(nodeList: AnonymousNode<T, O>[]) {
// 	return nodeList.map(node => getCategories(node));
// }
