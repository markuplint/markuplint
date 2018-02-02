import {
	AmbiguousNode,
	Indentation,
	NodeType,
	NuLocation,
} from '../dom';

import Document from './document';
import GhostNode from './ghost-node';

import {
	RuleConfig,
} from '../rule';

import {
	ConfigureFileJSONRules,
} from '../ruleset/JSONInterface';

export default abstract class Node<T = null, O = {}> {
	public readonly type: NodeType = 'Node';
	public nodeName: string;
	public readonly line: number;
	public readonly col: number;
	public endLine: number;
	public endCol: number;
	public readonly startOffset: number;
	public endOffset: number;
	public prevNode: AmbiguousNode<T, O> = null;
	public nextNode: AmbiguousNode<T, O> = null;
	public readonly parentNode: AmbiguousNode<T, O> = null;
	public raw = '';
	public prevSyntaxicalNode: Node<T, O> | null = null;
	public indentation: Indentation | null = null;
	public rules: ConfigureFileJSONRules = {};
	public document: Document<T, O> | null = null;

	/**
	 * @WIP
	 */
	public depth = 0;

	constructor (nodeName: string, location: NuLocation, raw: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>) {
		this.nodeName = nodeName;
		this.line = location.line;
		this.col = location.col;
		this.endLine = location.endLine;
		this.endCol = location.endCol;
		this.startOffset = location.startOffset;
		this.endOffset = location.endOffset;
		this.raw = raw;
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
			line: this.line || null,
			col: this.col || null,
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
