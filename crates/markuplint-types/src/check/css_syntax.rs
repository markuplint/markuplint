//! Port of `packages/@markuplint/types/src/css-syntax.ts` (`cssSyntaxMatch`), with
//! `css-overrides.ts` and `css-tokenizers.ts`.
//!
//! A value is matched by css-tree's lexer ([`crate::css::csstree::lexer`]) forked with
//! markuplint's overrides and, for a custom syntax, its definitions.
//!
//! Not ported: the `caseSensitive` mimic of a custom syntax and its `ebnf` form. No definition in
//! `defs.ts`, `css-defs.ts` or the specs sets either.

use std::sync::LazyLock;

use super::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};
use crate::css::csstree::lexer::generic::Generic;
use crate::css::csstree::lexer::{Lexer, MatchResult};

/// TS `cssOverrides`: css-tree's transform-function definitions are too strict for the variants
/// SVG attributes accept, so markuplint replaces them.
pub const CSS_OVERRIDES: &[(&str, &str)] = &[
    // Alias
    ("legacy-length-percentage", "<length> | <percentage> | <svg-length>"),
    ("legacy-angle", "<angle> | <zero> | <number>"),
    // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-translate
    (
        "translate()",
        "translate( <legacy-length-percentage> , <legacy-length-percentage>? ) | translate( <legacy-length-percentage> <legacy-length-percentage>? )",
    ),
    // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-scale
    ("scale()", "scale( [ <number> | <percentage> ]#{1,2} )"),
    // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-rotate
    ("rotate()", "rotate( <legacy-angle> )"),
    // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-skew
    (
        "skew()",
        "skew( <legacy-angle> , <legacy-angle>? ) | skew( <legacy-angle> <legacy-angle>? )",
    ),
];

/// TS `cssTokenizers`: the types markuplint adds as functions (css-tree generic types).
const CSS_TOKENIZERS: &[(&str, Generic)] = &[
    // RFC: https://www.rfc-editor.org/info/bcp47
    ("bcp-47", Generic::Bcp47),
];

/// The lexer `cssSyntaxMatch` forks for a type name: css-tree's with `cssOverrides`.
static NAME_LEXER: LazyLock<Lexer> = LazyLock::new(|| Lexer::new().fork(CSS_OVERRIDES, &[]));

/// TS `CustomCssSyntax`: a syntax markuplint defines (`syntax.apply` and `syntax.def`).
pub struct CustomCssSyntax<'a> {
    pub ref_: &'a str,
    pub apply: &'a str,
    pub def: &'a [(&'a str, &'a str)],
}

/// The `type` argument of TS `cssSyntaxMatch`.
pub enum CssSyntax<'a> {
    /// A CSS syntax name: `<color>`, `<'mask'>`.
    Name(&'a str),
    Custom(&'a CustomCssSyntax<'a>),
}

/// TS `detectName`.
fn detect_name(def: &str) -> (bool, &str) {
    let is_prop = def.starts_with("<'");
    let name = def.strip_prefix("<'").or_else(|| def.strip_prefix('<')).unwrap_or(def);
    let name = name
        .strip_suffix("'>")
        .or_else(|| name.strip_suffix('>'))
        .unwrap_or(name);
    (is_prop, name)
}

/// TS `cssSyntaxMatch(value, type)`. `None` is TS's `MARKUPLINT_TYPE_NO_EXIST` error: the lexer
/// has no type or property of that name.
#[must_use]
pub fn css_syntax_match(value: &str, ty: &CssSyntax<'_>) -> Option<CheckResult> {
    let custom_lexer;
    let (lexer, def_name, custom_ref): (&Lexer, &str, Option<&str>) = match ty {
        CssSyntax::Name(name) => (&NAME_LEXER, name, None),
        CssSyntax::Custom(custom) => {
            // `{ ...cssTokenizers, ...type.syntax.def }`: a string becomes a type of the fork, a
            // tokenizer is added to the lexer afterwards
            let types: Vec<(&str, &str)> = CSS_OVERRIDES.iter().chain(custom.def.iter()).copied().collect();
            let mut lexer = Lexer::new().fork(&types, &[]);
            for (name, generic) in CSS_TOKENIZERS {
                if !custom.def.iter().any(|(n, _)| n == name) {
                    lexer.add_generic_type(name, *generic);
                }
            }
            custom_lexer = lexer;
            (&custom_lexer, custom.apply, Some(custom.ref_))
        }
    };

    let (is_prop, name) = detect_name(def_name);
    let exists = if is_prop {
        lexer.property(name).is_some()
    } else {
        lexer.type_def(name).is_some()
    };
    if !exists {
        return None;
    }

    let ref_ = custom_ref.map_or_else(
        || {
            let ref_param = if is_prop { "Property" } else { "Type" };
            format!("https://csstree.github.io/docs/syntax/#{ref_param}:{name}")
        },
        ToOwned::to_owned,
    );

    // - `var()` is not supported, so TS treats it as matched
    //   (@see https://github.com/csstree/csstree/issues/62)
    // - an `Err` is where TS throws (a definition css-tree cannot parse, or a reference to a type
    //   nothing defines); no definition markuplint ships does either, which the tests check
    let Ok(MatchResult::Mismatch(error)) = lexer.match_value(def_name, value) else {
        return Some(matched());
    };

    let raw = value
        .get(error.mismatch_offset..error.mismatch_offset + error.mismatch_length)
        .unwrap_or("");
    Some(unmatched_with(
        raw,
        Reason::SyntaxError,
        UnmatchedOpts {
            ref_: Some(ref_),
            offset: Some(error.mismatch_offset),
            line: Some(error.line),
            column: Some(error.column),
            expects: Some(vec![Expect {
                type_: ExpectType::Syntax,
                value: error.syntax,
            }]),
            part_name: (error.mismatch_offset != 0).then(|| "value".to_owned()),
            ..Default::default()
        },
    ))
}

/// TS `cssSyntaxMatch` of a type name as `_checkKeywordType` calls it: a name the lexer does not
/// know matches any value.
#[must_use]
pub fn css_syntax_match_name(value: &str, name: &str) -> CheckResult {
    css_syntax_match(value, &CssSyntax::Name(name)).unwrap_or_else(matched)
}
