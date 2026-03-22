use markuplint_types::simple_patterns::{
    is_dom_id, is_hash_name, is_no_empty_any, is_one_code_point_char, is_one_line_any, is_valid_custom_command,
    is_xml_name, is_zero,
};

#[test]
fn zero() {
    assert!(is_zero("0"));
    assert!(!is_zero("1"));
    assert!(!is_zero(""));
    assert!(!is_zero("00"));
    assert!(!is_zero("0.0"));
}

#[test]
fn no_empty_any() {
    assert!(is_no_empty_any("a"));
    assert!(is_no_empty_any(" "));
    assert!(is_no_empty_any("hello world"));
    assert!(!is_no_empty_any(""));
}

#[test]
fn one_line_any() {
    assert!(is_one_line_any("hello"));
    assert!(is_one_line_any("hello world"));
    assert!(is_one_line_any(""));
    assert!(is_one_line_any("\t")); // tab is not a newline
    assert!(!is_one_line_any("hello\nworld"));
    assert!(!is_one_line_any("hello\rworld"));
    assert!(!is_one_line_any("\n"));
    assert!(!is_one_line_any("\r"));
}

#[test]
fn dom_id() {
    assert!(is_dom_id("my-id"));
    assert!(is_dom_id("a"));
    assert!(is_dom_id("123"));
    assert!(!is_dom_id(""));
    assert!(!is_dom_id("my id"));
    assert!(!is_dom_id(" id"));
    assert!(!is_dom_id("id "));
    assert!(!is_dom_id("a\tb"));
    assert!(!is_dom_id("a\nb"));
}

#[test]
fn hash_name() {
    assert!(is_hash_name("#foo"));
    assert!(is_hash_name("#"));
    assert!(!is_hash_name("foo"));
    assert!(!is_hash_name(""));
}

#[test]
fn one_code_point_char() {
    assert!(is_one_code_point_char("a"));
    assert!(is_one_code_point_char("1"));
    assert!(is_one_code_point_char(" "));
    assert!(!is_one_code_point_char(""));
    assert!(!is_one_code_point_char("ab"));
    assert!(!is_one_code_point_char("abc"));
}

#[test]
fn valid_custom_command() {
    assert!(is_valid_custom_command("--foo"));
    assert!(is_valid_custom_command("--a"));
    assert!(is_valid_custom_command("---"));
    assert!(!is_valid_custom_command("--"));
    assert!(!is_valid_custom_command("-foo"));
    assert!(!is_valid_custom_command("foo"));
    assert!(!is_valid_custom_command(""));
}

#[test]
fn xml_name() {
    assert!(is_xml_name("div"));
    assert!(is_xml_name("my-element"));
    assert!(is_xml_name("_private"));
    assert!(is_xml_name(":namespaced"));
    assert!(is_xml_name("a1"));
    assert!(is_xml_name("foo.bar"));
    assert!(is_xml_name("\u{00C0}")); // Latin capital letter A with grave
    assert!(!is_xml_name(""));
    assert!(!is_xml_name("1abc")); // starts with digit
    assert!(!is_xml_name("-abc")); // starts with hyphen
    assert!(!is_xml_name(".abc")); // starts with dot
}
