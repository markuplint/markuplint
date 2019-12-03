import { ContentModel, PermittedStructuresSchema } from './permitted-structres';

/**
 * markuplit Markup-language spec
 */
export interface MLMLSpec {
	$schema?: string;

	/**
	 * Reference URLs
	 */
	cites?: string[];
	def?: {
		'#globalAttrs'?: Attribute[];
		'#roles'?: ARIRRoleAttribute[];
		'#ariaAttrs'?: ARIAAttribute[];
		'#contentModels'?: { [model in ContentModel]?: string[] };
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
	 * Experimental technology
	 */
	experimental?: true;

	/**
	 * Obsolete or alternative elements
	 */
	obsolete?:
		| true
		| {
				alt: string;
		  };

	/**
	 * Deprecated
	 */
	deprecated?: true;

	/**
	 * Non-standard
	 */
	nonStandard?: true;

	/**
	 * Element cateogries
	 */
	categories: ContentModel[];

	/**
	 * Permitted contents and permitted parents
	 */
	permittedStructures: PermittedStructuresSchema;

	/**
	 * Permitted ARIA roles
	 */
	permittedRoles: {
		summary: string;
		roles: PermittedRolesSpec;
	};

	/**
	 * Tag omittion
	 */
	omittion: ElementSpecOmittion;

	/**
	 * Attributes
	 */
	attributes: (Attribute | string)[];
};

type PermittedRolesSpec = {};

type ElementSpecOmittion = false | ElementSpecOmittionTags;

type ElementSpecOmittionTags = {
	startTag: boolean | ElementCondition;
	endTag: boolean | ElementCondition;
};

type ElementCondition = {
	__WIP__: 'WORK_IN_PROGRESS';
};

export type Attribute = {
	name: string;
	type: AttributeType;
	description: string;
	experimental?: true;
	obsolete?: true;
	deprecated?: true;
	nonStandard?: true;
	required?: true;
	enum?: string[];
	condition?: {
		ancestor: string;
	};
};

// type AttributeCtegory = 'global' | 'xml' | 'aria' | 'eventhandler' | 'form' | 'particular';

export type AttributeType = 'string' | 'space-separated-tokens' | 'function-body' | 'uint' | 'int' | 'float';

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
