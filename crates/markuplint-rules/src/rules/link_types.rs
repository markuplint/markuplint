//! `link-types` rule: validates link type keywords in the `rel` attribute
//! on `<link>`, `<a>`, `<area>`, and `<form>` elements.

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers;
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct LinkTypes;

impl Rule for LinkTypes {
    fn id(&self) -> &'static str {
        "link-types"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || el.is_ghost {
                continue;
            }

            let tag = el.base.node_name.as_str();
            if !matches!(tag, "link" | "a" | "area" | "form") {
                continue;
            }

            let Some(rel_value) = helpers::get_attr_value_from_el(el, "rel") else {
                continue;
            };

            let trimmed = rel_value.trim();
            if trimmed.is_empty() {
                continue;
            }

            // Determine element context
            let context = match tag {
                "link" => {
                    // Check if inside <body>
                    if is_in_body(arena, node_id) {
                        ElementContext::BodyLink
                    } else {
                        ElementContext::Link
                    }
                }
                "a" | "area" => ElementContext::AArea,
                "form" => ElementContext::Form,
                _ => continue,
            };

            // Parse options
            let allow_microformats = parse_allow_microformats(&rule_config.options);

            for keyword in trimmed.split_whitespace() {
                let kw_lower = keyword.to_ascii_lowercase();

                if let Some(msg) = validate_keyword(&kw_lower, keyword, context, &allow_microformats) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: msg,
                        line: el.base.line,
                        col: el.base.col,
                        raw: keyword.to_string(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}

#[derive(Clone, Copy)]
enum ElementContext {
    Link,
    BodyLink,
    AArea,
    Form,
}

enum AllowMicroformats {
    Disabled,
    All,
    List(Vec<String>),
}

fn parse_allow_microformats(options: &Value) -> AllowMicroformats {
    match options {
        Value::Object(obj) => match obj.get("allowMicroformats") {
            Some(Value::Bool(true)) => AllowMicroformats::All,
            Some(Value::Array(arr)) => {
                let list: Vec<String> = arr
                    .iter()
                    .filter_map(|v| v.as_str())
                    .map(str::to_ascii_lowercase)
                    .collect();
                AllowMicroformats::List(list)
            }
            _ => AllowMicroformats::Disabled,
        },
        _ => AllowMicroformats::Disabled,
    }
}

fn validate_keyword(
    kw_lower: &str,
    original: &str,
    context: ElementContext,
    allow_microformats: &AllowMicroformats,
) -> Option<String> {
    // Check WHATWG standard keywords
    if let Some(def) = WHATWG_KEYWORDS.iter().find(|d| d.keyword == kw_lower) {
        return validate_whatwg(def, context);
    }

    // Check dropped keywords
    if DROPPED_KEYWORDS.iter().any(|k| k.eq_ignore_ascii_case(kw_lower)) {
        return Some(format!("\"{original}\" is dropped"));
    }

    // Check dropped without prejudice
    if DROPPED_WITHOUT_PREJUDICE
        .iter()
        .any(|k| k.eq_ignore_ascii_case(kw_lower))
    {
        return Some(format!("\"{original}\" is dropped"));
    }

    // Check rejected
    if REJECTED_KEYWORDS.iter().any(|k| k.eq_ignore_ascii_case(kw_lower)) {
        return Some(format!("\"{original}\" is rejected"));
    }

    // Check non-HTML rel values
    if NON_HTML_REL_VALUES.iter().any(|k| k.eq_ignore_ascii_case(kw_lower)) {
        return Some(format!("\"{original}\" is not allowed"));
    }

    // Handle Microformats
    match allow_microformats {
        AllowMicroformats::Disabled => Some(format!("The \"{original}\" keyword is not allowed")),
        AllowMicroformats::All => validate_microformat_keyword(kw_lower, original, context),
        AllowMicroformats::List(list) => {
            if !list.iter().any(|a| a == kw_lower) {
                return Some(format!("The \"{original}\" keyword is not allowed"));
            }
            // Even if in allow list, check element context for registered microformats
            if let Some(def) = MICROFORMAT_KEYWORDS
                .iter()
                .find(|d| d.keyword.eq_ignore_ascii_case(kw_lower))
            {
                return validate_microformat_context(def, original, context);
            }
            // Custom keyword in allow list — allow it
            None
        }
    }
}

fn validate_whatwg(def: &WhatwgKeyword, context: ElementContext) -> Option<String> {
    match context {
        ElementContext::Link => {
            if def.link_not_allowed {
                Some(format!(
                    "The \"{}\" keyword is not allowed on the \"link\" element",
                    def.keyword
                ))
            } else {
                None
            }
        }
        ElementContext::BodyLink => {
            if def.link_not_allowed {
                Some(format!(
                    "The \"{}\" keyword is not allowed on the \"link\" element",
                    def.keyword
                ))
            } else if !def.body_ok {
                Some(format!(
                    "The \"{}\" keyword is not allowed on the \"link\" element inside the \"body\" element",
                    def.keyword
                ))
            } else {
                None
            }
        }
        ElementContext::AArea => {
            if def.a_not_allowed {
                Some(format!(
                    "The \"{}\" keyword is not allowed on the \"a\" element",
                    def.keyword
                ))
            } else {
                None
            }
        }
        ElementContext::Form => {
            if def.form_not_allowed {
                Some(format!(
                    "The \"{}\" keyword is not allowed on the \"form\" element",
                    def.keyword
                ))
            } else {
                None
            }
        }
    }
}

fn validate_microformat_keyword(kw_lower: &str, original: &str, context: ElementContext) -> Option<String> {
    let Some(def) = MICROFORMAT_KEYWORDS
        .iter()
        .find(|d| d.keyword.eq_ignore_ascii_case(kw_lower))
    else {
        return Some(format!("The \"{original}\" keyword is not allowed"));
    };
    validate_microformat_context(def, original, context)
}

fn validate_microformat_context(def: &MicroformatKeyword, original: &str, context: ElementContext) -> Option<String> {
    match context {
        ElementContext::Link | ElementContext::BodyLink => {
            (!def.link).then(|| format!("The \"{original}\" keyword is not allowed on the \"link\" element"))
        }
        ElementContext::AArea => {
            (!def.a).then(|| format!("The \"{original}\" keyword is not allowed on the \"a\" element"))
        }
        ElementContext::Form => {
            // Microformats don't define form context; reject
            Some(format!(
                "The \"{original}\" keyword is not allowed on the \"form\" element"
            ))
        }
    }
}

fn is_in_body(arena: &DomArena, node_id: markuplint_dom::arena::NodeId) -> bool {
    let mut current = node_id;
    loop {
        let Some(node) = arena.get(current) else {
            return false;
        };
        if let Some(el) = node.as_element()
            && el.base.node_name == "body"
        {
            return true;
        }
        let Some(base) = node.base() else {
            return false;
        };
        let Some(parent) = base.parent else {
            return false;
        };
        current = parent;
    }
}

// --- Data tables ---

#[allow(clippy::struct_excessive_bools)]
struct WhatwgKeyword {
    keyword: &'static str,
    link_not_allowed: bool,
    a_not_allowed: bool,
    form_not_allowed: bool,
    body_ok: bool,
}

struct MicroformatKeyword {
    keyword: &'static str,
    link: bool,
    a: bool,
}

#[rustfmt::skip]
static WHATWG_KEYWORDS: &[WhatwgKeyword] = &[
    WhatwgKeyword { keyword: "alternate",        link_not_allowed: false, a_not_allowed: false, form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "canonical",        link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "author",           link_not_allowed: false, a_not_allowed: false, form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "bookmark",         link_not_allowed: true,  a_not_allowed: false, form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "dns-prefetch",     link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "expect",           link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "external",         link_not_allowed: true,  a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "help",             link_not_allowed: false, a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "icon",             link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "manifest",         link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "modulepreload",    link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "license",          link_not_allowed: false, a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "next",             link_not_allowed: false, a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "nofollow",         link_not_allowed: true,  a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "noopener",         link_not_allowed: true,  a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "noreferrer",       link_not_allowed: true,  a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "opener",           link_not_allowed: true,  a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "pingback",         link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "preconnect",       link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "prefetch",         link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "preload",          link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "prev",             link_not_allowed: false, a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "privacy-policy",   link_not_allowed: false, a_not_allowed: false, form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "search",           link_not_allowed: false, a_not_allowed: false, form_not_allowed: false, body_ok: false },
    WhatwgKeyword { keyword: "stylesheet",       link_not_allowed: false, a_not_allowed: true,  form_not_allowed: true,  body_ok: true  },
    WhatwgKeyword { keyword: "tag",              link_not_allowed: true,  a_not_allowed: false, form_not_allowed: true,  body_ok: false },
    WhatwgKeyword { keyword: "terms-of-service", link_not_allowed: false, a_not_allowed: false, form_not_allowed: true,  body_ok: false },
];

// Combined microformat keywords (formats + proposals + html5 extensions + brainstorming + posh + dublin core)
// excluding any that overlap with WHATWG standard keywords.
// cspell:disable
#[rustfmt::skip]
static MICROFORMAT_KEYWORDS: &[MicroformatKeyword] = &[
    // formats
    MicroformatKeyword { keyword: "acquaintance", link: false, a: true },
    MicroformatKeyword { keyword: "appendix", link: true, a: true },
    MicroformatKeyword { keyword: "chapter", link: true, a: true },
    MicroformatKeyword { keyword: "child", link: true, a: true },
    MicroformatKeyword { keyword: "colleague", link: false, a: true },
    MicroformatKeyword { keyword: "contact", link: false, a: true },
    MicroformatKeyword { keyword: "contents", link: true, a: true },
    MicroformatKeyword { keyword: "copyright", link: true, a: true },
    MicroformatKeyword { keyword: "co-resident", link: false, a: true },
    MicroformatKeyword { keyword: "co-worker", link: false, a: true },
    MicroformatKeyword { keyword: "crush", link: false, a: true },
    MicroformatKeyword { keyword: "date", link: false, a: true },
    MicroformatKeyword { keyword: "friend", link: false, a: true },
    MicroformatKeyword { keyword: "glossary", link: true, a: true },
    MicroformatKeyword { keyword: "its-rules", link: true, a: false },
    MicroformatKeyword { keyword: "kin", link: false, a: true },
    MicroformatKeyword { keyword: "me", link: true, a: true },
    MicroformatKeyword { keyword: "met", link: false, a: true },
    MicroformatKeyword { keyword: "muse", link: false, a: true },
    MicroformatKeyword { keyword: "neighbor", link: false, a: true },
    MicroformatKeyword { keyword: "previous", link: true, a: true },
    MicroformatKeyword { keyword: "section", link: true, a: true },
    MicroformatKeyword { keyword: "spouse", link: false, a: true },
    MicroformatKeyword { keyword: "start", link: true, a: true },
    MicroformatKeyword { keyword: "subsection", link: true, a: true },
    MicroformatKeyword { keyword: "sweetheart", link: false, a: true },
    MicroformatKeyword { keyword: "toc", link: true, a: true },
    MicroformatKeyword { keyword: "transformation", link: true, a: true },
    // proposals
    MicroformatKeyword { keyword: "pronunciation", link: true, a: true },
    MicroformatKeyword { keyword: "directory", link: true, a: true },
    MicroformatKeyword { keyword: "enclosure", link: true, a: true },
    MicroformatKeyword { keyword: "home", link: true, a: true },
    MicroformatKeyword { keyword: "payment", link: true, a: true },
    MicroformatKeyword { keyword: "vcs-*", link: true, a: true },
    // html5 link type extensions
    MicroformatKeyword { keyword: "about", link: true, a: true },
    MicroformatKeyword { keyword: "amphtml", link: true, a: true },
    MicroformatKeyword { keyword: "apple-touch-icon", link: true, a: false },
    MicroformatKeyword { keyword: "apple-touch-icon-precomposed", link: true, a: false },
    MicroformatKeyword { keyword: "apple-touch-startup-image", link: true, a: false },
    MicroformatKeyword { keyword: "archived", link: true, a: true },
    MicroformatKeyword { keyword: "attachment", link: true, a: true },
    MicroformatKeyword { keyword: "authorization_endpoint", link: true, a: false },
    MicroformatKeyword { keyword: "category", link: true, a: true },
    MicroformatKeyword { keyword: "code-repository", link: true, a: true },
    MicroformatKeyword { keyword: "code-license", link: true, a: true },
    MicroformatKeyword { keyword: "component", link: true, a: false },
    MicroformatKeyword { keyword: "chrome-webstore-item", link: true, a: false },
    MicroformatKeyword { keyword: "content-repository", link: true, a: true },
    MicroformatKeyword { keyword: "content-license", link: true, a: true },
    MicroformatKeyword { keyword: "DCTERMS.conformsTo", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.contributor", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.creator", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.description", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.hasFormat", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.hasPart", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.hasVersion", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.isFormatOf", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.isPartOf", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.isReferencedBy", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.isReplacedBy", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.isRequiredBy", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.isVersionOf", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.license", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.mediator", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.publisher", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.references", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.relation", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.replaces", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.requires", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.rightsHolder", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.source", link: true, a: false },
    MicroformatKeyword { keyword: "DCTERMS.subject", link: true, a: false },
    MicroformatKeyword { keyword: "disclosure", link: false, a: true },
    MicroformatKeyword { keyword: "discussion", link: true, a: true },
    MicroformatKeyword { keyword: "donation", link: true, a: true },
    MicroformatKeyword { keyword: "edit", link: true, a: true },
    MicroformatKeyword { keyword: "EditURI", link: true, a: false },
    MicroformatKeyword { keyword: "entry-content", link: false, a: true },
    MicroformatKeyword { keyword: "first", link: true, a: true },
    MicroformatKeyword { keyword: "gbfs", link: true, a: false },
    MicroformatKeyword { keyword: "gtfs-static", link: true, a: false },
    MicroformatKeyword { keyword: "gtfs-realtime", link: true, a: false },
    MicroformatKeyword { keyword: "hub", link: true, a: true },
    MicroformatKeyword { keyword: "import", link: true, a: false },
    MicroformatKeyword { keyword: "in-reply-to", link: true, a: true },
    MicroformatKeyword { keyword: "root", link: true, a: true },
    MicroformatKeyword { keyword: "index", link: true, a: true },
    MicroformatKeyword { keyword: "issues", link: true, a: true },
    MicroformatKeyword { keyword: "jslicense", link: true, a: true },
    MicroformatKeyword { keyword: "last", link: true, a: true },
    MicroformatKeyword { keyword: "lightbox", link: false, a: true },
    MicroformatKeyword { keyword: "lightvideo", link: false, a: true },
    MicroformatKeyword { keyword: "main", link: true, a: true },
    MicroformatKeyword { keyword: "mask-icon", link: true, a: false },
    MicroformatKeyword { keyword: "meta", link: true, a: false },
    MicroformatKeyword { keyword: "micropub", link: true, a: false },
    MicroformatKeyword { keyword: "openid.delegate", link: true, a: false },
    MicroformatKeyword { keyword: "openid.server", link: true, a: false },
    MicroformatKeyword { keyword: "openid2.local_id", link: true, a: false },
    MicroformatKeyword { keyword: "openid2.provider", link: true, a: false },
    MicroformatKeyword { keyword: "p3pv1", link: true, a: false },
    MicroformatKeyword { keyword: "pgpkey", link: true, a: false },
    MicroformatKeyword { keyword: "prerender", link: true, a: true },
    MicroformatKeyword { keyword: "profile", link: true, a: true },
    MicroformatKeyword { keyword: "publisher", link: true, a: true },
    MicroformatKeyword { keyword: "radioepg", link: true, a: true },
    MicroformatKeyword { keyword: "rendition", link: true, a: true },
    MicroformatKeyword { keyword: "reply-to", link: true, a: true },
    MicroformatKeyword { keyword: "schema.DCTERMS", link: true, a: false },
    MicroformatKeyword { keyword: "service", link: true, a: false },
    MicroformatKeyword { keyword: "shortlink", link: true, a: false },
    MicroformatKeyword { keyword: "sidebar", link: true, a: true },
    MicroformatKeyword { keyword: "sitemap", link: true, a: false },
    MicroformatKeyword { keyword: "subresource", link: true, a: false },
    MicroformatKeyword { keyword: "sword", link: true, a: false },
    MicroformatKeyword { keyword: "syndication", link: true, a: true },
    MicroformatKeyword { keyword: "timesheet", link: true, a: false },
    MicroformatKeyword { keyword: "token_endpoint", link: true, a: false },
    MicroformatKeyword { keyword: "webmention", link: true, a: true },
    MicroformatKeyword { keyword: "widget", link: true, a: true },
    MicroformatKeyword { keyword: "wlwmanifest", link: true, a: false },
    MicroformatKeyword { keyword: "image_src", link: true, a: false },
    MicroformatKeyword { keyword: "http://docs.oasis-open.org/ns/cmis/link/200908/acl", link: true, a: true },
    MicroformatKeyword { keyword: "stylesheet/less", link: true, a: false },
    MicroformatKeyword { keyword: "yandex-tableau-widget", link: true, a: false },
    // brainstorming
    MicroformatKeyword { keyword: "accessibility", link: true, a: true },
    MicroformatKeyword { keyword: "bibliography", link: true, a: true },
    MicroformatKeyword { keyword: "cite", link: true, a: true },
    MicroformatKeyword { keyword: "embed", link: true, a: true },
    MicroformatKeyword { keyword: "group", link: true, a: true },
    MicroformatKeyword { keyword: "longdesc", link: true, a: true },
    MicroformatKeyword { keyword: "map", link: true, a: true },
    MicroformatKeyword { keyword: "member", link: true, a: true },
    MicroformatKeyword { keyword: "m_PageScroll2id", link: true, a: true },
    MicroformatKeyword { keyword: "source", link: true, a: true },
    MicroformatKeyword { keyword: "vcalendar-parent", link: true, a: true },
    MicroformatKeyword { keyword: "vcalendar-child", link: true, a: true },
    MicroformatKeyword { keyword: "vcalendar-sibling", link: true, a: true },
    MicroformatKeyword { keyword: "status", link: true, a: true },
    MicroformatKeyword { keyword: "https://api.w.org/", link: true, a: true },
    // posh usage (excluding duplicates from above)
    MicroformatKeyword { keyword: "archive", link: true, a: true },
    MicroformatKeyword { keyword: "archives", link: true, a: true },
    MicroformatKeyword { keyword: "comment", link: true, a: true },
    MicroformatKeyword { keyword: "contribution", link: true, a: true },
    MicroformatKeyword { keyword: "endorsed", link: true, a: true },
    MicroformatKeyword { keyword: "fan", link: true, a: true },
    MicroformatKeyword { keyword: "feed", link: true, a: true },
    MicroformatKeyword { keyword: "footnote", link: true, a: true },
    MicroformatKeyword { keyword: "kinetic-stylesheet", link: true, a: true },
    MicroformatKeyword { keyword: "made", link: true, a: true },
    MicroformatKeyword { keyword: "microsummary", link: true, a: true },
    MicroformatKeyword { keyword: "permalink", link: true, a: true },
    MicroformatKeyword { keyword: "popover", link: true, a: true },
    MicroformatKeyword { keyword: "privacy", link: true, a: true },
    MicroformatKeyword { keyword: "publickey", link: true, a: true },
    MicroformatKeyword { keyword: "referral", link: true, a: true },
    MicroformatKeyword { keyword: "related", link: true, a: true },
    MicroformatKeyword { keyword: "replies", link: true, a: true },
    MicroformatKeyword { keyword: "respond-proxy", link: true, a: true },
    MicroformatKeyword { keyword: "respond-redirect", link: true, a: true },
    MicroformatKeyword { keyword: "resource", link: true, a: true },
    MicroformatKeyword { keyword: "sponsor", link: true, a: true },
    MicroformatKeyword { keyword: "tooltip", link: true, a: true },
    MicroformatKeyword { keyword: "trackback", link: true, a: true },
    MicroformatKeyword { keyword: "unendorsed", link: true, a: true },
    MicroformatKeyword { keyword: "user", link: true, a: true },
    // dublin core
    MicroformatKeyword { keyword: "schema.DC", link: true, a: false },
];
// cspell:enable

static DROPPED_KEYWORDS: &[&str] = &[
    "banner",
    "begin",
    "biblioentry",
    "bibliography",
    "child",
    "citation",
    "collection",
    "definition",
    "disclaimer",
    "editor",
    "end",
    "footnote",
    "navigate",
    "origin",
    "parent",
    "pointer",
    "publisher",
    "sibling",
    "top",
    "trademark",
    "translation",
    "urc",
];

static DROPPED_WITHOUT_PREJUDICE: &[&str] = &["first", "index", "last", "up"];

static REJECTED_KEYWORDS: &[&str] = &["logo", "pavatar"]; // cspell:disable-line

// cspell:disable
static NON_HTML_REL_VALUES: &[&str] = &[
    "self",
    "http://gdata.youtube.com/schemas/2007#in-reply-to",
    "collection",
    "compensatingtx",
    "east",
    "events",
    "exit",
    "north",
    "south",
    "via",
    "west",
    "item",
    "create-form",
    "edit-form",
    "lightframe",
    "superbox[image]",
    "wp-video-lightbox",
    "youtube",
    "shadowbox",
    "permission",
    "sub",
    "unsub",
    "version-history",
    "latest-version",
    "working-copy",
    "working-copy-of",
    "predecessor-version",
    "successor-version",
];
// cspell:enable

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
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
        LinkTypes.verify(&arena, &spec, &config)
    }

    fn run_with_options(html: &str, options: serde_json::Value) -> Vec<Violation> {
        let arena = html_arena(html);
        let spec = html_spec();
        let config = RuleConfigSet::global_only(RuleConfig {
            options,
            ..Default::default()
        });
        LinkTypes.verify(&arena, &spec, &config)
    }

    // --- Element context ---

    #[test]
    fn link_rel_stylesheet_allowed() {
        assert!(run(r#"<link rel="stylesheet">"#).is_empty());
    }

    #[test]
    fn link_rel_bookmark_not_allowed() {
        let v = run(r#"<link rel="bookmark">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"link\" element"));
    }

    #[test]
    fn a_rel_bookmark_allowed() {
        assert!(run(r#"<a rel="bookmark">link</a>"#).is_empty());
    }

    #[test]
    fn a_rel_canonical_not_allowed() {
        let v = run(r#"<a rel="canonical">link</a>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"a\" element"));
    }

    #[test]
    fn form_rel_nofollow_allowed() {
        assert!(run(r#"<form rel="nofollow"></form>"#).is_empty());
    }

    #[test]
    fn form_rel_stylesheet_not_allowed() {
        let v = run(r#"<form rel="stylesheet"></form>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"form\" element"));
    }

    #[test]
    fn area_rel_noopener_allowed() {
        assert!(run(r#"<area rel="noopener">"#).is_empty());
    }

    #[test]
    fn area_rel_canonical_not_allowed() {
        let v = run(r#"<area rel="canonical">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"a\" element"));
    }

    // --- Body-ok ---

    #[test]
    fn link_canonical_in_head_allowed() {
        assert!(run(r#"<html><head><link rel="canonical"></head><body></body></html>"#).is_empty());
    }

    #[test]
    fn link_stylesheet_in_body_allowed_body_ok() {
        assert!(run(r#"<html><head></head><body><link rel="stylesheet"></body></html>"#).is_empty());
    }

    #[test]
    fn link_canonical_in_body_not_allowed() {
        let v = run(r#"<html><head></head><body><link rel="canonical"></body></html>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("inside the \"body\" element"));
    }

    #[test]
    fn link_icon_in_body_not_body_ok() {
        let v = run(r#"<html><head></head><body><link rel="icon"></body></html>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("inside the \"body\" element"));
    }

    #[test]
    fn link_bookmark_in_body_not_allowed_on_link() {
        let v = run(r#"<html><head></head><body><link rel="bookmark"></body></html>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"link\" element"));
    }

    // --- Fragment mode: link in fragment is not in body ---

    #[test]
    fn link_canonical_in_fragment_allowed() {
        assert!(run(r#"<link rel="canonical">"#).is_empty());
    }

    // --- Microformats control ---

    #[test]
    fn default_apple_touch_icon_not_allowed() {
        let v = run(r#"<link rel="apple-touch-icon">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed"));
    }

    #[test]
    fn allow_microformats_true_apple_touch_icon_allowed() {
        let v = run_with_options(
            r#"<link rel="apple-touch-icon">"#,
            serde_json::json!({ "allowMicroformats": true }),
        );
        assert!(v.is_empty());
    }

    #[test]
    fn allow_microformats_true_disclosure_on_a_allowed() {
        let v = run_with_options(
            r#"<a rel="disclosure">link</a>"#,
            serde_json::json!({ "allowMicroformats": true }),
        );
        assert!(v.is_empty());
    }

    #[test]
    fn allow_microformats_true_disclosure_on_link_not_allowed() {
        let v = run_with_options(
            r#"<link rel="disclosure">"#,
            serde_json::json!({ "allowMicroformats": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"link\" element"));
    }

    #[test]
    fn allow_microformats_true_unregistered_not_allowed() {
        let v = run_with_options(r#"<link rel="ikon">"#, serde_json::json!({ "allowMicroformats": true }));
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed"));
    }

    #[test]
    fn allow_microformats_true_form_rejected() {
        let v = run_with_options(
            r#"<form rel="apple-touch-icon"></form>"#,
            serde_json::json!({ "allowMicroformats": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"form\" element"));
    }

    #[test]
    fn allow_microformats_list_specific_keyword() {
        let v = run_with_options(
            r#"<link rel="apple-touch-icon">"#,
            serde_json::json!({ "allowMicroformats": ["apple-touch-icon"] }),
        );
        assert!(v.is_empty());
    }

    #[test]
    fn allow_microformats_list_other_keyword_rejected() {
        let v = run_with_options(
            r#"<link rel="mask-icon">"#,
            serde_json::json!({ "allowMicroformats": ["apple-touch-icon"] }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed"));
    }

    #[test]
    fn allow_microformats_list_custom_keyword_allowed() {
        let v = run_with_options(
            r#"<link rel="my-custom-rel">"#,
            serde_json::json!({ "allowMicroformats": ["my-custom-rel"] }),
        );
        assert!(v.is_empty());
    }

    // --- Dropped/Rejected/Non-HTML ---

    #[test]
    fn dropped_banner() {
        let v = run(r#"<link rel="banner">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("dropped"));
    }

    #[test]
    fn rejected_logo() {
        let v = run(r#"<a rel="logo">link</a>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("rejected"));
    }

    #[test]
    fn dropped_without_prejudice_first() {
        let v = run(r#"<link rel="first">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("dropped"));
    }

    #[test]
    fn non_html_self() {
        let v = run(r#"<link rel="self">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed"));
    }

    // --- Edge cases ---

    #[test]
    fn div_rel_ignored() {
        assert!(run(r#"<div rel="whatever"></div>"#).is_empty());
    }

    #[test]
    fn case_insensitive_noopener() {
        assert!(run(r#"<a rel="NoOpener">link</a>"#).is_empty());
    }

    #[test]
    fn multiple_keywords_ok() {
        assert!(run(r#"<a rel="noopener noreferrer">link</a>"#).is_empty());
    }

    #[test]
    fn one_error_for_unknown_in_multiple() {
        let v = run(r#"<a rel="noopener foobar">link</a>"#);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].raw, "foobar");
    }

    #[test]
    fn empty_rel_skip() {
        assert!(run(r#"<link rel="">"#).is_empty());
    }

    #[test]
    fn whitespace_only_rel_skip() {
        assert!(run(r#"<link rel="  ">"#).is_empty());
    }

    #[test]
    fn duplicate_keyword_in_rel() {
        // Duplicate keywords should each be validated independently
        let v = run(r#"<a rel="noopener noopener">link</a>"#);
        // Both are valid WHATWG keywords for a/area → no violation
        assert!(v.is_empty());
    }

    #[test]
    fn allow_microformats_list_context_mismatch() {
        // disclosure is allowed for a but not link, even when in allow list
        let v = run_with_options(
            r#"<link rel="disclosure">"#,
            serde_json::json!({ "allowMicroformats": ["disclosure"] }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("not allowed on the \"link\" element"));
    }
}
