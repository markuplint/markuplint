import type { ARIA } from './aria.js';
import type { AttributeJSON, AttributeType, ConditionalAttributeType, GlobalAttributes } from './attributes.js';
import type { ContentModel, Category } from './permitted-structures.js';
import type { ariaVersions } from '../utils/aria-version.js';
import type { ExpressionLanguage, LiteralValueDeclaration, NamespaceURI } from '@markuplint/ml-ast';
import type { ReadonlyDeep } from 'type-fest';

/**
 * markuplint Markup-language spec
 */
export interface MLMLSpec {
	readonly cites: Cites;
	readonly def: SpecDefs;
	readonly specs: readonly ElementSpec[];
	readonly directivePatterns?: readonly DirectivePattern[];
	/**
	 * Selectors of the elements that the framework moves to the `<head>` wherever they are written, so
	 * the content model of the element that contains them does not apply to them. An element in the
	 * `<head>` itself is not moved, and is judged as usual.
	 *
	 * React does so for `<title>`, `<meta>`, `<link>` and `<style>` under conditions the selectors
	 * express (`@markuplint/react-spec`):
	 *
	 * > React will always place the DOM element corresponding to the `<title>` component within the
	 * > document's `<head>`, regardless of where in the React tree it is rendered.
	 *
	 * @see https://react.dev/reference/react-dom/components/title#special-rendering-behavior
	 */
	readonly movedToHead?: readonly string[];
	/**
	 * Controls how `@markuplint/ml-core`'s `MLAttr` resolves attribute names.
	 *
	 * - `'idl'`: enables IDL-to-content attribute name resolution (e.g.
	 *   `className` → `class`) and suggests the IDL name as a candidate when the
	 *   content attribute name is used (e.g. `tabindex` → "Did you mean
	 *   `tabIndex`?"). Used by React, which accepts only IDL property names.
	 * - `'both'`: enables the same resolution but accepts both content attribute
	 *   names and IDL property names without suggesting either. Used by Svelte.
	 */
	readonly acceptedAttrNames?: 'idl' | 'both';
	/**
	 * Where the browser holds the children of a `template` element that the author wrote without
	 * a directive of the framework.
	 *
	 * - `'separate-tree'` (the default, as the HTML parser does it): in the `content` of the element, a
	 *   `DocumentFragment` that is a tree of its own. An id in it is unique in that tree only, and an
	 *   id reference in it is resolved in that tree only. A declarative shadow root (`shadowrootmode`)
	 *   may be attached to the parent element.
	 * - `'in-place'`: in the element itself, in the tree of the document. The framework creates the
	 *   element and appends the children to it through the DOM API, which never fills `content` and
	 *   never attaches a declarative shadow root: the `template` element is an ordinary element.
	 *
	 * Known limitations of `'in-place'`: React does not render the same tree when it hydrates server
	 * output (the server output has the children in `content`), and Vue puts them in `content` when
	 * it renders static markup as a string and replaces the element with its content when it hydrates.
	 */
	readonly templateContent?: 'separate-tree' | 'in-place';
	/**
	 * How the framework renders a literal in an attribute value that is written as code, where it
	 * differs from the default of `@markuplint/ml-core`: by kind of attribute, and by attribute name
	 * in `attrs`, in the form that a parser declares as well (see {@link LiteralValueDeclaration}).
	 * What differs on a custom element is in `customElements`.
	 */
	readonly literalValues?: LiteralValueDeclaration;
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
	/**
	 * See {@link MLMLSpec.movedToHead}. Concatenated across merged specs, in the order of the specs.
	 */
	readonly movedToHead?: readonly string[];
	/**
	 * See {@link MLMLSpec.acceptedAttrNames}. Last-write-wins across merged
	 * specs; omitting the property does not reset a previously set value.
	 */
	readonly acceptedAttrNames?: 'idl' | 'both';
	/**
	 * See {@link MLMLSpec.templateContent}. Last-write-wins across merged specs; omitting the
	 * property does not reset a previously set value.
	 */
	readonly templateContent?: 'separate-tree' | 'in-place';
	/**
	 * See {@link MLMLSpec.literalValues}. Merged by kind of attribute, by attribute name and by key,
	 * and the later spec wins on a key that two specs have.
	 */
	readonly literalValues?: LiteralValueDeclaration;
};

/**
 * A declarative pattern for resolving framework-specific directive
 * attributes to their canonical names and metadata. Stored as part
 * of the spec, enabling "parser-less" framework support.
 *
 * The `pattern` is a regex string matched against the raw attribute name.
 * Capture groups can be referenced in `potentialName` using `$1`, `$2`, etc.
 *
 * Patterns are evaluated in order and the first match wins. Merging specs
 * (`schemaToSpec`) concatenates pattern arrays, so spec authors should define
 * patterns from most specific to most general.
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
	 * Whether the value of this attribute is written as code (a binding). It is the source of
	 * `MLAttr#isExpressionValue`; whether the value is known is up to `MLAttr#isDynamicValue`, which
	 * reads the code.
	 */
	readonly isDynamicValue?: true;

	/**
	 * The language of the code that the value is written in. A value that is nothing but a literal is
	 * rendered as the framework renders it (see {@link MLMLSpec.literalValues}), which needs the
	 * attribute to be the one the pattern names (`potentialName`) and the value to be what the attribute
	 * becomes, not a condition or a binding target. A pattern without it is not read as a literal.
	 */
	readonly expressionLanguage?: ExpressionLanguage;

	/**
	 * The semantic value type for matched attributes.
	 */
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';

	/**
	 * If true, the attribute is not a repeat of an attribute of the same name (`:class` beside `class`,
	 * which Vue merges). Can also be a string array of potentialName values for which this holds
	 * (e.g., ['class', 'style']).
	 *
	 * It is not whether the attribute may be written twice: that is told by {@link DirectivePattern.duplicateKey}
	 * (without it, the same spelling of a name that is not `true` is a repeat, and `true` is never one).
	 */
	readonly isDuplicatable?: true | readonly string[];

	/**
	 * The key under which the framework counts this directive as written twice, as a template that takes the
	 * captures of `pattern` (`$1`, `$2`, …) as they are spelled. Two attributes of an element with the same key
	 * are a repeat, whatever name the directive resolves to (`potentialName`): a framework tells a repeat by
	 * what it keeps of the name, and a directive is not an attribute of the DOM.
	 *
	 * Without it, a pattern is keyed by the name as it is written (how a framework that rejects only the
	 * same spelling of a directive tells a repeat), except a pattern with `isDuplicatable: true`, which is
	 * never a repeat (a framework that takes any number of the same directive).
	 *
	 * @example "$1" -- the key of `:view-box.camel` is its argument, `view-box` (with `duplicateKeyModifiers`, `viewBox`)
	 */
	readonly duplicateKey?: string;

	/**
	 * Modifiers of the directive that change {@link DirectivePattern.duplicateKey}: the modifiers are those
	 * written after the name, and a framework gives two spellings of a name that differ in them the same key
	 * (the order of them, a modifier that it does not know) or a different one (a modifier that changes the
	 * name that is bound). Only the modifiers listed here count, and a modifier is matched as it is spelled.
	 */
	readonly duplicateKeyModifiers?: {
		/**
		 * The capture group of `pattern` that holds the modifiers, joined with `.` and starting with it (`.prop.camel`).
		 */
		readonly group: number;

		/**
		 * The modifiers that turn the template into camelCase before the prefixes are put in front of it.
		 */
		readonly camelize?: readonly string[];

		/**
		 * The prefix that a modifier puts in front of the key. They are put in the order listed, so that
		 * the first of the listed modifiers that is written is the outermost.
		 */
		readonly prefixes?: readonly { readonly modifier: string; readonly prefix: string }[];

		/**
		 * When no prefix is put in front of the key, it is the name of an attribute (`:id.foo` binds `id`), so
		 * the element folds its case as it does for any attribute and it is a repeat of that attribute
		 * written as such (`:id`). A key with a prefix is a property or a namespaced name, which
		 * keeps its case (`.id` and `.ID` are two).
		 */
		readonly foldedWithoutPrefix?: true;
	};
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
	 * Experimental technology: not yet standardized (proposed or draft;
	 * subject to change or removal).
	 */
	readonly experimental?: true;

	/**
	 * Obsolete or alternative elements: removed from the spec entirely
	 * (browsers may no longer recognize it). Optionally points to an
	 * alternative element via `alt`.
	 */
	readonly obsolete?:
		| true
		| {
				readonly alt: string;
		  };

	/**
	 * Deprecated: still defined by the spec but its use is discouraged
	 * (usually still works in browsers).
	 */
	readonly deprecated?: true;

	/**
	 * Non-standard: never part of any standard (vendor-specific or
	 * proprietary).
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
	// Status flags share the semantics documented on `ElementSpec` above:
	// experimental = not yet standardized; obsolete = removed from the spec;
	// deprecated = discouraged but still defined; nonStandard = never standard.
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
 *
 * An error type does not mean the role was dropped: with `NO_PERMITTED` (a role
 * ARIA in HTML does not permit on the element) the `role` is the one the author
 * specified, as user agents still expose it.
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
