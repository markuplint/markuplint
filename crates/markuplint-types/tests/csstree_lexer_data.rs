//! `data/csstree-lexer.json` and the syntaxes markuplint adds to it (`css-overrides.ts`,
//! `css-defs.ts`, the `SourceSizeList` syntax) against the Rust lexer: every name the data lists as
//! a generic type has a Rust implementation, every syntax parses, and every type or property a
//! syntax references is defined. css-tree throws on a reference it cannot resolve; the Rust port
//! treats that as a match, which these checks keep unreachable.

use markuplint_types::check::css_defs::CSS_DEFS;
use markuplint_types::check::css_syntax::CSS_OVERRIDES;
use markuplint_types::css::csstree::lexer::{DUMP, Lexer, generic};
use markuplint_types::css::syntax_definition::{ast::SyntaxNode, parse};

fn references(node: &SyntaxNode, out: &mut Vec<(bool, String)>) {
    match node {
        SyntaxNode::Type { name, .. } => out.push((false, name.clone())),
        SyntaxNode::Property { name } => out.push((true, name.clone())),
        SyntaxNode::Group { terms, .. } => terms.iter().for_each(|t| references(t, out)),
        SyntaxNode::Multiplier { term, .. } | SyntaxNode::Boolean { term } => references(term, out),
        _ => {}
    }
}

/// The syntaxes of `lexer` that `syntaxes` reaches, with every reference resolved.
fn assert_resolves(lexer: &Lexer, syntaxes: &[(String, String)]) {
    let mut failures = Vec::new();
    for (name, syntax) in syntaxes {
        let ast = match parse(syntax) {
            Ok(ast) => ast,
            Err(error) => {
                failures.push(format!("{name}: {syntax:?} does not parse: {error}"));
                continue;
            }
        };
        let mut refs = Vec::new();
        references(&ast, &mut refs);
        for (is_property, reference) in refs {
            let found = if is_property {
                lexer.property(&reference).is_some()
            } else {
                lexer.type_def(&reference).is_some()
            };
            if !found {
                failures.push(format!("{name}: references undefined {reference}"));
            }
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn generics_are_implemented() {
    let missing: Vec<&String> = DUMP
        .generics
        .iter()
        .filter(|name| generic::lookup(name).is_none())
        .collect();
    assert!(missing.is_empty(), "{missing:?}");
}

#[test]
fn css_tree_syntaxes_resolve() {
    let syntaxes: Vec<(String, String)> = DUMP
        .types
        .iter()
        .chain(DUMP.properties.iter())
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    assert_resolves(&Lexer::new(), &syntaxes);
}

#[test]
fn css_overrides_resolve() {
    let lexer = Lexer::new().fork(CSS_OVERRIDES, &[]);
    let syntaxes: Vec<(String, String)> = CSS_OVERRIDES
        .iter()
        .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
        .collect();
    assert_resolves(&lexer, &syntaxes);
}

#[test]
fn css_defs_resolve() {
    for (name, def) in CSS_DEFS {
        let Some((apply, defs)) = def.syntax else {
            continue;
        };
        let types: Vec<(&str, &str)> = CSS_OVERRIDES.iter().chain(defs.iter()).copied().collect();
        let mut lexer = Lexer::new().fork(&types, &[]);
        lexer.add_generic_type("bcp-47", generic::Generic::Bcp47);
        let mut syntaxes: Vec<(String, String)> =
            defs.iter().map(|(k, v)| ((*k).to_owned(), (*v).to_owned())).collect();
        syntaxes.push(((*name).to_owned(), apply.to_owned()));
        assert_resolves(&lexer, &syntaxes);
    }
}
