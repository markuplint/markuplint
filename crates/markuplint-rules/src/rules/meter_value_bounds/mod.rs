//! `meter-value-bounds` rule: the HTML LS inequalities between the numeric attributes of
//! `<meter>`.
//!
//! Ports `packages/@markuplint/rules/src/meter-value-bounds/`. HTML LS § the meter element:
//! minimum ≤ value ≤ maximum, minimum ≤ low/high/optimum ≤ maximum, and low ≤ high when both are
//! written. An absent `min` is 0, an absent `max` is 1, and an absent `value` is the minimum.
//!
//! Values are read with JS `Number()` semantics, as TS reads them. A written value that is not a
//! finite number skips the element: `no-invalid-attr-value` reports it, and a bound against an
//! unknown value would only add noise. So does a dynamic value.

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::ElementData;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::helpers::finite_number_attr;
use crate::rule::{Rule, RuleConfig, RuleConfigSet};
use crate::srcset_check::{attr_node, is_dynamic};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

const DEFAULT_MIN: f64 = 0.0;
const DEFAULT_MAX: f64 = 1.0;

pub struct MeterValueBounds;

impl Rule for MeterValueBounds {
    fn id(&self) -> &'static str {
        "meter-value-bounds"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || element_local_name(el) != "meter" {
                continue;
            }
            // A meter a pretender makes has unknown attributes until `as` pins what it is.
            if el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none() {
                continue;
            }
            let report = Reporter {
                rule_id: self.id(),
                rule_config,
                el,
            };
            check(el, &report, &mut violations);
        }

        violations
    }
}

/// A written attribute and its number.
struct Bound<'a> {
    attr: Option<&'a MLASTHTMLAttr>,
    num: Option<f64>,
}

fn check(el: &ElementData, report: &Reporter<'_>, violations: &mut Vec<Violation>) {
    let names = ["value", "min", "max", "low", "high", "optimum"];
    let attrs = names.map(|name| attr_node(el, name));
    if attrs.iter().flatten().any(|attr| is_dynamic(attr)) {
        return;
    }
    let bounds = attrs.map(|attr| Bound {
        attr,
        num: finite_number_attr(attr.map(|a| a.value.raw.as_str())),
    });
    if bounds.iter().any(|b| b.attr.is_some() && b.num.is_none()) {
        return;
    }
    let [value, min, max, low, high, optimum] = bounds;

    let min_value = min.num.unwrap_or(DEFAULT_MIN);
    let max_value = max.num.unwrap_or(DEFAULT_MAX);
    let value_value = value.num.unwrap_or(min_value);

    let mut le = |lower_name: &str, lower: &Bound<'_>, upper_name: &str, upper: &Bound<'_>, upper_default: f64| {
        violations.push(report.less_or_equal(lower_name, lower.attr, upper_name, upper.attr, upper_default));
    };

    if min_value > max_value {
        le("min", &min, "max", &max, DEFAULT_MAX);
    }
    if min_value > value_value {
        le("min", &min, "value", &value, DEFAULT_MIN);
    }
    if value_value > max_value {
        le("value", &value, "max", &max, DEFAULT_MAX);
    }

    for (name, bound) in [("low", &low), ("high", &high), ("optimum", &optimum)] {
        let Some(num) = bound.num else {
            continue;
        };
        if min_value > num {
            le("min", &min, name, bound, DEFAULT_MIN);
        }
        if num > max_value {
            le(name, bound, "max", &max, DEFAULT_MAX);
        }
    }

    if let (Some(low_num), Some(high_num)) = (low.num, high.num)
        && low_num > high_num
    {
        le("low", &low, "high", &high, 0.0);
    }
}

struct Reporter<'a> {
    rule_id: &'a str,
    rule_config: &'a RuleConfig,
    el: &'a ElementData,
}

impl Reporter<'_> {
    /// TS `reportLE()`: `lower ≤ upper` does not hold. Reported at the lower attribute's value,
    /// else the upper one's, else the element when neither is written.
    fn less_or_equal(
        &self,
        lower_name: &str,
        lower: Option<&MLASTHTMLAttr>,
        upper_name: &str,
        upper: Option<&MLASTHTMLAttr>,
        upper_default: f64,
    ) -> Violation {
        let upper_desc = if upper.is_some() {
            format!("the value of the \"{upper_name}\" attribute")
        } else {
            // TS `upperDefault === 1 ? 'one' : String(upperDefault)`; the defaults are 0 and 1.
            let default = if (upper_default - 1.0).abs() < f64::EPSILON {
                "one".to_owned()
            } else {
                format!("{upper_default}")
            };
            format!("{default} when the \"{upper_name}\" attribute is absent")
        };
        let message = format!("The value of the \"{lower_name}\" attribute must be less than or equal to {upper_desc}");
        let (line, col, raw) = match lower.or(upper) {
            Some(attr) => (attr.value.line, attr.value.col, attr.value.raw.clone()),
            None => (self.el.base.line, self.el.base.col, self.el.base.raw.clone()),
        };
        Violation {
            rule_id: self.rule_id.to_owned(),
            name: None,
            severity: self.rule_config.severity,
            message,
            line,
            col,
            raw,
            reason: self.rule_config.reason.clone(),
            fix: None,
        }
    }
}
