//! Port of `packages/@markuplint/types/src/whatwg/check-link-type.ts`.
//!
//! <https://html.spec.whatwg.org/multipage/links.html#linkTypes>

use crate::check::list::check_list;
use crate::check::types::{
    CheckResult, EnumType, Expect, ExpectType, ListNumber, ListType, Reason, Separator, Type, UnmatchedOpts,
};
use crate::token::{TokenCollection, TokenCollectionOptions};

/// The element context a link type is checked in (TS `checkLinkType({ el })`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LinkTypeContext {
    /// `{ el: 'link' }`
    Link,
    /// `{ el: 'body link' }`: a `link` element in the `body` element (body-ok keywords only)
    BodyLink,
    /// `{ el: 'a, area' }`
    AnchorAndArea,
    /// `{ el: 'form' }`
    Form,
}

/// A row of the WHATWG link type table (TS `DEF_LINK_TYPE_WHATWG`): whether the keyword is allowed
/// (anything but "not allowed") on `link`, on `a` / `area` and on `form`, and whether it is
/// body-ok ("Yes").
#[allow(clippy::struct_excessive_bools)]
struct WhatwgLinkType {
    keyword: &'static str,
    link: bool,
    a: bool,
    form: bool,
    body_ok: bool,
}

/// A Microformats-registered keyword with its per-element context flags.
struct MicroformatsLinkType {
    keyword: &'static str,
    link: bool,
    a: bool,
}

// The tables below are generated from the TS module: `DEF_LINK_TYPE_WHATWG`,
// `ALLOWED_LINK_TYPE_MICROFORMATS` and, concatenated in this order,
// `DEF_LINK_TYPE_MICROFORMATS_NON_HTML_REL_VALUES`, `_DROPPED`, `_DROPPED_WITHOUT_PREJUDICE` and
// `_REJECTED`. Their order and their duplicates are kept: the expected keywords of a result are
// listed in the order of these tables.
//
// <https://html.spec.whatwg.org/multipage/links.html#linkTypes>
// <https://microformats.org/wiki/existing-rel-values>

#[rustfmt::skip]
const WHATWG: &[WhatwgLinkType] = &[
    WhatwgLinkType { keyword: "alternate", link: true, a: true, form: false, body_ok: false },
    WhatwgLinkType { keyword: "canonical", link: true, a: false, form: false, body_ok: false },
    WhatwgLinkType { keyword: "author", link: true, a: true, form: false, body_ok: false },
    WhatwgLinkType { keyword: "bookmark", link: false, a: true, form: false, body_ok: false },
    WhatwgLinkType { keyword: "dns-prefetch", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "expect", link: true, a: false, form: false, body_ok: false },
    WhatwgLinkType { keyword: "external", link: false, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "help", link: true, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "icon", link: true, a: false, form: false, body_ok: false },
    WhatwgLinkType { keyword: "manifest", link: true, a: false, form: false, body_ok: false },
    WhatwgLinkType { keyword: "modulepreload", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "license", link: true, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "next", link: true, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "nofollow", link: false, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "noopener", link: false, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "noreferrer", link: false, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "opener", link: false, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "pingback", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "preconnect", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "prefetch", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "preload", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "prev", link: true, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "privacy-policy", link: true, a: true, form: false, body_ok: false },
    WhatwgLinkType { keyword: "search", link: true, a: true, form: true, body_ok: false },
    WhatwgLinkType { keyword: "stylesheet", link: true, a: false, form: false, body_ok: true },
    WhatwgLinkType { keyword: "tag", link: false, a: true, form: false, body_ok: false },
    WhatwgLinkType { keyword: "terms-of-service", link: true, a: true, form: false, body_ok: false },
];

#[rustfmt::skip]
const ALLOWED_MICROFORMATS: &[MicroformatsLinkType] = &[
    MicroformatsLinkType { keyword: "acquaintance", link: false, a: true },
    MicroformatsLinkType { keyword: "appendix", link: true, a: true },
    MicroformatsLinkType { keyword: "chapter", link: true, a: true },
    MicroformatsLinkType { keyword: "child", link: true, a: true },
    MicroformatsLinkType { keyword: "colleague", link: false, a: true },
    MicroformatsLinkType { keyword: "contact", link: false, a: true },
    MicroformatsLinkType { keyword: "contents", link: true, a: true },
    MicroformatsLinkType { keyword: "copyright", link: true, a: true },
    MicroformatsLinkType { keyword: "co-resident", link: false, a: true },
    MicroformatsLinkType { keyword: "co-worker", link: false, a: true },
    MicroformatsLinkType { keyword: "crush", link: false, a: true },
    MicroformatsLinkType { keyword: "date", link: false, a: true },
    MicroformatsLinkType { keyword: "friend", link: false, a: true },
    MicroformatsLinkType { keyword: "glossary", link: true, a: true },
    MicroformatsLinkType { keyword: "its-rules", link: true, a: false },
    MicroformatsLinkType { keyword: "kin", link: false, a: true },
    MicroformatsLinkType { keyword: "me", link: true, a: true },
    MicroformatsLinkType { keyword: "met", link: false, a: true },
    MicroformatsLinkType { keyword: "muse", link: false, a: true },
    MicroformatsLinkType { keyword: "neighbor", link: false, a: true },
    MicroformatsLinkType { keyword: "parent", link: true, a: true },
    MicroformatsLinkType { keyword: "previous", link: true, a: true },
    MicroformatsLinkType { keyword: "section", link: true, a: true },
    MicroformatsLinkType { keyword: "sibling", link: false, a: true },
    MicroformatsLinkType { keyword: "spouse", link: false, a: true },
    MicroformatsLinkType { keyword: "start", link: true, a: true },
    MicroformatsLinkType { keyword: "subsection", link: true, a: true },
    MicroformatsLinkType { keyword: "sweetheart", link: false, a: true },
    MicroformatsLinkType { keyword: "toc", link: true, a: true },
    MicroformatsLinkType { keyword: "transformation", link: true, a: true },
    MicroformatsLinkType { keyword: "pronunciation", link: true, a: true },
    MicroformatsLinkType { keyword: "directory", link: true, a: true },
    MicroformatsLinkType { keyword: "enclosure", link: true, a: true },
    MicroformatsLinkType { keyword: "home", link: true, a: true },
    MicroformatsLinkType { keyword: "payment", link: true, a: true },
    MicroformatsLinkType { keyword: "vcs-*", link: true, a: true },
    MicroformatsLinkType { keyword: "about", link: true, a: true },
    MicroformatsLinkType { keyword: "amphtml", link: true, a: true },
    MicroformatsLinkType { keyword: "apple-touch-icon", link: true, a: false },
    MicroformatsLinkType { keyword: "apple-touch-icon-precomposed", link: true, a: false },
    MicroformatsLinkType { keyword: "apple-touch-startup-image", link: true, a: false },
    MicroformatsLinkType { keyword: "archived", link: true, a: true },
    MicroformatsLinkType { keyword: "attachment", link: true, a: true },
    MicroformatsLinkType { keyword: "authorization_endpoint", link: true, a: false },
    MicroformatsLinkType { keyword: "category", link: true, a: true },
    MicroformatsLinkType { keyword: "code-repository", link: true, a: true },
    MicroformatsLinkType { keyword: "code-license", link: true, a: true },
    MicroformatsLinkType { keyword: "component", link: true, a: false },
    MicroformatsLinkType { keyword: "chrome-webstore-item", link: true, a: false },
    MicroformatsLinkType { keyword: "content-repository", link: true, a: true },
    MicroformatsLinkType { keyword: "content-license", link: true, a: true },
    MicroformatsLinkType { keyword: "DCTERMS.conformsTo", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.contributor", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.creator", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.description", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.hasFormat", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.hasPart", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.hasVersion", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.isFormatOf", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.isPartOf", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.isReferencedBy", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.isReplacedBy", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.isRequiredBy", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.isVersionOf", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.license", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.mediator", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.publisher", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.references", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.relation", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.replaces", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.requires", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.rightsHolder", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.source", link: true, a: false },
    MicroformatsLinkType { keyword: "DCTERMS.subject", link: true, a: false },
    MicroformatsLinkType { keyword: "disclosure", link: false, a: true },
    MicroformatsLinkType { keyword: "discussion", link: true, a: true },
    MicroformatsLinkType { keyword: "donation", link: true, a: true },
    MicroformatsLinkType { keyword: "edit", link: true, a: true },
    MicroformatsLinkType { keyword: "EditURI", link: true, a: false },
    MicroformatsLinkType { keyword: "enclosure", link: true, a: true },
    MicroformatsLinkType { keyword: "entry-content", link: false, a: true },
    MicroformatsLinkType { keyword: "first", link: true, a: true },
    MicroformatsLinkType { keyword: "gbfs", link: true, a: false },
    MicroformatsLinkType { keyword: "gtfs-static", link: true, a: false },
    MicroformatsLinkType { keyword: "gtfs-realtime", link: true, a: false },
    MicroformatsLinkType { keyword: "home", link: true, a: true },
    MicroformatsLinkType { keyword: "hub", link: true, a: true },
    MicroformatsLinkType { keyword: "import", link: true, a: false },
    MicroformatsLinkType { keyword: "in-reply-to", link: true, a: true },
    MicroformatsLinkType { keyword: "root", link: true, a: true },
    MicroformatsLinkType { keyword: "index", link: true, a: true },
    MicroformatsLinkType { keyword: "issues", link: true, a: true },
    MicroformatsLinkType { keyword: "jslicense", link: true, a: true },
    MicroformatsLinkType { keyword: "last", link: true, a: true },
    MicroformatsLinkType { keyword: "lightbox", link: false, a: true },
    MicroformatsLinkType { keyword: "lightvideo", link: false, a: true },
    MicroformatsLinkType { keyword: "main", link: true, a: true },
    MicroformatsLinkType { keyword: "mask-icon", link: true, a: false },
    MicroformatsLinkType { keyword: "meta", link: true, a: false },
    MicroformatsLinkType { keyword: "micropub", link: true, a: false },
    MicroformatsLinkType { keyword: "openid.delegate", link: true, a: false },
    MicroformatsLinkType { keyword: "openid.server", link: true, a: false },
    MicroformatsLinkType { keyword: "openid2.local_id", link: true, a: false },
    MicroformatsLinkType { keyword: "openid2.provider", link: true, a: false },
    MicroformatsLinkType { keyword: "p3pv1", link: true, a: false },
    MicroformatsLinkType { keyword: "pgpkey", link: true, a: false },
    MicroformatsLinkType { keyword: "prerender", link: true, a: true },
    MicroformatsLinkType { keyword: "profile", link: true, a: true },
    MicroformatsLinkType { keyword: "publisher", link: true, a: true },
    MicroformatsLinkType { keyword: "radioepg", link: true, a: true },
    MicroformatsLinkType { keyword: "rendition", link: true, a: true },
    MicroformatsLinkType { keyword: "reply-to", link: true, a: true },
    MicroformatsLinkType { keyword: "schema.DCTERMS", link: true, a: false },
    MicroformatsLinkType { keyword: "service", link: true, a: false },
    MicroformatsLinkType { keyword: "shortlink", link: true, a: false },
    MicroformatsLinkType { keyword: "sidebar", link: true, a: true },
    MicroformatsLinkType { keyword: "sitemap", link: true, a: false },
    MicroformatsLinkType { keyword: "subresource", link: true, a: false },
    MicroformatsLinkType { keyword: "sword", link: true, a: false },
    MicroformatsLinkType { keyword: "syndication", link: true, a: true },
    MicroformatsLinkType { keyword: "timesheet", link: true, a: false },
    MicroformatsLinkType { keyword: "token_endpoint", link: true, a: false },
    MicroformatsLinkType { keyword: "webmention", link: true, a: true },
    MicroformatsLinkType { keyword: "widget", link: true, a: true },
    MicroformatsLinkType { keyword: "wlwmanifest", link: true, a: false },
    MicroformatsLinkType { keyword: "image_src", link: true, a: false },
    MicroformatsLinkType { keyword: "http://docs.oasis-open.org/ns/cmis/link/200908/acl", link: true, a: true },
    MicroformatsLinkType { keyword: "stylesheet/less", link: true, a: false },
    MicroformatsLinkType { keyword: "yandex-tableau-widget", link: true, a: false },
    MicroformatsLinkType { keyword: "accessibility", link: true, a: true },
    MicroformatsLinkType { keyword: "bibliography", link: true, a: true },
    MicroformatsLinkType { keyword: "cite", link: true, a: true },
    MicroformatsLinkType { keyword: "embed", link: true, a: true },
    MicroformatsLinkType { keyword: "group", link: true, a: true },
    MicroformatsLinkType { keyword: "longdesc", link: true, a: true },
    MicroformatsLinkType { keyword: "map", link: true, a: true },
    MicroformatsLinkType { keyword: "member", link: true, a: true },
    MicroformatsLinkType { keyword: "m_PageScroll2id", link: true, a: true },
    MicroformatsLinkType { keyword: "prerender", link: true, a: true },
    MicroformatsLinkType { keyword: "profile", link: true, a: true },
    MicroformatsLinkType { keyword: "shortlink", link: true, a: true },
    MicroformatsLinkType { keyword: "source", link: true, a: true },
    MicroformatsLinkType { keyword: "vcalendar-parent", link: true, a: true },
    MicroformatsLinkType { keyword: "vcalendar-child", link: true, a: true },
    MicroformatsLinkType { keyword: "vcalendar-sibling", link: true, a: true },
    MicroformatsLinkType { keyword: "status", link: true, a: true },
    MicroformatsLinkType { keyword: "https://api.w.org/", link: true, a: true },
    MicroformatsLinkType { keyword: "archive", link: true, a: true },
    MicroformatsLinkType { keyword: "archives", link: true, a: true },
    MicroformatsLinkType { keyword: "comment", link: true, a: true },
    MicroformatsLinkType { keyword: "contribution", link: true, a: true },
    MicroformatsLinkType { keyword: "EditURI", link: true, a: true },
    MicroformatsLinkType { keyword: "endorsed", link: true, a: true },
    MicroformatsLinkType { keyword: "fan", link: true, a: true },
    MicroformatsLinkType { keyword: "feed", link: true, a: true },
    MicroformatsLinkType { keyword: "footnote", link: true, a: true },
    MicroformatsLinkType { keyword: "kinetic-stylesheet", link: true, a: true },
    MicroformatsLinkType { keyword: "lightbox", link: true, a: true },
    MicroformatsLinkType { keyword: "made", link: true, a: true },
    MicroformatsLinkType { keyword: "meta", link: true, a: true },
    MicroformatsLinkType { keyword: "microsummary", link: true, a: true },
    MicroformatsLinkType { keyword: "openid.delegate", link: true, a: true },
    MicroformatsLinkType { keyword: "openid.server", link: true, a: true },
    MicroformatsLinkType { keyword: "permalink", link: true, a: true },
    MicroformatsLinkType { keyword: "pgpkey", link: true, a: true },
    MicroformatsLinkType { keyword: "popover", link: true, a: true },
    MicroformatsLinkType { keyword: "privacy", link: true, a: true },
    MicroformatsLinkType { keyword: "publickey", link: true, a: true },
    MicroformatsLinkType { keyword: "referral", link: true, a: true },
    MicroformatsLinkType { keyword: "related", link: true, a: true },
    MicroformatsLinkType { keyword: "replies", link: true, a: true },
    MicroformatsLinkType { keyword: "respond-proxy", link: true, a: true },
    MicroformatsLinkType { keyword: "respond-redirect", link: true, a: true },
    MicroformatsLinkType { keyword: "resource", link: true, a: true },
    MicroformatsLinkType { keyword: "sitemap", link: true, a: true },
    MicroformatsLinkType { keyword: "sponsor", link: true, a: true },
    MicroformatsLinkType { keyword: "tooltip", link: true, a: true },
    MicroformatsLinkType { keyword: "trackback", link: true, a: true },
    MicroformatsLinkType { keyword: "unendorsed", link: true, a: true },
    MicroformatsLinkType { keyword: "user", link: true, a: true },
    MicroformatsLinkType { keyword: "wlwmanifest", link: true, a: true },
    MicroformatsLinkType { keyword: "schema.DC", link: true, a: false },
    MicroformatsLinkType { keyword: "schema.DCTERMS", link: true, a: false },
];

/// Dropped, rejected and non-HTML keywords of the Microformats registry.
const DISALLOWED: &[&str] = &[
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
    "first",
    "index",
    "last",
    "up",
    "logo",
    "pavatar",
];

const REF: &str = "https://html.spec.whatwg.org/multipage/links.html#linkTypes";

/// TS `checkLinkType({ el })(value)`.
///
/// A keyword of the dropped, rejected and non-HTML lists is searched as TS `tokens.search(keyword)`
/// searches it: as a case-sensitive substring of any token, so `subsection` is reported because it
/// contains `sub`.
///
/// # Examples
///
/// ```
/// use markuplint_types::whatwg::link_type::{LinkTypeContext, check_link_type};
///
/// assert!(check_link_type("stylesheet", LinkTypeContext::Link).is_matched());
/// assert!(!check_link_type("stylesheet", LinkTypeContext::AnchorAndArea).is_matched());
/// ```
#[must_use]
pub fn check_link_type(value: &str, context: LinkTypeContext) -> CheckResult {
    let tokens = TokenCollection::new(
        value,
        TokenCollectionOptions {
            separator: Separator::Space,
            case_insensitive: true,
            unique: true,
            ..TokenCollectionOptions::default()
        },
    );

    for keyword in DISALLOWED {
        if let Some(searched) = tokens.search(|t| t.value.contains(keyword)) {
            return searched.unmatched_result(
                Some(Reason::UnexpectedToken),
                UnmatchedOpts {
                    expects: Some(vec![Expect {
                        type_: ExpectType::Common,
                        value: "valid Link Type".to_owned(),
                    }]),
                    ..Default::default()
                },
            );
        }
    }

    let mut enum_values: Vec<String> = Vec::new();
    for def in WHATWG {
        let allowed = match context {
            LinkTypeContext::Link => def.link,
            LinkTypeContext::BodyLink => def.link && def.body_ok,
            LinkTypeContext::AnchorAndArea => def.a,
            LinkTypeContext::Form => def.form,
        };
        if allowed {
            enum_values.push(def.keyword.to_owned());
        }
    }
    for def in ALLOWED_MICROFORMATS {
        let allowed = match context {
            LinkTypeContext::Link => def.link,
            LinkTypeContext::AnchorAndArea => def.a,
            LinkTypeContext::BodyLink | LinkTypeContext::Form => false,
        };
        if allowed {
            enum_values.push(def.keyword.to_owned());
        }
    }

    let token = Type::Enum(EnumType {
        enum_values,
        case_insensitive: true,
        // TS `disallowToSurroundBySpaces ?? true`
        disallow_to_surround_by_spaces: true,
    });
    let list = ListType {
        token: Box::new(token.clone()),
        separator: Separator::Space,
        case_insensitive: true,
        unique: true,
        number: Some(ListNumber::OneOrMore),
        ..ListType::default()
    };
    check_list(value, &list, Some(REF), |v| crate::check::check(v, &token, Some(REF)))
}
