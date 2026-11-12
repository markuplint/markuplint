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
    /// The leading combinator of a relative selector (`:has(> li)`); `None` everywhere else, and
    /// for `:has(li)`, which relates to its anchor as a descendant.
    pub head_combinator: Option<Combinator>,
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

/// The operator of `:display-size()`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DisplaySizeOperator {
    Equal,
    Greater,
    GreaterOrEqual,
    Less,
    LessOrEqual,
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
    /// `:first-child` as Selectors Level 4 defines it: no element sibling comes before the element
    /// (text does not count). A content model category counts text as well; see
    /// [`crate::matcher::is_content_model_first_child`].
    FirstChild,
    /// markuplint extension: a `<select>` in the HTML namespace whose display size compares to the
    /// number as the operator says (TS `displaySizePseudoClass`). An attribute selector cannot tell
    /// the display size, which is the `size` parsed as a non-negative integer, else 4 with
    /// `multiple` and 1 without.
    DisplaySize(DisplaySizeOperator, f64),
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
