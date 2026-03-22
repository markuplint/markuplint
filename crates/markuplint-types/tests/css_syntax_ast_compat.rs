//! AST structure compatibility tests against css-tree v3.2.1.
//!
//! These tests verify the exact AST shape, not just round-trip strings.

use markuplint_types::css::syntax_definition::ast::*;
use markuplint_types::css::syntax_definition::parse;

/// Helper to parse and unwrap.
fn p(input: &str) -> SyntaxNode {
    parse(input).unwrap_or_else(|e| panic!("Failed to parse `{input}`: {e}"))
}

// --- Mixed combinator precedence ---

#[test]
fn ast_bar_vs_juxtaposition() {
    // css-tree: Group(|, [Keyword(a), Group(' ', [Keyword(b), Keyword(c)])])
    let node = p("a | b c");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Keyword { name: "a".into() },
                SyntaxNode::Group {
                    terms: vec![
                        SyntaxNode::Keyword { name: "b".into() },
                        SyntaxNode::Keyword { name: "c".into() },
                    ],
                    combinator: Combinator::Juxtaposition,
                    disallow_empty: false,
                    explicit: false,
                },
            ],
            combinator: Combinator::Bar,
            disallow_empty: false,
            explicit: false,
        }
    );
}

#[test]
fn ast_bar_vs_double_ampersand() {
    // css-tree: Group(|, [Keyword(a), Group(&&, [Keyword(b), Keyword(c)])])
    let node = p("a | b && c");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Keyword { name: "a".into() },
                SyntaxNode::Group {
                    terms: vec![
                        SyntaxNode::Keyword { name: "b".into() },
                        SyntaxNode::Keyword { name: "c".into() },
                    ],
                    combinator: Combinator::DoubleAmpersand,
                    disallow_empty: false,
                    explicit: false,
                },
            ],
            combinator: Combinator::Bar,
            disallow_empty: false,
            explicit: false,
        }
    );
}

#[test]
fn ast_juxtaposition_vs_bar() {
    // css-tree: Group(|, [Group(' ', [a, b]), Group(' ', [c, d])])
    let node = p("a b | c d");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Group {
                    terms: vec![
                        SyntaxNode::Keyword { name: "a".into() },
                        SyntaxNode::Keyword { name: "b".into() },
                    ],
                    combinator: Combinator::Juxtaposition,
                    disallow_empty: false,
                    explicit: false,
                },
                SyntaxNode::Group {
                    terms: vec![
                        SyntaxNode::Keyword { name: "c".into() },
                        SyntaxNode::Keyword { name: "d".into() },
                    ],
                    combinator: Combinator::Juxtaposition,
                    disallow_empty: false,
                    explicit: false,
                },
            ],
            combinator: Combinator::Bar,
            disallow_empty: false,
            explicit: false,
        }
    );
}

#[test]
fn ast_double_ampersand_vs_double_bar() {
    // css-tree: Group(||, [Group(&&, [a, b]), c])
    let node = p("a && b || c");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Group {
                    terms: vec![
                        SyntaxNode::Keyword { name: "a".into() },
                        SyntaxNode::Keyword { name: "b".into() },
                    ],
                    combinator: Combinator::DoubleAmpersand,
                    disallow_empty: false,
                    explicit: false,
                },
                SyntaxNode::Keyword { name: "c".into() },
            ],
            combinator: Combinator::DoubleBar,
            disallow_empty: false,
            explicit: false,
        }
    );
}

// --- Stacked multipliers ---

#[test]
fn ast_stacked_plus_hash() {
    // css-tree: Multiplier(#, Multiplier(+, Type(color)))
    let node = p("<color>+#");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 1,
                    max: 0,
                    comma: true,
                },
                term: Box::new(SyntaxNode::Multiplier {
                    info: MultiplierInfo {
                        min: 1,
                        max: 0,
                        comma: false,
                    },
                    term: Box::new(SyntaxNode::Type {
                        name: "color".into(),
                        opts: None,
                    }),
                }),
            }],
            combinator: Combinator::Juxtaposition,
            disallow_empty: false,
            explicit: false,
        }
    );
}

// --- Function: rgb( <number> , <number> , <number> ) ---

#[test]
fn ast_rgb_function() {
    // css-tree: Group(' ', [Function(rgb), Type(number), Comma, Type(number), Comma, Type(number), Token(")")])
    let node = p("rgb( <number> , <number> , <number> )");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Function { name: "rgb".into() },
                SyntaxNode::Type { name: "number".into(), opts: None },
                SyntaxNode::Comma,
                SyntaxNode::Type { name: "number".into(), opts: None },
                SyntaxNode::Comma,
                SyntaxNode::Type { name: "number".into(), opts: None },
                SyntaxNode::Token { value: ")".into() },
            ],
            combinator: Combinator::Juxtaposition,
            disallow_empty: false,
            explicit: false,
        }
    );
}

// --- Boolean expression ---

#[test]
fn ast_boolean_expr() {
    // css-tree: Group(' ', [Boolean(Type(media-feature))])
    let node = p("<boolean-expr[<media-feature>]>");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![SyntaxNode::Boolean {
                term: Box::new(SyntaxNode::Type {
                    name: "media-feature".into(),
                    opts: None,
                }),
            }],
            combinator: Combinator::Juxtaposition,
            disallow_empty: false,
            explicit: false,
        }
    );
}

// --- bg-layer with comma ---

#[test]
fn ast_bg_layer_comma() {
    // css-tree: Group(' ', [Multiplier(#, Type(bg-layer)), Comma, Type(final-bg-layer)])
    let node = p("<bg-layer># , <final-bg-layer>");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Multiplier {
                    info: MultiplierInfo {
                        min: 1,
                        max: 0,
                        comma: true,
                    },
                    term: Box::new(SyntaxNode::Type {
                        name: "bg-layer".into(),
                        opts: None,
                    }),
                },
                SyntaxNode::Comma,
                SyntaxNode::Type {
                    name: "final-bg-layer".into(),
                    opts: None,
                },
            ],
            combinator: Combinator::Juxtaposition,
            disallow_empty: false,
            explicit: false,
        }
    );
}

// --- box-shadow: inset? && <length>{2,4} && <color>? ---

#[test]
fn ast_box_shadow() {
    let node = p("inset? && <length>{2,4} && <color>?");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Multiplier {
                    info: MultiplierInfo { min: 0, max: 1, comma: false },
                    term: Box::new(SyntaxNode::Keyword { name: "inset".into() }),
                },
                SyntaxNode::Multiplier {
                    info: MultiplierInfo { min: 2, max: 4, comma: false },
                    term: Box::new(SyntaxNode::Type { name: "length".into(), opts: None }),
                },
                SyntaxNode::Multiplier {
                    info: MultiplierInfo { min: 0, max: 1, comma: false },
                    term: Box::new(SyntaxNode::Type { name: "color".into(), opts: None }),
                },
            ],
            combinator: Combinator::DoubleAmpersand,
            disallow_empty: false,
            explicit: false,
        }
    );
}

// --- Complex: content property ---

#[test]
fn ast_content_property() {
    // "normal | none | [ <content-replacement> | <content-list> ] [ / [ <string> | <counter> ]+ ]?"
    let node = p("normal | none | [ <content-replacement> | <content-list> ] [ / [ <string> | <counter> ]+ ]?");
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![
                SyntaxNode::Keyword { name: "normal".into() },
                SyntaxNode::Keyword { name: "none".into() },
                SyntaxNode::Group {
                    terms: vec![
                        SyntaxNode::Group {
                            terms: vec![
                                SyntaxNode::Type { name: "content-replacement".into(), opts: None },
                                SyntaxNode::Type { name: "content-list".into(), opts: None },
                            ],
                            combinator: Combinator::Bar,
                            disallow_empty: false,
                            explicit: true,
                        },
                        SyntaxNode::Multiplier {
                            info: MultiplierInfo { min: 0, max: 1, comma: false },
                            term: Box::new(SyntaxNode::Group {
                                terms: vec![
                                    SyntaxNode::Token { value: "/".into() },
                                    SyntaxNode::Multiplier {
                                        info: MultiplierInfo { min: 1, max: 0, comma: false },
                                        term: Box::new(SyntaxNode::Group {
                                            terms: vec![
                                                SyntaxNode::Type { name: "string".into(), opts: None },
                                                SyntaxNode::Type { name: "counter".into(), opts: None },
                                            ],
                                            combinator: Combinator::Bar,
                                            disallow_empty: false,
                                            explicit: true,
                                        }),
                                    },
                                ],
                                combinator: Combinator::Juxtaposition,
                                disallow_empty: false,
                                explicit: true,
                            }),
                        },
                    ],
                    combinator: Combinator::Juxtaposition,
                    disallow_empty: false,
                    explicit: false,
                },
            ],
            combinator: Combinator::Bar,
            disallow_empty: false,
            explicit: false,
        }
    );
}
