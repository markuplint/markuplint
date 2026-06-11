//! HTML element category tables per WHATWG spec.

pub const VOID_ELEMENTS: &[&str] = &[
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
];

/// Used by the adoption agency algorithm.
pub const FORMATTING_ELEMENTS: &[&str] = &[
    "a", "b", "big", "code", "em", "font", "i", "nobr", "s", "small", "strike", "strong", "tt", "u",
];

/// Per WHATWG spec; used for "in scope" checks.
pub const SPECIAL_ELEMENTS_HTML: &[&str] = &[
    "address",
    "applet",
    "area",
    "article",
    "aside",
    "base",
    "basefont",
    "bgsound",
    "blockquote",
    "body",
    "br",
    "button",
    "caption",
    "center",
    "col",
    "colgroup",
    "dd",
    "details",
    "dialog",
    "dir",
    "div",
    "dl",
    "dt",
    "embed",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "frame",
    "frameset",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "header",
    "hgroup",
    "hr",
    "html",
    "iframe",
    "img",
    "input",
    "keygen",
    "li",
    "link",
    "listing",
    "main",
    "marquee",
    "menu",
    "meta",
    "nav",
    "noembed",
    "noframes",
    "noscript",
    "object",
    "ol",
    "p",
    "param",
    "plaintext",
    "pre",
    "script",
    "search",
    "section",
    "select",
    "source",
    "style",
    "summary",
    "table",
    "tbody",
    "td",
    "template",
    "textarea",
    "tfoot",
    "th",
    "thead",
    "title",
    "tr",
    "track",
    "ul",
    "wbr",
    "xmp",
];

pub const IMPLIED_END_TAG_ELEMENTS: &[&str] = &["dd", "dt", "li", "optgroup", "option", "p", "rb", "rp", "rt", "rtc"];

/// Elements included in "generate implied end tags thoroughly".
pub const IMPLIED_END_TAG_THOROUGHLY_ELEMENTS: &[&str] = &[
    "caption", "colgroup", "dd", "dt", "li", "optgroup", "option", "p", "rb", "rp", "rt", "rtc", "tbody", "td",
    "tfoot", "th", "thead", "tr",
];

/// Raw text elements (RAWTEXT parsing).
pub const RAW_TEXT_ELEMENTS: &[&str] = &["style", "xmp", "iframe", "noembed", "noframes"];

/// Escapable raw text elements (RCDATA parsing).
pub const ESCAPABLE_RAW_TEXT_ELEMENTS: &[&str] = &["textarea", "title"];

#[must_use]
pub fn is_void_element(name: &str) -> bool {
    VOID_ELEMENTS.contains(&name)
}

#[must_use]
pub fn is_formatting_element(name: &str) -> bool {
    FORMATTING_ELEMENTS.contains(&name)
}

#[must_use]
pub fn is_special_element_html(name: &str) -> bool {
    SPECIAL_ELEMENTS_HTML.contains(&name)
}
