pub mod candidate;
pub mod custom;
pub mod directive;
pub mod enum_check;
pub mod keyword_type;
pub mod list;
pub mod number;
pub mod pattern;
pub mod types;

use types::{CheckResult, Type};

/// The main entry point, corresponding to TS `check(value, type)`.
///
/// # Examples
///
/// ```
/// use markuplint_types::check::check;
/// use markuplint_types::check::types::Type;
///
/// // Keyword type
/// assert!(check("hello", &Type::Keyword("Any".into()), None).is_matched());
///
/// // Enum type
/// use markuplint_types::check::types::EnumType;
/// let t = Type::Enum(EnumType {
///     enum_values: vec!["foo".into(), "bar".into()],
///     ..Default::default()
/// });
/// assert!(check("foo", &t, None).is_matched());
/// assert!(!check("baz", &t, None).is_matched());
/// ```
#[must_use]
pub fn check(value: &str, type_def: &Type, ref_: Option<&str>) -> CheckResult {
    check_base(value, type_def, ref_)
}

fn check_base(value: &str, type_def: &Type, ref_: Option<&str>) -> CheckResult {
    match type_def {
        Type::Keyword(keyword) => keyword_type::check_keyword_type(value, keyword),
        Type::Enum(enum_type) => enum_check::check_enum(value, enum_type, ref_),
        Type::Number(number_type) => number::check_number(value, number_type, ref_),
        Type::Pattern(pattern_type) => pattern::check_pattern(value, pattern_type),
        Type::List(list_type) => list::check_list(value, list_type, |token| check_base(token, &list_type.token, ref_)),
        Type::Directive(directive_type) => directive::check_directive(value, directive_type, |token| {
            check_base(token, &directive_type.token, ref_)
        }),
    }
}
