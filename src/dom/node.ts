import {
	AmbiguousNode,
	Indentation,
	NodeType,
} from './';

import Document from './document';
import GhostNode from './ghost-node';
import Token from './token';

import {
	RuleConfig,
} from '../rule';

import {
	ConfigureFileJSONRules,
} from '../ruleset/JSONInterface';

export default abstract class Node<T = null, O = {}> extends Token {
	public readonly type: NodeType = 'Node';
	public nodeName: string;
	public prevNode: AmbiguousNode<T, O> = null;
	public nextNode: AmbiguousNode<T, O> = null;
	public readonly parentNode: AmbiguousNode<T, O> = null;
	public prevSyntaxicalNode: Node<T, O> | null = null;
	public indentation: Indentation | null = null;
	public rules: ConfigureFileJSONRules = {};
	public document: Document<T, O> | null = null;

	/**
	 * @WIP
	 */
	public depth = 0;

	constructor (nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>) {
		super(raw, line, col, startOffset);
		this.nodeName = nodeName;
		this.prevNode = prevNode;
		this.nextNode = nextNode;
		this.parentNode = parentNode;
	}

	public toString () {
		return this.raw;
	}

	public toJSON () {
		return {
			nodeName: this.nodeName,
			line: this.location.line || null,
			col: this.location.col || null,
		};
	}

	public is (type: NodeType) {
		return this.type === type;
	}

	public get rule () {
		if (!this.document) {
			return null;
		}
		if (!this.document.rule) {
			return null;
		}
		const name = this.document.rule.name;
		// @ts-ignore
		const rule: ConfigureFileJSONRuleOption<T, O> = this.rules[name];
		if (rule == null) {
			return null;
		}
		return this.document.rule.optimizeOption(rule);
	}
}
