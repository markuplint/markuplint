import type { ARIA } from './aria.js';
import type { AttributeJSON, AttributeType, GlobalAttributes } from './attributes.js';
import type { ContentModel, Category } from './permitted-structures.js';
import type { ariaVersions } from '../constant/aria-version.js';
import type { NamespaceURI } from '@markuplint/ml-ast';
import type { ReadonlyDeep } from 'type-fest';

/**
 * markuplint Markup-language spec
 */
export interface MLMLSpec {
	readonly cites: Cites;
	readonly def: SpecDefs;
	readonly specs: readonly ElementSpec[];
}

export type ExtendedElementSpec = Partial<Omit<ElementSpec, 'name' | 'attributes'>> & {
	readonly name: ElementSpec['name'];
	readonly attributes?: Readonly<Record<string, Partial<Attribute>>>;
};

export type ExtendedSpec = {
	readonly cites?: Cites;
	readonly def?: Partial<SpecDefs>;
	readonly specs?: readonly ExtendedElementSpec[];
};

/**
 * Reference URLs
 */
export type Cites = readonly string[];

export type SpecDefs = {
	readonly '#globalAttrs': {
		readonly [category: string]: Readonly<Record<string, Partial<Attribute>>>;
	};
	readonly '#aria': {
		readonly '1.3': ARIASpec;
		readonly '1.2': ARIASpec;
		readonly '1.1': ARIASpec;
	};
	readonly '#contentModels': {
		readonly [model in Category]?: readonly string[];
	};
};

type ARIASpec = {
	readonly roles: readonly ARIARoleInSchema[];
	readonly graphicsRoles: readonly ARIARoleInSchema[];
	readonly props: readonly ARIAProperty[];
};

/**
 * Element spec
 */
export type ElementSpec = {
	/**
	 * Tag name
	 */
	readonly name: string;

	/**
	 * Namespaces in XML
	 * @see https://www.w3.org/TR/xml-names/
	 */
	readonly namespace?: NamespaceURI;

	/**
	 * Reference URL
	 */
	readonly cite: string;

	/**
	 * Description
	 */
	readonly description?: string;

	/**
	 * Experimental technology
	 */
	readonly experimental?: true;

	/**
	 * Obsolete or alternative elements
	 */
	readonly obsolete?:
		| true
		| {
				readonly alt: string;
		  };

	/**
	 * Deprecated
	 */
	readonly deprecated?: true;

	/**
	 * Non-standard
	 */
	readonly nonStandard?: true;

	/**
	 * Element categories
	 */
	readonly categories: readonly Category[];

	/**
	 * Permitted contents and permitted parents
	 */
	readonly contentModel: ReadonlyDeep<ContentModel>;

	/**
	 * Tag omission
	 */
	readonly omission: ElementSpecOmission;

	/**
	 * Global Attributes
	 */
	readonly globalAttrs: ReadonlyDeep<GlobalAttributes>;

	/**
	 * Attributes
	 */
	readonly attributes: Readonly<Record<string, Attribute>>;

	/**
	 * WAI-ARIA role and properties
	 */
	readonly aria: ReadonlyDeep<ARIA>;

	/**
	 * If true, it is possible to add any properties as attributes,
	 * for example, when using a template engine or a view language.
	 *
	 * @see https://v2.vuejs.org/v2/guide/components-slots.html#Scoped-Slots
	 *
	 * **It assumes to specify it on the parser plugin.**
	 */
	readonly possibleToAddProperties?: true;
};

type ElementSpecOmission = false | ElementSpecOmissionTags;

type ElementSpecOmissionTags = {
	readonly startTag: boolean | ElementCondition;
	readonly endTag: boolean | ElementCondition;
};

type ElementCondition = {
	readonly __WIP__: 'WORK_IN_PROGRESS';
};

export type Attribute = {
	readonly name: string;
	readonly type: ReadonlyDeep<AttributeType> | readonly ReadonlyDeep<AttributeType>[];
	readonly description?: string;
	readonly caseSensitive?: true;
	readonly experimental?: boolean;
	readonly obsolete?: true;
	readonly deprecated?: boolean;
	readonly nonStandard?: true;
} & ExtendableAttributeSpec;

type ExtendableAttributeSpec = Omit<ReadonlyDeep<AttributeJSON>, 'type'>;

export type ARIARole = {
	readonly name: string;
	readonly isAbstract: boolean;
	readonly deprecated: boolean;
	readonly requiredContextRole: readonly string[];
	readonly requiredOwnedElements: readonly string[];
	readonly accessibleNameRequired: boolean;
	readonly accessibleNameFromAuthor: boolean;
	readonly accessibleNameFromContent: boolean;
	readonly accessibleNameProhibited: boolean;
	readonly childrenPresentational: boolean;
	readonly ownedProperties: readonly ARIARoleOwnedProperties[];
	readonly prohibitedProperties: readonly string[];
};

export type ARIARoleInSchema = Partial<
	ARIARole & {
		readonly description: string;
		readonly generalization: readonly string[];
	}
> & {
	readonly name: string;
};

export type ARIARoleOwnedProperties = {
	readonly name: string;
	readonly inherited?: true;
	readonly required?: true;
	readonly deprecated?: true;
};

export type ARIAProperty = {
	readonly name: string;
	readonly type: 'property' | 'state';
	readonly deprecated?: true;
	readonly isGlobal?: true;
	readonly value: ARIAAttributeValue;
	readonly conditionalValue?: readonly {
		readonly role: readonly string[];
		readonly value: ARIAAttributeValue;
	}[];
	readonly enum: readonly string[];
	readonly defaultValue?: string;
	readonly equivalentHtmlAttrs?: readonly EquivalentHtmlAttr[];
	readonly valueDescriptions?: Readonly<Record<string, string>>;
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

export type ARIAVersion = (typeof ariaVersions)[number];

export type EquivalentHtmlAttr = {
	readonly htmlAttrName: string;
	readonly isNotStrictEquivalent?: true;
	readonly value: string | null;
};

export type Matches = (selector: string) => boolean;

export type ComputedRole = {
	readonly el: Element;
	readonly role:
		| (ARIARole & {
				readonly superClassRoles: readonly ARIARoleInSchema[];
				readonly isImplicit?: boolean;
		  })
		| null;
	readonly errorType?: RoleComputationError;
};

export type RoleComputationError =
	| 'ABSTRACT'
	| 'GLOBAL_PROP_MUST_NOT_BE_PRESENTATIONAL'
	| 'IMPLICIT_ROLE_NAMESPACE_ERROR'
	| 'INTERACTIVE_ELEMENT_MUST_NOT_BE_PRESENTATIONAL'
	| 'INVALID_LANDMARK'
	| 'INVALID_REQUIRED_CONTEXT_ROLE'
	| 'NO_EXPLICIT'
	| 'NO_OWNER'
	| 'NO_PERMITTED'
	| 'REQUIRED_OWNED_ELEMENT_MUST_NOT_BE_PRESENTATIONAL'
	| 'ROLE_NO_EXISTS';
