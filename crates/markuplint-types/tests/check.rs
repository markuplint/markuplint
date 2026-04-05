use markuplint_types::check::check;
use markuplint_types::check::types::{
    DirectiveType, EnumType, ListNumber, ListType, NumberType, NumericKind, PatternType, Separator, Type,
};

// --- Keyword types ---

#[test]
fn any() {
    assert!(check("", &Type::Keyword("Any".into()), None).is_matched());
    assert!(check(" ", &Type::Keyword("Any".into()), None).is_matched());
    assert!(check("a", &Type::Keyword("Any".into()), None).is_matched());
}

#[test]
fn no_empty_any() {
    assert!(!check("", &Type::Keyword("NoEmptyAny".into()), None).is_matched());
    assert!(check(" ", &Type::Keyword("NoEmptyAny".into()), None).is_matched());
    assert!(check("a", &Type::Keyword("NoEmptyAny".into()), None).is_matched());
}

#[test]
fn one_line_any() {
    assert!(check("", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(check(" ", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(check("a", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(check("a ", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(check("a b", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(!check("a\n", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(!check("a\nb", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(!check("a\r\nb", &Type::Keyword("OneLineAny".into()), None).is_matched());
    assert!(!check("a\rb", &Type::Keyword("OneLineAny".into()), None).is_matched());
}

#[test]
fn pattern_keyword() {
    assert!(check(".*", &Type::Keyword("Pattern".into()), None).is_matched());
    assert!(check("[a-z]+", &Type::Keyword("Pattern".into()), None).is_matched());
    assert!(!check("]//[()?!+*", &Type::Keyword("Pattern".into()), None).is_matched());
}

// --- Pattern (object) ---

#[test]
fn pattern_object() {
    let p = |pat: &str| {
        Type::Pattern(PatternType {
            pattern: pat.to_owned(),
        })
    };
    assert!(check("hello", &p("/^he/"), None).is_matched());
    assert!(!check("hello", &p("/^xyz/"), None).is_matched());
    assert!(check("foo", &p("foo"), None).is_matched());
    assert!(!check("foo", &p("bar"), None).is_matched());
    assert!(check("Hello", &p("/hello/i"), None).is_matched());
}

// --- BCP47 ---

#[test]
fn bcp47() {
    assert!(check("en", &Type::Keyword("BCP47".into()), None).is_matched());
    assert!(check("en-US", &Type::Keyword("BCP47".into()), None).is_matched());
    assert!(check("ja", &Type::Keyword("BCP47".into()), None).is_matched());
    assert!(!check(" ja ", &Type::Keyword("BCP47".into()), None).is_matched());
    // Empty string is valid per HTML spec: lang="" means "language unknown"
    // Matches TS behavior: check('', 'BCP47').matched === true
    assert!(check("", &Type::Keyword("BCP47".into()), None).is_matched());
    assert!(!check("zh/cn", &Type::Keyword("BCP47".into()), None).is_matched());
}

// --- Srcset ---

#[test]
fn srcset() {
    let kw = Type::Keyword("Srcset".into());
    assert!(check("a/bb/ccc/dddd", &kw, None).is_matched());
    assert!(check("a/bb/ccc/dddd 200w", &kw, None).is_matched());
    // Width + density descriptor mixing must be invalid
    assert!(!check("a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5x ", &kw, None).is_matched());
    assert!(!check("a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5a", &kw, None).is_matched());
    assert!(!check("a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5x  unexpected-string", &kw, None).is_matched());
    // Issue #1171
    assert!(check("/path/to/file 1x, /path/to/file@2x 2x", &kw, None).is_matched());

    // Descriptor consistency
    assert!(check("a.jpg 480w, b.jpg 1024w", &kw, None).is_matched());
    assert!(check("a.jpg 1x, b.jpg 2x", &kw, None).is_matched());
    assert!(check("a.jpg, b.jpg", &kw, None).is_matched());
    assert!(check("a.jpg, b.jpg 2x", &kw, None).is_matched());
    assert!(!check("a.jpg 480w, b.jpg", &kw, None).is_matched());
    assert!(!check("a.jpg 480w, b.jpg 2x", &kw, None).is_matched());
    assert!(!check("a.jpg 480w, b.jpg 2x, c.jpg", &kw, None).is_matched());
}

// --- IconSize ---

#[test]
fn icon_size() {
    let kw = Type::Keyword("IconSize".into());
    assert!(check("any", &kw, None).is_matched());
    assert!(check("Any", &kw, None).is_matched());
    assert!(check("10x10", &kw, None).is_matched());
    assert!(check("1x1", &kw, None).is_matched());
    assert!(!check("1x0", &kw, None).is_matched());
    assert!(!check("0x1", &kw, None).is_matched());
    assert!(!check("0x0", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
    assert!(!check(" ", &kw, None).is_matched());
    assert!(!check("1", &kw, None).is_matched());
    assert!(!check("1x", &kw, None).is_matched());
    assert!(!check("x1", &kw, None).is_matched());
}

// --- Number ---

#[test]
#[allow(clippy::similar_names)]
fn number_range() {
    let int_gt0 = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: Some(0.0),
        gte: None,
        lt: None,
        lte: None,
        clampable: false,
    });
    assert!(check("10", &int_gt0, None).is_matched());
    assert!(!check("0", &int_gt0, None).is_matched());

    let int_gte0 = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: None,
        gte: Some(0.0),
        lt: None,
        lte: None,
        clampable: false,
    });
    assert!(check("0", &int_gte0, None).is_matched());

    let int_lt10 = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: None,
        gte: None,
        lt: Some(10.0),
        lte: None,
        clampable: false,
    });
    assert!(check("9", &int_lt10, None).is_matched());
    assert!(!check("10", &int_lt10, None).is_matched());
}

// --- Non-existent types (graceful fallback) ---

#[test]
fn non_existent_types() {
    assert!(check("abc", &Type::Keyword("String".into()), None).is_matched());
    assert!(check("abc", &Type::Keyword("FooBar".into()), None).is_matched());
    assert!(check("abc", &Type::Keyword(" ".into()), None).is_matched());
    assert!(check("abc", &Type::Keyword("\n".into()), None).is_matched());
    assert!(check("abc", &Type::Keyword(String::new()), None).is_matched());
}

// --- ItemProp ---

#[test]
fn item_prop() {
    let kw = Type::Keyword("ItemProp".into());
    assert!(check("itemListElement", &kw, None).is_matched());
    assert!(check("item", &kw, None).is_matched());
    assert!(check("position", &kw, None).is_matched());
}

// --- legacy-transform (CSS type, falls back to matched) ---

#[test]
fn legacy_transform() {
    let kw = Type::Keyword("<'transform'>".into());
    assert!(check("translate(300)", &kw, None).is_matched());
    assert!(check("translate(300px)", &kw, None).is_matched());
    assert!(check("translate(300 300)", &kw, None).is_matched());
    assert!(check("translate(300px 300px)", &kw, None).is_matched());
    assert!(check("translate(300 , 300)", &kw, None).is_matched());
    assert!(check("translate(300px , 300px)", &kw, None).is_matched());
    assert!(check("translate(300,300)", &kw, None).is_matched());
    assert!(check("translate(300px,300px)", &kw, None).is_matched());
}

// --- Directive ---

#[test]
fn directive() {
    let dir = Type::Directive(DirectiveType {
        directive: vec![
            r"/^closest\s+(?<token>.+)$/".to_owned(),
            r"/^previous\s+(?<token>.+)$/".to_owned(),
            "next ".to_owned(),
        ],
        token: Box::new(Type::Keyword("<complex-selector-list>".into())),
        ref_: None,
    });

    assert!(check("closest #id", &dir, None).is_matched());
    assert!(check("closest .class", &dir, None).is_matched());
    assert!(check("closest type", &dir, None).is_matched());
    assert!(!check("closes type", &dir, None).is_matched());
    assert!(check("previous #id", &dir, None).is_matched());
    assert!(check("previous .class", &dir, None).is_matched());
    assert!(check("previous type", &dir, None).is_matched());
    assert!(!check("prev #id", &dir, None).is_matched());
    assert!(check("next #id", &dir, None).is_matched());
    assert!(!check("nex #id", &dir, None).is_matched());
    assert!(!check(" next #id", &dir, None).is_matched());
}

// --- JSON ---

#[test]
fn json() {
    let kw = Type::Keyword("JSON".into());
    assert!(check(r#"{"a": 1}"#, &kw, None).is_matched());
    assert!(!check(r#"{"a": 1"#, &kw, None).is_matched());
    assert!(!check(r#"{"a": 1,}"#, &kw, None).is_matched());
    assert!(check(r#"{"a": 1, "b": 2}"#, &kw, None).is_matched());
    assert!(!check(r#"{"a": 1, "b": 2"#, &kw, None).is_matched());
    assert!(!check(r#"{"a": 1, "b": 2,}"#, &kw, None).is_matched());
}

// --- Enum ---

#[test]
fn enum_basic() {
    let t = Type::Enum(EnumType {
        enum_values: vec!["closest".into(), "previous".into(), "next".into()],
        ..Default::default()
    });
    assert!(check("closest", &t, None).is_matched());
    assert!(check("previous", &t, None).is_matched());
    assert!(check("next", &t, None).is_matched());
    assert!(!check("unknown", &t, None).is_matched());
}

#[test]
fn enum_case_insensitive() {
    let t = Type::Enum(EnumType {
        enum_values: vec!["foo".into(), "bar".into()],
        case_insensitive: true,
        ..Default::default()
    });
    assert!(check("FOO", &t, None).is_matched());
    assert!(check("Bar", &t, None).is_matched());
}

#[test]
fn enum_case_sensitive() {
    let t = Type::Enum(EnumType {
        enum_values: vec!["foo".into(), "bar".into()],
        case_insensitive: false,
        ..Default::default()
    });
    assert!(check("foo", &t, None).is_matched());
    assert!(!check("FOO", &t, None).is_matched());
}

// --- List ---

#[test]
fn list_space_separated() {
    let t = Type::List(ListType {
        token: Box::new(Type::Keyword("Uint".into())),
        separator: Separator::Space,
        ..Default::default()
    });
    assert!(check("1 2 3", &t, None).is_matched());
    assert!(!check("1 2 abc", &t, None).is_matched());
}

#[test]
fn list_comma_separated() {
    let t = Type::List(ListType {
        token: Box::new(Type::Keyword("Uint".into())),
        separator: Separator::Comma,
        ..Default::default()
    });
    assert!(check("1,2,3", &t, None).is_matched());
    assert!(check("1, 2, 3", &t, None).is_matched());
}

#[test]
fn list_unique() {
    let t = Type::List(ListType {
        token: Box::new(Type::Keyword("Any".into())),
        separator: Separator::Space,
        unique: true,
        case_insensitive: true,
        ..Default::default()
    });
    assert!(check("a b c", &t, None).is_matched());
    assert!(!check("a b a", &t, None).is_matched());
    assert!(!check("a A", &t, None).is_matched());
}

#[test]
fn list_one_or_more() {
    let t = Type::List(ListType {
        token: Box::new(Type::Keyword("Uint".into())),
        separator: Separator::Space,
        number: Some(ListNumber::OneOrMore),
        allow_empty: false,
        ..Default::default()
    });
    assert!(check("1", &t, None).is_matched());
    assert!(!check("", &t, None).is_matched());
}

#[test]
fn list_comma_empty_tokens() {
    let t = Type::List(ListType {
        token: Box::new(Type::Keyword("Uint".into())),
        separator: Separator::Comma,
        allow_empty: false,
        ..Default::default()
    });
    // Trailing comma produces an empty token
    assert!(!check("1,2,", &t, None).is_matched());
    // Leading comma
    assert!(!check(",1,2", &t, None).is_matched());
}

// --- DateTime ---

#[test]
fn datetime() {
    let kw = Type::Keyword("DateTime".into());
    assert!(check("2024-01-01", &kw, None).is_matched());
    assert!(check("2024-01-01T12:00", &kw, None).is_matched());
    assert!(check("2024-01-01T12:00:00", &kw, None).is_matched());
    assert!(check("12:00", &kw, None).is_matched());
    assert!(!check("invalid", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
}

// --- AutoComplete ---

#[test]
fn autocomplete() {
    let kw = Type::Keyword("AutoComplete".into());
    assert!(check("name", &kw, None).is_matched());
    assert!(check("on", &kw, None).is_matched());
    assert!(check("off", &kw, None).is_matched());
    assert!(!check("xxx", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
}

// --- Accept ---

#[test]
fn accept() {
    let kw = Type::Keyword("Accept".into());
    assert!(check("image/*", &kw, None).is_matched());
    assert!(check("audio/*", &kw, None).is_matched());
    assert!(check("video/*", &kw, None).is_matched());
    assert!(check(".jpg", &kw, None).is_matched());
    assert!(check(".pdf", &kw, None).is_matched());
    assert!(check("text/html", &kw, None).is_matched());
    assert!(!check("foo", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
}

// --- BaseURL ---

#[test]
fn base_url() {
    let kw = Type::Keyword("BaseURL".into());
    assert!(check("https://example.com", &kw, None).is_matched());
    assert!(check("/path/to/page", &kw, None).is_matched());
    assert!(!check("data:text/html,<h1>Hello</h1>", &kw, None).is_matched());
    assert!(!check("javascript:alert(1)", &kw, None).is_matched());
}

// --- NavigableTargetNameOrKeyword ---

#[test]
fn navigable_target_name_or_keyword() {
    let kw = Type::Keyword("NavigableTargetNameOrKeyword".into());
    assert!(check("_blank", &kw, None).is_matched());
    assert!(check("_self", &kw, None).is_matched());
    assert!(check("_parent", &kw, None).is_matched());
    assert!(check("_top", &kw, None).is_matched());
    assert!(check("myframe", &kw, None).is_matched());
    // Typo keyword suggests candidate
    assert!(!check("_blnak", &kw, None).is_matched());
    // Unknown underscore-prefixed name
    assert!(!check("_foo", &kw, None).is_matched());
}

// --- TabIndex ---

#[test]
fn tab_index() {
    let kw = Type::Keyword("TabIndex".into());
    assert!(check("-1", &kw, None).is_matched());
    assert!(check("0", &kw, None).is_matched());
    assert!(check("1", &kw, None).is_matched());
    assert!(!check("abc", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
}

// --- SerializedPermissionsPolicy ---

#[test]
fn serialized_permissions_policy() {
    let kw = Type::Keyword("SerializedPermissionsPolicy".into());
    assert!(check("autoplay", &kw, None).is_matched());
    assert!(check("fullscreen", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
}

// --- SRIHash ---

#[test]
fn sri_hash() {
    let kw = Type::Keyword("SRIHash".into());
    assert!(check("sha256-abc123", &kw, None).is_matched());
    assert!(check("sha384-abc123==", &kw, None).is_matched());
    assert!(check("sha512-abc+def/ghi=", &kw, None).is_matched());
    assert!(check("sha256-abc123 sha384-def456", &kw, None).is_matched());
    assert!(!check("md5-abc123", &kw, None).is_matched());
    assert!(!check("sha1-abc123", &kw, None).is_matched());
    assert!(!check("", &kw, None).is_matched());
}

// --- Number edge cases ---

#[test]
fn number_empty() {
    let int_type = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: None,
        gte: None,
        lt: None,
        lte: None,
        clampable: false,
    });
    assert!(!check("", &int_type, None).is_matched());
}

#[test]
fn number_non_numeric() {
    let int_type = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: None,
        gte: None,
        lt: None,
        lte: None,
        clampable: false,
    });
    assert!(!check("abc", &int_type, None).is_matched());
    assert!(!check("12px", &int_type, None).is_matched());
}

#[test]
fn number_float_as_integer() {
    let int_type = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: None,
        gte: None,
        lt: None,
        lte: None,
        clampable: false,
    });
    assert!(!check("1.5", &int_type, None).is_matched());
    assert!(check("10", &int_type, None).is_matched());
}

#[test]
fn number_clampable() {
    let clamped = Type::Number(NumberType {
        number_type: NumericKind::Integer,
        gt: None,
        gte: Some(0.0),
        lt: None,
        lte: Some(100.0),
        clampable: true,
    });
    assert!(check("50", &clamped, None).is_matched());
    assert!(!check("-1", &clamped, None).is_matched());
    assert!(!check("101", &clamped, None).is_matched());
}
