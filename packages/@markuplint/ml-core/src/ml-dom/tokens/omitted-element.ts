import type { Document } from '../';
import type { IMLDOMOmittedElement } from '../types';
import type { MLASTOmittedElement } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import MLDOMAbstractElement from './abstract-element';

export default class MLDOMOmittedElement<T extends RuleConfigValue, O = null>
	extends MLDOMAbstractElement<T, O, MLASTOmittedElement>
	implements IMLDOMOmittedElement
{
	readonly type = 'OmittedElement';
	obsolete = false;

	constructor(astNode: MLASTOmittedElement, document: Document<T, O>) {
		super(astNode, document);
	}
}
