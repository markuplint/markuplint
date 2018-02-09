import {
	AmbiguousNode,
	NodeType,
} from './';

import Node from './node';

import {
	ConfigureFileJSONRules,
} from '../ruleset/JSONInterface';

export default abstract class GhostNode<T = null, O = {}> {
	public readonly type: NodeType = null;
	public nodeName: string;
	public prevNode: AmbiguousNode<T, O> = null;
	public nextNode: AmbiguousNode<T, O> = null;
	public readonly parentNode: AmbiguousNode<T, O> = null;
	public raw = '';
	public rules: ConfigureFileJSONRules = {};

	constructor (nodeName: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>) {
		this.nodeName = nodeName;
		this.prevNode = prevNode;
		this.nextNode = nextNode;
		this.parentNode = parentNode;
	}

	public toString () {
		return this.raw;
	}
}
