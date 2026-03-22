use markuplint_types::primitive::{
    NumberType, is_float, is_int, is_non_zero_uint, is_quantity, is_uint, range, split_unit,
};

#[test]
fn int() {
    assert!(is_int("0"));
    assert!(is_int("1"));
    assert!(is_int("-0"));
    assert!(is_int("-1"));
    assert!(is_int("10"));
    assert!(is_int("100"));
    assert!(!is_int("1.00"));
    assert!(!is_int(".001"));
    assert!(!is_int(" 1 "));
    assert!(!is_int("- 1"));
}

#[test]
fn uint() {
    assert!(is_uint("0", None));
    assert!(is_uint("1", None));
    assert!(is_uint("10", None));
    assert!(is_uint("100", None));
    assert!(!is_uint("-0", None));
    assert!(!is_uint("-1", None));
    assert!(!is_uint("1.00", None));
    assert!(!is_uint(".001", None));
    assert!(!is_uint(" 1 ", None));
    assert!(!is_uint("- 1", None));
}

#[test]
fn uint_with_gt() {
    assert!(is_uint("5", Some(3)));
    assert!(!is_uint("3", Some(3)));
    assert!(!is_uint("2", Some(3)));
}

#[test]
fn float() {
    assert!(is_float("0"));
    assert!(is_float("1"));
    assert!(is_float("10"));
    assert!(is_float("100"));
    assert!(is_float("-0"));
    assert!(is_float("-1"));
    assert!(is_float("1.00"));
    assert!(is_float(".001"));
    assert!(!is_float(" 1 "));
    assert!(!is_float("- 1"));
}

#[test]
fn non_zero_uint() {
    assert!(!is_non_zero_uint("0"));
    assert!(is_non_zero_uint("1"));
    assert!(is_non_zero_uint("10"));
    assert!(is_non_zero_uint("100"));
    assert!(!is_non_zero_uint("-0"));
    assert!(!is_non_zero_uint("-1"));
    assert!(!is_non_zero_uint("1.00"));
    assert!(!is_non_zero_uint(".001"));
    assert!(!is_non_zero_uint(" 1 "));
    assert!(!is_non_zero_uint("- 1"));
}

#[test]
fn quantity() {
    assert!(is_quantity("0px", &["px", "em"], NumberType::Float));
    assert!(is_quantity(".5px", &["px", "em"], NumberType::Float));
    assert!(is_quantity("1.5em", &["px", "em"], NumberType::Float));
    assert!(!is_quantity("1.5cm", &["px", "em"], NumberType::Float));
    assert!(!is_quantity("1.5px", &["px", "em"], NumberType::Int));
    assert!(is_quantity("-5px", &["px", "em"], NumberType::Int));
    assert!(!is_quantity("-5px", &["px", "em"], NumberType::Uint));
    assert!(is_quantity("1.12e+21px", &["px", "em"], NumberType::Float));
    assert!(!is_quantity("1.12e+21px", &["px", "em"], NumberType::Int));
}

#[test]
fn test_split_unit() {
    let r = split_unit("10px");
    assert_eq!(r.num, "10");
    assert_eq!(r.unit, "px");

    let r = split_unit("1.5em");
    assert_eq!(r.num, "1.5");
    assert_eq!(r.unit, "em");

    let r = split_unit("-3.14rem");
    assert_eq!(r.num, "-3.14");
    assert_eq!(r.unit, "rem");

    let r = split_unit(".5px");
    assert_eq!(r.num, ".5");
    assert_eq!(r.unit, "px");

    let r = split_unit("1.12e+21px");
    assert_eq!(r.num, "1.12e+21");
    assert_eq!(r.unit, "px");

    let r = split_unit("42");
    assert_eq!(r.num, "42");
    assert_eq!(r.unit, "");
}

#[test]
fn test_range() {
    assert!(range("5", 0.0, 10.0));
    assert!(range("0", 0.0, 10.0));
    assert!(range("10", 0.0, 10.0));
    assert!(!range("-1", 0.0, 10.0));
    assert!(!range("11", 0.0, 10.0));
    assert!(!range("abc", 0.0, 10.0));
    assert!(range("3.14", 3.0, 4.0));
}
