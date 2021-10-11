import type { ContentModel, PermittedStructuresSchema } from './permitted-structres';
import type { AttributeType } from './attributes';

/**
 * markuplit Markup-language spec
 */
export interface MLMLSpec {
	cites: Cites;
	def: SpecDefs;
	specs: ElementSpec[];
}

type ExtendedElementSpec = Partial<ElementSpec> & { name: ElementSpec['name'] };

export type ExtendedSpec = {
	cites?: Cites;
	def?: Partial<SpecDefs>;
	specs?: ExtendedElementSpec[];
};

/**
 * Reference URLs
 */
export type Cites = string[];

export type SpecDefs = {
	'#globalAttrs': Attribute[];
	'#roles': ARIRRoleAttribute[];
	'#ariaAttrs': ARIAAttribute[];
	'#contentModels': { [model in ContentModel]?: string[] };
};

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
		roles: PermittedRoles;
		conditions?: {
			condition: string;
			roles: PermittedRoles;
		}[];
	};

	/**
	 * Implicit ARIA role
	 */
	implicitRole: {
		summary: string;
		role: ImplicitRole;
		conditions?: {
			condition: string;
			role: ImplicitRole;
		}[];
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

/**
 * If `false`, this mean is "No corresponding role".
 */
type ImplicitRole = string | false;

/**
 * If `true`, this mean is "Any".
 * If `false`, this mean is "No".
 */
export type PermittedRoles = string[] | boolean;

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
	caseSensitive?: true;
	experimental?: true;
	obsolete?: true;
	deprecated?: true;
	nonStandard?: true;
	required?: true | AttributeCondition;
	requiredEither?: string[];
	noUse?: boolean;
	condition?: AttributeCondition;
};

export type AttributeCondition = {
	ancestor?: string;
	self?: string | string[];
};

// type AttributeCtegory = 'global' | 'xml' | 'aria' | 'eventhandler' | 'form' | 'particular';

export type ARIRRoleAttribute = {
	name: string;
	description: string;
	isAbstract?: true;
	generalization: string[];
	requiredContextRole?: string[];
	accessibleNameRequired: boolean;
	accessibleNameFromContent: boolean;
	accessibleNameProhibited: boolean;
	ownedAttribute: ARIARoleOwnedPropOrState[];
	childrenPresentational?: boolean;
};

export type ARIARoleOwnedPropOrState = {
	name: string;
	inherited?: true;
	required?: true;
	deprecated?: true;
	prohibited?: true;
	defaultValue?: boolean | string | number;
};

export type ARIAAttribute = {
	name: string;
	type: 'property' | 'state';
	deprecated?: true;
	isGlobal?: true;
	value: ARIAAttributeValue;
	conditionalValue?: {
		role: string[];
		value: ARIAAttributeValue;
	}[];
	enum: string[];
	defaultValue?: string;
	equivalentHtmlAttrs?: EquivalentHtmlAttr[];
	valueDescriptions?: Record<string, string>;
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

export type EquivalentHtmlAttr = {
	htmlAttrName: string;
	isNotStrictEquivalent?: true;
	value: string | null;
};

export interface SpecOM {
	[tagName: string]: MLDOMElementSpec;
}

export interface MLDOMElementSpec {
	experimental: boolean;
	obsolete: boolean | string;
	deprecated: boolean;
	nonStandard: boolean;
	categories: ContentModel[];
	permittedStructures: PermittedStructuresSchema;
	attributes: Attribute[];
}
