use markuplint_types::css::syntax_definition::ast::{Combinator, MultiplierInfo, SyntaxNode, TypeRange};
use markuplint_types::css::syntax_definition::generate::generate;
use markuplint_types::css::syntax_definition::parse;

// --- Basic keywords ---

#[test]
fn keyword() {
    let node = parse("auto").unwrap();
    assert_eq!(
        node,
        SyntaxNode::Group {
            terms: vec![SyntaxNode::Keyword { name: "auto".into() }],
            combinator: Combinator::Juxtaposition,
            disallow_empty: false,
            explicit: false,
        }
    );
}

#[test]
fn multiple_keywords_juxtaposition() {
    let node = parse("a b c").unwrap();
    if let SyntaxNode::Group { terms, combinator, .. } = &node {
        assert_eq!(*combinator, Combinator::Juxtaposition);
        assert_eq!(terms.len(), 3);
    } else {
        panic!("Expected Group");
    }
}

// --- Types ---

#[test]
fn type_simple() {
    let node = parse("<color>").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert_eq!(terms.len(), 1);
        assert_eq!(
            terms[0],
            SyntaxNode::Type {
                name: "color".into(),
                opts: None,
            }
        );
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn type_with_range() {
    let node = parse("<integer [0,10]>").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert_eq!(
            terms[0],
            SyntaxNode::Type {
                name: "integer".into(),
                opts: Some(TypeRange {
                    min: Some(0.0),
                    max: Some(10.0),
                }),
            }
        );
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn type_function_notation() {
    let node = parse("<transform()>").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert_eq!(
            terms[0],
            SyntaxNode::Type {
                name: "transform()".into(),
                opts: None,
            }
        );
    } else {
        panic!("Expected Group");
    }
}

// --- Property reference ---

#[test]
fn property() {
    let node = parse("<'transform'>").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert_eq!(
            terms[0],
            SyntaxNode::Property {
                name: "transform".into(),
            }
        );
    } else {
        panic!("Expected Group");
    }
}

// --- Combinators ---

#[test]
fn bar_combinator() {
    let node = parse("a | b | c").unwrap();
    if let SyntaxNode::Group { terms, combinator, .. } = &node {
        assert_eq!(*combinator, Combinator::Bar);
        assert_eq!(terms.len(), 3);
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn double_ampersand() {
    let node = parse("a && b && c").unwrap();
    if let SyntaxNode::Group { terms, combinator, .. } = &node {
        assert_eq!(*combinator, Combinator::DoubleAmpersand);
        assert_eq!(terms.len(), 3);
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn double_bar() {
    let node = parse("a || b || c").unwrap();
    if let SyntaxNode::Group { terms, combinator, .. } = &node {
        assert_eq!(*combinator, Combinator::DoubleBar);
        assert_eq!(terms.len(), 3);
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn mixed_combinators_precedence() {
    // "a | b c" → Group(|, [a, Group(' ', [b, c])])
    let node = parse("a | b c").unwrap();
    if let SyntaxNode::Group { terms, combinator, .. } = &node {
        assert_eq!(*combinator, Combinator::Bar);
        assert_eq!(terms.len(), 2);
        // Second term should be a juxtaposition group
        if let SyntaxNode::Group {
            combinator: inner_comb,
            terms: inner_terms,
            ..
        } = &terms[1]
        {
            assert_eq!(*inner_comb, Combinator::Juxtaposition);
            assert_eq!(inner_terms.len(), 2);
        } else {
            panic!("Expected inner Group");
        }
    } else {
        panic!("Expected Group");
    }
}

// --- Multipliers ---

#[test]
fn multiplier_star() {
    let node = parse("<color>*").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 0,
                    max: 0,
                    comma: false
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_plus() {
    let node = parse("<color>+").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 1,
                    max: 0,
                    comma: false
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_question() {
    let node = parse("<color>?").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 0,
                    max: 1,
                    comma: false
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_hash() {
    let node = parse("<color>#").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 1,
                    max: 0,
                    comma: true
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_hash_question() {
    let node = parse("<color>#?").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 0,
                    max: 0,
                    comma: true
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_range_exact() {
    let node = parse("<color>{3}").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 3,
                    max: 3,
                    comma: false
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_range_min_max() {
    let node = parse("<color>{1,4}").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 1,
                    max: 4,
                    comma: false
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_range_min_unbounded() {
    let node = parse("<color>{2,}").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 2,
                    max: 0,
                    comma: false
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn multiplier_hash_range() {
    let node = parse("<color>#{1,4}").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(
            &terms[0],
            SyntaxNode::Multiplier {
                info: MultiplierInfo {
                    min: 1,
                    max: 4,
                    comma: true
                },
                ..
            }
        ));
    } else {
        panic!("Expected Group");
    }
}

// --- Grouping ---

#[test]
fn explicit_group() {
    let node = parse("[ a | b ]").unwrap();
    if let SyntaxNode::Group {
        explicit,
        combinator,
        terms,
        ..
    } = &node
    {
        assert!(explicit);
        assert_eq!(*combinator, Combinator::Bar);
        assert_eq!(terms.len(), 2);
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn explicit_group_disallow_empty() {
    let node = parse("[ a | b ]!").unwrap();
    if let SyntaxNode::Group {
        disallow_empty,
        explicit,
        ..
    } = &node
    {
        assert!(explicit);
        assert!(disallow_empty);
    } else {
        panic!("Expected Group");
    }
}

#[test]
fn group_with_multiplier() {
    let node = parse("[ <number> ]{1,4}").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(matches!(&terms[0], SyntaxNode::Multiplier { .. }));
    } else {
        panic!("Expected outer Group");
    }
}

// --- Comma ---

#[test]
fn comma_in_sequence() {
    let node = parse("a , b").unwrap();
    if let SyntaxNode::Group { terms, .. } = &node {
        assert_eq!(terms.len(), 3);
        assert!(matches!(&terms[1], SyntaxNode::Comma));
    } else {
        panic!("Expected Group");
    }
}

// --- Function ---

#[test]
fn function_notation() {
    let node = parse("rgb( <number> )").unwrap();
    // Function should appear in the terms
    if let SyntaxNode::Group { terms, .. } = &node {
        assert!(!terms.is_empty());
    } else {
        panic!("Expected Group");
    }
}

// --- Round-trip tests ---

#[test]
fn roundtrip_simple_keyword() {
    assert_roundtrip("auto");
}

#[test]
fn roundtrip_type() {
    assert_roundtrip("<color>");
}

#[test]
fn roundtrip_property() {
    assert_roundtrip("<'transform'>");
}

#[test]
fn roundtrip_bar() {
    assert_roundtrip("a | b | c");
}

#[test]
fn roundtrip_double_ampersand() {
    assert_roundtrip("a && b && c");
}

#[test]
fn roundtrip_double_bar() {
    assert_roundtrip("a || b || c");
}

#[test]
fn roundtrip_multiplier_star() {
    assert_roundtrip("<color>*");
}

#[test]
fn roundtrip_multiplier_plus() {
    assert_roundtrip("<color>+");
}

#[test]
fn roundtrip_multiplier_question() {
    assert_roundtrip("<color>?");
}

#[test]
fn roundtrip_multiplier_hash() {
    assert_roundtrip("<color>#");
}

#[test]
fn roundtrip_multiplier_range() {
    assert_roundtrip("<color>{1,4}");
}

#[test]
fn roundtrip_explicit_group() {
    assert_roundtrip("[ a | b ]");
}

#[test]
fn roundtrip_explicit_group_disallow_empty() {
    assert_roundtrip("[ a | b ]!");
}

#[test]
fn roundtrip_complex() {
    assert_roundtrip("<length> | <percentage>");
}

#[test]
fn roundtrip_juxtaposition() {
    assert_roundtrip("a b c");
}

// --- Real-world CSS syntax definitions ---

#[test]
fn real_world_background() {
    // Simplified background syntax
    let input = "<color> || <bg-image> || <bg-position>";
    let node = parse(input).unwrap();
    let output = generate(&node);
    assert_eq!(output, input);
}

#[test]
fn real_world_border() {
    let input = "<line-width> || <line-style> || <color>";
    let node = parse(input).unwrap();
    let output = generate(&node);
    assert_eq!(output, input);
}

// --- Error cases ---

#[test]
fn error_double_combinator() {
    assert!(parse("a || | b").is_err());
}

#[test]
fn error_leading_combinator() {
    assert!(parse("| a").is_err());
}

#[test]
fn error_trailing_combinator() {
    assert!(parse("a |").is_err());
}

// --- Helper ---

fn assert_roundtrip(input: &str) {
    let node = parse(input).unwrap_or_else(|e| panic!("Failed to parse `{input}`: {e}"));
    let output = generate(&node);
    assert_eq!(output, input, "Round-trip failed for `{input}`");
}
