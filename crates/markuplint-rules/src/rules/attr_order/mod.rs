//! `attr-order` rule: attributes appear in a configured (by default alphabetical) order.
//!
//! The fix rewrites the attribute list in the expected order (see [`reorder_fix`]).

use std::cmp::Ordering;
use std::collections::HashSet;

use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr};
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::aria_check::attr_name;
use crate::attr_name_key::AttrNames;
use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct AttrOrder;

/// TS `SortOrder`.
enum SortOrder {
    Alphabetical,
    SourceOrder,
    /// The listed names first, in list order. A non-string item takes a position
    /// but matches no attribute, as in TS `order.indexOf(name)`.
    Fixed(Vec<Option<String>>),
    /// An order string TS does not recognise: every pair compares equal.
    Unknown,
}

/// TS `CompiledEntry.match`.
enum Matcher<'s> {
    Name(String),
    Pattern(fancy_regex::Regex),
    /// The `global` and `event` groups: membership in a set of names from the spec.
    InSet(&'s HashSet<String>),
    Aria,
    Role,
    Data,
    Spread,
    Never,
}

/// TS `CompiledEntry`; its position in the list is the TS `entryIndex`.
struct CompiledEntry<'s> {
    order: SortOrder,
    matcher: Matcher<'s>,
}

/// TS `AttrInfo`.
struct AttrInfo<'a> {
    /// The name as written (`pattern`, messages).
    name: &'a str,
    /// TS `namespaceKeyOf`: the name the DOM gives the attribute, which the alphabetical order
    /// and the predefined groups go by.
    key: String,
    /// What the DOM makes of the names of the configuration (TS `MLAttr#isNamedBy`).
    names: &'a AttrNames<'a>,
    index: usize,
    is_spread: bool,
    /// TS `scopeNode` (`nameNode ?? spacesBeforeName`) as `(line, col, raw)`: absent
    /// for a spread attribute, which has neither token.
    scope: Option<(u32, u32, &'a str)>,
    /// The attribute whose tokens the fix moves; absent for a spread attribute, which has
    /// none (TS reads empty text from its absent tokens).
    tokens: Option<&'a MLASTHTMLAttr>,
}

impl AttrInfo<'_> {
    /// TS `attr.isNamedBy(name)`: a spread attribute is named `#spread`.
    fn is_named_by(&self, name: &str) -> bool {
        self.tokens
            .map_or(name == "#spread", |attr| self.names.is_named_by(attr, name))
    }

    /// TS `spacing`: the whitespace before the name.
    fn spacing(&self) -> &str {
        self.tokens.map_or("", |attr| attr.spaces_before_name.raw.as_str())
    }

    /// TS `buildAttrContent`: everything after the whitespace before the name.
    fn content(&self) -> String {
        self.tokens.map_or_else(String::new, |attr| {
            [
                &attr.name,
                &attr.spaces_before_equal,
                &attr.equal,
                &attr.spaces_after_equal,
                &attr.start_quote,
                &attr.value,
                &attr.end_quote,
            ]
            .iter()
            .map(|token| token.raw.as_str())
            .collect()
        })
    }
}

/// TS `getAttrRange` and the replacement the fix puts there: the attributes in `sorted`
/// order, each position keeping the whitespace the attribute that stood there had. The
/// range runs from the first attribute's leading whitespace to the end of the last
/// attribute's last token with text. `None` when either end is a spread attribute, which
/// has no tokens to measure from — TS makes the same fix a no-op.
fn reorder_fix(infos: &[AttrInfo<'_>], sorted: &[usize]) -> Option<Fix> {
    let first = infos.first()?.tokens?;
    let last = infos.last()?.tokens?;
    let last_token = [
        &last.end_quote,
        &last.value,
        &last.start_quote,
        &last.spaces_after_equal,
        &last.equal,
        &last.spaces_before_equal,
        &last.name,
        &last.spaces_before_name,
    ]
    .into_iter()
    .find(|token| !token.raw.is_empty())?;

    let mut text = String::new();
    for (slot, &moved) in infos.iter().zip(sorted) {
        text.push_str(slot.spacing());
        text.push_str(&infos[moved].content());
    }
    Some(Fix::replace_range(
        first.spaces_before_name.offset,
        last_token.offset + last_token.raw.len(),
        text,
    ))
}

impl Rule for AttrOrder {
    fn id(&self) -> &'static str {
        "attr-order"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let global_attrs = spec_attr_names(spec, "#HTMLGlobalAttrs");
        let event_attrs = spec_attr_names(spec, "#GlobalEventAttrs");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || el.attributes.len() <= 1 {
                continue;
            }

            let alphabetical = rule_config
                .options
                .get("alphabetical")
                .and_then(Value::as_bool)
                .unwrap_or(true);
            let ms = if rule_config.severity == Severity::Error {
                "must"
            } else {
                "should"
            };
            // TS `defaultValue: []`: `true` (or anything that is not a list) is the empty
            // list, which means "alphabetical only".
            let entries: &[Value] = rule_config.value.as_array().map_or(&[], Vec::as_slice);
            let compiled = compile_entries(entries, &global_attrs, &event_attrs);

            let names = AttrNames::new(el, arena.settings());
            let infos: Vec<AttrInfo<'_>> = el
                .attributes
                .iter()
                .enumerate()
                .map(|(index, attr)| match attr {
                    MLASTAttr::HTMLAttr(html_attr) => AttrInfo {
                        name: attr_name(html_attr),
                        key: names.namespace_key_of(html_attr),
                        names: &names,
                        index,
                        is_spread: false,
                        scope: Some((
                            html_attr.name.line,
                            html_attr.name.col,
                            markuplint_dom::helpers::get_raw_attr_name(html_attr),
                        )),
                        tokens: Some(html_attr),
                    },
                    // TS `MLAttr.name` of a spread attribute.
                    MLASTAttr::Spread(_) => AttrInfo {
                        name: "#spread",
                        key: "#spread".to_owned(),
                        names: &names,
                        index,
                        is_spread: true,
                        scope: None,
                        tokens: None,
                    },
                })
                .collect();

            let sorted: Vec<usize> = if compiled.is_empty() {
                let mut order: Vec<usize> = (0..infos.len()).collect();
                if alphabetical {
                    order.sort_by(|&a, &b| compare_strings(&infos[a].key, &infos[b].key));
                }
                order
            } else {
                sort_attrs(&infos, &compiled, alphabetical)
            };

            // The first position holding an attribute other than the expected one is
            // reported, at the attribute that belongs there. A spread attribute has no
            // position to report at, so the search moves on.
            for (i, actual) in infos.iter().enumerate() {
                if actual.index == sorted[i] {
                    continue;
                }
                let expected = &infos[sorted[i]];
                let Some((line, col, raw)) = expected.scope else {
                    continue;
                };
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!(
                        "\"{}\" {ms} be before \"{}\"",
                        display_name(expected.name),
                        display_name(actual.name)
                    ),
                    line,
                    col,
                    raw: raw.to_owned(),
                    reason: rule_config.reason.clone(),
                    fix: reorder_fix(&infos, &sorted),
                });
                break;
            }
        }

        violations
    }
}

/// TS `name || '(spread)'`.
fn display_name(name: &str) -> &str {
    if name.is_empty() { "(spread)" } else { name }
}

/// The attribute names of one `#globalAttrs` category (`#HTMLGlobalAttrs`,
/// `#GlobalEventAttrs`), as TS reads them from `document.specs.def`.
fn spec_attr_names(spec: &MLMLSpec, category: &str) -> HashSet<String> {
    spec.def
        .global_attrs
        .get(category)
        .map(|attrs| attrs.keys().cloned().collect())
        .unwrap_or_default()
}

/// TS `compareStrings`: the `<` of JavaScript strings, which compares UTF-16 code units.
fn compare_strings(a: &str, b: &str) -> Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}

/// TS `entry.order ?? 'alphabetical'`.
fn parse_order(value: Option<&Value>) -> SortOrder {
    match value {
        None => SortOrder::Alphabetical,
        Some(Value::String(s)) if s == "alphabetical" => SortOrder::Alphabetical,
        Some(Value::String(s)) if s == "source-order" => SortOrder::SourceOrder,
        Some(Value::Array(items)) => SortOrder::Fixed(items.iter().map(|v| v.as_str().map(str::to_owned)).collect()),
        Some(_) => SortOrder::Unknown,
    }
}

/// TS `compileEntries`. Of `name`, `pattern` and `group`, the first one present decides
/// what an object entry matches.
fn compile_entries<'s>(
    entries: &[Value],
    global_attrs: &'s HashSet<String>,
    event_attrs: &'s HashSet<String>,
) -> Vec<CompiledEntry<'s>> {
    entries
        .iter()
        .map(|entry| {
            let Value::Object(obj) = entry else {
                return CompiledEntry {
                    order: SortOrder::Alphabetical,
                    matcher: entry
                        .as_str()
                        .map_or(Matcher::Never, |name| Matcher::Name(name.to_owned())),
                };
            };
            let present = |key: &str| obj.get(key).filter(|v| !v.is_null());
            let order_value = present("order");
            let order = parse_order(order_value);

            if let Some(name) = present("name") {
                let matcher = name.as_str().map_or(Matcher::Never, |n| Matcher::Name(n.to_owned()));
                return CompiledEntry { order, matcher };
            }

            if let Some(pattern) = present("pattern") {
                // TS skips an entry whose pattern is not a valid regular expression.
                let matcher = pattern
                    .as_str()
                    .and_then(|p| fancy_regex::Regex::new(p).ok())
                    .map_or(Matcher::Never, Matcher::Pattern);
                return CompiledEntry { order, matcher };
            }

            if let Some(group) = present("group") {
                let matcher = match group.as_str().unwrap_or_default() {
                    "global" => Matcher::InSet(global_attrs),
                    "event" => Matcher::InSet(event_attrs),
                    "aria" => Matcher::Aria,
                    "role" => Matcher::Role,
                    "data" => Matcher::Data,
                    "spread" => Matcher::Spread,
                    _ => Matcher::Never,
                };
                // A spread group keeps the attributes as written unless told otherwise.
                let order = if matches!(matcher, Matcher::Spread) && order_value.is_none() {
                    SortOrder::SourceOrder
                } else {
                    order
                };
                return CompiledEntry { order, matcher };
            }

            CompiledEntry {
                order,
                matcher: Matcher::Never,
            }
        })
        .collect()
}

impl Matcher<'_> {
    fn matches(&self, info: &AttrInfo<'_>) -> bool {
        // The name as written for a `pattern`, which takes no flags and so is not folded; the name
        // the DOM gives the attribute for a group (TS `namespaceKeyOf`).
        let name = info.name;
        let key = info.key.as_str();
        match self {
            Self::Name(n) => info.is_named_by(n),
            Self::Pattern(re) => re.is_match(name).unwrap_or(false),
            Self::InSet(names) => names.contains(key),
            // TS `/^aria-.+$/` and `/^data-.+$/`.
            Self::Aria => prefixed_by(key, "aria-"),
            Self::Role => key == "role",
            Self::Data => prefixed_by(key, "data-"),
            Self::Spread => info.is_spread,
            Self::Never => false,
        }
    }
}

/// `^<prefix>.+$` of a JavaScript regular expression without flags: something follows
/// the prefix, and `.` matches no line terminator.
fn prefixed_by(name: &str, prefix: &str) -> bool {
    name.strip_prefix(prefix)
        .is_some_and(|rest| !rest.is_empty() && !rest.contains(['\n', '\r', '\u{2028}', '\u{2029}']))
}

/// TS `compareWithinGroup`.
fn compare_within_group(a: &AttrInfo<'_>, b: &AttrInfo<'_>, order: &SortOrder) -> Ordering {
    match order {
        SortOrder::Alphabetical => compare_strings(&a.key, &b.key),
        SortOrder::SourceOrder => a.index.cmp(&b.index),
        SortOrder::Fixed(list) => {
            // TS `order.findIndex(name => attr.isNamedBy(name))`.
            let position = |info: &AttrInfo<'_>| {
                list.iter()
                    .position(|n| n.as_deref().is_some_and(|name| info.is_named_by(name)))
            };
            let (ai, bi) = (position(a), position(b));
            let a_idx = ai.unwrap_or(list.len());
            let b_idx = bi.unwrap_or(list.len());
            if a_idx != b_idx {
                return a_idx.cmp(&b_idx);
            }
            if ai.is_none() && bi.is_none() {
                return compare_strings(&a.key, &b.key);
            }
            Ordering::Equal
        }
        SortOrder::Unknown => Ordering::Equal,
    }
}

/// TS `sortAttrs`: the attribute indices in the expected order. Every attribute takes
/// the first entry it matches; unmatched ones go last, alphabetically or (with
/// `alphabetical: false`) as written.
fn sort_attrs(infos: &[AttrInfo<'_>], compiled: &[CompiledEntry<'_>], alphabetical: bool) -> Vec<usize> {
    // `(attribute index, entry index, entry order)`; an unmatched attribute takes the
    // entry index after the last entry and no order.
    let mut tagged: Vec<(usize, usize, Option<&SortOrder>)> = infos
        .iter()
        .map(|info| {
            compiled
                .iter()
                .enumerate()
                .find(|(_, entry)| entry.matcher.matches(info))
                .map_or((info.index, compiled.len(), None), |(i, entry)| {
                    (info.index, i, Some(&entry.order))
                })
        })
        .collect();

    // A stable sort, as TS `toSorted`.
    tagged.sort_by(|&(a, a_entry, a_order), &(b, b_entry, _)| {
        if a_entry != b_entry {
            return a_entry.cmp(&b_entry);
        }
        let (a, b) = (&infos[a], &infos[b]);
        match a_order {
            None if alphabetical => compare_strings(&a.key, &b.key),
            None => a.index.cmp(&b.index),
            Some(order) => compare_within_group(a, b, order),
        }
    });
    tagged.into_iter().map(|(index, _, _)| index).collect()
}
