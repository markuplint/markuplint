use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use super::{document_order, parsed};
use crate::aria_resolver_impl::SpecAriaResolver;
use crate::lint::{LintConfig, pretended_document};

/// Where an element that a selector matches starts: TS `MLElement#startLine` / `startCol`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SearchHit {
    pub line: u32,
    pub col: u32,
}

/// TS `MLParentNode#deepQuerySelectorAll` of the document, which `markuplint --search` reads: the
/// elements that `selector` matches in every tree of the document (what is in the content of a
/// `template` element too), in the order of the markup, as the position they start at.
///
/// The selector is matched in the tree of each element ([`markuplint_dom::tree`]), against the
/// document after the pretenders were applied, as a selector of a node rule is. The document is
/// the scope, so `:scope` is no element of it.
///
/// No element when the document did not parse, as TS has no document then.
///
/// # Errors
///
/// The message of the selector that cannot be read: a syntax error, or a `:model()` that names no
/// category of the spec (TS's `InvalidSelectorError`).
pub fn search(
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &LintConfig,
    selector: &str,
) -> Result<Vec<SearchHit>, String> {
    if !parsed(arena) {
        return Ok(Vec::new());
    }
    let list = markuplint_selector::parser::parse(selector)
        .and_then(|list| markuplint_selector::extended::validate_model_categories(&list, spec).map(|()| list))?;

    let arena = &*pretended_document(arena, spec, config);
    let aria = SpecAriaResolver { spec };
    let document = arena.document_id();

    Ok(document_order(arena)
        .into_iter()
        .filter_map(|id| {
            let DomNode::Element(element) = arena.get(id)? else {
                return None;
            };
            markuplint_selector::matcher::matches(&list, arena, id, document, Some(spec), Some(&aria)).then_some(
                SearchHit {
                    line: element.base.line,
                    col: element.base.col,
                },
            )
        })
        .collect())
}
