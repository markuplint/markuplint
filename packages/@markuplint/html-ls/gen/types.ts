/**
 * markuplit Markup-language spec
 */
export interface MLMLSpecJSON {
	$schema?: string;

	/**
	 * Reference URLs
	 */
	cites?: string[];
	def?: {
		'#globalAttrs'?: Attribute[];
		'#roles'?: ARIRRoleAttribute[];
		'#ariaAttrs'?: ARIAAttribute[];
	};
	specs: ElementSpec[];
}

/**
 * Element spec
 */
export type ElementSpec = {
	/**
	 * Tag name
	 */
	name: string;

	/**
	 * Reference URL
	 */
	cite: string;

	/**
	 * Description
	 */
	description?: string;

	/**
	 * If element is obsolete then defined alternate element name.
	 */
	obsolete?: {
		alt: string;
	};

	/**
	 * Element cateogries
	 */
	categories: ElementCategories;

	/**
	 * Permitted content model
	 */
	contentModel: {
		exists: 'required' | 'any';
		models: string[];
	}[];

	/**
	 * Tag omittion
	 */
	omittion: ElementSpecOmittion;

	/**
	 * Attributes
	 */
	attributes: (AttributeSpec | string)[];
};

export type ElementCategories = (
	| ElementCategory
	| {
			category: ElementCategory;
			condition: ElementCondition;
	  })[];

/**
 * Element Category
 *
 * @cite https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content
 */
export type ElementCategory =
	| 'transparent'
	| 'metadata'
	| 'flow'
	| 'sectioning'
	| 'heading'
	| 'phrasing'
	| 'embedded'
	| 'interactive'
	| 'palpable'
	| 'script-supporting';

export type ElementSpecOmittion = false | ElementSpecOmittionTags;

type ElementSpecOmittionTags = {
	startTag: boolean | ElementCondition;
	endTag: boolean | ElementCondition;
};

export type ElementCondition = {
	__WIP__: 'WORK_IN_PROGRESS';
};

export type Attribute = {
	name: string;
	description: string;
	category: AttributeCtegory;
	experimental?: true;
	obsolete?: true;
	value: AttributeValue;
};

export type AttributeSpec = Attribute & {
	required?: true;
};

export type AttributeCtegory = 'global' | 'xml' | 'aria' | 'eventhandler' | 'form' | 'particular';

export type AttributeValue = 'string' | 'space-separated-tokens' | 'function-body' | 'uint' | 'int' | 'float';

export type ARIRRoleAttribute = {
	name: string;
	description: string;
	isAbstract?: true;
	generalization: string[];
	ownedAttribute: string[];
};

export type ARIAAttribute = {
	name: string;
	type: 'property' | 'state';
	deprecated?: true;
	value: ARIAAttributeValue;
	defaultValue?: string;
};

export type ARIAAttributeValue =
	| 'true/false'
	| 'tristate'
	| 'true/false/undefined'
	| 'ID reference'
	| 'ID reference list'
	| 'integer'
	| 'number'
	| 'string'
	| 'token'
	| 'token list'
	| 'URI';
