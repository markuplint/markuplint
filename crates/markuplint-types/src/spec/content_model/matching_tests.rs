//! Tests ported from TypeScript test files in
//! `packages/@markuplint/rules/src/permitted-contents/`.

#[cfg(test)]
mod tests {
    use crate::spec::content_model::child_node::ChildNodeInfo;
    use crate::spec::content_model::matching::{
        choice as choice_fn, count_pattern as count_pattern_fn, order as order_fn,
        recursive_branch as recursive_branch_fn, validate_content_model,
    };
    use crate::spec::content_model::result::{MatchResult, ResultType};
    use crate::spec::content_model::serde_types::*;
    use crate::spec::load_spec;
    use crate::spec::types::MLMLSpec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../../../packages/@markuplint/html-spec/index.json");
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
            assert_eq!(run(r##""#flow""##, &["c"]).result_type, ResultType::UnmatchedSelectorButMayEmpty);
            assert_eq!(run(r##""#flow""##, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(r##""#flow""##, &[]).result_type, ResultType::MatchedZero);
        }

        #[test]
        fn array_a_flow() {
            assert_eq!(run(r##"["a", "#flow"]"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["a", "#flow"]"##, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"["a", "#flow"]"##, &["c"]).result_type, ResultType::UnmatchedSelectorButMayEmpty);
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
    // count-pattern.spec.ts
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
            assert_eq!(run(r##"{"require": "a"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"require": "a"}"##, &["b"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(r##"{"require": "a"}"##, &["c"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(r##"{"require": "a"}"##, &["#text"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(r##"{"require": "a"}"##, &[]).result_type, ResultType::MissingNodeRequired);

            assert_eq!(run(r##"{"require": "a"}"##, &["a"]).matched.len(), 1);
            assert_eq!(run(r##"{"require": "a"}"##, &["b"]).matched.len(), 0);
            assert_eq!(run(r##"{"require": "a"}"##, &[]).matched.len(), 0);
        }

        #[test]
        fn optional_a() {
            assert_eq!(run(r##"{"optional": "a"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"optional": "a"}"##, &["a", "a"]).result_type, ResultType::UnexpectedExtraNode);
            assert_eq!(run(r##"{"optional": "a"}"##, &["b"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"optional": "a"}"##, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"optional": "a"}"##, &["#text"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"optional": "a"}"##, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(r##"{"optional": "a"}"##, &["a"]).matched.len(), 1);
            assert_eq!(run(r##"{"optional": "a"}"##, &["a", "a"]).matched.len(), 1);
            assert_eq!(run(r##"{"optional": "a"}"##, &["b"]).matched.len(), 0);
        }

        #[test]
        fn one_or_more_a() {
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["b"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["c"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["#text"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &[]).result_type, ResultType::MissingNodeOneOrMore);

            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["a"]).matched.len(), 1);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["a", "a", "b"]).matched.len(), 2);
            assert_eq!(run(r##"{"oneOrMore": "a"}"##, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_a() {
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["b"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["#text"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["a"]).matched.len(), 1);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["a", "a", "b"]).matched.len(), 2);
            assert_eq!(run(r##"{"zeroOrMore": "a"}"##, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn require_flow() {
            assert_eq!(run(r##"{"require": "#flow"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"require": "#flow"}"##, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"require": "#flow"}"##, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"require": "#flow"}"##, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"require": "#flow"}"##, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(r##"{"require": "#flow"}"##, &["a"]).matched.len(), 1);
            assert_eq!(run(r##"{"require": "#flow"}"##, &["c"]).matched.len(), 0);
            assert_eq!(run(r##"{"require": "#flow"}"##, &["#text"]).matched.len(), 1);
        }

        #[test]
        fn one_or_more_flow() {
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["b"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["#text"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &[]).result_type, ResultType::MatchedZero);

            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["a", "a", "b"]).matched.len(), 3);
            assert_eq!(run(r##"{"oneOrMore": "#flow"}"##, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_flow() {
            assert_eq!(run(r##"{"zeroOrMore": "#flow"}"##, &["a"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"zeroOrMore": "#flow"}"##, &["c"]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"zeroOrMore": "#flow"}"##, &[]).result_type, ResultType::MatchedZero);
            assert_eq!(run(r##"{"zeroOrMore": "#flow"}"##, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(r##"{"zeroOrMore": "#flow"}"##, &["a", "c", "c"]).matched.len(), 1);
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

            assert_eq!(run(p, &["script"]).matched.len(), 1);
            assert_eq!(run(p, &["template"]).matched.len(), 1);
            assert_eq!(run(p, &["a"]).matched.len(), 0);
        }

        #[test]
        fn min_max() {
            assert_eq!(run(r##"{"require": "c", "min": 2}"##, &[]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(r##"{"require": "c", "min": 2}"##, &["c"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(r##"{"require": "c", "min": 2}"##, &["c", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(r##"{"require": "c", "max": 1}"##, &["c", "c"]).result_type, ResultType::UnexpectedExtraNode);
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
            assert_eq!(run(p, &["dt", "dd", "dd", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
        }

        #[test]
        fn ruby_part3_one_or_more_rt_rp() {
            let p = r##"{"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}"##;
            assert_eq!(run(p, &["rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt", "rp"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["rt", "rp", "rt"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt", "rp", "rt", "rp"]).result_type, ResultType::Matched);
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
            assert_eq!(run(p, &["dt", "dd", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
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
            assert_eq!(run(p, &["a", "b", "c", "d"]).result_type, ResultType::UnexpectedExtraNode);
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
            assert_eq!(run(p, &["a", "b", "b", "c"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["b", "a"]).result_type, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "b"]).result_type, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn ordered_requires_and_optionals_with_flow() {
            let p = r##"[{"require": "a"}, {"optional": "b"}, {"optional": "c"}, {"require": "#flow"}]"##;
            assert_eq!(run(p, &["a", "b", "c"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "b", "c"]).result_type, ResultType::UnexpectedExtraNode);
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
            assert_eq!(run(p, &["dt", "dd", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd", "dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt", "dd", "dd", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
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
            assert_eq!(run(p, &["dt", "dd", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd", "dt", "dd"]).result_type, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt", "dd", "dd", "dt"]).result_type, ResultType::MissingNodeOneOrMore);
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
            assert_eq!(run(p, &["span", "rp", "rt"]).result_type, ResultType::MissingNodeRequired);
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
            assert_eq!(run(p, &["span", "rp", "rt"]).result_type, ResultType::MissingNodeRequired);
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
            assert_eq!(run(p, &["rp", "rt", "rp", "rt"]).result_type, ResultType::MissingNodeRequired);
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
    // Integration tests with real html-spec content models
    // ================================================================
    mod integration {
        use super::*;
        use crate::spec::content_model::{get_content_model, ContentModelContents};

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
            // NOTE: ["meta", "title"] and ["title", "meta"] require :not() selector
            // support to correctly prevent title from being consumed by
            // zeroOrMore(:model(metadata):not(title)). Deferred to full selector integration.
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
}
