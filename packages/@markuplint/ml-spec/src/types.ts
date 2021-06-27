import { ContentModel, PermittedStructuresSchema } from './permitted-structures';

/**
 * markuplint Markup-language spec
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
	enum?: string[];
	noUse?: boolean;
	condition?: AttributeCondition;
};

export type AttributeCondition = {
	ancestor?: string;
	self?: string | string[];
};

// type AttributeCtegory = 'global' | 'xml' | 'aria' | 'eventhandler' | 'form' | 'particular';

export type AttributeType =
	| 'String'
	| 'NonEmptyString'
	| 'Boolean'
	| 'Function' // JavaScript function body
	| 'Date'
	| 'Int' // Integer
	| 'Uint' // Non-negative integer
	| 'Float' // Floating-point number
	| 'NonZeroUint' // Non-negative integer greater than zero
	| 'AcceptList' // https://html.spec.whatwg.org/multipage/input.html#attr-input-accept
	| 'AutoComplete' // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens
	| 'BCP47' // https://tools.ietf.org/html/bcp47
	| 'Color' // https://drafts.csswg.org/css-color/#typedef-color
	| 'ColSpan' // https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-colspan
	| 'Coords' // https://html.spec.whatwg.org/multipage/image-maps.html#attr-area-coords
	| 'DateTime' // https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value
	| 'Destination' // https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as
	| 'DOMID'
	| 'DOMIDList'
	| 'ItemType' // https://html.spec.whatwg.org/multipage/microdata.html#attr-itemtype
	| 'LinkSizes' // https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes
	| 'LinkType' // https://html.spec.whatwg.org/multipage/links.html#linkTypes
	| 'LinkTypeList' // https://html.spec.whatwg.org/multipage/links.html#linkTypes
	| 'MediaQuery' // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-media-query-list
	| 'MediaQueryList' // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-media-query-list
	| 'MIMEType' // https://mimesniff.spec.whatwg.org/#valid-mime-type
	| 'ReferrerPolicy' // https://html.spec.whatwg.org/multipage/urls-and-fetching.html#referrer-policy-attributes
	| 'RowSpan' // https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-rowspan
	| 'SourceSizeList' // https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
	| 'SrcSet' // https://html.spec.whatwg.org/multipage/images.html#srcset-attribute
	| 'TabIndex' // https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex
	| 'Target' // https://html.spec.whatwg.org/multipage/links.html#attr-hyperlink-target
	| 'URL' // https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
	| 'URLHash' // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference
	| 'URLList'; // https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces

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
	enum: string[];
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
