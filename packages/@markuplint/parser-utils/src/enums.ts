/**
 * States of the tag-level state machine used during tokenization.
 * Transitions drive the parser through detecting the opening bracket,
 * tag name, attributes, and closing bracket of an HTML/XML tag.
 */
export enum TagState {
	BeforeOpenTag,
	FirstCharOfTagName,
	TagName,
	Attrs,
	AfterAttrs,
	AfterOpenTag,
}

/**
 * States of the attribute-level state machine used during attribute tokenization.
 * Transitions drive the parser through the attribute name, equals sign,
 * and value portions of an HTML/XML attribute.
 */
export enum AttrState {
	BeforeName,
	Name,
	Equal,
	BeforeValue,
	Value,
	AfterValue,
}
