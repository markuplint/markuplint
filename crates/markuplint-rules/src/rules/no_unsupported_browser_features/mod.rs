//! `no-unsupported-browser-features` rule: report HTML elements and attributes that the project's
//! browserslist targets do not support, according to MDN's browser-compat-data (BCD).
//!
//! Ports `packages/@markuplint/rules/src/no-unsupported-browser-features/` (`index.ts`,
//! `compat-data.ts`, and the part of `resolve-browsers.ts` that is not browserslist itself).
//!
//! What this engine does not have is browserslist and BCD, so the caller supplies them as
//! [`BrowserSupport`] in `ruleCommonSettings.browserSupport`: TS resolves the targets once per file
//! (`resolve-browsers.ts`, from the global options of the rule and the file name, which is all the
//! TS rule reads for it) and extracts, from the user's installed `@mdn/browser-compat-data`, the
//! statements of those browsers for `html.elements.<element>` and the keys directly beneath it.
//! BCD is not embedded in the binary: how new the data is must not depend on the release of
//! markuplint. It sits in the common settings, not in the options of the rule, because a node rule
//! replaces the options of the rule for its nodes while the targets are those of the document.
//! Without it (no browserslist configuration applies) the rule reports nothing, as in TS.
//!
//! The walk, the pretender gate, the `ignoreFeatures` lookup and the attribute-name folding are the
//! same as `no-experimental-features` (`crate::feature_check`). The default severity is `warning`.

use markuplint_core::i18n::{Primitive as Kw, Translator};
use std::collections::HashMap;

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{attr_name, is_named_by, key_of, name_key};
use markuplint_types::spec::types::MLMLSpec;
use serde::Deserialize;
use serde_json::Value;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

/// A browser the project targets, resolved by browserslist (TS `TargetBrowser`).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetBrowser {
    /// The BCD browser name (`chrome_android`).
    pub browser: String,
    pub version: String,
    pub display_name: String,
}

/// `version_added` of a BCD statement. BCD 8 has a version string or `false`; anything else is
/// read as `false`.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum VersionAdded {
    Version(String),
    Unsupported(#[allow(dead_code)] bool),
}

/// One support statement of BCD. `flags`, `prefix` and `alternative_name` only say that the
/// statement is not the standard one.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompatStatement {
    pub version_added: VersionAdded,
    #[serde(default)]
    pub version_removed: Option<String>,
    #[serde(default)]
    pub flags: bool,
    #[serde(default)]
    pub prefix: bool,
    #[serde(default)]
    pub alternative_name: bool,
}

/// The statements of one feature by BCD browser name (`__compat.support`), for the target
/// browsers only.
pub type CompatSupport = HashMap<String, Vec<CompatStatement>>;

/// `bcd.html.elements.<element>`: its own support and that of the attribute keys beneath it (the
/// keys as BCD spells them, which can be in camel case: `privateToken`).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementCompat {
    #[serde(default)]
    pub compat: Option<CompatSupport>,
    #[serde(default)]
    pub attrs: HashMap<String, CompatSupport>,
}

/// What the rule needs of browserslist and BCD (see the module documentation).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserSupport {
    pub targets: Vec<TargetBrowser>,
    /// `bcd.html.elements` by the exact element name.
    pub elements: HashMap<String, ElementCompat>,
}

/// A target browser that does not support a feature (TS `UnsupportedResult`).
#[derive(Debug, PartialEq, Eq)]
struct Unsupported<'a> {
    display_name: &'a str,
    target_version: &'a str,
    /// `None`: not added (`version_added: false`).
    added_version: Option<&'a str>,
    removed_version: Option<&'a str>,
}

/// TS `JS Number(s)` for the parts of a version: an empty part is `0`, a part that is not a number
/// is `NaN`.
fn js_number(part: &str) -> f64 {
    let trimmed = part.trim();
    if trimmed.is_empty() {
        return 0.0;
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_digit() || matches!(c, '.' | 'e' | 'E' | '+' | '-'))
    {
        return f64::NAN;
    }
    trimmed.parse::<f64>().unwrap_or(f64::NAN)
}

/// TS `parseVersion`: a comparable `[major, minor, patch]`. The `≤` of BCD is stripped, and a
/// version that is not a number (`preview`) has a `NaN` major.
fn parse_version(version: &str) -> [f64; 3] {
    let cleaned = version.strip_prefix('≤').unwrap_or(version);
    let mut parts = cleaned.split('.').map(js_number);
    [
        parts.next().unwrap_or(f64::NAN),
        parts.next().unwrap_or(0.0),
        parts.next().unwrap_or(0.0),
    ]
}

/// TS `isVersionSatisfied`: whether the target version is the version the feature was added in or
/// later. A version that cannot be compared (`preview`) is satisfied.
#[allow(clippy::float_cmp)] // the parts are whole numbers parsed from text, as in TS `!==`
fn is_version_satisfied(target: &str, added: &str) -> bool {
    let [t_major, t_minor, t_patch] = parse_version(target);
    let [a_major, a_minor, a_patch] = parse_version(added);
    if t_major.is_nan() || a_major.is_nan() {
        return true;
    }
    if t_major != a_major {
        return t_major > a_major;
    }
    if t_minor != a_minor {
        return t_minor > a_minor;
    }
    t_patch >= a_patch
}

/// TS `checkSupport`: the first statement that is not behind a flag, a prefix or another name is
/// the standard support. No such statement is not a finding.
fn check_support<'a>(
    statements: Option<&'a Vec<CompatStatement>>,
    target: &'a TargetBrowser,
) -> Option<Unsupported<'a>> {
    let stmt = statements?
        .iter()
        .find(|s| !s.flags && !s.prefix && !s.alternative_name)?;
    let unsupported = |added_version, removed_version| {
        Some(Unsupported {
            display_name: &target.display_name,
            target_version: &target.version,
            added_version,
            removed_version,
        })
    };
    let VersionAdded::Version(added) = &stmt.version_added else {
        return unsupported(None, None);
    };
    if !is_version_satisfied(&target.version, added) {
        return unsupported(Some(added), None);
    }
    // Added, and later removed
    if let Some(removed) = stmt.version_removed.as_deref()
        && is_version_satisfied(&target.version, removed)
    {
        return unsupported(None, Some(removed));
    }
    None
}

fn check_all<'a>(support: Option<&'a CompatSupport>, targets: &'a [TargetBrowser]) -> Vec<Unsupported<'a>> {
    let Some(support) = support else {
        return Vec::new();
    };
    targets
        .iter()
        .filter_map(|target| check_support(support.get(&target.browser), target))
        .collect()
}

/// TS `findAttrIdentifier`: the key as written comes first; otherwise a key of BCD that the DOM
/// would key as the attribute is keyed (`privateToken` is `privatetoken` for an attribute that
/// the HTML parser folds). `MLAttr#isNamedBy` is not asked: it reads a name with a capital letter
/// as the prop of a framework and matches only its exact spelling, but a key of BCD is the
/// spelling of an attribute of the browser.
fn find_attr_support<'a>(
    element: &'a ElementCompat,
    el: &markuplint_dom::node::ElementData,
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
) -> Option<&'a CompatSupport> {
    let name = attr_name(attr);
    if let Some(exact) = element.attrs.get(name) {
        return Some(exact);
    }
    let name_key = name_key(el, attr);
    // BCD keys of one element are few; the order of a hash map does not matter, as a key that is
    // the attribute is the only one that matches except when two keys fold to the same name.
    let mut keys: Vec<&String> = element
        .attrs
        .keys()
        .filter(|key| key.eq_ignore_ascii_case(&name_key) && key_of(el, attr, key) == name_key)
        .collect();
    keys.sort();
    keys.first().and_then(|key| element.attrs.get(*key))
}

/// TS `formatUnsupportedMessage`.
fn format_message(
    tr: Translator<'static>,
    feature_name: &str,
    feature_type: &str,
    unsupported: &[Unsupported<'_>],
) -> String {
    let details = unsupported
        .iter()
        .map(|u| match (u.added_version, u.removed_version) {
            (None, Some(removed)) if !removed.is_empty() => format!("{} (removed in {removed})", u.display_name),
            (None, _) => format!("{} (not supported)", u.display_name),
            (Some(added), _) => format!("{} (added in {added}, target: {})", u.display_name, u.target_version),
        })
        .collect::<Vec<_>>()
        .join(", ");
    tr.finish(&tr.t(
        "{0} is not supported in {1}",
        &[
            Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(feature_name), Kw::S(feature_type)])),
            Kw::S(&details),
        ],
    ))
}

/// The parts of the keys of `ignoreFeatures` (TS `parseIgnoreFeatures`): the element keys, and the
/// element part and the attribute part of the attribute keys.
struct IgnoreFeatures<'a> {
    elements: Vec<&'a str>,
    attrs: Vec<(&'a str, &'a str)>,
}

impl<'a> IgnoreFeatures<'a> {
    fn parse(option: &'a Value) -> Self {
        let mut elements = Vec::new();
        let mut attrs = Vec::new();
        for feature in option.as_array().into_iter().flatten().filter_map(Value::as_str) {
            match feature.find('[') {
                Some(open) if feature.ends_with(']') => {
                    attrs.push((&feature[..open], &feature[open + 1..feature.len() - 1]));
                }
                _ => elements.push(feature),
            }
        }
        Self { elements, attrs }
    }
}

/// The element part of a key names `el_name`, compared as the document compares tag names
/// (TS `createIgnoreFeaturesLookup`).
fn element_part_matches(part: &str, el_name: &str, tag_name_case_sensitive: bool) -> bool {
    if tag_name_case_sensitive {
        part == el_name
    } else {
        part.eq_ignore_ascii_case(el_name)
    }
}

pub struct NoUnsupportedBrowserFeatures;

impl Rule for NoUnsupportedBrowserFeatures {
    fn id(&self) -> &'static str {
        "no-unsupported-browser-features"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let tr = config.translator();
        // Without a browserslist configuration, there is nothing to check against.
        let Some(support) = config.common_settings().browser_support.as_ref() else {
            return Vec::new();
        };
        if support.targets.is_empty() {
            return Vec::new();
        }
        let tag_name_case_sensitive = arena.settings().tag_name_case_sensitive;
        let mut violations = Vec::new();
        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || el.is_ghost {
                continue;
            }
            // Web components and authored elements reach this rule via `pretenders`: they
            // masquerade as a known HTML element on `el.localName` (#3740).
            if el.namespace != NamespaceURI::XHTML || (el.element_type != ElementType::Html && el.pretended().is_none())
            {
                continue;
            }
            // TS `el.localName`
            let el_name = if tag_name_case_sensitive {
                el.base.node_name.clone()
            } else {
                el.base.node_name.to_ascii_lowercase()
            };
            // The `ignoreFeatures` of an element replaces that of the rule
            let empty = Value::Null;
            let ignore = IgnoreFeatures::parse(rule_config.options.get("ignoreFeatures").unwrap_or(&empty));
            let element = support.elements.get(&el_name);

            let element_ignored = ignore
                .elements
                .iter()
                .any(|part| element_part_matches(part, &el_name, tag_name_case_sensitive));
            if !element_ignored {
                let unsupported = check_all(element.and_then(|e| e.compat.as_ref()), &support.targets);
                if !unsupported.is_empty() {
                    violations.push(Violation {
                        spec_conformance: None,
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format_message(tr, &el_name, "element", &unsupported),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: rule_config.reason.clone(),
                        fix: None,
                    });
                }
            }

            let Some(element) = element else {
                continue;
            };
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                if html_attr.is_directive == Some(true) {
                    continue;
                }
                let attr_ignored = ignore.attrs.iter().any(|(part, name)| {
                    element_part_matches(part, &el_name, tag_name_case_sensitive) && is_named_by(el, html_attr, name)
                });
                if attr_ignored {
                    continue;
                }
                let unsupported = check_all(find_attr_support(element, el, html_attr), &support.targets);
                if unsupported.is_empty() {
                    continue;
                }
                violations.push(Violation {
                    spec_conformance: None,
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format_message(tr, attr_name(html_attr), "attribute", &unsupported),
                    line: html_attr.name.line,
                    col: html_attr.name.col,
                    raw: html_attr.name.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                });
            }
        }
        violations
    }
}
