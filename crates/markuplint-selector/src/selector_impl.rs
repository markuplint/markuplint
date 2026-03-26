//! markuplint's `SelectorImpl` for the Servo selectors crate.

use cssparser::ToCss;
use selectors::parser::{NonTSPseudoClass, SelectorImpl};
use std::fmt;

/// markuplint's selector implementation for the Servo selectors engine.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkuplintSelectorImpl;

impl SelectorImpl for MarkuplintSelectorImpl {
    type AttrValue = String;
    type Identifier = String;
    type LocalName = String;
    type NamespacePrefix = String;
    type NamespaceUrl = String;
    type BorrowedLocalName = str;
    type BorrowedNamespaceUrl = str;

    type NonTSPseudoClass = MlPseudoClass;
    type PseudoElement = MlPseudoElement;

    type ExtraMatchingData<'a> = ();
}

/// markuplint-specific pseudo-classes.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum MlPseudoClass {
    /// `:model(category)` — content model category matching.
    Model(String),
    /// `:role(roleName)` — ARIA role matching.
    Role(String),
    /// `:aria(condition)` — ARIA state matching (e.g., `has name`).
    Aria(String),
}

impl ToCss for MlPseudoClass {
    fn to_css<W: fmt::Write>(&self, dest: &mut W) -> fmt::Result {
        match self {
            Self::Model(s) => write!(dest, ":model({s})"),
            Self::Role(s) => write!(dest, ":role({s})"),
            Self::Aria(s) => write!(dest, ":aria({s})"),
        }
    }
}

impl NonTSPseudoClass for MlPseudoClass {
    type Impl = MarkuplintSelectorImpl;

    fn is_active_or_hover(&self) -> bool {
        false
    }
}

/// markuplint pseudo-elements (none supported — linting doesn't need `::before`/`::after`).
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum MlPseudoElement {}

impl ToCss for MlPseudoElement {
    fn to_css<W: fmt::Write>(&self, _dest: &mut W) -> fmt::Result {
        match *self {}
    }
}

impl selectors::parser::PseudoElement for MlPseudoElement {
    type Impl = MarkuplintSelectorImpl;
}
