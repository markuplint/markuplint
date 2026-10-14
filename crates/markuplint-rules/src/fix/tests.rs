use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr};

use super::{Fix, TextEdit};
use crate::test_util::html_arena;

/// The attribute at `index` of the first element of `html`.
fn attr_of(html: &str, index: usize) -> MLASTHTMLAttr {
    let arena = html_arena(html);
    let (_, el) = arena.elements().next().unwrap();
    match &el.attributes[index] {
        MLASTAttr::HTMLAttr(attr) => (**attr).clone(),
        other => panic!("not an HTML attribute: {other:?}"),
    }
}

#[test]
fn v6_fix_011_remove_attr_takes_the_space_before_it() {
    // ` id="b"` is bytes 14..21.
    let attr = attr_of(r#"<div class="a" id="b"></div>"#, 1);
    assert_eq!(Fix::remove_attr(&attr), Some(Fix::remove(14, 21)));
}

#[test]
fn v6_fix_012_remove_attr_takes_spaces_around_the_equal_sign() {
    // ` class = 'a'` is the whole attribute, from the space before its name.
    let attr = attr_of("<div class = 'a'></div>", 0);
    assert_eq!(Fix::remove_attr(&attr), Some(Fix::remove(4, 16)));
}

#[test]
fn v6_fix_013_remove_boolean_attr() {
    let attr = attr_of("<input disabled disabled />", 1);
    assert_eq!(Fix::remove_attr(&attr), Some(Fix::remove(15, 24)));
}

#[test]
fn v6_fix_014_remove_attr_value_keeps_the_name() {
    // `="a"` follows `class` (bytes 5..10).
    let attr = attr_of(r#"<div class="a"></div>"#, 0);
    assert_eq!(Fix::remove_attr_value(&attr), Some(Fix::remove(10, 14)));
}

#[test]
fn v6_fix_015_remove_attr_value_includes_spaces_around_the_equal_sign() {
    let attr = attr_of("<div class = 'a'></div>", 0);
    assert_eq!(Fix::remove_attr_value(&attr), Some(Fix::remove(10, 16)));
}

#[test]
fn v6_fix_016_remove_attr_value_of_a_boolean_attr_is_nothing() {
    let attr = attr_of("<input disabled>", 0);
    assert_eq!(Fix::remove_attr_value(&attr), None);
}

#[test]
fn v6_fix_001_replace_range_is_one_edit() {
    let fix = Fix::replace_range(3, 7, "x");
    assert_eq!(
        fix.edits,
        vec![TextEdit {
            range: [3, 7],
            text: "x".to_string()
        }]
    );
}

#[test]
fn v6_fix_002_insert_before_is_zero_width_at_start() {
    let fix = Fix::insert_before(5, "ab");
    assert_eq!(
        fix.edits,
        vec![TextEdit {
            range: [5, 5],
            text: "ab".to_string()
        }]
    );
}

#[test]
fn v6_fix_004_remove_replaces_the_range_with_nothing() {
    let fix = Fix::remove(1, 4);
    assert_eq!(
        fix.edits,
        vec![TextEdit {
            range: [1, 4],
            text: String::new()
        }]
    );
}

#[test]
fn v6_fix_005_ascii_source_keeps_offsets() {
    let mut fix = Fix::replace_range(3, 7, "x");
    fix.convert_to_utf16("<div class=a>");
    assert_eq!(fix.edits[0].range, [3, 7]);
}

#[test]
fn v6_fix_006_two_byte_chars_count_once() {
    // "é" is 2 bytes and 1 UTF-16 unit; `<p>é<b>` → `<b>` starts at byte 5, unit 4.
    let source = "<p>é<b>";
    let mut fix = Fix::replace_range(5, 8, "x");
    fix.convert_to_utf16(source);
    assert_eq!(fix.edits[0].range, [4, 7]);
}

#[test]
fn v6_fix_007_three_byte_chars_count_once() {
    // "日本" is 6 bytes and 2 UTF-16 units; `<b>` after it starts at byte 9, unit 5.
    let source = "<p>日本<b>";
    let mut fix = Fix::remove(9, 12);
    fix.convert_to_utf16(source);
    assert_eq!(fix.edits[0].range, [5, 8]);
}

#[test]
fn v6_fix_008_astral_chars_count_twice() {
    // "😀" is 4 bytes and 2 UTF-16 units; `<b>` after it starts at byte 7, unit 5.
    let source = "<p>😀<b>";
    let mut fix = Fix::insert_before(7, "x");
    fix.convert_to_utf16(source);
    assert_eq!(fix.edits[0].range, [5, 5]);
}

#[test]
fn v6_fix_009_end_of_source_converts() {
    let source = "é";
    let mut fix = Fix::insert_before(2, "x");
    fix.convert_to_utf16(source);
    assert_eq!(fix.edits[0].range, [1, 1]);
}

#[test]
fn v6_fix_017_offset_past_the_end_stays_at_the_end() {
    let mut fix = Fix::replace_range(2, 99, "x");
    fix.convert_to_utf16("é日");
    // "é" is 2 bytes / 1 unit and "日" 3 bytes / 1 unit, so the end is unit 2.
    assert_eq!(fix.edits[0].range, [1, 2]);
}

#[test]
fn v6_fix_018_offset_inside_a_character_takes_the_start_of_it() {
    // Byte 4 is the second byte of "日" (bytes 3..6), whose start is unit 3.
    let mut fix = Fix::insert_before(4, "x");
    fix.convert_to_utf16("<p>日");
    assert_eq!(fix.edits[0].range, [3, 3]);
}

#[test]
fn v6_fix_010_serializes_as_the_ts_fix_data() {
    let fix = Fix::replace_range(1, 2, "x");
    let json = serde_json::to_value(&fix).unwrap();
    assert_eq!(json, serde_json::json!({ "edits": [{ "range": [1, 2], "text": "x" }] }));
}
