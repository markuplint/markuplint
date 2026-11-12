//! `case-sensitive-attr-name` rule: attribute names must be lowercase (or uppercase per config).
//! Port of `packages/@markuplint/rules/src/case-sensitive-attr-name/`.
//!
//! The attribute names of SVG and `MathML` elements are case-sensitive in the DOM: the HTML
//! parser gives them the spelling of their specification (`viewBox`), so a name in another case
//! is reported and fixed to that spelling, whatever the option says. A name with no spec is not
//! checked there.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::attr_name;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_name_key::{attr_specs_of, find_attr_spec};
use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct CaseSensitiveAttrName;

impl Rule for CaseSensitiveAttrName {
    fn id(&self) -> &'static str {
        "case-sensitive-attr-name"
    }

    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let tr = config.translator();

        // JSX props (`onClick`) are JavaScript identifiers, not case-insensitive HTML attribute
        // names; lowercasing them breaks the app (TS `document.attrNameCaseSensitive`).
        if arena.settings().attr_name_case_sensitive {
            return violations;
        }

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // TS `el.elementType !== 'html'`, as written (a pretender does not change it).
            if *el.identity(true).element_type != ElementType::Html {
                continue;
            }
            let case = rule_config.value.as_str().unwrap_or("lower");
            // TS uses "should" for warning, "must" for error
            let verb = if rule_config.severity == Severity::Error {
                "must"
            } else {
                "should"
            };
            let attr_specs = attr_specs_of(spec, el);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // TS `attr.nameNode?.raw !== attr.name`: a name the parser resolved to another
                // (JSX's `tabIndex` is `tabindex`) is not the name written, so there is no case to
                // enforce on it.
                let raw_name = markuplint_dom::helpers::get_raw_attr_name(html_attr);
                let name = attr_name(html_attr);
                if raw_name != name {
                    continue;
                }
                let attr_spec = attr_specs
                    .as_deref()
                    .and_then(|specs| find_attr_spec(specs, el, html_attr));
                let name_start = html_attr.name.offset;
                let replace = |text: String| Fix::replace_range(name_start, name_start + raw_name.len(), text);

                // The names of SVG and MathML are case-sensitive in the DOM: the spelling of the
                // spec is the one, whatever the option says
                if el.namespace != NamespaceURI::XHTML {
                    if let Some(spec_name) = attr_spec.and_then(|s| s.name.as_deref())
                        && spec_name != name
                    {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: tr.finish(&tr.t(
                                &format!("{{0}} {verb} be {{1}}"),
                                &[
                                    Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S("attribute")])),
                                    Kw::S(&format!("\"{spec_name}\"")),
                                ],
                            )),
                            line: html_attr.name.line,
                            col: html_attr.name.col,
                            raw: raw_name.to_owned(),
                            reason: rule_config.reason.clone(),
                            fix: Some(replace(spec_name.to_owned())),
                        });
                    }
                    continue;
                }

                // Attributes the spec marks case-sensitive are exempt.
                if attr_spec.is_some_and(|s| s.case_sensitive == Some(true)) {
                    continue;
                }

                let is_correct = match case {
                    "upper" => !name.bytes().any(|b| b.is_ascii_lowercase()),
                    _ => !name.bytes().any(|b| b.is_ascii_uppercase()),
                };
                if is_correct {
                    continue;
                }
                let case_str = if case == "upper" { "uppercase" } else { "lowercase" };
                // The check is ASCII-only, as the TS regex is, but the TS fix converts with
                // `toLowerCase()` / `toUpperCase()`, which are not.
                let fixed_name = if case == "upper" {
                    name.to_uppercase()
                } else {
                    name.to_lowercase()
                };
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: tr.finish(&tr.t(
                        &format!("{{0}} {verb} be {{1}}"),
                        &[
                            Kw::S(&tr.t("{0} of {1}", &[Kw::S("attribute names"), Kw::S("HTML elements")])),
                            Kw::S(case_str),
                        ],
                    )),
                    line: html_attr.name.line,
                    col: html_attr.name.col,
                    raw: raw_name.to_owned(),
                    reason: rule_config.reason.clone(),
                    fix: Some(replace(fixed_name)),
                });
            }
        }

        violations
    }
}
