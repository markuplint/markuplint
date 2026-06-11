//! CSS selector AST types.

#[derive(Debug, Clone)]
pub struct SelectorList {
    pub selectors: Vec<ComplexSelector>,
}

#[derive(Debug, Clone)]
pub struct ComplexSelector {
    pub subject: CompoundSelector,
    /// Stored reversed (right-to-left): the parent compound is first.
    pub chain: Vec<(Combinator, CompoundSelector)>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Combinator {
    Descendant,
    Child,
    NextSibling,
    SubsequentSibling,
}

#[derive(Debug, Clone)]
pub struct CompoundSelector {
    pub parts: Vec<SimpleSelector>,
}

#[derive(Debug, Clone)]
pub enum SimpleSelector {
    Universal,
    Type(String),
    Id(String),
    Class(String),
    Attribute(AttributeSelector),
    PseudoClass(PseudoClassSelector),
    Namespace(String),
}

#[derive(Debug, Clone)]
pub struct AttributeSelector {
    pub name: String,
    pub operator: Option<AttrOperator>,
    pub value: Option<String>,
    pub case_insensitive: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttrOperator {
    Equals,
    Includes,
    DashMatch,
    PrefixMatch,
    SuffixMatch,
    SubstringMatch,
}

#[derive(Debug, Clone)]
pub enum PseudoClassSelector {
    Not(SelectorList),
    Is(SelectorList),
    Has(SelectorList),
    /// Same as `:is()` but contributes zero specificity.
    Where(SelectorList),
    Scope,
    Root,
    /// markuplint extension: matches if any ancestor matches the argument.
    Closest(SelectorList),
    /// markuplint extension: matches an element's content-model category.
    Model(String),
    /// markuplint extension: matches an element's computed ARIA role.
    Role(String),
    /// markuplint extension: matches an element by accessible-name presence.
    Aria(String),
}

/// Specificity as `[id, class, type]`.
pub type Specificity = [u32; 3];
