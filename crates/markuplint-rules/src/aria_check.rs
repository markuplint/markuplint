//! Machinery shared by the rules the `wai-aria` umbrella rule was split into.
//!
//! Ports the parts the 21 TS rules (`packages/@markuplint/rules/src/<rule>/index.ts`,
//! `.../src/wai-aria/checkings/*.ts`) repeat:
//!
//! - [`walk_elements`]: the preamble every `index.ts` shares (`document.walkOn('Element')`,
//!   `getSpec`, the `#ARIAAttrs` gate), including the two rules that deviate from it
//!   ([`ElementGate`]).
//! - [`resolve_aria_version`]: `el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion
//!   ?? ARIA_RECOMMENDED_VERSION`.
//! - [`get_element_aria`]: `getARIA()` (`ml-spec/src/algorithm/aria/get-aria.ts`) with
//!   `resolveVersion()` and `optimizePermittedRoles()`, typed ([`ResolvedElementARIA`]).
//! - [`role_tokens`]: `attr.tokenList.allTokens()` for the `role` attribute, so a role problem is
//!   reported at the offending token rather than at the whole value.
//! - The three report scopes TS uses (attribute, element, token) on [`ElementContext`].
//!
//! Messages are not built here: they are hard-coded English strings per rule, equal to the TS `en`
//! output.

// The module is staged: the rules that consume most of these items are ported one step at a time,
// so until then they have no caller. Drop this once the last of the 21 rules is on top of it.
#![allow(dead_code)]

use std::cell::OnceCell;

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::ElementData;
use markuplint_selector::parser;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::lookup::get_spec_by_tag_name;
use markuplint_types::spec::types::{
    ARIAConditions, ARIAConditionsOrFalse, ARIAPropertyType, ARIARoleInSchema, ElementARIA, ElementARIAVersionBlock,
    ElementSpec, ImplicitRole, MLMLSpec,
};
use serde_json::Value;

use crate::aria::computed_role::get_computed_role;
use crate::aria_resolver_impl::SpecAriaResolver;
use crate::rule::{RuleCommonSettings, RuleConfigSet};
use crate::violation::{Severity, Violation};

// ============================================================
// Version
// ============================================================

/// The ARIA version a rule checks against.
///
/// TS: `el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ??
/// ARIA_RECOMMENDED_VERSION`. The rules' `schema.json` has no `options`, yet the TS rules still
/// read `options.version`, and their specs pass it (`rule: { options: { version: '1.2' } }`), so
/// it stays the first source. A value that is not one of `1.1` / `1.2` / `1.3` is skipped rather
/// than trusted, so a typo falls through to the next source instead of selecting no version.
pub(crate) fn resolve_aria_version(options: &Value, common_settings: &RuleCommonSettings) -> ARIAVersion {
    options
        .get("version")
        .and_then(Value::as_str)
        .and_then(parse_aria_version)
        .or_else(|| common_settings.aria_version.as_deref().and_then(parse_aria_version))
        .unwrap_or(ARIAVersion::RECOMMENDED)
}

fn parse_aria_version(version: &str) -> Option<ARIAVersion> {
    match version {
        "1.1" => Some(ARIAVersion::V1_1),
        "1.2" => Some(ARIAVersion::V1_2),
        "1.3" => Some(ARIAVersion::V1_3),
        _ => None,
    }
}

// ============================================================
// Walking elements
// ============================================================

/// Which elements a rule looks at, by what the spec says about them.
///
/// Every TS rule starts with `getSpec(el, specs)` and `elSpec.globalAttrs['#ARIAAttrs']`; they
/// differ only in the cases below.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ElementGate {
    /// The element has a spec and the spec says ARIA attributes are supported. The default.
    Supported,
    /// The element has a spec and the spec says ARIA attributes are **not** supported.
    /// `no-aria-on-unsupported-element` is the inverse of everything else.
    Unsupported,
    /// As [`Self::Supported`], but an element without a spec is let through when it is a web
    /// component. `no-prohibited-naming` and `role-supports-aria-prop` do this: autonomous custom
    /// elements have no spec entry yet still accept `aria-*`, and are checked for naming
    /// prohibition. An element that has a spec whose flag is falsy is still skipped.
    SupportedOrWebComponent,
}

impl ElementGate {
    fn admits(self, el_spec: Option<&ElementSpec>, el: &ElementData) -> bool {
        let Some(el_spec) = el_spec else {
            return self == Self::SupportedOrWebComponent && el.element_type == ElementType::WebComponent;
        };
        let supports_aria = is_truthy(el_spec.global_attrs.get("#ARIAAttrs"));
        match self {
            Self::Unsupported => !supports_aria,
            Self::Supported | Self::SupportedOrWebComponent => supports_aria,
        }
    }
}

/// JS truthiness of a spec value (`if (elSpec.globalAttrs['#ARIAAttrs'])`).
fn is_truthy(value: Option<&Value>) -> bool {
    match value {
        None | Some(Value::Null) => false,
        Some(Value::Bool(b)) => *b,
        Some(Value::Number(n)) => n.as_f64().is_some_and(|n| n != 0.0),
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Array(_) | Value::Object(_)) => true,
    }
}

/// What a rule's per-element check gets to see.
pub(crate) struct ElementContext<'a> {
    pub(crate) spec: &'a MLMLSpec,
    pub(crate) arena: &'a DomArena,
    pub(crate) node_id: NodeId,
    pub(crate) el: &'a ElementData,
    /// The element's name as the parser gave it. For spec lookups use [`Self::el_spec`] or
    /// [`Self::aria`], which also account for the namespace.
    pub(crate) el_name: &'a str,
    /// `None` only for a web component admitted by [`ElementGate::SupportedOrWebComponent`].
    pub(crate) el_spec: Option<&'a ElementSpec>,
    pub(crate) version: ARIAVersion,
    pub(crate) rule_id: &'a str,
    pub(crate) severity: Severity,
    pub(crate) reason: Option<&'a str>,
    /// Resolved on first use: a rule asks for it once per attribute, and it matches selectors.
    aria: OnceCell<Option<ResolvedElementARIA>>,
}

impl ElementContext<'_> {
    /// [`get_element_aria`] for this element at the version the rule is configured for.
    pub(crate) fn aria(&self) -> Option<&ResolvedElementARIA> {
        self.aria
            .get_or_init(|| get_element_aria(self.spec, self.arena, self.node_id, self.el_name, self.version))
            .as_ref()
    }

    /// TS `el.localName`, the element name the messages quote.
    pub(crate) fn local_name(&self) -> String {
        element_local_name(self.el)
    }

    /// TS `getImplicitRoleName()` (`ml-spec/src/algorithm/aria/get-implicit-role.ts`) for this
    /// element at the rule's version: the implicit role of [`Self::aria`], `None` for the spec's
    /// `false` ("no corresponding role") or an element without an ARIA section.
    pub(crate) fn implicit_role_name(&self) -> Option<&str> {
        self.aria().and_then(|aria| aria.implicit_role.as_deref())
    }

    /// TS `scope: attr`: the attribute from its name to its end.
    pub(crate) fn attr_violation(&self, attr: &MLASTHTMLAttr, message: impl Into<String>) -> Violation {
        self.violation(attr.name.line, attr.name.col, attr.raw.clone(), message.into())
    }

    /// TS `scope: el`: the start tag.
    pub(crate) fn element_violation(&self, message: impl Into<String>) -> Violation {
        self.violation(
            self.el.base.line,
            self.el.base.col,
            self.el.base.raw.clone(),
            message.into(),
        )
    }

    /// TS `scope: token`: one whitespace-separated token of an attribute value, see [`role_tokens`].
    pub(crate) fn token_violation(&self, token: &RoleToken, message: impl Into<String>) -> Violation {
        self.violation(token.line, token.col, token.value.clone(), message.into())
    }

    fn violation(&self, line: u32, col: u32, raw: String, message: String) -> Violation {
        Violation {
            rule_id: self.rule_id.to_string(),
            name: None,
            severity: self.severity,
            message,
            line,
            col,
            raw,
            reason: self.reason.map(str::to_string),
        }
    }
}

/// Runs `check` on every element `gate` admits.
///
/// `parse_options` runs once per element, since `nodeRules` can give an element options of its
/// own. An element the rule is disabled for (globally, by `nodeRules`, or because it is a ghost
/// element) is skipped, as in [`crate::attr_check::walk_attrs`]. `check` pushes onto the output
/// because one element can produce several violations.
pub(crate) fn walk_elements<O>(
    rule_id: &str,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfigSet,
    gate: ElementGate,
    parse_options: impl Fn(&Value) -> O,
    mut check: impl FnMut(&O, &ElementContext<'_>, &mut Vec<Violation>),
) -> Vec<Violation> {
    if config.global().value == Value::Bool(false) {
        return vec![];
    }

    let mut violations = Vec::new();

    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled || rule_config.value == Value::Bool(false) || el.is_ghost {
            continue;
        }

        let el_spec = get_spec_by_tag_name(spec, &el.base.node_name, Some(namespace_uri(&el.namespace)));
        if !gate.admits(el_spec, el) {
            continue;
        }

        let options = parse_options(&rule_config.options);
        let ctx = ElementContext {
            spec,
            arena,
            node_id,
            el,
            el_name: &el.base.node_name,
            el_spec,
            version: resolve_aria_version(&rule_config.options, config.common_settings()),
            rule_id,
            severity: rule_config.severity,
            reason: rule_config.reason.as_deref(),
            aria: OnceCell::new(),
        };
        check(&options, &ctx, &mut violations);
    }

    violations
}

fn namespace_uri(namespace: &NamespaceURI) -> &'static str {
    match namespace {
        NamespaceURI::XHTML => "http://www.w3.org/1999/xhtml",
        NamespaceURI::SVG => "http://www.w3.org/2000/svg",
        NamespaceURI::MathML => "http://www.w3.org/1998/Math/MathML",
        NamespaceURI::XLink => "http://www.w3.org/1999/xlink",
    }
}

// ============================================================
// Attributes
// ============================================================

/// The HTML attributes of `el` (spread attributes carry no name to check).
pub(crate) fn html_attrs(el: &ElementData) -> impl Iterator<Item = &MLASTHTMLAttr> {
    el.attributes.iter().filter_map(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr) => Some(&**html_attr),
        MLASTAttr::Spread(_) => None,
    })
}

/// The attribute's name as TS `attr.name` gives it: the name the parser resolved (`potentialName`)
/// when there is one, otherwise the name as written.
pub(crate) fn attr_name(attr: &MLASTHTMLAttr) -> &str {
    attr.potential_name
        .as_deref()
        .unwrap_or_else(|| markuplint_dom::helpers::get_raw_attr_name(attr))
}

/// TS `el.localName`: an HTML element's name is lower-cased, a foreign (SVG, `MathML`) or
/// authored/web-component element keeps the case it was written in.
pub(crate) fn element_local_name(el: &ElementData) -> String {
    if el.element_type == ElementType::Html && el.namespace == NamespaceURI::XHTML {
        el.base.node_name.to_ascii_lowercase()
    } else {
        el.base.node_name.clone()
    }
}

/// TS `/^aria-/i.test(attr.name)`.
pub(crate) fn is_aria_prop_attr(attr: &MLASTHTMLAttr) -> bool {
    attr_name(attr)
        .get(..5)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("aria-"))
}

/// TS `el.getAttributeNode('role')`: the first `role` attribute, matched case-insensitively.
pub(crate) fn role_attr(el: &ElementData) -> Option<&MLASTHTMLAttr> {
    html_attrs(el).find(|attr| attr_name(attr).eq_ignore_ascii_case("role"))
}

/// TS `el.attributes.filter(attr => /^aria-/i.test(attr.name))`.
pub(crate) fn aria_prop_attrs(el: &ElementData) -> Vec<&MLASTHTMLAttr> {
    html_attrs(el).filter(|attr| is_aria_prop_attr(attr)).collect()
}

/// A list of names as TS `t(list)` writes it without the last-separator flag: `"a", "b", "c"`.
pub(crate) fn quoted_list(items: &[String]) -> String {
    items
        .iter()
        .map(|item| format!("\"{item}\""))
        .collect::<Vec<_>>()
        .join(", ")
}

/// `"property"` or `"state"`, the word the messages put after `ARIA`.
pub(crate) fn prop_type_label(prop_type: &ARIAPropertyType) -> &'static str {
    match prop_type {
        ARIAPropertyType::Property => "property",
        ARIAPropertyType::State => "state",
    }
}

// ============================================================
// Role tokens
// ============================================================

/// One whitespace-separated token of the `role` attribute value, with where it starts.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct RoleToken {
    pub(crate) value: String,
    /// 1-based line of the token's first character.
    pub(crate) line: u32,
    /// 1-based column of the token's first character.
    pub(crate) col: u32,
}

/// The tokens of the `role` attribute value with their positions.
///
/// Port of `attr.tokenList.allTokens()` (`ml-core/src/ml-dom/node/dom-token-list.ts`): the value
/// is split on whitespace (JS `\s+`) and an attribute with a dynamic value has no token list at
/// all, hence no tokens.
///
/// Deliberately not a transcription of how TS finds the positions. TS searches the value for each
/// token with `indexOf` starting at the *previous token's start*, so a repeated token
/// (`role="a a"`) or a token that is a substring of an earlier one (`role="button b"`) is placed
/// at the earlier occurrence, and on a later line of a multi-line value it adds the value's start
/// column to the column. Here every token is placed where it is written; the two agree whenever
/// the tokens are distinct, non-nested and on the value's first line.
///
/// Columns count characters (code points), as every other column of the DOM does: the parser
/// advances one column per character. TS counts UTF-16 code units, so after a character outside
/// the BMP a column differs by one, for these tokens as for any other position.
pub(crate) fn role_tokens(attr: &MLASTHTMLAttr) -> Vec<RoleToken> {
    if attr.is_dynamic_value == Some(true) {
        return vec![];
    }

    let mut tokens = Vec::new();
    let mut current: Option<RoleToken> = None;
    let mut line = attr.value.line;
    let mut col = attr.value.col;

    let mut chars = attr.value.raw.chars().peekable();
    while let Some(ch) = chars.next() {
        if is_js_whitespace(ch) {
            tokens.extend(current.take());
        } else {
            current
                .get_or_insert_with(|| RoleToken {
                    value: String::new(),
                    line,
                    col,
                })
                .value
                .push(ch);
        }

        // The HTML parser counts "\r\n", "\r" and "\n" each as one line break.
        match ch {
            '\r' => {
                if chars.peek() == Some(&'\n') {
                    chars.next();
                }
                line += 1;
                col = 1;
            }
            '\n' => {
                line += 1;
                col = 1;
            }
            _ => col += 1,
        }
    }
    tokens.extend(current);

    tokens
}

/// JS `\s`: Unicode `White_Space` except U+0085, plus U+FEFF.
pub(crate) fn is_js_whitespace(ch: char) -> bool {
    ch == '\u{FEFF}' || (ch.is_whitespace() && ch != '\u{85}')
}

// ============================================================
// Element ARIA (getARIA)
// ============================================================

/// An element's ARIA spec after the ARIA version and the matching conditions are applied.
///
/// TS: `getARIA()` minus `conditions`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ResolvedElementARIA {
    /// `None` is the spec's `false`: no corresponding role.
    pub(crate) implicit_role: Option<String>,
    pub(crate) permitted_roles: PermittedRoles,
    /// `aria-*` name and the value the element implies for it.
    pub(crate) implicit_properties: Vec<(String, String)>,
    pub(crate) properties: ElementProperties,
    pub(crate) naming_prohibited: bool,
}

/// TS: `PermittedRoles = boolean | (string | { name; deprecated? })[] | PermittedARIAAAMInfo`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum PermittedRoles {
    /// `true`: any role.
    Any,
    /// `false`: no role may be set explicitly, not even the implicit one. (A missing value is read
    /// the same way; the schema requires it, so it does not occur in valid spec data.)
    Nothing,
    /// An explicit list, with the `presentation` / `none` (and, from 1.3, `img` / `image`)
    /// synonyms added, unique by name and sorted by name. See [`optimize_permitted_roles`].
    Roles(Vec<PermittedRole>),
    /// The roles of the named accessibility API mappings, `{ "core-aam": true }` /
    /// `{ "graphics-aam": true }`.
    Aam { core_aam: bool, graphics_aam: bool },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct PermittedRole {
    pub(crate) name: String,
    pub(crate) deprecated: bool,
}

/// TS: `PermittedARIAProperties = false | { global?, role?, only?, without? }`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum ElementProperties {
    /// The spec does not constrain the properties (`properties` is absent).
    Unspecified,
    /// `false`: "No role or aria-* attributes".
    Disallowed,
    Constrained(PropertiesConstraint),
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct PropertiesConstraint {
    /// `global: true`: the global `aria-*` properties are allowed.
    pub(crate) global: bool,
    /// `role`: "and any aria-* attributes applicable to the allowed roles".
    pub(crate) role: Option<RoleProperties>,
    /// `only`: whitelist; when present, nothing outside it is supported.
    pub(crate) only: Option<Vec<OnlyEntry>>,
    /// `without`: blacklist with a suggested alternative.
    pub(crate) without: Option<Vec<WithoutEntry>>,
}

/// TS: `role?: true | string | [string, ...string[]]`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum RoleProperties {
    /// `true`: the properties of whichever roles are allowed.
    Allowed,
    /// The properties of these roles only.
    Roles(Vec<String>),
}

/// An `only` entry: a bare name, or a name with the value it is limited to.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct OnlyEntry {
    pub(crate) name: String,
    pub(crate) value: Option<String>,
}

/// A `without` entry: an `aria-*` attribute the element should not carry, how strongly the spec
/// says so, and what to do about it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WithoutEntry {
    pub(crate) name: String,
    pub(crate) value: Option<String>,
    pub(crate) restriction: Restriction,
    pub(crate) alt: Option<WithoutAlt>,
}

/// The `type` of a `without` entry.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Restriction {
    NotRecommended,
    ShouldNot,
    MustNot,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WithoutAlt {
    pub(crate) method: AltMethod,
    /// The HTML attribute that carries the same information.
    pub(crate) target: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum AltMethod {
    RemoveAttr,
    SetAttr,
}

/// Port of `getARIA()` with `resolveVersion()` and `optimizePermittedRoles()`.
///
/// 1. The version block (`aria["1.1"]`, ...) overrides the base fields; `namingProhibited` is
///    the exception for 1.1, which always uses the base value because 1.1 predates it. A version
///    block with `conditions: false` removes the conditions altogether.
/// 2. **Every** condition whose selector matches the element is then applied, in the order the
///    spec lists them, each replacing the fields it carries (not merging into them). A later
///    match therefore wins, which is why [`ARIAConditions`] keeps source order.
/// 3. A condition whose selector does not parse is skipped, as TS skips one that throws a
///    `SyntaxError`.
/// 4. `permittedRoles` lists are optimized, see [`optimize_permitted_roles`].
///
/// Conditions are matched with an ARIA resolver, so `:aria(has name)` / `:role()` conditions
/// (`<img>`, `<aside>`, ...) work as they do for the TS rules, which match through ml-core. A
/// resolver computes accessible names and roles, so this function must not be called from inside
/// that computation (`aria::accname`, `aria::computed_role`) without a guard against recursion.
///
/// `None` when the element is gone or its spec has no ARIA section.
pub(crate) fn get_element_aria(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el_name: &str,
    version: ARIAVersion,
) -> Option<ResolvedElementARIA> {
    let el = arena.get(node_id)?.as_element()?;
    let el_spec = get_spec_by_tag_name(spec, el_name, Some(namespace_uri(&el.namespace)))?;
    let aria = &el_spec.aria;
    // `aria` is always present in the Rust model; the two fields the schema requires being absent
    // is how a spec without an ARIA section shows up.
    if aria.implicit_role.is_none() && aria.permitted_roles.is_none() {
        return None;
    }

    let (mut layer, conditions) = resolve_version(aria, version);

    if let Some(conditions) = conditions {
        let resolver = SpecAriaResolver { spec };
        for (selector, override_value) in conditions {
            let Ok(selector) = parser::parse(selector) else {
                continue;
            };
            if !markuplint_selector::matcher::matches(&selector, arena, node_id, None, Some(spec), Some(&resolver)) {
                continue;
            }
            layer.overlay(Layer::from_value(override_value));
        }
    }

    Some(layer.into_resolved(version))
}

/// TS `resolveVersion()`.
fn resolve_version(aria: &ElementARIA, version: ARIAVersion) -> (Layer<'_>, Option<&ARIAConditions>) {
    let block = match version {
        ARIAVersion::V1_1 => aria.v1_1.as_ref(),
        ARIAVersion::V1_2 => aria.v1_2.as_ref(),
        ARIAVersion::V1_3 => aria.v1_3.as_ref(),
    };

    let mut layer = Layer::from_element_aria(aria);
    let mut conditions = aria.conditions.as_ref();

    if let Some(block) = block {
        let naming_prohibited = layer.naming_prohibited;
        layer.overlay(Layer::from_block(block));
        if version == ARIAVersion::V1_1 {
            layer.naming_prohibited = naming_prohibited;
        }
        conditions = match &block.conditions {
            Some(ARIAConditionsOrFalse::Flag(false)) => None,
            Some(ARIAConditionsOrFalse::Conditions(conditions)) => Some(conditions),
            Some(ARIAConditionsOrFalse::Flag(true)) | None => conditions,
        };
    }

    (layer, conditions)
}

/// The ARIA fields of one layer (base, version block, or one condition), each `None` when the
/// layer does not carry it. Applying a layer is `field = layer.field ?? field`.
#[derive(Clone, Copy, Default)]
struct Layer<'a> {
    implicit_role: Option<ImplicitRoleLayer<'a>>,
    permitted_roles: Option<&'a Value>,
    implicit_properties: Option<&'a Value>,
    properties: Option<&'a Value>,
    naming_prohibited: Option<bool>,
}

/// What a layer says about `implicitRole`, when it says anything.
#[derive(Clone, Copy)]
enum ImplicitRoleLayer<'a> {
    Role(&'a str),
    /// `false`: no corresponding role.
    NoRole,
}

impl<'a> Layer<'a> {
    fn from_element_aria(aria: &'a ElementARIA) -> Self {
        Self {
            implicit_role: aria.implicit_role.as_ref().map(implicit_role_layer),
            permitted_roles: carried(aria.permitted_roles.as_ref()),
            implicit_properties: carried(aria.implicit_properties.as_ref()),
            properties: carried(aria.properties.as_ref()),
            naming_prohibited: aria.naming_prohibited,
        }
    }

    fn from_block(block: &'a ElementARIAVersionBlock) -> Self {
        Self {
            implicit_role: block.implicit_role.as_ref().map(implicit_role_layer),
            permitted_roles: carried(block.permitted_roles.as_ref()),
            implicit_properties: carried(block.implicit_properties.as_ref()),
            properties: carried(block.properties.as_ref()),
            naming_prohibited: block.naming_prohibited,
        }
    }

    /// A condition's override object.
    fn from_value(value: &'a Value) -> Self {
        let Some(obj) = value.as_object() else {
            return Self::default();
        };
        Self {
            implicit_role: match obj.get("implicitRole") {
                Some(Value::String(role)) => Some(ImplicitRoleLayer::Role(role.as_str())),
                Some(Value::Bool(_)) => Some(ImplicitRoleLayer::NoRole),
                _ => None,
            },
            permitted_roles: carried(obj.get("permittedRoles")),
            implicit_properties: carried(obj.get("implicitProperties")),
            properties: carried(obj.get("properties")),
            naming_prohibited: obj.get("namingProhibited").and_then(Value::as_bool),
        }
    }

    fn overlay(&mut self, over: Layer<'a>) {
        self.implicit_role = over.implicit_role.or(self.implicit_role);
        self.permitted_roles = over.permitted_roles.or(self.permitted_roles);
        self.implicit_properties = over.implicit_properties.or(self.implicit_properties);
        self.properties = over.properties.or(self.properties);
        self.naming_prohibited = over.naming_prohibited.or(self.naming_prohibited);
    }

    fn into_resolved(self, version: ARIAVersion) -> ResolvedElementARIA {
        ResolvedElementARIA {
            implicit_role: match self.implicit_role {
                Some(ImplicitRoleLayer::Role(role)) => Some(role.to_string()),
                Some(ImplicitRoleLayer::NoRole) | None => None,
            },
            permitted_roles: optimize_permitted_roles(parse_permitted_roles(self.permitted_roles), version),
            implicit_properties: parse_implicit_properties(self.implicit_properties),
            properties: parse_properties(self.properties),
            naming_prohibited: self.naming_prohibited.unwrap_or(false),
        }
    }
}

fn implicit_role_layer(role: &ImplicitRole) -> ImplicitRoleLayer<'_> {
    match role {
        ImplicitRole::Role(name) => ImplicitRoleLayer::Role(name.as_str()),
        ImplicitRole::None(_) => ImplicitRoleLayer::NoRole,
    }
}

/// JS `??` treats `null` like a missing value.
fn carried(value: Option<&Value>) -> Option<&Value> {
    value.filter(|v| !v.is_null())
}

// ---- permittedRoles ----

fn parse_permitted_roles(value: Option<&Value>) -> PermittedRoles {
    match value {
        Some(Value::Bool(true)) => PermittedRoles::Any,
        Some(Value::Array(entries)) => PermittedRoles::Roles(entries.iter().filter_map(parse_permitted_role).collect()),
        Some(Value::Object(info)) => PermittedRoles::Aam {
            core_aam: info.get("core-aam").and_then(Value::as_bool) == Some(true),
            graphics_aam: info.get("graphics-aam").and_then(Value::as_bool) == Some(true),
        },
        _ => PermittedRoles::Nothing,
    }
}

fn parse_permitted_role(entry: &Value) -> Option<PermittedRole> {
    match entry {
        Value::String(name) => Some(PermittedRole {
            name: name.clone(),
            deprecated: false,
        }),
        Value::Object(obj) => Some(PermittedRole {
            name: obj.get("name")?.as_str()?.to_string(),
            deprecated: obj.get("deprecated").and_then(Value::as_bool) == Some(true),
        }),
        _ => None,
    }
}

/// Port of `optimizePermittedRoles()`; anything but a list is returned as it is.
///
/// - `presentation` and `none` imply each other
///   (<https://www.w3.org/TR/wai-aria-1.2/#note-regarding-the-aria-1-1-none-role>).
/// - From ARIA 1.3, `img` and `image` imply each other, as `image` became the primary name
///   (<https://w3c.github.io/aria/#ref-for-image>).
/// - Entries are unique by name and sorted by name.
///
/// TS builds a `Set` of the list's values, so only an entry written as a bare string triggers a
/// synonym; an `{ name, deprecated }` entry does not. That is kept (`deprecated` entries do not
/// trigger), but uniqueness is by name, where TS would keep a bare string and an object of the
/// same name side by side, and the sort is by name, where TS sorts objects as `[object Object]`.
/// Callers look roles up by name, so neither difference is observable.
fn optimize_permitted_roles(permitted: PermittedRoles, version: ARIAVersion) -> PermittedRoles {
    let PermittedRoles::Roles(roles) = permitted else {
        return permitted;
    };

    let plain = |name: &str| roles.iter().any(|r| r.name == name && !r.deprecated);
    let mut synonyms: Vec<&str> = Vec::new();
    if plain("presentation") {
        synonyms.push("none");
    }
    if plain("none") {
        synonyms.push("presentation");
    }
    if version == ARIAVersion::V1_3 {
        if plain("image") {
            synonyms.push("img");
        }
        if plain("img") {
            synonyms.push("image");
        }
    }
    let synonyms: Vec<PermittedRole> = synonyms
        .into_iter()
        .map(|name| PermittedRole {
            name: name.to_string(),
            deprecated: false,
        })
        .collect();

    let mut optimized: Vec<PermittedRole> = Vec::with_capacity(roles.len() + synonyms.len());
    for role in roles.iter().cloned().chain(synonyms) {
        if !optimized.iter().any(|r| r.name == role.name) {
            optimized.push(role);
        }
    }
    optimized.sort_by(|a, b| a.name.cmp(&b.name));

    PermittedRoles::Roles(optimized)
}

// ---- implicitProperties / properties ----

fn parse_implicit_properties(value: Option<&Value>) -> Vec<(String, String)> {
    value
        .and_then(Value::as_object)
        .map(|props| {
            props
                .iter()
                .filter_map(|(name, value)| Some((name.clone(), value.as_str()?.to_string())))
                .collect()
        })
        .unwrap_or_default()
}

fn parse_properties(value: Option<&Value>) -> ElementProperties {
    match value {
        Some(Value::Bool(false)) => ElementProperties::Disallowed,
        Some(Value::Object(obj)) => ElementProperties::Constrained(PropertiesConstraint {
            global: obj.get("global").and_then(Value::as_bool) == Some(true),
            role: match obj.get("role") {
                Some(Value::Bool(true)) => Some(RoleProperties::Allowed),
                Some(Value::String(role)) => Some(RoleProperties::Roles(vec![role.clone()])),
                Some(Value::Array(roles)) => Some(RoleProperties::Roles(
                    roles.iter().filter_map(|r| r.as_str().map(str::to_string)).collect(),
                )),
                _ => None,
            },
            only: obj
                .get("only")
                .and_then(Value::as_array)
                .map(|entries| entries.iter().filter_map(parse_only_entry).collect()),
            without: obj
                .get("without")
                .and_then(Value::as_array)
                .map(|entries| entries.iter().filter_map(parse_without_entry).collect()),
        }),
        _ => ElementProperties::Unspecified,
    }
}

fn parse_only_entry(entry: &Value) -> Option<OnlyEntry> {
    match entry {
        Value::String(name) => Some(OnlyEntry {
            name: name.clone(),
            value: None,
        }),
        Value::Object(obj) => Some(OnlyEntry {
            name: obj.get("name")?.as_str()?.to_string(),
            value: obj.get("value").and_then(Value::as_str).map(str::to_string),
        }),
        _ => None,
    }
}

fn parse_without_entry(entry: &Value) -> Option<WithoutEntry> {
    let obj = entry.as_object()?;
    let restriction = match obj.get("type")?.as_str()? {
        "not-recommended" => Restriction::NotRecommended,
        "should-not" => Restriction::ShouldNot,
        "must-not" => Restriction::MustNot,
        _ => return None,
    };
    let alt = obj.get("alt").and_then(Value::as_object).and_then(|alt| {
        Some(WithoutAlt {
            method: match alt.get("method")?.as_str()? {
                "remove-attr" => AltMethod::RemoveAttr,
                "set-attr" => AltMethod::SetAttr,
                _ => return None,
            },
            target: alt.get("target")?.as_str()?.to_string(),
        })
    });
    Some(WithoutEntry {
        name: obj.get("name")?.as_str()?.to_string(),
        value: obj.get("value").and_then(Value::as_str).map(str::to_string),
        restriction,
        alt,
    })
}

// ============================================================
// Computed role, property types and attribute lookup
// ============================================================

impl<'a> ElementContext<'a> {
    /// The role spec of the element's computed role: TS `getComputedRole(specs, el, version).role`,
    /// which is an `ARIARole` carrying `ownedProperties`. `None` when the element has no role, or
    /// the role cannot be computed (an unknown element, an invalid `role` value).
    pub(crate) fn computed_role(&self) -> Option<&'a ARIARoleInSchema> {
        let computed = get_computed_role(self.spec, self.arena, self.node_id, self.version, false);
        let role = computed.role?;
        aria::get_role_spec(self.spec, &role.name, self.version)
    }

    /// `"property"` or `"state"` for the `aria-*` attribute `name`, `"property"` when the spec at
    /// this version does not know it: TS `propSpecs.find(p => p.name === attr.name)?.type ??
    /// 'property'`. The match is on the name as written, like TS.
    pub(crate) fn prop_type_of(&self, name: &str) -> &'static str {
        aria::get_aria_spec(self.spec, self.version)
            .props
            .iter()
            .find(|prop| prop.name == name)
            .map_or("property", |prop| prop_type_label(&prop.prop_type))
    }
}

/// TS `el.getAttributeNode(name)` for an HTML attribute: the first attribute of that name,
/// matched case-insensitively.
pub(crate) fn find_attr<'e>(el: &'e ElementData, name: &str) -> Option<&'e MLASTHTMLAttr> {
    html_attrs(el).find(|attr| attr_name(attr).eq_ignore_ascii_case(name))
}

#[cfg(test)]
mod tests;
