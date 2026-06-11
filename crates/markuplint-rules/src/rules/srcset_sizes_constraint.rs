//! `srcset-sizes-constraint` rule: enforces WHATWG constraints between
//! `srcset`, `sizes`, and `loading` attributes on `<img>` and `<source>` elements.

use std::sync::LazyLock;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfig, RuleConfigSet};
use crate::violation::Violation;

static WIDTH_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[1-9]\d*w$").unwrap());
static DENSITY_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\d+(?:\.\d+)?x$").unwrap());

pub struct SrcsetSizesConstraint;

impl Rule for SrcsetSizesConstraint {
    fn id(&self) -> &'static str {
        "srcset-sizes-constraint"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || el.is_ghost {
                continue;
            }
            check_element(self.id(), arena, node_id, el, rule_config, &mut violations);
        }

        violations
    }
}

fn check_element(
    rule_id: &str,
    arena: &DomArena,
    node_id: NodeId,
    el: &ElementData,
    rule_config: &RuleConfig,
    violations: &mut Vec<Violation>,
) {
    let tag = el.base.node_name.as_str();
    if tag != "img" && tag != "source" {
        return;
    }

    // source is only relevant inside <picture>
    if tag == "source" && !is_in_picture(arena, el) {
        return;
    }

    let Some(srcset_value) = helpers::get_attr_value_from_el(el, "srcset") else {
        return;
    };

    let sizes_value = helpers::get_attr_value_from_el(el, "sizes");
    let parsed = parse_srcset(srcset_value);

    // Check 2: width and density descriptors must not be mixed
    if parsed.has_width && (parsed.has_density || parsed.has_implied) {
        violations.push(make_violation(
            rule_id,
            rule_config,
            "The \"srcset\" attribute must not mix width and pixel density descriptors",
            el,
            srcset_value,
        ));
    }

    // Check 1: sizes present → srcset must use width descriptors
    if sizes_value.is_some() && !parsed.has_width {
        violations.push(make_violation(
            rule_id,
            rule_config,
            "The \"srcset\" attribute requires width descriptors when the \"sizes\" attribute is present",
            el,
            srcset_value,
        ));
    }

    // Check 3: img[sizes=auto] → loading=lazy required
    if tag == "img" && sizes_value.is_some_and(has_sizes_auto) {
        let loading = helpers::get_attr_value_from_el(el, "loading");
        if loading != Some("lazy") {
            violations.push(make_violation(
                rule_id,
                rule_config,
                "The \"sizes\" attribute with \"auto\" requires the \"loading\" attribute to be \"lazy\"",
                el,
                sizes_value.unwrap(),
            ));
        }
    }

    // Check 4: source[sizes=auto] → following sibling img must have loading=lazy
    if tag == "source" && sizes_value.is_some_and(has_sizes_auto) {
        let img_loading = find_following_img_loading(arena, node_id);
        if img_loading != Some("lazy") {
            violations.push(make_violation(
                rule_id,
                rule_config,
                "The \"source\" element with sizes=\"auto\" requires the following sibling \"img\" element to have loading=\"lazy\"",
                el,
                sizes_value.unwrap(),
            ));
        }
    }

    // Check 5: img with w descriptors → sizes required
    if tag == "img" && parsed.has_width && sizes_value.is_none() {
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity: rule_config.severity,
            message: "The \"sizes\" attribute is required when the \"srcset\" attribute uses width descriptors"
                .to_string(),
            line: el.base.line,
            col: el.base.col,
            raw: el.base.raw.clone(),
            reason: None,
        });
    }
}

fn is_in_picture(arena: &DomArena, el: &ElementData) -> bool {
    el.base
        .parent
        .and_then(|pid| arena.get(pid))
        .and_then(|n| n.as_element())
        .is_some_and(|p| p.base.node_name == "picture")
}

fn make_violation(rule_id: &str, rule_config: &RuleConfig, message: &str, el: &ElementData, raw: &str) -> Violation {
    Violation {
        rule_id: rule_id.to_string(),
        name: None,
        severity: rule_config.severity,
        message: message.to_string(),
        line: el.base.line,
        col: el.base.col,
        raw: raw.to_string(),
        reason: None,
    }
}

struct ParseResult {
    has_width: bool,
    has_density: bool,
    has_implied: bool,
}

fn parse_srcset(value: &str) -> ParseResult {
    let raw = value.trim();
    if raw.is_empty() {
        return ParseResult {
            has_width: false,
            has_density: false,
            has_implied: false,
        };
    }

    let mut has_width = false;
    let mut has_density = false;
    let mut has_implied = false;

    for segment in raw.split(',') {
        let tokens: Vec<&str> = segment.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }

        if let Some(descriptor) = tokens.get(1) {
            if WIDTH_RE.is_match(descriptor) {
                has_width = true;
            } else if DENSITY_RE.is_match(descriptor) {
                has_density = true;
            }
        } else {
            has_implied = true;
        }
    }

    ParseResult {
        has_width,
        has_density,
        has_implied,
    }
}

fn has_sizes_auto(value: &str) -> bool {
    let v = value.trim().to_ascii_lowercase();
    v == "auto" || v.starts_with("auto ") || v.starts_with("auto,")
}

fn find_following_img_loading(arena: &DomArena, node_id: NodeId) -> Option<&str> {
    let mut current_id = node_id;
    loop {
        let next_id = arena.get(current_id)?.base()?.next_sibling?;
        if let Some(DomNode::Element(el)) = arena.get(next_id)
            && el.base.node_name == "img"
        {
            return helpers::get_attr_value_from_el(el, "loading");
        }
        current_id = next_id;
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::rule::RuleConfigSet;
    use crate::violation::Severity;

    fn html_arena(html: &str) -> DomArena {
        let as_doc = markuplint_html_parser::should_parse_as_document(html);
        let is_fragment = !as_doc;
        let parser_arena = if is_fragment {
            markuplint_html_parser::parse_fragment(html)
        } else {
            markuplint_html_parser::parse_document(html)
        };
        markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
    }

    fn html_spec() -> MLMLSpec {
        markuplint_types::spec::load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json"))
            .unwrap()
    }

    fn run(html: &str) -> Vec<Violation> {
        let arena = html_arena(html);
        let spec = html_spec();
        let config = RuleConfigSet::global_only(RuleConfig::default());
        SrcsetSizesConstraint.verify(&arena, &spec, &config)
    }

    // --- No violations ---

    #[test]
    fn srcset_with_x_descriptors_only() {
        assert!(run(r#"<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">"#).is_empty());
    }

    #[test]
    fn srcset_with_w_descriptors_and_sizes() {
        assert!(run(r#"<img srcset="small.png 480w, large.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="large.png" alt="photo">"#).is_empty());
    }

    #[test]
    fn sizes_auto_with_loading_lazy() {
        assert!(run(r#"<img srcset="small.png 480w, large.png 1024w" sizes="auto" loading="lazy" src="large.png" alt="photo">"#).is_empty());
    }

    #[test]
    fn sizes_auto_comma_with_loading_lazy() {
        assert!(run(r#"<img srcset="small.png 480w, large.png 1024w" sizes="auto, 100vw" loading="lazy" src="large.png" alt="photo">"#).is_empty());
    }

    #[test]
    fn source_sizes_auto_with_sibling_img_lazy() {
        assert!(run(r#"<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>"#).is_empty());
    }

    #[test]
    fn single_url_srcset_no_descriptor() {
        assert!(run(r#"<img srcset="image.png" src="image.png" alt="photo">"#).is_empty());
    }

    #[test]
    fn element_without_srcset_ignored() {
        assert!(run(r#"<img src="image.png" alt="photo">"#).is_empty());
    }

    #[test]
    fn source_outside_picture_ignored() {
        assert!(run(r#"<video><source src="video.mp4" type="video/mp4"></video>"#).is_empty());
    }

    #[test]
    fn empty_srcset() {
        assert!(run(r#"<img srcset="" src="image.png" alt="p">"#).is_empty());
    }

    #[test]
    fn whitespace_only_srcset() {
        assert!(run(r#"<img srcset="   " src="image.png" alt="p">"#).is_empty());
    }

    // --- Check 1: sizes requires width descriptors ---

    #[test]
    fn check1_sizes_with_x_descriptors() {
        let v = run(r#"<img srcset="image-1x.png 1x, image-2x.png 2x" sizes="100vw" src="image-1x.png" alt="photo">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check1_sizes_with_no_descriptors() {
        let v = run(r#"<img srcset="image.png" sizes="100vw" src="image.png" alt="photo">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check1_source_sizes_with_x_descriptors() {
        let v =
            run(r#"<picture><source srcset="p.webp 1x, p2.webp 2x" sizes="100vw"><img src="p.jpg" alt="p"></picture>"#);
        assert_eq!(v.len(), 1);
    }

    // --- Check 2: no mixing width and density ---

    #[test]
    fn check2_w_plus_x_mixing() {
        let v = run(r#"<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">"#);
        assert_eq!(v.len(), 2); // Check 2 + Check 5
    }

    #[test]
    fn check2_w_plus_no_descriptor_mixing() {
        let v = run(r#"<img srcset="small.png 480w, large.png" src="small.png" alt="photo">"#);
        assert_eq!(v.len(), 2); // Check 2 + Check 5
    }

    #[test]
    fn check2_all_w_no_violation() {
        assert!(run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="s.png" alt="p">"#).is_empty());
    }

    #[test]
    fn check2_all_x_no_violation() {
        assert!(run(r#"<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">"#).is_empty());
    }

    #[test]
    fn check2_x_plus_no_descriptor_no_violation() {
        assert!(run(r#"<img srcset="small.png, large.png 2x" src="small.png" alt="p">"#).is_empty());
    }

    // --- Check 3: sizes=auto requires loading=lazy ---

    #[test]
    fn check3_sizes_auto_without_loading() {
        let v = run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="auto" src="l.png" alt="p">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check3_sizes_auto_with_loading_eager() {
        let v = run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="eager" src="l.png" alt="p">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check3_sizes_auto_comma_without_loading() {
        let v = run(r#"<img srcset="s.png 480w" sizes="auto, 100vw" src="s.png" alt="p">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check3_sizes_uppercase_auto_without_loading() {
        let v = run(r#"<img srcset="s.png 480w" sizes="AUTO" src="s.png" alt="p">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check3_sizes_auto_whitespace_with_lazy() {
        assert!(run(r#"<img srcset="s.png 480w" sizes=" auto " loading="lazy" src="s.png" alt="p">"#).is_empty());
    }

    // --- Check 4: source sizes=auto requires sibling img lazy ---

    #[test]
    fn check4_source_sizes_auto_img_no_loading() {
        let v = run(r#"<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" alt="p"></picture>"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check4_source_sizes_auto_img_eager() {
        let v = run(
            r#"<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="eager" alt="p"></picture>"#,
        );
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check4_source_sizes_auto_img_lazy() {
        assert!(run(r#"<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>"#).is_empty());
    }

    #[test]
    fn check4_source_sizes_auto_no_following_img() {
        let v = run(r#"<picture><source srcset="s.webp 480w" sizes="auto"></picture>"#);
        assert_eq!(v.len(), 1);
    }

    // --- Check 5: w descriptors on img require sizes ---

    #[test]
    fn check5_w_without_sizes() {
        let v = run(r#"<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn check5_w_with_sizes_ok() {
        assert!(run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="l.png" alt="p">"#).is_empty());
    }

    #[test]
    fn check5_x_without_sizes_ok() {
        assert!(run(r#"<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">"#).is_empty());
    }

    #[test]
    fn check5_source_w_without_sizes_ok() {
        assert!(
            run(r#"<picture><source srcset="s.webp 480w, l.webp 1024w"><img src="l.jpg" alt="p"></picture>"#)
                .is_empty()
        );
    }
}
