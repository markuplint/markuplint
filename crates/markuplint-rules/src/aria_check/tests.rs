//! Tests for the shared ARIA rule machinery. These have no TS counterpart: the TS side tests it
//! only through the rules.

use super::*;
use crate::rule::{RuleConfig, RuleConfigSet};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn html_arena(html: &str) -> DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn node_id(arena: &DomArena, name: &str) -> NodeId {
    arena
        .elements()
        .find(|(_, el)| el.base.node_name == name)
        .map(|(id, _)| id)
        .unwrap()
}

fn aria_of(html: &str, name: &str, version: ARIAVersion) -> ResolvedElementARIA {
    let arena = html_arena(html);
    get_element_aria(&spec(), &arena, node_id(&arena, name), name, version).unwrap()
}

fn role_attr_of(html: &str) -> MLASTHTMLAttr {
    let arena = html_arena(html);
    let (_, el) = arena.elements().next().unwrap();
    role_attr(el).unwrap().clone()
}

fn token(value: &str, line: u32, col: u32) -> RoleToken {
    RoleToken {
        value: value.to_string(),
        line,
        col,
    }
}

fn config_set() -> RuleConfigSet {
    RuleConfigSet::global_only(RuleConfig::default())
}

// ============================================================
// resolve_aria_version
// ============================================================

#[test]
fn version_defaults_to_recommended() {
    let version = resolve_aria_version(&Value::Null, &RuleCommonSettings::default());
    assert_eq!(version, ARIAVersion::V1_3);
}

#[test]
fn version_from_options() {
    let options = serde_json::json!({ "version": "1.2" });
    assert_eq!(
        resolve_aria_version(&options, &RuleCommonSettings::default()),
        ARIAVersion::V1_2
    );
}

#[test]
fn version_from_common_settings() {
    let common: RuleCommonSettings = serde_json::from_str(r#"{ "ariaVersion": "1.1" }"#).unwrap();
    assert_eq!(resolve_aria_version(&Value::Null, &common), ARIAVersion::V1_1);
}

#[test]
fn version_option_wins_over_common_settings() {
    let options = serde_json::json!({ "version": "1.2" });
    let common: RuleCommonSettings = serde_json::from_str(r#"{ "ariaVersion": "1.1" }"#).unwrap();
    assert_eq!(resolve_aria_version(&options, &common), ARIAVersion::V1_2);
}

#[test]
fn version_unknown_value_falls_through() {
    let options = serde_json::json!({ "version": "9.9" });
    let common: RuleCommonSettings = serde_json::from_str(r#"{ "ariaVersion": "1.1" }"#).unwrap();
    assert_eq!(resolve_aria_version(&options, &common), ARIAVersion::V1_1);
}

#[test]
fn common_settings_accept_snake_case_key() {
    let common: RuleCommonSettings = serde_json::from_str(r#"{ "aria_version": "1.2" }"#).unwrap();
    assert_eq!(common.aria_version.as_deref(), Some("1.2"));
}

#[test]
fn common_settings_reach_the_walker() {
    let arena = html_arena("<div></div>");
    let spec = spec();
    let common: RuleCommonSettings = serde_json::from_str(r#"{ "ariaVersion": "1.1" }"#).unwrap();
    let config = config_set().with_common_settings(common);

    let mut seen = Vec::new();
    walk_elements(
        "test",
        &arena,
        &spec,
        &config,
        ElementGate::Supported,
        |_| (),
        |(), ctx, _| seen.push(ctx.version),
    );
    assert_eq!(seen, vec![ARIAVersion::V1_1]);
}

// ============================================================
// walk_elements
// ============================================================

fn walked(html: &str, spec: &MLMLSpec, gate: ElementGate) -> Vec<String> {
    let arena = html_arena(html);
    let mut names = Vec::new();
    walk_elements(
        "test",
        &arena,
        spec,
        &config_set(),
        gate,
        |_| (),
        |(), ctx, _| names.push(ctx.el_name.to_string()),
    );
    names
}

fn spec_with_aria_unsupported_div() -> MLMLSpec {
    let mut spec = spec();
    let div = spec.specs.iter_mut().find(|s| s.name == "div").unwrap();
    div.global_attrs.insert("#ARIAAttrs".to_string(), Value::Bool(false));
    spec
}

#[test]
fn gate_aria_supported_needs_a_spec_with_the_flag() {
    let spec = spec_with_aria_unsupported_div();
    // `my-element` has no spec, `div` has the flag turned off.
    let names = walked(
        "<my-element></my-element><div></div><span></span>",
        &spec,
        ElementGate::Supported,
    );
    assert_eq!(names, vec!["span"]);
}

#[test]
fn gate_aria_unsupported_is_the_inverse_and_still_needs_a_spec() {
    let spec = spec_with_aria_unsupported_div();
    let names = walked(
        "<my-element></my-element><div></div><span></span>",
        &spec,
        ElementGate::Unsupported,
    );
    assert_eq!(names, vec!["div"]);
}

#[test]
fn gate_web_component_lets_spec_less_custom_elements_through() {
    let spec = spec_with_aria_unsupported_div();
    let names = walked(
        "<my-element></my-element><div></div><span></span>",
        &spec,
        ElementGate::SupportedOrWebComponent,
    );
    assert_eq!(names, vec!["my-element", "span"]);
}

#[test]
fn walk_skips_when_globally_disabled() {
    let arena = html_arena("<div></div>");
    let config = RuleConfigSet::global_only(RuleConfig {
        value: Value::Bool(false),
        ..RuleConfig::default()
    });
    let mut count = 0;
    walk_elements(
        "test",
        &arena,
        &spec(),
        &config,
        ElementGate::Supported,
        |_| (),
        |(), _, _| count += 1,
    );
    assert_eq!(count, 0);
}

#[test]
fn walk_skips_when_disabled_by_config() {
    let arena = html_arena("<div></div>");
    let config = RuleConfigSet::global_only(RuleConfig {
        disabled: true,
        ..RuleConfig::default()
    });
    let mut count = 0;
    walk_elements(
        "test",
        &arena,
        &spec(),
        &config,
        ElementGate::Supported,
        |_| (),
        |(), _, _| count += 1,
    );
    assert_eq!(count, 0);
}

// ============================================================
// Report scopes
// ============================================================

#[test]
fn attr_scope_starts_at_the_name_and_covers_the_attribute() {
    let arena = html_arena(r#"<div role="button"></div>"#);
    let violations = walk_elements(
        "test",
        &arena,
        &spec(),
        &config_set(),
        ElementGate::Supported,
        |_| (),
        |(), ctx, out| out.push(ctx.attr_violation(role_attr(ctx.el).unwrap(), "msg")),
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "test");
    assert_eq!(violations[0].message, "msg");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 6);
    assert_eq!(violations[0].raw, "role=\"button\"");
}

#[test]
fn element_scope_is_the_start_tag() {
    let arena = html_arena("<div\n  class=\"a\"></div>");
    let violations = walk_elements(
        "test",
        &arena,
        &spec(),
        &config_set(),
        ElementGate::Supported,
        |_| (),
        |(), ctx, out| out.push(ctx.element_violation("msg")),
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, "<div\n  class=\"a\">");
}

#[test]
fn token_scope_is_the_token() {
    let arena = html_arena(r#"<div role="button hoge"></div>"#);
    let violations = walk_elements(
        "test",
        &arena,
        &spec(),
        &config_set(),
        ElementGate::Supported,
        |_| (),
        |(), ctx, out| {
            let tokens = role_tokens(role_attr(ctx.el).unwrap());
            out.push(ctx.token_violation(&tokens[1], "msg"));
        },
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 19);
    assert_eq!(violations[0].raw, "hoge");
}

#[test]
fn reason_and_severity_come_from_the_rule_config() {
    let arena = html_arena("<div></div>");
    let config = RuleConfigSet::global_only(RuleConfig {
        severity: Severity::Warning,
        reason: Some("because".to_string()),
        ..RuleConfig::default()
    });
    let violations = walk_elements(
        "test",
        &arena,
        &spec(),
        &config,
        ElementGate::Supported,
        |_| (),
        |(), ctx, out| out.push(ctx.element_violation("msg")),
    );
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].reason.as_deref(), Some("because"));
}

// ============================================================
// Attributes
// ============================================================

#[test]
fn aria_prop_attrs_are_the_aria_prefixed_ones_case_insensitively() {
    let arena = html_arena(r#"<div role="button" aria-pressed="false" ARIA-LABEL="x" data-aria-foo class="a"></div>"#);
    let (_, el) = arena.elements().next().unwrap();
    let names: Vec<&str> = aria_prop_attrs(el).into_iter().map(attr_name).collect();
    assert_eq!(names, vec!["aria-pressed", "ARIA-LABEL"]);
}

#[test]
fn role_attr_is_found_case_insensitively() {
    let arena = html_arena(r#"<div ROLE="button"></div>"#);
    let (_, el) = arena.elements().next().unwrap();
    assert_eq!(role_attr(el).map(attr_name), Some("ROLE"));
}

#[test]
fn prop_type_labels() {
    assert_eq!(prop_type_label(&ARIAPropertyType::Property), "property");
    assert_eq!(prop_type_label(&ARIAPropertyType::State), "state");
}

#[test]
fn find_element_by_id_returns_the_first_match_in_document_order() {
    let arena = html_arena(r#"<div id="a"></div><p id="b"></p><span id="b"></span>"#);
    let found = markuplint_dom::helpers::find_element_by_id(&arena, "b").unwrap();
    assert_eq!(found, node_id(&arena, "p"));
    assert_eq!(markuplint_dom::helpers::find_element_by_id(&arena, "B"), None);
    assert_eq!(markuplint_dom::helpers::find_element_by_id(&arena, "none"), None);
}

// ============================================================
// role_tokens
// ============================================================

#[test]
fn role_tokens_single_token() {
    let attr = role_attr_of(r#"<div role="button"></div>"#);
    assert_eq!(role_tokens(&attr), vec![token("button", 1, 12)]);
}

#[test]
fn role_tokens_multiple_spaces_between_tokens() {
    let attr = role_attr_of(r#"<div role="a   b"></div>"#);
    assert_eq!(role_tokens(&attr), vec![token("a", 1, 12), token("b", 1, 16)]);
}

#[test]
fn role_tokens_leading_and_trailing_whitespace() {
    let attr = role_attr_of(r#"<div role="  a b  "></div>"#);
    assert_eq!(role_tokens(&attr), vec![token("a", 1, 14), token("b", 1, 16)]);
}

#[test]
fn role_tokens_repeated_and_nested_tokens_keep_their_own_positions() {
    let attr = role_attr_of(r#"<div role="button b button"></div>"#);
    assert_eq!(
        role_tokens(&attr),
        vec![token("button", 1, 12), token("b", 1, 19), token("button", 1, 21)]
    );
}

#[test]
fn role_tokens_multi_line_value() {
    let attr = role_attr_of("<div role=\"a\n  b c\"></div>");
    assert_eq!(
        role_tokens(&attr),
        vec![token("a", 1, 12), token("b", 2, 3), token("c", 2, 5)]
    );
}

#[test]
fn role_tokens_multi_line_value_with_crlf() {
    let attr = role_attr_of("<div role=\"a\r\nb\"></div>");
    assert_eq!(role_tokens(&attr), vec![token("a", 1, 12), token("b", 2, 1)]);
}

#[test]
fn role_tokens_tab_and_newline_separate_tokens() {
    let attr = role_attr_of("<div role=\"a\tb\nc\"></div>");
    assert_eq!(
        role_tokens(&attr),
        vec![token("a", 1, 12), token("b", 1, 14), token("c", 2, 1)]
    );
}

#[test]
fn role_tokens_empty_and_valueless() {
    assert_eq!(role_tokens(&role_attr_of(r#"<div role=""></div>"#)), vec![]);
    assert_eq!(role_tokens(&role_attr_of(r#"<div role="   "></div>"#)), vec![]);
    assert_eq!(role_tokens(&role_attr_of("<div role></div>")), vec![]);
}

#[test]
fn role_tokens_dynamic_value_has_no_token_list() {
    let mut attr = role_attr_of(r#"<div role="button"></div>"#);
    attr.is_dynamic_value = Some(true);
    assert_eq!(role_tokens(&attr), vec![]);
}

#[test]
fn role_tokens_columns_count_characters() {
    let attr = role_attr_of("<div role=\"あ b\"></div>");
    assert_eq!(role_tokens(&attr), vec![token("あ", 1, 12), token("b", 1, 14)]);
}

// ============================================================
// get_element_aria
// ============================================================

#[test]
fn aria_of_unknown_element_is_none() {
    let arena = html_arena("<my-element></my-element>");
    let id = node_id(&arena, "my-element");
    assert_eq!(
        get_element_aria(&spec(), &arena, id, "my-element", ARIAVersion::V1_3),
        None
    );
}

#[test]
fn aria_base_values() {
    let aria = aria_of("<abbr></abbr>", "abbr", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role, None);
    assert_eq!(aria.permitted_roles, PermittedRoles::Any);
    assert!(aria.naming_prohibited);
    assert_eq!(aria.properties, ElementProperties::Unspecified);
}

#[test]
fn aria_implicit_properties() {
    let aria = aria_of("<h1></h1>", "h1", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role.as_deref(), Some("heading"));
    assert_eq!(
        aria.implicit_properties,
        vec![("aria-level".to_string(), "1".to_string())]
    );
}

#[test]
fn aria_aam_info_in_svg() {
    let aria = aria_of("<svg></svg>", "svg", ARIAVersion::V1_3);
    assert_eq!(
        aria.permitted_roles,
        PermittedRoles::Aam {
            core_aam: true,
            graphics_aam: true
        }
    );
}

#[test]
fn aria_properties_only_and_version_override() {
    let only = ElementProperties::Constrained(PropertiesConstraint {
        only: Some(vec![OnlyEntry {
            name: "aria-hidden".to_string(),
            value: None,
        }]),
        ..PropertiesConstraint::default()
    });
    assert_eq!(aria_of("<br>", "br", ARIAVersion::V1_3).properties, only);
    assert_eq!(aria_of("<br>", "br", ARIAVersion::V1_2).properties, only);

    // The `1.1` block replaces `properties` wholesale.
    assert_eq!(
        aria_of("<br>", "br", ARIAVersion::V1_1).properties,
        ElementProperties::Constrained(PropertiesConstraint {
            global: true,
            role: Some(RoleProperties::Allowed),
            ..PropertiesConstraint::default()
        })
    );
}

#[test]
fn aria_properties_false_from_a_condition() {
    let aria = aria_of(r#"<input type="hidden">"#, "input", ARIAVersion::V1_3);
    assert_eq!(aria.properties, ElementProperties::Disallowed);

    let aria = aria_of("<meta>", "meta", ARIAVersion::V1_3);
    assert_eq!(aria.properties, ElementProperties::Disallowed);
}

#[test]
fn aria_properties_without_from_a_condition() {
    let aria = aria_of(r#"<input type="checkbox">"#, "input", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role.as_deref(), Some("checkbox"));
    assert_eq!(
        aria.properties,
        ElementProperties::Constrained(PropertiesConstraint {
            global: true,
            role: Some(RoleProperties::Allowed),
            without: Some(vec![WithoutEntry {
                name: "aria-checked".to_string(),
                value: None,
                restriction: Restriction::MustNot,
                alt: Some(WithoutAlt {
                    method: AltMethod::SetAttr,
                    target: "checked".to_string(),
                }),
            }]),
            ..PropertiesConstraint::default()
        })
    );
}

#[test]
fn aria_properties_without_with_a_value_and_remove_attr() {
    let aria = aria_of(r##"<a href="#"></a>"##, "a", ARIAVersion::V1_3);
    assert_eq!(
        aria.properties,
        ElementProperties::Constrained(PropertiesConstraint {
            global: true,
            role: Some(RoleProperties::Allowed),
            without: Some(vec![WithoutEntry {
                name: "aria-disabled".to_string(),
                value: Some("true".to_string()),
                restriction: Restriction::NotRecommended,
                alt: Some(WithoutAlt {
                    method: AltMethod::RemoveAttr,
                    target: "href".to_string(),
                }),
            }]),
            ..PropertiesConstraint::default()
        })
    );
}

#[test]
fn aria_version_conditions_replace_the_base_conditions() {
    // In 1.3 the checkbox condition says "must-not"; the `1.1` block's own conditions say
    // "should-not" (the block carries conditions of its own, so the base ones are not applied).
    let aria = aria_of(r#"<input type="checkbox">"#, "input", ARIAVersion::V1_1);
    let ElementProperties::Constrained(constraint) = aria.properties else {
        panic!("expected a constraint");
    };
    assert_eq!(constraint.without.unwrap()[0].restriction, Restriction::ShouldNot);
}

#[test]
fn aria_every_matching_condition_applies_later_wins() {
    // `aside` inside an `article` matches the first condition (generic, naming prohibited);
    // with a name it matches the second as well, which sets the role back but leaves
    // `namingProhibited` from the first.
    let aria = aria_of("<article><aside></aside></article>", "aside", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role.as_deref(), Some("generic"));
    assert!(aria.naming_prohibited);

    let aria = aria_of(
        r#"<article><aside aria-label="x"></aside></article>"#,
        "aside",
        ARIAVersion::V1_3,
    );
    assert_eq!(aria.implicit_role.as_deref(), Some("complementary"));
    assert!(aria.naming_prohibited);

    let aria = aria_of("<aside></aside>", "aside", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role.as_deref(), Some("complementary"));
    assert!(!aria.naming_prohibited);
}

#[test]
fn aria_version_block_can_remove_the_conditions() {
    // `aside["1.2"].conditions` is `false`.
    let aria = aria_of("<article><aside></aside></article>", "aside", ARIAVersion::V1_2);
    assert_eq!(aria.implicit_role.as_deref(), Some("complementary"));
    assert!(!aria.naming_prohibited);
}

#[test]
fn aria_naming_prohibited_ignores_the_1_1_block() {
    let mut spec = spec();
    let div = spec.specs.iter_mut().find(|s| s.name == "div").unwrap();
    div.aria = serde_json::from_str(
        r#"{ "implicitRole": "generic", "permittedRoles": true, "namingProhibited": true,
             "1.1": { "namingProhibited": false, "implicitRole": "group" },
             "1.2": { "namingProhibited": false, "implicitRole": "group" } }"#,
    )
    .unwrap();
    let arena = html_arena("<div></div>");
    let id = node_id(&arena, "div");

    // `namingProhibited` was introduced in ARIA 1.2, so the `1.1` block's value is not read
    // (the other fields of the block still are).
    let v1_1 = get_element_aria(&spec, &arena, id, "div", ARIAVersion::V1_1).unwrap();
    assert_eq!(v1_1.implicit_role.as_deref(), Some("group"));
    assert!(v1_1.naming_prohibited);
    let v1_2 = get_element_aria(&spec, &arena, id, "div", ARIAVersion::V1_2).unwrap();
    assert_eq!(v1_2.implicit_role.as_deref(), Some("group"));
    assert!(!v1_2.naming_prohibited);
    let v1_3 = get_element_aria(&spec, &arena, id, "div", ARIAVersion::V1_3).unwrap();
    assert_eq!(v1_3.implicit_role.as_deref(), Some("generic"));
    assert!(v1_3.naming_prohibited);
}

#[test]
fn aria_conditions_apply_in_source_order() {
    let mut spec = spec();
    let div = spec.specs.iter_mut().find(|s| s.name == "div").unwrap();
    // The selectors are listed in the reverse of alphabetical order on purpose.
    div.aria = serde_json::from_str(
        r#"{ "implicitRole": "generic", "permittedRoles": true,
             "conditions": {
               "[data-b]": { "implicitRole": "banner" },
               "[data-a]": { "implicitRole": "navigation", "namingProhibited": true }
             } }"#,
    )
    .unwrap();
    let arena = html_arena("<div data-a data-b></div>");
    let id = node_id(&arena, "div");

    let aria = get_element_aria(&spec, &arena, id, "div", ARIAVersion::V1_3).unwrap();
    assert_eq!(aria.implicit_role.as_deref(), Some("navigation"));
    assert!(aria.naming_prohibited);
}

#[test]
fn aria_condition_with_an_unparsable_selector_is_skipped() {
    let mut spec = spec();
    let div = spec.specs.iter_mut().find(|s| s.name == "div").unwrap();
    div.aria = serde_json::from_str(
        r#"{ "implicitRole": "generic", "permittedRoles": true,
             "conditions": {
               "[[[": { "implicitRole": "button" },
               "div": { "namingProhibited": true }
             } }"#,
    )
    .unwrap();
    let arena = html_arena("<div></div>");
    let id = node_id(&arena, "div");

    let aria = get_element_aria(&spec, &arena, id, "div", ARIAVersion::V1_3).unwrap();
    assert_eq!(aria.implicit_role.as_deref(), Some("generic"));
    assert!(aria.naming_prohibited);
}

#[test]
fn aria_condition_false_values_replace_the_base() {
    // `img[alt=""]`: `implicitRole` becomes `presentation`, `permittedRoles` becomes `false`.
    let aria = aria_of(r#"<img alt="">"#, "img", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role.as_deref(), Some("presentation"));
    assert_eq!(aria.permitted_roles, PermittedRoles::Nothing);
    assert_eq!(
        aria.properties,
        ElementProperties::Constrained(PropertiesConstraint {
            only: Some(vec![OnlyEntry {
                name: "aria-hidden".to_string(),
                value: Some("true".to_string()),
            }]),
            ..PropertiesConstraint::default()
        })
    );

    let aria = aria_of(r#"<img alt="x">"#, "img", ARIAVersion::V1_3);
    assert_eq!(aria.implicit_role.as_deref(), Some("img"));
    assert!(matches!(aria.permitted_roles, PermittedRoles::Roles(_)));
}

#[test]
fn aria_permitted_roles_by_version() {
    let names = |aria: &ResolvedElementARIA| match &aria.permitted_roles {
        PermittedRoles::Roles(roles) => roles.iter().map(|r| r.name.clone()).collect::<Vec<_>>(),
        other => panic!("expected a list, got {other:?}"),
    };
    // `math` is permitted on `img` from ARIA 1.2; the `1.1` block lists the roles without it.
    assert!(names(&aria_of(r#"<img alt="x">"#, "img", ARIAVersion::V1_3)).contains(&"math".to_string()));
    assert!(!names(&aria_of(r#"<img alt="x">"#, "img", ARIAVersion::V1_1)).contains(&"math".to_string()));
}

#[test]
fn aria_permitted_roles_keep_deprecated_flag() {
    let aria = aria_of("<ul></ul>", "ul", ARIAVersion::V1_3);
    let PermittedRoles::Roles(roles) = aria.permitted_roles else {
        panic!("expected a list");
    };
    let directory = roles.iter().find(|r| r.name == "directory").unwrap();
    assert!(directory.deprecated);
    let list = roles.iter().find(|r| r.name == "list").map(|r| r.deprecated);
    assert_eq!(list, None);
}

// ============================================================
// optimize_permitted_roles
// ============================================================

fn roles(names: &[&str]) -> PermittedRoles {
    PermittedRoles::Roles(
        names
            .iter()
            .map(|name| PermittedRole {
                name: (*name).to_string(),
                deprecated: false,
            })
            .collect(),
    )
}

#[test]
fn optimize_presentation_and_none_imply_each_other() {
    assert_eq!(
        optimize_permitted_roles(roles(&["presentation", "button"]), ARIAVersion::V1_2),
        roles(&["button", "none", "presentation"])
    );
    assert_eq!(
        optimize_permitted_roles(roles(&["none"]), ARIAVersion::V1_1),
        roles(&["none", "presentation"])
    );
}

#[test]
fn optimize_img_and_image_imply_each_other_only_in_1_3() {
    assert_eq!(
        optimize_permitted_roles(roles(&["img"]), ARIAVersion::V1_3),
        roles(&["image", "img"])
    );
    assert_eq!(
        optimize_permitted_roles(roles(&["image"]), ARIAVersion::V1_3),
        roles(&["image", "img"])
    );
    assert_eq!(
        optimize_permitted_roles(roles(&["img"]), ARIAVersion::V1_2),
        roles(&["img"])
    );
}

#[test]
fn optimize_makes_the_list_unique_and_sorted() {
    assert_eq!(
        optimize_permitted_roles(roles(&["tab", "button", "tab"]), ARIAVersion::V1_3),
        roles(&["button", "tab"])
    );
}

#[test]
fn optimize_leaves_non_lists_alone() {
    assert_eq!(
        optimize_permitted_roles(PermittedRoles::Any, ARIAVersion::V1_3),
        PermittedRoles::Any
    );
    assert_eq!(
        optimize_permitted_roles(PermittedRoles::Nothing, ARIAVersion::V1_3),
        PermittedRoles::Nothing
    );
}

#[test]
fn optimize_deprecated_entry_does_not_add_a_synonym() {
    let deprecated_presentation = PermittedRoles::Roles(vec![PermittedRole {
        name: "presentation".to_string(),
        deprecated: true,
    }]);
    assert_eq!(
        optimize_permitted_roles(deprecated_presentation.clone(), ARIAVersion::V1_3),
        deprecated_presentation
    );
}
