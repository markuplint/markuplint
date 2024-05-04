export enum TagState {
	BeforeOpenTag,
	FirstCharOfTagName,
	TagName,
	Attrs,
	AfterAttrs,
	AfterOpenTag,
}

export enum AttrState {
	BeforeName,
	Name,
	Equal,
	BeforeValue,
	Value,
	AfterValue,
}
