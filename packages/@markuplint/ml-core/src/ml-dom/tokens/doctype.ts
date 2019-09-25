import { MLASTDoctype, MLASTNode } from '@markuplint/ml-ast';
import { Document } from '..';
import { IMLDOMDoctype } from '../types';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMDoctype<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTNode>
	implements IMLDOMDoctype {
	public readonly type = 'Doctype';

	private _name: string;
	private _publicId: string;
	private _systemId: string;

	constructor(astNode: MLASTDoctype, document: Document<T, O>) {
		super(astNode, document);
		this._name = astNode.name;
		this._publicId = astNode.publicId;
		this._systemId = astNode.systemId;
	}

	get name() {
		return this._name;
	}

	get publicId() {
		return this._publicId;
	}

	get systemId() {
		return this._systemId;
	}
}
