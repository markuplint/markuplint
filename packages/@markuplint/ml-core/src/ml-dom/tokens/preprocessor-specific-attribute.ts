import type { MLASTPreprocessorSpecificAttr } from '@markuplint/ml-ast';
import MLDOMToken from './token';

export default class MLDOMPreprocessorSpecificAttribute extends MLDOMToken<MLASTPreprocessorSpecificAttr> {
	readonly attrType = 'ps-attr';
	readonly potentialName: string;
	readonly potentialValue: string;
	readonly valueType: 'string' | 'number' | 'boolean' | 'code';
	readonly isDuplicatable: boolean;

	constructor(astToken: MLASTPreprocessorSpecificAttr) {
		super(astToken);

		this.potentialName = astToken.potentialName;
		this.potentialValue = astToken.potentialValue;
		this.valueType = astToken.valueType;
		this.isDuplicatable = astToken.isDuplicatable;
	}

	getName() {
		return {
			line: this.startLine,
			col: this.startCol,
			potential: this.potentialName.toLowerCase(),
			raw: this.raw,
		};
	}

	getValue() {
		return {
			line: this.startLine,
			col: this.startCol,
			potential: this.potentialValue,
			raw: this.raw,
		};
	}

	toString() {
		return this.raw;
	}
}
