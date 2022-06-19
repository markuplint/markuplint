import type { ARIA } from './aria';
import type { AttributeJSON, AttributeType, GlobalAttributes } from './attributes';
import type { ContentModel, Category } from './permitted-structres';
import type { NamespaceURI } from '@markuplint/ml-ast';

/**
 * markuplit Markup-language spec
 */
export interface MLMLSpec {
	cites: Cites;
	def: SpecDefs;
	specs: ElementSpec[];
}

export type ExtendedElementSpec = Partial<Omit<ElementSpec, 'name' | 'attributes'>> & {
	name: ElementSpec['name'];
	attributes?: Record<string, Partial<Attribute>>;
};

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
	'#globalAttrs': Partial<{
		'#extends': Record<string, Partial<Attribute>>;
		'#HTMLGlobalAttrs': Record<string, Partial<Attribute>>;
		[OtherGlobalAttrs: string]: Record<string, Partial<Attribute>>;
	}>;
	'#ariaAttrs': ARIAAttribute[];
	'#roles': ARIRRoleAttribute[];
	'#contentModels': { [model in Category]?: string[] };
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
	 * Namespaces in XML
	 * @see https://www.w3.org/TR/xml-names/
	 */
	namespace?: NamespaceURI;

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
	categories: Category[];

	/**
	 * Permitted contents and permitted parents
	 */
	contentModel: ContentModel;

	/**
	 * Tag omittion
	 */
	omittion: ElementSpecOmittion;

	/**
	 * Global Attributes
	 */
	globalAttrs: GlobalAttributes;

	/**
	 * Attributes
	 */
	attributes: Record<string, Attribute>;

	/**
	 * WAI-ARIA role and properies
	 */
	aria: ARIA;

	/**
	 * If true, it is possible to add any properties as attributes,
	 * for example, when using a template engine or a view language.
	 *
	 * @see https://v2.vuejs.org/v2/guide/components-slots.html#Scoped-Slots
	 *
	 * **It assumes to specify it on the parser plugin.**
	 */
	possibleToAddProperties?: true;
};

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
	type: AttributeType | AttributeType[];
	description?: string;
	caseSensitive?: true;
	experimental?: boolean;
	obsolete?: true;
	deprecated?: boolean;
	nonStandard?: true;
} & ExtendableAttributeSpec;

type ExtendableAttributeSpec = Omit<AttributeJSON, 'type'>;

export type ARIRRoleAttribute = {
	name: string;
	description: string;
	isAbstract?: true;
	generalization: string[];
	requiredContextRole?: string[];
	accessibleNameRequired: boolean;
	accessibleNameFromContent: boolean;
	accessibleNameProhibited: boolean;
	childrenPresentational?: boolean;
	ownedProperties: ARIARoleOwnedProperties[];
};

export type ARIARoleOwnedProperties = {
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

export type ARIAVersion = '1.1' | '1.2';

export type EquivalentHtmlAttr = {
	htmlAttrName: string;
	isNotStrictEquivalent?: true;
	value: string | null;
};

export type Matches = (selector: string) => boolean;
