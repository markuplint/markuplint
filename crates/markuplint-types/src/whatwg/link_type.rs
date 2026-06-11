//! This boolean validator accepts keywords valid in any element context.
//!
//! <https://html.spec.whatwg.org/multipage/links.html#linkTypes>

/// <https://html.spec.whatwg.org/multipage/links.html#linkTypes>
const WHATWG_KEYWORDS: &[&str] = &[
    "alternate",
    "canonical",
    "author",
    "bookmark",
    "dns-prefetch",
    "expect",
    "external",
    "help",
    "icon",
    "manifest",
    "modulepreload",
    "license",
    "next",
    "nofollow",
    "noopener",
    "noreferrer",
    "opener",
    "pingback",
    "preconnect",
    "prefetch",
    "preload",
    "prev",
    "privacy-policy",
    "search",
    "stylesheet",
    "tag",
    "terms-of-service",
];

/// Microformats allowed keywords (all categories combined, excluding WHATWG overlaps).
///
/// Sources: formats, proposals, HTML5 link type extensions, brainstorming,
/// POSH usage, Dublin Core.
///
/// <https://microformats.org/wiki/existing-rel-values>
#[allow(clippy::doc_markdown)]
const MICROFORMATS_KEYWORDS: &[&str] = &[
    // formats
    "acquaintance",
    "appendix",
    "chapter",
    "child",
    "colleague",
    "contact",
    "contents",
    "copyright",
    "co-resident",
    "co-worker",
    "crush",
    "date",
    "friend",
    "glossary",
    "its-rules",
    "kin",
    "me",
    "met",
    "muse",
    "neighbor",
    "parent",
    "previous",
    "section",
    "sibling",
    "spouse",
    "start",
    "subsection",
    "sweetheart",
    "toc",
    "transformation",
    // proposals
    "pronunciation",
    "directory",
    "enclosure",
    "home",
    "payment",
    "vcs-*",
    // HTML5 link type extensions
    "about",
    "amphtml",
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
    "apple-touch-startup-image",
    "archived",
    "attachment",
    "authorization_endpoint",
    "category",
    "code-repository",
    "code-license",
    "component",
    "chrome-webstore-item",
    "content-repository",
    "content-license",
    "DCTERMS.conformsTo",
    "DCTERMS.contributor",
    "DCTERMS.creator",
    "DCTERMS.description",
    "DCTERMS.hasFormat",
    "DCTERMS.hasPart",
    "DCTERMS.hasVersion",
    "DCTERMS.isFormatOf",
    "DCTERMS.isPartOf",
    "DCTERMS.isReferencedBy",
    "DCTERMS.isReplacedBy",
    "DCTERMS.isRequiredBy",
    "DCTERMS.isVersionOf",
    "DCTERMS.license",
    "DCTERMS.mediator",
    "DCTERMS.publisher",
    "DCTERMS.references",
    "DCTERMS.relation",
    "DCTERMS.replaces",
    "DCTERMS.requires",
    "DCTERMS.rightsHolder",
    "DCTERMS.source",
    "DCTERMS.subject",
    "disclosure",
    "discussion",
    "donation",
    "edit",
    "EditURI",
    "entry-content",
    "first",
    "gbfs",
    "gtfs-static",
    "gtfs-realtime",
    "hub",
    "import",
    "in-reply-to",
    "root",
    "index",
    "issues",
    "jslicense",
    "last",
    "lightbox",
    "lightvideo",
    "main",
    "mask-icon",
    "meta",
    "micropub",
    "openid.delegate",
    "openid.server",
    "openid2.local_id",
    "openid2.provider",
    "p3pv1",
    "pgpkey",
    "prerender",
    "profile",
    "publisher",
    "radioepg",
    "rendition",
    "reply-to",
    "schema.DCTERMS",
    "service",
    "shortlink",
    "sidebar",
    "sitemap",
    "subresource",
    "sword",
    "syndication",
    "timesheet",
    "token_endpoint",
    "webmention",
    "widget",
    "wlwmanifest",
    "image_src",
    "http://docs.oasis-open.org/ns/cmis/link/200908/acl",
    "stylesheet/less",
    "yandex-tableau-widget",
    // brainstorming
    "accessibility",
    "bibliography",
    "cite",
    "embed",
    "group",
    "longdesc",
    "map",
    "member",
    "m_PageScroll2id",
    "source",
    "vcalendar-parent",
    "vcalendar-child",
    "vcalendar-sibling",
    "status",
    "https://api.w.org/",
    // POSH usage (minus overlaps with above)
    "archive",
    "archives",
    "comment",
    "contribution",
    "endorsed",
    "fan",
    "feed",
    "footnote",
    "kinetic-stylesheet",
    "made",
    "microsummary",
    "permalink",
    "popover",
    "privacy",
    "publickey",
    "referral",
    "related",
    "replies",
    "respond-proxy",
    "respond-redirect",
    "resource",
    "sponsor",
    "tooltip",
    "trackback",
    "unendorsed",
    "user",
    // Dublin Core
    "schema.DC",
];

/// Excluded keywords: non-HTML, dropped, dropped-without-prejudice, rejected.
const EXCLUDED_KEYWORDS: &[&str] = &[
    // non-HTML rel values
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
    // dropped
    "banner",
    "begin",
    "biblioentry",
    "bibliography",
    "child",
    "citation",
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
    // dropped without prejudice
    "first",
    "index",
    "last",
    "up",
    // rejected
    "logo",
    "pavatar",
];

fn matches_keyword(token: &str, list: &[&str]) -> bool {
    list.iter().any(|keyword| token.eq_ignore_ascii_case(keyword))
}

/// This is an element-agnostic boolean check. Element-specific context
/// filtering (link vs a/area vs form) is deferred to error-reporting validators.
///
/// # Examples
///
/// ```
/// use markuplint_types::whatwg::link_type::is_link_type;
///
/// assert!(is_link_type("stylesheet"));
/// assert!(is_link_type("nofollow noopener"));
/// assert!(!is_link_type("invalid-keyword"));
/// ```
#[must_use]
pub fn is_link_type(value: &str) -> bool {
    let tokens: Vec<&str> = value.split_ascii_whitespace().collect();

    if tokens.is_empty() {
        return false;
    }

    for i in 0..tokens.len() {
        for j in (i + 1)..tokens.len() {
            if tokens[i].eq_ignore_ascii_case(tokens[j]) {
                return false;
            }
        }
    }

    for token in &tokens {
        if matches_keyword(token, EXCLUDED_KEYWORDS) {
            return false;
        }

        if !matches_keyword(token, WHATWG_KEYWORDS) && !matches_keyword(token, MICROFORMATS_KEYWORDS) {
            return false;
        }
    }

    true
}
