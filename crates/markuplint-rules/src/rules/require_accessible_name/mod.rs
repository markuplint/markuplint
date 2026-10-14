//! `require-accessible-name` rule: elements with roles that require accessible names must have one.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname::get_accname;
use crate::aria::computed_role::get_computed_role;
use crate::aria::is_exposed::is_exposed;
use crate::helpers::{accname_may_be_mutable, accname_may_come_from_unknown_content};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct RequireAccessibleName;

impl Rule for RequireAccessibleName {
    fn id(&self) -> &'static str {
        "require-accessible-name"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        let version = parse_aria_version(config.global());

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.is_ghost {
                continue;
            }

            if !is_exposed(spec, arena, node_id, version) {
                continue;
            }

            // A framework binding (a dynamic attribute, a spread, a block whose output is not
            // known) may resolve to a name at runtime, so skip it. TS `accnameMayBeMutable`.
            if accname_may_be_mutable(arena, node_id) {
                continue;
            }

            let computed = get_computed_role(spec, arena, node_id, version, false);

            if let Some(role) = &computed.role
                && role.accessible_name_required
            {
                let accname = get_accname(spec, arena, node_id, version);
                // The static scan cannot decide whether the unknown content is the name.
                if accname.name.is_empty() && !accname_may_come_from_unknown_content(arena, node_id) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "Require accessible name".to_string(),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: None,
                        fix: None,
                    });
                }
            }
        }

        violations
    }
}

fn parse_aria_version(config: &crate::rule::RuleConfig) -> ARIAVersion {
    config
        .options
        .get("ariaVersion")
        .and_then(serde_json::Value::as_str)
        .map_or(ARIAVersion::RECOMMENDED, |s| match s {
            "1.1" => ARIAVersion::V1_1,
            "1.2" => ARIAVersion::V1_2,
            "1.3" => ARIAVersion::V1_3,
            _ => ARIAVersion::RECOMMENDED,
        })
}

#[cfg(test)]
mod tests;
