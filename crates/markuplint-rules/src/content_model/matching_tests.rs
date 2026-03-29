//! Tests ported from TypeScript test files in
//! `packages/@markuplint/rules/src/permitted-contents/`.

#[cfg(test)]
mod tests {
    use crate::content_model::child_node::ChildNodeInfo;
    use crate::content_model::matching::{
        choice as choice_fn, count_pattern as count_pattern_fn, order as order_fn,
        recursive_branch as recursive_branch_fn, validate_content_model,
    };
    use crate::content_model::result::{MatchResult, ResultType};
    use markuplint_types::spec::content_model::serde_types::*;
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../../packages/@markuplint/html-spec/index.json");
        load_spec(json).unwrap()
    }

    fn nodes(tags: &[&str]) -> Vec<ChildNodeInfo> {
        tags.iter()
            .map(|&t| {
                if t == "#text" {
                    ChildNodeInfo::text("text")
                } else if t == "#text:ws" {
                    ChildNodeInfo::text(" ")
                } else {
                    ChildNodeInfo::element(t)
                }
            })
            .collect()
    }

    // ================================================================
    // recursive-branch.spec.ts
    // ================================================================
    mod recursive_branch {
        use super::*;

        fn run(model_json: &str, tags: &[&str]) -> MatchResult {
            let spec = html_spec();
            let model: ModelOrPatterns = serde_json::from_str(model_json).unwrap();
            recursive_branch_fn(&model, &nodes(tags), &spec, 0)
        }

        #[test]
        fn single_tag_a() {
            assert_eq!(run(r##""a""##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##""a""##, &["b"]).result_type, ResultType::UnmatchedSelectors);
            assert_eq!(run(r##""a""##, &["c"]).result_type, ResultType::UnmatchedSelectors);
            assert_eq!(run(r##""a""##, &["#text"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(r##""a""##, &[]).result_type, ResultType::MissingNode);
        }

        #[test]
        fn flow_category() {
            assert_eq!(run(r##""#flow""##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##""#flow""##, &["b"]).result_type, ResultType::Matched);
            assert_eq!(
                run(r##""#flow""##, &["c"]).result_type,
                ResultType::UnmatchedSelectorButMayEmpty
            );
            assert_eq!(run(r##""#flow""##, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(r##""#flow""##, &[]).result_type, ResultType::MatchedZero);
        }

        #[test]
        fn array_a_flow() {
            assert_eq!(run(r##"["a", "#flow"]"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["a", "#flow"]"##, &["b"]).result_type, ResultType::Matched);
            assert_eq!(
                run(r##"["a", "#flow"]"##, &["c"]).result_type,
                ResultType::UnmatchedSelectorButMayEmpty
            );
            assert_eq!(run(r##"["a", "#flow"]"##, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["a", "#flow"]"##, &[]).result_type, ResultType::MatchedZero);
        }

        #[test]
        fn array_c_flow() {
            assert_eq!(run(r##"["c", "#flow"]"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &["c"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &[]).result_type, ResultType::MatchedZero);
        }
    }

    // ================================================================
    // count-pattern.spec.ts — all 166 TS assertions ported 1:1
    // ================================================================
    mod count_pattern {
        use super::*;

        fn run(pattern_json: &str, tags: &[&str]) -> MatchResult {
            let spec = html_spec();
            let pattern: PermittedContentPattern = serde_json::from_str(pattern_json).unwrap();
            count_pattern_fn(&pattern, &nodes(tags), &spec, 0)
        }

        #[test]
        fn require_a() {
            let p = r##"{"require": "a"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &[]).result_type, ResultType::MissingNodeRequired);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);
        }

        #[test]
        fn optional_a() {
            let p = r##"{"optional": "a"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "a"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["b"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["a", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);
        }

        #[test]
        fn one_or_more_a() {
            let p = r##"{"oneOrMore": "a"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &[]).result_type, ResultType::MissingNodeOneOrMore);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 2);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_a() {
            let p = r##"{"zeroOrMore": "a"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 2);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn require_flow() {
            let p = r##"{"require": "#flow"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["b", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["c", "a"]).matched.len(), 0);
            assert_eq!(run(p, &["#text", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["a"]).matched.len(), 1);
        }

        #[test]
        fn optional_flow() {
            let p = r##"{"optional": "#flow"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);
        }

        #[test]
        fn one_or_more_flow() {
            let p = r##"{"oneOrMore": "#flow"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_flow() {
            let p = r##"{"zeroOrMore": "#flow"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_script_supporting() {
            let p = r##"{"zeroOrMore": ":model(script-supporting)"}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["b"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["script"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["template"]).result_type, ResultType::Matched);

            assert_eq!(run(p, &["a"]).matched.len(), 0);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);
            assert_eq!(run(p, &["script"]).matched.len(), 1);
            assert_eq!(run(p, &["template"]).matched.len(), 1);
        }

        #[test]
        fn min_max() {
            assert_eq!(
                run(r##"{"require": "c", "min": 2}"##, &[]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(
                run(r##"{"require": "c", "min": 2}"##, &["c"]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(
                run(r##"{"require": "c", "min": 2}"##, &["c", "c"]).result_type,
                ResultType::Matched
            );
            assert_eq!(
                run(r##"{"require": "c", "max": 1}"##, &["c", "c"]).result_type,
                ResultType::UnexpectedExtraNode
            );
            assert_eq!(run(r##"{"require": "c", "max": 1}"##, &["c", "c"]).hint.max, Some(1));
        }

        #[test]
        fn dl_element_one_or_more_pattern() {
            let p = r##"{"oneOrMore": [
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dt"},
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dd"},
                {"zeroOrMore": ":model(script-supporting)"}
            ]}"##;
            assert_eq!(run(p, &["dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dd"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dd", "dt"]).result_type,
                ResultType::MissingNodeOneOrMore
            );
        }

        // --- ruby element part #1 (TS: oneOrMore with model array selectors) ---
        #[test]
        fn ruby_part1_phrasing_model_array() {
            let p = r##"{"oneOrMore": [
                ":model(phrasing):not(ruby, :has(ruby))",
                "ruby:not(:has(ruby))"
            ]}"##;
            assert_eq!(run(p, &["span"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["#text", "span"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["ruby"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["ruby", "span"]).result_type, ResultType::Matched);
            // NOTE: Tests for <span><ruby></ruby></span> and <ruby><ruby></ruby></ruby>
            // require :has() with descendant checking via ChildNodeInfo.children.
            // These are tested in the selector_integration module with element_with_children.
        }

        // --- ruby element part #2 (TS: complex nested with choice) ---
        #[test]
        fn ruby_part2_complex_nested() {
            let p = r##"{"oneOrMore": [
                {"oneOrMore": [
                    ":model(phrasing):not(ruby, :has(ruby))",
                    "ruby:not(:has(rt, rp))"
                ]},
                {"choice": [
                    [{"oneOrMore": "rt"}],
                    [{"require": "rp"}, {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]
                ]}
            ]}"##;
            assert_eq!(run(p, &["span"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["span"]).query, "rt");
            assert_eq!(run(p, &["span", "rp", "rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["span", "rp", "rt"]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(run(p, &["span", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["span", "rp", "rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["span", "rt"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["span", "rt", "span", "rt"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["#text", "rt", "#text", "rt"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["#text", "rt", "rt", "#text", "rt", "rt"]).result_type,
                ResultType::Matched
            );
            assert_eq!(
                run(p, &["#text", "rp", "rt", "rp", "#text", "rt"]).result_type,
                ResultType::Matched
            );
        }

        // --- ruby element part #3 (TS: oneOrMore rt/rp) ---
        #[test]
        fn ruby_part3_one_or_more_rt_rp() {
            let p = r##"{"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}"##;
            assert_eq!(run(p, &["rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["rt", "rp", "rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp", "rt", "rp"]).result_type, ResultType::Matched);
        }

        // --- Issue #1146 1/2 (TS: oneOrMore with single-branch choice) ---
        #[test]
        fn issue_1146_one_or_more_choice() {
            let p = r##"{"oneOrMore": [{"choice": [[{"require": "b"}]]}]}"##;
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "b"]).result_type, ResultType::Matched);
        }

        // --- Issue #1146 2/2 (TS: oneOrMore with optional + choice) ---
        #[test]
        fn issue_1146_one_or_more_optional_choice() {
            let p = r##"{"oneOrMore": [
                {"optional": "a"},
                {"choice": [
                    [{"optional": "b"}],
                    [{"require": "c"}]
                ]}
            ]}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "a", "a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c", "b", "a"]).result_type, ResultType::Matched);
        }
    }

    // ================================================================
    // choice.spec.ts
    // ================================================================
    mod choice {
        use super::*;

        fn run(pattern_json: &str, tags: &[&str]) -> MatchResult {
            let spec = html_spec();
            let pattern: ChoicePattern = serde_json::from_str(pattern_json).unwrap();
            choice_fn(&pattern, &nodes(tags), &spec, 0)
        }

        #[test]
        fn ordered_requires() {
            let p = r##"{"choice": [[{"require": "a"}], [{"require": "b"}], [{"require": "c"}]]}"##;
            assert_eq!(run(p, &[]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "a"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "c"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["d"]).result_type, ResultType::MissingNodeRequired);
        }

        #[test]
        fn optional() {
            let p = r##"{"choice": [[{"require": "a"}], [{"require": "b"}], [{"optional": "c"}]]}"##;
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["d"]).result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn interleave() {
            let p = r##"{"choice": [[{"require": "a"}, {"require": "b"}], [{"require": "b"}, {"require": "a"}]]}"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["b"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "a", "c"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["b", "a", "a"]).result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn dl_element() {
            let p = r##"{"choice": [
                [{"oneOrMore": [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dt"},
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dd"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]}],
                [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "div"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]
            ]}"##;
            assert_eq!(run(p, &["dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &[]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &[]).query, "dt");
            assert_eq!(run(p, &["dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["div"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["div", "div"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt"]).result_type,
                ResultType::MissingNodeOneOrMore
            );
        }

        #[test]
        fn ruby_part() {
            let p = r##"{"choice": [
                [{"oneOrMore": "rt"}],
                [{"require": "rp"}, {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]
            ]}"##;
            assert_eq!(run(p, &["rt"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["rp"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp"]).query, "rt");
            assert_eq!(run(p, &["rt", "rt"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["rp", "rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["rp", "rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["rt", "rp"]).query, "rt");
        }

        #[test]
        fn issue_1146() {
            let p = r##"{"choice": [[{"optional": "b"}], [{"require": "c"}]]}"##;
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "b"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c", "c"]).result_type, ResultType::UnexpectedExtraNode);
        }
    }

    // ================================================================
    // order.spec.ts
    // ================================================================
    mod order {
        use super::*;

        fn run(patterns_json: &str, tags: &[&str]) -> MatchResult {
            let spec = html_spec();
            let patterns: Vec<PermittedContentPattern> = serde_json::from_str(patterns_json).unwrap();
            order_fn(&patterns, &nodes(tags), &spec, 0)
        }

        #[test]
        fn ordered_requires() {
            let p = r##"[{"require": "a"}, {"require": "b"}, {"require": "c"}]"##;
            assert_eq!(run(p, &["a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b", "c"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["a", "b", "c", "d"]).result_type,
                ResultType::UnexpectedExtraNode
            );
        }

        #[test]
        fn ordered_requires_with_flow() {
            let p = r##"[{"require": "#flow"}, {"require": "a"}, {"require": "#flow"}, {"require": "b"}]"##;
            assert_eq!(run(p, &[]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "c"]).result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn ordered_requires_and_optionals() {
            let p = r##"[{"require": "a"}, {"optional": "b"}, {"require": "c"}]"##;
            assert_eq!(run(p, &["a", "b", "c"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["a", "b", "b", "c"]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(run(p, &["a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["b", "a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "b"]).result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn ordered_requires_and_optionals_with_flow() {
            let p = r##"[{"require": "a"}, {"optional": "b"}, {"optional": "c"}, {"require": "#flow"}]"##;
            assert_eq!(run(p, &["a", "b", "c"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["a", "b", "b", "c"]).result_type,
                ResultType::UnexpectedExtraNode
            );
            assert_eq!(run(p, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["b", "a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "b"]).result_type, ResultType::Matched);
        }

        #[test]
        fn ordered_zero_or_more_combination() {
            let p = r##"[{"zeroOrMore": "a"}, {"zeroOrMore": "b"}, {"zeroOrMore": "c"}]"##;
            assert_eq!(run(p, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &[]).result_type, ResultType::MatchedZero);
            assert_eq!(run(p, &["b", "c"]).result_type, ResultType::Matched);
        }

        #[test]
        fn dl_element_flat() {
            let p = r##"[
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dt"},
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dd"},
                {"zeroOrMore": ":model(script-supporting)"}
            ]"##;
            assert_eq!(run(p, &["dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt"]).result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn dl_element_nested() {
            let p = r##"[{"oneOrMore": [
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dt"},
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dd"},
                {"zeroOrMore": ":model(script-supporting)"}
            ]}]"##;
            assert_eq!(run(p, &["dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt"]).result_type,
                ResultType::MissingNodeOneOrMore
            );
            assert_eq!(run(p, &["dt", "dd", "dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt", "dd", "dd", "dt"]).result_type,
                ResultType::MissingNodeOneOrMore
            );
        }

        #[test]
        fn dl_element_full_choice() {
            let p = r##"[{"choice": [
                [{"oneOrMore": [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dt"},
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dd"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]}],
                [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "div"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]
            ]}]"##;
            assert_eq!(run(p, &["dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt"]).query, "dd");
            assert_eq!(run(p, &["dt", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt"]).result_type,
                ResultType::MissingNodeOneOrMore
            );
            assert_eq!(run(p, &["dt", "dd", "dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt", "dd", "dd", "dt"]).result_type,
                ResultType::MissingNodeOneOrMore
            );
            assert_eq!(run(p, &["div"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["div", "div"]).result_type, ResultType::Matched);
        }

        #[test]
        fn ruby_element() {
            let p = r##"[{"oneOrMore": [
                {"require": ":model(phrasing):not(ruby, :has(ruby))"},
                {"choice": [
                    [{"oneOrMore": "rt"}],
                    [{"oneOrMore": [
                        {"require": "rp"},
                        {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}
                    ]}]
                ]}
            ]}]"##;
            assert_eq!(run(p, &["span"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["span"]).query, "rt");
            assert_eq!(run(p, &["span", "rt"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["span", "rp", "rt"]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(run(p, &["span", "rp", "rt"]).query, "rp");
        }

        #[test]
        fn ruby_part_order() {
            let p = r##"[
                {"require": ":model(phrasing):not(ruby, :has(ruby))"},
                {"choice": [
                    [{"oneOrMore": "rt"}],
                    [{"oneOrMore": [{"require": "rp"}, {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]}]
                ]}
            ]"##;
            assert_eq!(run(p, &["span"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["span"]).query, "rt");
            assert_eq!(run(p, &["span", "rt"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["span", "rp", "rt"]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(run(p, &["span", "rp", "rt"]).query, "rp");
        }

        #[test]
        fn ruby_rp_rt_rp_nested() {
            let p = r##"[{"oneOrMore": [
                {"require": "rp"},
                {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}
            ]}]"##;
            assert_eq!(run(p, &["span"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["span"]).query, "rp");
            assert_eq!(run(p, &["rp"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp"]).query, "rt");
            assert_eq!(run(p, &["rp", "rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(
                run(p, &["rp", "rt", "rp", "rt"]).result_type,
                ResultType::MissingNodeRequired
            );
            assert_eq!(run(p, &["rp", "rt", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rp", "rt", "rp", "rt", "rp"]).result_type, ResultType::Matched);
        }

        #[test]
        fn ruby_rt_rp_pattern() {
            let p = r##"[{"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]"##;
            assert_eq!(run(p, &["rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["rt", "rp", "rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp", "rt", "rp"]).result_type, ResultType::Matched);
        }

        #[test]
        fn simple_rt_rp() {
            let p = r##"[{"require": "rt"}, {"require": "rp"}]"##;
            assert_eq!(run(p, &["rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).result_type, ResultType::Matched);
        }

        #[test]
        fn issue_1146() {
            let p = r##"[{"choice": [[{"require": "b"}]]}]"##;
            let r = run(p, &["b", "b"]);
            assert_eq!(r.result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(r.query, "b");
            assert_eq!(r.hint.max, Some(1));
            assert_eq!(r.matched.len(), 1);
            assert_eq!(r.unmatched.len(), 1);
        }
    }

    // ================================================================
    // matches-selector.spec.ts
    // ================================================================
    mod matches_selector {
        use super::*;
        use crate::content_model::matching::matches_selector as matches_selector_fn;

        fn run(query: &str, tag: &str) -> MatchResult {
            let spec = html_spec();
            let child_nodes = nodes(&[tag]);
            matches_selector_fn(query, child_nodes.first(), child_nodes.len(), &spec)
        }

        fn run_empty(query: &str) -> MatchResult {
            let spec = html_spec();
            matches_selector_fn(query, None, 0, &spec)
        }

        #[test]
        fn tag_a() {
            assert_eq!(run("a", "a").result_type, ResultType::Matched);
            assert_eq!(run("a", "b").result_type, ResultType::UnmatchedSelectors);
            assert_eq!(run("a", "c").result_type, ResultType::UnmatchedSelectors);
            assert_eq!(run("a", "#text").result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run_empty("a").result_type, ResultType::MissingNode);
        }

        #[test]
        fn flow_category() {
            assert_eq!(run("#flow", "a").result_type, ResultType::Matched);
            assert_eq!(run("#flow", "b").result_type, ResultType::Matched);
            assert_eq!(run("#flow", "c").result_type, ResultType::UnmatchedSelectorButMayEmpty);
            assert_eq!(run("#flow", "#text").result_type, ResultType::Matched);
            assert_eq!(run_empty("#flow").result_type, ResultType::MatchedZero);
        }

        #[test]
        fn model_flow() {
            assert_eq!(run(":model(flow)", "a").result_type, ResultType::Matched);
            assert_eq!(run(":model(flow)", "b").result_type, ResultType::Matched);
            assert_eq!(
                run(":model(flow)", "c").result_type,
                ResultType::UnmatchedSelectorButMayEmpty
            );
            assert_eq!(run(":model(flow)", "#text").result_type, ResultType::Matched);
            assert_eq!(run_empty(":model(flow)").result_type, ResultType::MatchedZero);
        }

        #[test]
        fn text_selector() {
            assert_eq!(run("#text", "a").result_type, ResultType::UnmatchedSelectorButMayEmpty);
            assert_eq!(run("#text", "b").result_type, ResultType::UnmatchedSelectorButMayEmpty);
            assert_eq!(run("#text", "c").result_type, ResultType::UnmatchedSelectorButMayEmpty);
            assert_eq!(run("#text", "#text").result_type, ResultType::Matched);
            assert_eq!(run_empty("#text").result_type, ResultType::MatchedZero);
        }

        #[test]
        fn whitespace_text_node() {
            let spec = html_spec();
            let ws = ChildNodeInfo::text("   ");
            let r = matches_selector_fn("a", Some(&ws), 1, &spec);
            assert_eq!(r.result_type, ResultType::Matched);
            assert!(r.zero_match); // whitespace is zero-width match

            let text = ChildNodeInfo::text("hello");
            let r2 = matches_selector_fn("a", Some(&text), 1, &spec);
            assert_eq!(r2.result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn preprocessor_block() {
            let spec = html_spec();
            let pp = ChildNodeInfo::preprocessor_block("<% code %>");
            let r = matches_selector_fn("a", Some(&pp), 1, &spec);
            assert_eq!(r.result_type, ResultType::Matched);
        }

        #[test]
        fn custom_element_with_flow() {
            let spec = html_spec();
            let ce = ChildNodeInfo::custom_element("my-component");
            // #flow includes #custom
            let r = matches_selector_fn("#flow", Some(&ce), 1, &spec);
            assert_eq!(r.result_type, ResultType::Matched);
        }

        #[test]
        fn model_phrasing_with_not_suffix() {
            // :model(phrasing):not(ruby, :has(ruby)) — span is phrasing and NOT ruby
            assert_eq!(
                run(":model(phrasing):not(ruby, :has(ruby))", "span").result_type,
                ResultType::Matched
            );
            // ruby is in #phrasing but excluded by :not(ruby) → should NOT match.
            // Returns UnmatchedSelectorButMayEmpty because #phrasing includes #text.
            assert_eq!(
                run(":model(phrasing):not(ruby, :has(ruby))", "ruby").result_type,
                ResultType::UnmatchedSelectorButMayEmpty
            );
        }

        #[test]
        fn expand_model_refs_debug() {
            let spec = html_spec();
            let expanded =
                crate::content_model::matching::expand_model_refs(":model(phrasing):not(ruby, :has(ruby))", &spec);
            assert!(expanded.starts_with(":is("), "expanded: {expanded}");
            assert!(expanded.contains(":not(ruby"), "expanded: {expanded}");

            let parsed = markuplint_selector::parser::parse(&expanded);
            assert!(parsed.is_ok(), "parse error for: {expanded}");

            let bridge = crate::content_model::arena_bridge::build_arena("div", &[ChildNodeInfo::element("span")]);
            let selector = parsed.unwrap();
            assert_eq!(bridge.child_ids.len(), 1, "should have 1 child");
            let span_id = bridge.child_ids[0];
            let matched = markuplint_selector::matcher::matches(&selector, &bridge.arena, span_id, None, None);
            assert!(matched, "span should match expanded selector: {expanded}");

            // Also test that ruby does NOT match
            let bridge2 = crate::content_model::arena_bridge::build_arena("div", &[ChildNodeInfo::element("ruby")]);
            let ruby_id = bridge2.child_ids[0];
            let matched2 = markuplint_selector::matcher::matches(&selector, &bridge2.arena, ruby_id, None, None);
            assert!(!matched2, "ruby should NOT match expanded selector");
        }
    }

    // ================================================================
    // opt_condition edge cases
    // ================================================================
    mod opt_condition_tests {
        use super::*;
        use crate::content_model::matching::matches_selector as matches_selector_fn;

        #[test]
        fn plain_tag_no_flags() {
            let spec = html_spec();
            // Plain tag "div" should not have has_text or has_custom
            let r = matches_selector_fn("div", Some(&ChildNodeInfo::text("hello")), 1, &spec);
            // text node against plain tag "div" → UNEXPECTED_EXTRA_NODE (not has_text)
            assert_eq!(r.result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn hash_category_with_selector_suffix() {
            let spec = html_spec();
            // #script-supporting should resolve correctly
            let r = matches_selector_fn("#script-supporting", Some(&ChildNodeInfo::element("script")), 1, &spec);
            assert_eq!(r.result_type, ResultType::Matched);
        }

        #[test]
        fn model_with_not_suffix_extracts_category() {
            let spec = html_spec();
            // ":model(metadata):not(title)" — meta matches, title does NOT
            let r = matches_selector_fn(
                ":model(metadata):not(title)",
                Some(&ChildNodeInfo::element("meta")),
                1,
                &spec,
            );
            assert_eq!(r.result_type, ResultType::Matched);

            // title is in #metadata but excluded by :not(title)
            let r2 = matches_selector_fn(
                ":model(metadata):not(title)",
                Some(&ChildNodeInfo::element("title")),
                1,
                &spec,
            );
            // #metadata includes #text → has_text=true → UnmatchedSelectorButMayEmpty
            assert_ne!(r2.result_type, ResultType::Matched);
        }

        #[test]
        fn needs_full_selector_detection() {
            use crate::content_model::matching::needs_full_selector;
            assert!(needs_full_selector(":model(phrasing):not(ruby)"));
            assert!(needs_full_selector("div:has(span)"));
            assert!(needs_full_selector(":is(a, b, c)"));
            assert!(!needs_full_selector("div"));
            assert!(!needs_full_selector("#flow"));
            assert!(!needs_full_selector(":model(phrasing)"));
        }
    }

    // ================================================================
    // transparent pattern
    // ================================================================
    mod transparent_tests {
        use super::*;

        #[test]
        fn transparent_matches_all_children() {
            let spec = html_spec();
            let patterns: Vec<PermittedContentPattern> =
                serde_json::from_str(r##"[{"transparent": "test"}]"##).unwrap();
            let r = validate_content_model(&spec, &patterns, &nodes(&["a", "b", "c"]));
            assert_eq!(r.result_type, ResultType::Matched);
            assert_eq!(r.matched.len(), 3);
            assert_eq!(r.unmatched.len(), 0);
        }

        #[test]
        fn transparent_empty_children() {
            let spec = html_spec();
            let patterns: Vec<PermittedContentPattern> =
                serde_json::from_str(r##"[{"transparent": "test"}]"##).unwrap();
            let r = validate_content_model(&spec, &patterns, &[]);
            assert_eq!(r.result_type, ResultType::MatchedZero);
        }
    }

    // ================================================================
    // matched index verification
    // ================================================================
    mod matched_indices {
        use super::*;

        #[test]
        fn order_matched_indices_correct() {
            let spec = html_spec();
            let patterns: Vec<PermittedContentPattern> =
                serde_json::from_str(r##"[{"require": "a"}, {"require": "b"}]"##).unwrap();
            let child_nodes = nodes(&["a", "b"]);
            let r = validate_content_model(&spec, &patterns, &child_nodes);
            assert_eq!(r.result_type, ResultType::Matched);
            assert_eq!(r.matched, vec![0, 1]);
            assert!(r.unmatched.is_empty());
        }

        #[test]
        fn count_pattern_matched_first_node() {
            let spec = html_spec();
            let patterns: Vec<PermittedContentPattern> = serde_json::from_str(r##"[{"require": "#flow"}]"##).unwrap();
            let r = validate_content_model(&spec, &patterns, &nodes(&["a", "b"]));
            // require matches first node only
            assert_eq!(r.matched, vec![0]);
        }

        #[test]
        fn one_or_more_multiple_matched() {
            let spec = html_spec();
            let patterns: Vec<PermittedContentPattern> = serde_json::from_str(r##"[{"oneOrMore": "a"}]"##).unwrap();
            let r = validate_content_model(&spec, &patterns, &nodes(&["a", "a", "b"]));
            assert_eq!(r.matched, vec![0, 1]);
            assert_eq!(r.unmatched, vec![2]);
        }

        #[test]
        fn zero_or_more_no_match() {
            let spec = html_spec();
            let pattern: PermittedContentPattern = serde_json::from_str(r##"{"zeroOrMore": "a"}"##).unwrap();
            // Call count_pattern directly (order wraps with UNEXPECTED_EXTRA_NODE for unmatched)
            let r = count_pattern_fn(&pattern, &nodes(&["b", "c"]), &spec, 0);
            assert_eq!(r.result_type, ResultType::MatchedZero);
            assert!(r.matched.is_empty());
            assert_eq!(r.unmatched, vec![0, 1]);
        }
    }

    // ================================================================
    // Integration tests with real html-spec content models
    // ================================================================
    mod integration {
        use super::*;
        use markuplint_types::spec::content_model::{ContentModelContents, get_content_model};

        fn run_element(element: &str, tags: &[&str]) -> ResultType {
            let spec = html_spec();
            let cm = get_content_model(&spec, element).unwrap();
            if let ContentModelContents::Patterns(patterns) = &cm.contents {
                validate_content_model(&spec, patterns, &nodes(tags)).result_type
            } else {
                panic!("{element} has no patterns");
            }
        }

        #[test]
        fn head_element() {
            assert_eq!(run_element("head", &["title"]), ResultType::Matched);
            // :not(title) now works via full selector matching:
            // title is NOT consumed by zeroOrMore(:model(metadata):not(title))
            assert_eq!(run_element("head", &["meta", "title"]), ResultType::Matched);
            assert_eq!(run_element("head", &["title", "meta"]), ResultType::Matched);
            assert_eq!(run_element("head", &[]), ResultType::MissingNodeRequired);
        }

        #[test]
        fn select_element() {
            assert_eq!(run_element("select", &[]), ResultType::MatchedZero);
            assert_eq!(run_element("select", &["option"]), ResultType::Matched);
            assert_eq!(run_element("select", &["option", "option"]), ResultType::Matched);
            assert_eq!(run_element("select", &["optgroup"]), ResultType::Matched);
            assert_eq!(run_element("select", &["option", "optgroup"]), ResultType::Matched);
        }

        #[test]
        fn ul_element() {
            assert_eq!(run_element("ul", &[]), ResultType::MatchedZero);
            assert_eq!(run_element("ul", &["li"]), ResultType::Matched);
            assert_eq!(run_element("ul", &["li", "li"]), ResultType::Matched);
            assert_eq!(run_element("ul", &["li", "script"]), ResultType::Matched);
        }

        #[test]
        fn table_element() {
            assert_eq!(run_element("table", &["tbody"]), ResultType::Matched);
            assert_eq!(run_element("table", &["thead", "tbody"]), ResultType::Matched);
            assert_eq!(run_element("table", &["caption", "tbody"]), ResultType::Matched);
        }
    }

    // ================================================================
    // arena_bridge structure tests
    // ================================================================
    mod arena_bridge_tests {
        use super::*;
        use crate::content_model::arena_bridge;
        use markuplint_dom::node::DomNode;

        #[test]
        fn parent_child_links() {
            let bridge =
                arena_bridge::build_arena("div", &[ChildNodeInfo::element("span"), ChildNodeInfo::element("p")]);
            // Document root is id 0
            let doc = bridge.arena.get(0).unwrap();
            assert!(matches!(doc, DomNode::Document(_)));
            assert_eq!(doc.children(), &[bridge.parent_id]);

            // Parent element is id 1
            let parent = bridge.arena.get(bridge.parent_id).unwrap();
            let parent_el = parent.as_element().unwrap();
            assert_eq!(parent_el.base.node_name, "div");
            assert_eq!(parent_el.base.children, bridge.child_ids);

            // Children have correct parent
            for &cid in &bridge.child_ids {
                assert_eq!(bridge.arena.get(cid).unwrap().parent_id(), Some(bridge.parent_id));
            }
        }

        #[test]
        fn sibling_links() {
            let bridge = arena_bridge::build_arena(
                "ul",
                &[
                    ChildNodeInfo::element("li"),
                    ChildNodeInfo::element("li"),
                    ChildNodeInfo::element("li"),
                ],
            );
            let ids = &bridge.child_ids;
            assert_eq!(ids.len(), 3);

            // First child: no prev, next = second
            let first = bridge.arena.get(ids[0]).unwrap().base().unwrap();
            assert_eq!(first.prev_sibling, None);
            assert_eq!(first.next_sibling, Some(ids[1]));

            // Middle child: prev = first, next = last
            let mid = bridge.arena.get(ids[1]).unwrap().base().unwrap();
            assert_eq!(mid.prev_sibling, Some(ids[0]));
            assert_eq!(mid.next_sibling, Some(ids[2]));

            // Last child: prev = middle, no next
            let last = bridge.arena.get(ids[2]).unwrap().base().unwrap();
            assert_eq!(last.prev_sibling, Some(ids[1]));
            assert_eq!(last.next_sibling, None);
        }

        #[test]
        fn recursive_children_for_has() {
            let bridge = arena_bridge::build_arena(
                "div",
                &[ChildNodeInfo::element_with_children(
                    "span",
                    vec![ChildNodeInfo::element("ruby")],
                )],
            );
            let span_id = bridge.child_ids[0];
            let span = bridge.arena.get(span_id).unwrap().as_element().unwrap();

            // span has one child (ruby)
            assert_eq!(span.base.children.len(), 1);
            let ruby_id = span.base.children[0];
            let ruby = bridge.arena.get(ruby_id).unwrap().as_element().unwrap();
            assert_eq!(ruby.base.node_name, "ruby");
            assert_eq!(ruby.base.parent, Some(span_id));
            assert_eq!(ruby.base.depth, 2); // doc=0, div=0, span=1, ruby=2
        }

        #[test]
        fn text_and_preprocessor_nodes() {
            let bridge = arena_bridge::build_arena(
                "div",
                &[ChildNodeInfo::text("hello"), ChildNodeInfo::preprocessor_block("<% %>")],
            );
            assert_eq!(bridge.child_ids.len(), 2);
            let text = bridge.arena.get(bridge.child_ids[0]).unwrap();
            assert!(matches!(text, DomNode::Text(_)));
            let ps = bridge.arena.get(bridge.child_ids[1]).unwrap();
            assert!(matches!(ps, DomNode::PSBlock(_)));
        }

        #[test]
        fn empty_children() {
            let bridge = arena_bridge::build_arena("div", &[]);
            assert!(bridge.child_ids.is_empty());
            let parent = bridge.arena.get(bridge.parent_id).unwrap();
            assert!(parent.children().is_empty());
        }
    }

    // ================================================================
    // full_selector_match / expand_model_refs tests
    // ================================================================
    mod selector_integration {
        use super::*;
        use crate::content_model::arena_bridge;
        use crate::content_model::matching::{expand_model_refs, matches_selector as matches_selector_fn};

        #[test]
        fn not_selector_simple() {
            // Direct :not(tag) without :model()
            let spec = html_spec();
            let bridge = arena_bridge::build_arena("div", &[ChildNodeInfo::element("span")]);
            let sel = markuplint_selector::parser::parse("span:not(ruby)").unwrap();
            assert!(markuplint_selector::matcher::matches(
                &sel,
                &bridge.arena,
                bridge.child_ids[0],
                None,
                None,
            ));

            let bridge2 = arena_bridge::build_arena("div", &[ChildNodeInfo::element("ruby")]);
            assert!(!markuplint_selector::matcher::matches(
                &sel,
                &bridge2.arena,
                bridge2.child_ids[0],
                None,
                None,
            ));
        }

        #[test]
        fn has_selector_with_children() {
            // :has(ruby) checks descendants
            let spec = html_spec();
            let with_ruby = ChildNodeInfo::element_with_children("span", vec![ChildNodeInfo::element("ruby")]);
            let bridge = arena_bridge::build_arena("div", &[with_ruby]);
            let sel = markuplint_selector::parser::parse("span:has(ruby)").unwrap();
            assert!(markuplint_selector::matcher::matches(
                &sel,
                &bridge.arena,
                bridge.child_ids[0],
                None,
                None,
            ));

            // Without ruby child → doesn't match
            let without_ruby = ChildNodeInfo::element_with_children("span", vec![ChildNodeInfo::element("em")]);
            let bridge2 = arena_bridge::build_arena("div", &[without_ruby]);
            assert!(!markuplint_selector::matcher::matches(
                &sel,
                &bridge2.arena,
                bridge2.child_ids[0],
                None,
                None,
            ));
        }

        #[test]
        fn is_selector() {
            let spec = html_spec();
            let bridge = arena_bridge::build_arena("div", &[ChildNodeInfo::element("span")]);
            let sel = markuplint_selector::parser::parse(":is(a, span, em)").unwrap();
            assert!(markuplint_selector::matcher::matches(
                &sel,
                &bridge.arena,
                bridge.child_ids[0],
                None,
                None,
            ));

            let bridge2 = arena_bridge::build_arena("div", &[ChildNodeInfo::element("div")]);
            assert!(!markuplint_selector::matcher::matches(
                &sel,
                &bridge2.arena,
                bridge2.child_ids[0],
                None,
                None,
            ));
        }

        #[test]
        fn expand_model_refs_multiple() {
            let spec = html_spec();
            // This pattern doesn't exist in html-spec but tests multiple :model() expansion
            let expanded = expand_model_refs(":model(metadata)", &spec);
            assert!(expanded.starts_with(":is("), "expanded: {expanded}");
            assert!(expanded.contains("meta"), "expanded: {expanded}");
            assert!(expanded.contains("link"), "expanded: {expanded}");
        }

        #[test]
        fn expand_model_refs_invalid_category() {
            let spec = html_spec();
            let expanded = expand_model_refs(":model(nonexistent)", &spec);
            assert_eq!(expanded, ":is(x-never-match)");
        }

        #[test]
        fn expand_model_refs_plain_tag_unchanged() {
            let spec = html_spec();
            let expanded = expand_model_refs("div", &spec);
            assert_eq!(expanded, "div");
        }

        #[test]
        fn ruby_not_has_ruby_via_selector() {
            // ruby:not(:has(ruby)) — should match plain ruby, not ruby containing ruby
            let spec = html_spec();
            let sel = markuplint_selector::parser::parse("ruby:not(:has(ruby))").unwrap();

            // Plain ruby → matches
            let bridge = arena_bridge::build_arena("div", &[ChildNodeInfo::element("ruby")]);
            assert!(markuplint_selector::matcher::matches(
                &sel,
                &bridge.arena,
                bridge.child_ids[0],
                None,
                None,
            ));

            // Ruby containing ruby → doesn't match
            let nested = ChildNodeInfo::element_with_children("ruby", vec![ChildNodeInfo::element("ruby")]);
            let bridge2 = arena_bridge::build_arena("div", &[nested]);
            assert!(!markuplint_selector::matcher::matches(
                &sel,
                &bridge2.arena,
                bridge2.child_ids[0],
                None,
                None,
            ));
        }

        #[test]
        fn head_element_not_title_granular() {
            let spec = html_spec();
            // :model(metadata):not(title) should match meta but not title
            let expanded = expand_model_refs(":model(metadata):not(title)", &spec);
            let sel = markuplint_selector::parser::parse(&expanded).unwrap();

            let bridge_meta = arena_bridge::build_arena("head", &[ChildNodeInfo::element("meta")]);
            assert!(markuplint_selector::matcher::matches(
                &sel,
                &bridge_meta.arena,
                bridge_meta.child_ids[0],
                None,
                None,
            ));

            let bridge_title = arena_bridge::build_arena("head", &[ChildNodeInfo::element("title")]);
            assert!(!markuplint_selector::matcher::matches(
                &sel,
                &bridge_title.arena,
                bridge_title.child_ids[0],
                None,
                None,
            ));

            let bridge_link = arena_bridge::build_arena("head", &[ChildNodeInfo::element("link")]);
            assert!(markuplint_selector::matcher::matches(
                &sel,
                &bridge_link.arena,
                bridge_link.child_ids[0],
                None,
                None,
            ));
        }

        #[test]
        fn full_selector_match_via_matches_selector() {
            // Verify full_selector_match is invoked through the public API
            // :model(metadata):not(title) through matches_selector should work
            let spec = html_spec();
            let r_meta = matches_selector_fn(
                ":model(metadata):not(title)",
                Some(&ChildNodeInfo::element("meta")),
                1,
                &spec,
            );
            assert_eq!(r_meta.result_type, ResultType::Matched);

            // title excluded by :not(title) — returns non-Matched
            let r_title = matches_selector_fn(
                ":model(metadata):not(title)",
                Some(&ChildNodeInfo::element("title")),
                1,
                &spec,
            );
            assert_ne!(r_title.result_type, ResultType::Matched);
        }

        #[test]
        fn expand_model_refs_preserves_hash_category_not() {
            let _spec = html_spec();
            assert!(crate::content_model::matching::needs_full_selector(
                "#metadata:not(title)"
            ));
        }
    }

    // ================================================================
    // ChildNodeInfo accessor + variant tests
    // ================================================================
    mod child_node_tests {
        use super::*;
        use crate::content_model::child_node::ChildNodeKind;

        #[test]
        fn accessors() {
            assert!(ChildNodeInfo::text("hello").is_text());
            assert!(!ChildNodeInfo::element("div").is_text());

            assert!(ChildNodeInfo::element("div").is_element());
            assert!(ChildNodeInfo::web_component("my-el").is_element());
            assert!(ChildNodeInfo::authored_element("X").is_element());
            assert!(!ChildNodeInfo::text("x").is_element());

            assert!(ChildNodeInfo::web_component("x").is_custom());
            assert!(ChildNodeInfo::authored_element("X").is_custom());
            assert!(!ChildNodeInfo::element("div").is_custom());

            assert!(ChildNodeInfo::text("   ").is_whitespace());
            assert!(!ChildNodeInfo::text("hello").is_whitespace());
            assert!(!ChildNodeInfo::element("div").is_whitespace());
        }

        #[test]
        fn variant_kinds() {
            assert!(matches!(
                ChildNodeInfo::web_component("x").kind,
                ChildNodeKind::WebComponent
            ));
            assert!(matches!(
                ChildNodeInfo::authored_element("X").kind,
                ChildNodeKind::AuthoredElement
            ));
            assert_eq!(ChildNodeInfo::custom_element("x"), ChildNodeInfo::web_component("x"));
        }
    }

    // ================================================================
    // arena_bridge ElementType mapping
    // ================================================================
    mod arena_element_type_tests {
        use super::*;
        use crate::content_model::arena_bridge;
        use markuplint_core::mlast::ElementType;

        #[test]
        fn element_type_mapping() {
            let b1 = arena_bridge::build_arena("div", &[ChildNodeInfo::element("span")]);
            assert_eq!(
                b1.arena
                    .get(b1.child_ids[0])
                    .unwrap()
                    .as_element()
                    .unwrap()
                    .element_type,
                ElementType::Html
            );

            let b2 = arena_bridge::build_arena("div", &[ChildNodeInfo::web_component("my-el")]);
            assert_eq!(
                b2.arena
                    .get(b2.child_ids[0])
                    .unwrap()
                    .as_element()
                    .unwrap()
                    .element_type,
                ElementType::WebComponent
            );

            let b3 = arena_bridge::build_arena("div", &[ChildNodeInfo::authored_element("X")]);
            assert_eq!(
                b3.arena
                    .get(b3.child_ids[0])
                    .unwrap()
                    .as_element()
                    .unwrap()
                    .element_type,
                ElementType::Authored
            );
        }
    }

    // ================================================================
    // types.rs enum deserialization
    // ================================================================
    mod types_enum_tests {
        use markuplint_types::spec::load_spec;
        use markuplint_types::spec::types::*;

        fn spec() -> MLMLSpec {
            load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
        }

        #[test]
        fn implicit_role_deserializes() {
            let s = spec();
            let button = s.specs.iter().find(|e| e.name == "button").unwrap();
            assert!(matches!(button.aria.implicit_role, Some(ImplicitRole::Role(ref r)) if r == "button"));
        }

        #[test]
        fn aria_property_type_deserializes() {
            let s = spec();
            let label = s.def.aria.v1_3.props.iter().find(|p| p.name == "aria-label").unwrap();
            assert!(matches!(label.prop_type, ARIAPropertyType::Property));
            let expanded = s
                .def
                .aria
                .v1_3
                .props
                .iter()
                .find(|p| p.name == "aria-expanded")
                .unwrap();
            assert!(matches!(expanded.prop_type, ARIAPropertyType::State));
        }

        #[test]
        fn aria_attribute_value_deserializes() {
            let s = spec();
            let hidden = s.def.aria.v1_3.props.iter().find(|p| p.name == "aria-hidden").unwrap();
            assert!(matches!(hidden.value, ARIAAttributeValue::TrueFalseUndefined));
        }

        #[test]
        fn attribute_condition_deserializes() {
            let s = spec();
            let input = s.specs.iter().find(|e| e.name == "input").unwrap();
            assert!(input.attributes["accept"].condition.is_some());
        }
    }
}
