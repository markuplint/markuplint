//! Port of `packages/@markuplint/types/src/whatwg/check-media-query-list.ts`: the `MediaQueryList`
//! type (the `media` attribute).
//!
//! The value is checked in TS's order:
//!
//! 1. It must match css-tree's `<media-query-list>` grammar (TS `cssSyntaxMatch`).
//! 2. A `;` inside parentheses is rejected: css-tree's parser absorbs it, but the CSS Syntax
//!    tokenizer makes a `<semicolon-token>` invalid inside a `<media-condition>`.
//! 3. The value is parsed as css-tree parses a media query list, and each query is walked:
//!    - a media type other than `all`, `screen` and `print` is rejected; the deprecated ones
//!      ([Media Queries Level 5 §2.3](https://www.w3.org/TR/mediaqueries-5/#media-types)) are
//!      named as such;
//!    - a `<general-enclosed>` is rejected, which
//!      [Media Queries Level 5 §3.1](https://www.w3.org/TR/mediaqueries-5/#evaluating) forbids
//!      in author stylesheets:
//!
//!      > Authors must not use <general-enclosed> in their stylesheets. It exists only for
//!      > future-compatibility, so that new syntax additions do not invalidate too much of a
//!      > <media-condition> in older user agents.
//!
//!    - a deprecated media feature (`device-width`, `device-height`, `device-aspect-ratio` and
//!      their `min-` / `max-` forms, which MDN's `@media` reference marks deprecated since Media
//!      Queries Level 4) is rejected;
//!    - the value of a range or discrete numeric feature (§2.4) must match the CSS type of the
//!      feature. A negative value is valid: such a feature is "false in the negative range", which
//!      means negative values parse and the query never matches
//!      (<https://www.w3.org/TR/mediaqueries-5/#mq-range-context>).
//!
//! An unknown feature name in the well-formed `(<ident>: <value>)` shape parses as a feature, not
//! as a `<general-enclosed>`, so a feature a later level adds keeps passing.

use std::rc::Rc;

use crate::check::css_syntax::css_syntax_match_name;
use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};
use crate::css::csstree::lexer::{Lexer, MatchResult};
use crate::css::csstree::parser::{
    Condition, ConditionChild, Feature, FeatureValue, ValueKind, parse_media_query_list,
};
use crate::css::csstree::tokenizer::Utf16Map;
use crate::token::Token;

fn expects() -> Vec<Expect> {
    vec![Expect {
        type_: ExpectType::Format,
        value: "media query list".to_owned(),
    }]
}

/// The media types Media Queries Level 5 §2.3 defines as current, in TS's order (the candidate
/// hint takes the first that fits).
///
/// @see <https://www.w3.org/TR/mediaqueries-5/#media-types>
const ACTIVE_MEDIA_TYPES: &[&str] = &["all", "screen", "print"];

/// The media types Media Queries Level 5 §2.3 keeps as syntax but makes match nothing; authors
/// must not use them.
const DEPRECATED_MEDIA_TYPES: &[&str] = &[
    "tty",
    "tv",
    "projection",
    "handheld",
    "braille",
    "embossed",
    "aural",
    "speech",
];

/// The media features deprecated since Media Queries Level 4 (MDN's `@media` reference), with
/// their `min-` / `max-` forms.
///
/// @see <https://developer.mozilla.org/en-US/docs/Web/CSS/@media>
const DEPRECATED_MEDIA_FEATURES: &[&str] = &[
    "device-width",
    "min-device-width",
    "max-device-width",
    "device-height",
    "min-device-height",
    "max-device-height",
    "device-aspect-ratio",
    "min-device-aspect-ratio",
    "max-device-aspect-ratio",
];

/// The CSS type of the value of each range or discrete numeric feature (Media Queries Level 5
/// §2.4). A discrete keyword feature (`prefers-color-scheme: dark`) is not here.
///
/// @see <https://www.w3.org/TR/mediaqueries-5/#mq-features>
fn feature_value_type(feature: &str) -> Option<&'static str> {
    Some(match feature {
        "width" | "height" | "min-width" | "max-width" | "min-height" | "max-height" => "<length>",
        "color"
        | "min-color"
        | "max-color"
        | "color-index"
        | "min-color-index"
        | "max-color-index"
        | "monochrome"
        | "min-monochrome"
        | "max-monochrome"
        | "horizontal-viewport-segments"
        | "min-horizontal-viewport-segments"
        | "max-horizontal-viewport-segments"
        | "vertical-viewport-segments"
        | "min-vertical-viewport-segments"
        | "max-vertical-viewport-segments" => "<integer>",
        "resolution" | "min-resolution" | "max-resolution" => "<resolution>",
        "aspect-ratio" | "min-aspect-ratio" | "max-aspect-ratio" => "<ratio>",
        _ => return None,
    })
}

/// A source and its UTF-16 offsets as byte offsets.
struct Source<'a> {
    value: &'a str,
    map: Utf16Map,
}

impl<'a> Source<'a> {
    fn new(value: &'a str) -> Self {
        Self {
            value,
            map: Utf16Map::new(value),
        }
    }

    fn byte(&self, offset16: usize) -> usize {
        self.map.byte(offset16)
    }

    fn slice(&self, start16: usize, end16: usize) -> &'a str {
        let start = self.byte(start16);
        let end = self.byte(end16).max(start);
        &self.value[start..end]
    }

    fn token(&self, raw: &str, byte_offset: usize) -> Token {
        Token::new(raw, byte_offset, Rc::from(self.value), &[])
    }
}

/// TS `checkMediaQueryList()`.
#[must_use]
pub fn check_media_query_list(value: &str) -> CheckResult {
    if value.is_empty() {
        return unmatched_with(
            value,
            Reason::EmptyToken,
            UnmatchedOpts {
                expects: Some(expects()),
                ..Default::default()
            },
        );
    }

    // Stage 1: the grammar
    let syntax_result = css_syntax_match_name(value, "<media-query-list>");
    if !syntax_result.is_matched() {
        return syntax_result;
    }

    let source = Source::new(value);

    // css-tree's parser absorbs a stray semicolon inside `()`
    if let Some(semicolon) = find_semicolon_inside_parens(value) {
        return source.token(";", semicolon).unmatched_result(
            Some(Reason::UnexpectedToken),
            UnmatchedOpts {
                expects: Some(expects()),
                part_name: Some("a stray semicolon inside the media condition".to_owned()),
                ..Default::default()
            },
        );
    }

    // Stage 2: walk the parsed queries
    let queries = match parse_media_query_list(&source.map.units) {
        Ok(queries) => queries,
        Err(error) => {
            return unmatched_with(
                value,
                Reason::SyntaxError,
                UnmatchedOpts {
                    expects: Some(expects()),
                    part_name: Some(error.message),
                    ..Default::default()
                },
            );
        }
    };

    for query in &queries {
        if let Some(media_type) = &query.media_type {
            let lowered = media_type.to_lowercase();
            let offset = source.byte(query.start);
            if DEPRECATED_MEDIA_TYPES.contains(&lowered.as_str()) {
                return source.token(media_type, offset).unmatched_result(
                    Some(Reason::DoesntExistInEnum),
                    UnmatchedOpts {
                        expects: Some(expects()),
                        part_name: Some(format!("deprecated media type \"{media_type}\"")),
                        ..Default::default()
                    },
                );
            }
            if !ACTIVE_MEDIA_TYPES.contains(&lowered.as_str()) {
                return source.token(media_type, offset).unmatched_result(
                    Some(Reason::DoesntExistInEnum),
                    UnmatchedOpts {
                        expects: Some(expects()),
                        candidate: nearest_media_type(&lowered).map(ToOwned::to_owned),
                        ..Default::default()
                    },
                );
            }
        }
        if let Some(condition) = &query.condition
            && let Some(result) = walk_condition(condition, &source)
        {
            return result;
        }
    }

    matched()
}

/// TS `walkCondition`: the first `<general-enclosed>`, deprecated feature or mistyped feature
/// value, in document order.
fn walk_condition(condition: &Condition, source: &Source<'_>) -> Option<CheckResult> {
    for child in &condition.children {
        let result = match child {
            ConditionChild::GeneralEnclosed { start, end } => {
                let raw = source.slice(*start, *end);
                Some(source.token(raw, source.byte(*start)).unmatched_result(
                    Some(Reason::SyntaxError),
                    UnmatchedOpts {
                        expects: Some(expects()),
                        part_name: Some(format!(
                            "unknown or malformed media condition {} (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)",
                            json_string(raw)
                        )),
                        ..Default::default()
                    },
                ))
            }
            ConditionChild::Feature(feature) => check_feature(feature, source),
            ConditionChild::Condition(inner) => walk_condition(inner, source),
            ConditionChild::Identifier | ConditionChild::FeatureRange => None,
        };
        if result.is_some() {
            return result;
        }
    }
    None
}

fn check_feature(feature: &Feature, source: &Source<'_>) -> Option<CheckResult> {
    let lowered = feature.name.to_lowercase();
    if DEPRECATED_MEDIA_FEATURES.contains(&lowered.as_str()) {
        let offset = source.byte(feature.start);
        // skip the leading `(` so the highlight lands on the feature name
        let name_offset = source.value[offset..]
            .find(|c: char| c.is_ascii_alphabetic())
            .unwrap_or(0);
        return Some(source.token(&feature.name, offset + name_offset).unmatched_result(
            Some(Reason::DoesntExistInEnum),
            UnmatchedOpts {
                expects: Some(expects()),
                part_name: Some(format!("deprecated media feature \"{}\"", feature.name)),
                ..Default::default()
            },
        ));
    }
    // the boolean form `(name)` has no value and takes any type
    let value = feature.value.as_ref()?;
    validate_feature_value(&lowered, value, source)
}

/// TS `validateFeatureValue`: the value of a range or discrete numeric feature against the CSS
/// type of the feature, by css-tree's default lexer. A function value (`calc()`) is not checked:
/// its value cannot be computed statically.
fn validate_feature_value(feature: &str, value: &FeatureValue, source: &Source<'_>) -> Option<CheckResult> {
    let expected_type = feature_value_type(feature)?;
    if value.kind == ValueKind::Function {
        return None;
    }
    let raw = source.slice(value.start, value.end);
    let detail = match Lexer::new().match_value(expected_type, raw) {
        Ok(MatchResult::Matched) => return None,
        Ok(MatchResult::Mismatch(error)) => error.raw_message.to_owned(),
        Ok(MatchResult::VarUnsupported) => "Matching for a tree with var() is not supported".to_owned(),
        Err(message) => message,
    };
    Some(source.token(raw, source.byte(value.start)).unmatched_result(
        Some(Reason::SyntaxError),
        UnmatchedOpts {
            expects: Some(expects()),
            part_name: Some(format!("{expected_type} required for \"{feature}\" ({detail})")),
            ..Default::default()
        },
    ))
}

/// TS `nearestMediaType`: only a typo hint.
fn nearest_media_type(input: &str) -> Option<&'static str> {
    ACTIVE_MEDIA_TYPES
        .iter()
        .find(|candidate| input.starts_with(**candidate) || candidate.starts_with(input))
        .copied()
}

/// TS `findSemicolonInsideParens`: the byte offset of the first `;` inside a `(` group. Media
/// Queries Level 5 has no quoted strings, so a depth counter is enough.
fn find_semicolon_inside_parens(input: &str) -> Option<usize> {
    let mut depth = 0usize;
    for (i, ch) in input.char_indices() {
        match ch {
            '(' => depth += 1,
            ')' => depth = depth.saturating_sub(1),
            ';' if depth > 0 => return Some(i),
            _ => {}
        }
    }
    None
}

/// JS `JSON.stringify(string)`.
fn json_string(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_default()
}

/// TS `findGeneralEnclosed(snippet)`: the first `<general-enclosed>` css-tree parses in a
/// parenthesized group, as its raw text and byte offset in `snippet`. `None` when there is none
/// or the snippet does not parse (the caller reports grammar errors).
///
/// It exists so a grammar that embeds a `<media-condition>` (`<source-size-list>`) can apply the
/// rule of Media Queries Level 5 §3.1 that forbids `<general-enclosed>` in author stylesheets.
#[must_use]
pub fn find_general_enclosed(snippet: &str) -> Option<(String, usize)> {
    let source = Source::new(snippet);
    let queries = parse_media_query_list(&source.map.units).ok()?;
    queries
        .iter()
        .filter_map(|q| q.condition.as_ref())
        .find_map(first_general_enclosed)
        .map(|(start, end)| (source.slice(start, end).to_owned(), source.byte(start)))
}

fn first_general_enclosed(condition: &Condition) -> Option<(usize, usize)> {
    condition.children.iter().find_map(|child| match child {
        ConditionChild::GeneralEnclosed { start, end } => Some((*start, *end)),
        ConditionChild::Condition(inner) => first_general_enclosed(inner),
        _ => None,
    })
}
