import type { ARIA } from './aria.js';
import type { AttributeJSON, AttributeType, ConditionalAttributeType, GlobalAttributes } from './attributes.js';
import type { ContentModel, Category } from './permitted-structures.js';
import type { ariaVersions } from '../utils/aria-version.js';
import type { NamespaceURI } from '@markuplint/ml-ast';
import type { ReadonlyDeep } from 'type-fest';

/**
 * markuplint Markup-language spec
 */
export interface MLMLSpec {
	readonly cites: Cites;
	readonly def: SpecDefs;
	readonly specs: readonly ElementSpec[];
	readonly directivePatterns?: readonly DirectivePattern[];
	readonly acceptedAttrNames?: 'idl' | 'both';
}

/**
 * An element specification for extending or overriding parts of the base spec.
 * Only the `name` property is required; all other properties are optional partial overrides.
 * Attributes use `Partial<Attribute>` to allow specifying only changed fields.
 */
export type ExtendedElementSpec = Partial<Omit<ElementSpec, 'name' | 'attributes'>> & {
	readonly name: ElementSpec['name'];
	readonly attributes?: Readonly<Record<string, Partial<Attribute>>>;
};

/**
 * A partial specification used for extending or customizing the base markup language spec.
 * Typically provided by parser plugins or framework-specific spec packages (e.g., `@markuplint/vue-spec`).
 */
export type ExtendedSpec = {
	readonly cites?: Cites;
	readonly def?: Partial<SpecDefs>;
	readonly specs?: readonly ExtendedElementSpec[];
	readonly directivePatterns?: readonly DirectivePattern[];
	readonly acceptedAttrNames?: 'idl' | 'both';
};

/**
 * A declarative pattern for resolving framework-specific directive
 * attributes to their canonical names and metadata. Stored as part
 * of the spec, enabling "parser-less" framework support.
 *
 * The `pattern` is a regex string matched against the raw attribute name.
 * Capture groups can be referenced in `potentialName` using `$1`, `$2`, etc.
 */
export type DirectivePattern = {
	/**
	 * A regex string (without delimiters) matched against the raw attribute name.
	 * Must be a valid JavaScript RegExp pattern. Capture groups can be used
	 * for potentialName templates.
	 * @example "^(?:x-bind:|:)([^.]+)(?:\\.[^.]+)?$"
	 */
	readonly pattern: string;

	/**
	 * Optional regex flags (e.g., "i" for case-insensitive).
	 * @default "i"
	 */
	readonly flags?: string;

	/**
	 * Template for the resolved potentialName. References capture groups
	 * with $1, $2, etc. If omitted, the attribute is treated as a directive
	 * with no potentialName change.
	 * @example "on$1"  -- for `@click` -> `onclick`
	 * @example "$1"    -- for `:href` -> `href`
	 */
	readonly potentialName?: string;

	/**
	 * Whether this attribute is a framework directive.
	 */
	readonly isDirective?: true;

	/**
	 * Whether this attribute has a dynamic value.
	 */
	readonly isDynamicValue?: true;

	/**
	 * The semantic value type for matched attributes.
	 */
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';

	/**
	 * If true, the attribute can appear multiple times on the same element.
	 * Can also be a string array of potentialName values for which
	 * duplication is allowed (e.g., ['class', 'style']).
	 */
	readonly isDuplicatable?: true | readonly string[];
};

/**
 * Reference URLs
 */
export type Cites = readonly string[];

/**
 * Internal definition data within a markup language spec, containing global attributes,
 * ARIA role/property definitions for each version, and content model category mappings.
 */
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
	readonly dpubRoles: readonly ARIARoleInSchema[];
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

/**
 * Describes a single HTML/SVG attribute with its type, description, and status flags.
 */
export type Attribute = {
	readonly name: string;
	readonly type:
		| ReadonlyDeep<AttributeType>
		| readonly ReadonlyDeep<AttributeType>[]
		| readonly ReadonlyDeep<ConditionalAttributeType>[];
	readonly description?: string;
	readonly caseSensitive?: true;
	readonly experimental?: boolean;
	readonly obsolete?: true;
	readonly deprecated?: boolean;
	readonly nonStandard?: true;
} & ExtendableAttributeSpec;

type ExtendableAttributeSpec = Omit<ReadonlyDeep<AttributeJSON>, 'type'>;

/**
 * A fully resolved ARIA role with all its properties, requirements, and naming constraints.
 */
export type ARIARole = {
	readonly name: string;
	readonly isAbstract: boolean;
	readonly deprecated: boolean;
	/** Required Accessibility Parent Role (ARIA 1.3 name) */
	readonly requiredAccessibilityParentRole: readonly string[];
	/** Allowed Accessibility Child Roles (ARIA 1.3 name) */
	readonly allowedAccessibilityChildRoles: readonly string[];
	/**
	 * @deprecated Use {@link ARIARole.requiredAccessibilityParentRole} instead.
	 * Retained for ARIA 1.2 backward compatibility.
	 */
	readonly requiredContextRole: readonly string[];
	/**
	 * @deprecated Use {@link ARIARole.allowedAccessibilityChildRoles} instead.
	 * Retained for ARIA 1.2 backward compatibility.
	 */
	readonly requiredOwnedElements: readonly string[];
	readonly accessibleNameRequired: boolean;
	readonly accessibleNameFromAuthor: boolean;
	readonly accessibleNameFromContent: boolean;
	readonly accessibleNameProhibited: boolean;
	readonly childrenPresentational: boolean;
	readonly ownedProperties: readonly ARIARoleOwnedProperties[];
	readonly prohibitedProperties: readonly string[];
};

/**
 * An ARIA role as defined in the raw schema data. All properties are optional
 * except `name`, since the schema may provide only partial role information.
 */
export type ARIARoleInSchema = Partial<
	ARIARole & {
		readonly description: string;
		readonly generalization: readonly string[];
	}
> & {
	readonly name: string;
};

/**
 * Describes a property owned by an ARIA role, including whether it is inherited,
 * required, or deprecated.
 *
 * `requiredCondition` qualifies `required: true` so that the property is only
 * required when the condition holds. The W3C ARIA source markup does not encode
 * such conditions; values are populated by manual overrides in
 * `@markuplint/html-spec/generator/aria.ts`. Currently the only value is
 * `'focusable'` (applied to `separator`'s `aria-valuenow`); the `wai-aria`
 * checker resolves this through `mayBeFocusable` from `@markuplint/ml-spec`.
 */
export type ARIARoleOwnedProperties = {
	readonly name: string;
	readonly inherited?: true;
	readonly required?: true;
	readonly requiredCondition?: 'focusable';
	readonly deprecated?: true;
};

/**
 * Describes an ARIA property or state, including its value type, enumeration values,
 * global status, default value, conditional values per role, and equivalent HTML attributes.
 */
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

/**
 * The possible value types for ARIA attributes, as defined by the WAI-ARIA specification.
 */
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

/**
 * A union type of supported ARIA specification version strings, derived from the `ariaVersions` tuple.
 */
export type ARIAVersion = (typeof ariaVersions)[number];

/**
 * Describes an HTML attribute that is semantically equivalent to an ARIA property,
 * enabling automatic mapping from HTML attributes to ARIA states/properties.
 */
export type EquivalentHtmlAttr = {
	readonly htmlAttrName: string;
	readonly isNotStrictEquivalent?: true;
	readonly value: string | null;
};

/**
 * A function that tests whether an element matches a given CSS selector string.
 * Typically bound to `Element.prototype.matches`.
 */
export type Matches = (selector: string) => boolean;

/**
 * The result of computing an element's ARIA role, containing the element reference,
 * the resolved role specification (or null if no role applies), and an optional
 * error type indicating issues during role computation.
 */
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

/**
 * Error codes that may arise during ARIA role computation, indicating specific
 * issues such as abstract roles, invalid context, or presentational conflicts.
 */
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
