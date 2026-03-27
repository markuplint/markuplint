//! CSS selector AST types.

/// A parsed CSS selector (comma-separated list of complex selectors).
#[derive(Debug, Clone)]
pub struct SelectorList {
    pub selectors: Vec<ComplexSelector>,
}

/// A complex selector: a chain of compound selectors joined by combinators.
/// Stored right-to-left (the rightmost/subject compound is first).
#[derive(Debug, Clone)]
pub struct ComplexSelector {
    /// The subject compound selector (rightmost).
    pub subject: CompoundSelector,
    /// Combinator chain leading to the subject (reversed: parent is first).
    pub chain: Vec<(Combinator, CompoundSelector)>,
}

/// A combinator between compound selectors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Combinator {
    /// Descendant (whitespace).
    Descendant,
    /// Child (`>`).
    Child,
    /// Next sibling (`+`).
    NextSibling,
    /// Subsequent sibling (`~`).
    SubsequentSibling,
}

/// A compound selector: a sequence of simple selectors (all must match).
#[derive(Debug, Clone)]
pub struct CompoundSelector {
    pub parts: Vec<SimpleSelector>,
}

/// A simple selector.
#[derive(Debug, Clone)]
pub enum SimpleSelector {
    /// Universal selector (`*`).
    Universal,
    /// Type/tag selector (e.g., `div`, `input`).
    Type(String),
    /// ID selector (e.g., `#foo`).
    Id(String),
    /// Class selector (e.g., `.bar`).
    Class(String),
    /// Attribute selector (e.g., `[type=checkbox]`).
    Attribute(AttributeSelector),
    /// Pseudo-class (e.g., `:not(...)`, `:is(...)`, `:model(flow)`).
    PseudoClass(PseudoClassSelector),
    /// Namespace prefix (e.g., `svg|rect`).
    Namespace(String),
}

/// Attribute selector.
#[derive(Debug, Clone)]
pub struct AttributeSelector {
    pub name: String,
    pub operator: Option<AttrOperator>,
    pub value: Option<String>,
    pub case_insensitive: bool,
}

/// Attribute selector operators.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttrOperator {
    /// `=` exact match.
    Equals,
    /// `~=` word match (whitespace-separated).
    Includes,
    /// `|=` dash match (exact or prefix with `-`).
    DashMatch,
    /// `^=` prefix match.
    PrefixMatch,
    /// `$=` suffix match.
    SuffixMatch,
    /// `*=` substring match.
    SubstringMatch,
}

/// Pseudo-class selector.
#[derive(Debug, Clone)]
pub enum PseudoClassSelector {
    /// `:not(selector_list)`
    Not(SelectorList),
    /// `:is(selector_list)`
    Is(SelectorList),
    /// `:has(relative_selector_list)` — uses `ComplexSelector` with head combinator
    Has(SelectorList),
    /// `:where(selector_list)` — same as `:is()` but zero specificity
    Where(SelectorList),
    /// `:scope`
    Scope,
    /// `:root`
    Root,
    /// `:closest(selector_list)` — markuplint-specific: matches if any ancestor matches.
    Closest(SelectorList),
    /// Extended: `:model(category)`
    Model(String),
    /// Extended: `:role(roleName)`
    Role(String),
    /// Extended: `:aria(condition)`
    Aria(String),
}

/// Specificity as `[id, class, type]`.
pub type Specificity = [u32; 3];
