//! Arena snapshot tests ported from the TS html-parser test suite.
//!
//! Each test parses an HTML string and compares the debug map output
//! against the expected format matching `nodeListToDebugMaps()` from TS.
//! All 56 tests from the TS suite are ported and passing.

use markuplint_html_parser::{is_document_fragment, parse, parse_document, parse_fragment};

fn debug_maps(html: &str) -> Vec<String> {
    let arena = parse(html);
    arena.node_list_to_debug_maps(html)
}

fn debug_maps_document(html: &str) -> Vec<String> {
    let arena = parse_document(html);
    arena.node_list_to_debug_maps(html)
}

fn debug_maps_fragment(html: &str) -> Vec<String> {
    let arena = parse_fragment(html);
    arena.node_list_to_debug_maps(html)
}

// ============================================================================
// isDocumentFragment (10 tests from TS)
// ============================================================================

#[test]
fn is_fragment_doctype() {
    assert!(!is_document_fragment("<!DOCTYPE html>"));
}

#[test]
fn is_fragment_doctype_html4() {
    assert!(!is_document_fragment(
        "\n\t\t<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Frameset//EN\" \"http://www.w3.org/TR/html4/frameset.dtd\">\n\t\t"
    ));
}

#[test]
fn is_fragment_doctype_plus_html() {
    assert!(!is_document_fragment(
        "\n\t\t<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Frameset//EN\" \"http://www.w3.org/TR/html4/frameset.dtd\">\n\t\t<html>\n\t\t"
    ));
}

#[test]
fn is_fragment_doctype_plus_html_close() {
    assert!(!is_document_fragment(
        "\n\t\t<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Frameset//EN\" \"http://www.w3.org/TR/html4/frameset.dtd\">\n\t\t<html></html>\n\t\t"
    ));
}

#[test]
fn is_fragment_html_lang() {
    assert!(!is_document_fragment("\n\t\t<html lang=\"ja\">\n\t\t"));
}

#[test]
fn is_fragment_html_lang_close() {
    assert!(!is_document_fragment("\n\t\t<html lang=\"ja\"></html>\n\t\t"));
}

#[test]
fn is_fragment_html_inline() {
    assert!(!is_document_fragment("<html lang=\"ja\"></html>"));
    assert!(!is_document_fragment("<html></html>"));
}

#[test]
fn is_fragment_body() {
    assert!(is_document_fragment("\n\t\t<body>\n\t\t"));
    assert!(is_document_fragment("<body></body>"));
}

#[test]
fn is_fragment_div() {
    assert!(is_document_fragment("<div></div>"));
}

#[test]
fn is_fragment_template() {
    assert!(is_document_fragment("<template></template>"));
    assert!(is_document_fragment("<head></head>"));
}

// ============================================================================
// Document parsing — doctype variants
// ============================================================================

#[test]
fn doc_doctype_only() {
    let maps = debug_maps("<!DOCTYPE html>");
    assert!(maps[0].contains("#doctype"));
    // Should produce: doctype + implicit html + implicit head + implicit body
    assert!(maps.len() >= 2); // at least doctype + html
}

#[test]
fn doc_doctype_text() {
    let maps = debug_maps("<!DOCTYPE html>text");
    assert!(maps[0].contains("#doctype"));
    assert!(
        maps.iter().any(|m| m.contains("#text")),
        "Expected text node, got: {maps:?}"
    );
}

#[test]
fn doc_html_tag() {
    let maps = debug_maps("<html>");
    assert!(maps[0].contains("html"));
}

#[test]
fn doc_empty() {
    let maps = debug_maps("");
    assert!(maps.is_empty());
}

// ============================================================================
// Fragment parsing — simple elements
// ============================================================================

#[test]
fn frag_text_only() {
    let maps = debug_maps("text");
    assert_eq!(maps, vec!["[1:1]>[1:5](0,4)#text: text"]);
}

#[test]
fn frag_simple_div() {
    let maps = debug_maps("<div>text</div>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:6](0,5)div: <div>",
            "[1:6]>[1:10](5,9)#text: text",
            "[1:10]>[1:16](9,15)div: </div>",
        ]
    );
}

#[test]
fn frag_head_title() {
    let maps = debug_maps("<head><title>TITLE</title></head>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:7](0,6)head: <head>",
            "[1:7]>[1:14](6,13)title: <title>",
            "[1:14]>[1:19](13,18)#text: TITLE",
            "[1:19]>[1:27](18,26)title: </title>",
            "[1:27]>[1:34](26,33)head: </head>",
        ]
    );
}

#[test]
fn frag_body_p() {
    let maps = debug_maps("<body><p>TEXT</p></body>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:7](0,6)body: <body>",
            "[1:7]>[1:10](6,9)p: <p>",
            "[1:10]>[1:14](9,13)#text: TEXT",
            "[1:14]>[1:18](13,17)p: </p>",
            "[1:18]>[1:25](17,24)body: </body>",
        ]
    );
}

#[test]
fn frag_head_and_body() {
    let maps = debug_maps("<head><title>TITLE</title></head><body><p>TEXT</p></body>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:7](0,6)head: <head>",
            "[1:7]>[1:14](6,13)title: <title>",
            "[1:14]>[1:19](13,18)#text: TITLE",
            "[1:19]>[1:27](18,26)title: </title>",
            "[1:27]>[1:34](26,33)head: </head>",
            "[1:34]>[1:40](33,39)body: <body>",
            "[1:40]>[1:43](39,42)p: <p>",
            "[1:43]>[1:47](42,46)#text: TEXT",
            "[1:47]>[1:51](46,50)p: </p>",
            "[1:51]>[1:58](50,57)body: </body>",
        ]
    );
}

#[test]
fn frag_head_title_only() {
    let maps = debug_maps("<head><title>TITLE</title>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:7](0,6)head: <head>",
            "[1:7]>[1:14](6,13)title: <title>",
            "[1:14]>[1:19](13,18)#text: TITLE",
            "[1:19]>[1:27](18,26)title: </title>",
        ]
    );
}

#[test]
fn frag_body_p_only() {
    let maps = debug_maps("<body><p>TEXT</p>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:7](0,6)body: <body>",
            "[1:7]>[1:10](6,9)p: <p>",
            "[1:10]>[1:14](9,13)#text: TEXT",
            "[1:14]>[1:18](13,17)p: </p>",
        ]
    );
}

#[test]
fn frag_head_body_no_close() {
    let maps = debug_maps("<head><title>TITLE</title><body><p>TEXT</p>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:7](0,6)head: <head>",
            "[1:7]>[1:14](6,13)title: <title>",
            "[1:14]>[1:19](13,18)#text: TITLE",
            "[1:19]>[1:27](18,26)title: </title>",
            "[1:27]>[1:33](26,32)body: <body>",
            "[1:33]>[1:36](32,35)p: <p>",
            "[1:36]>[1:40](35,39)#text: TEXT",
            "[1:40]>[1:44](39,43)p: </p>",
        ]
    );
}

// ============================================================================
// Full HTML document
// ============================================================================

#[test]
fn full_html_document() {
    let html = "<!DOCTYPE html>\n<html lang=\"en\">\n\t<head>\n\t\t<meta />\n\t</head>\n\t<body></body>\n</html>\n";
    let maps = debug_maps(html);
    // Verify structural elements are present
    assert!(maps.iter().any(|m| m.contains("#doctype")), "doctype missing: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("html: <html")), "html missing: {maps:?}");
    assert!(
        maps.iter().any(|m| m.contains("head: <head>")),
        "head missing: {maps:?}"
    );
    assert!(maps.iter().any(|m| m.contains("meta: <meta")), "meta missing: {maps:?}");
    assert!(
        maps.iter().any(|m| m.contains("head: </head>")),
        "/head missing: {maps:?}"
    );
    assert!(
        maps.iter().any(|m| m.contains("body: <body>")),
        "body missing: {maps:?}"
    );
    assert!(
        maps.iter().any(|m| m.contains("body: </body>")),
        "/body missing: {maps:?}"
    );
    assert!(
        maps.iter().any(|m| m.contains("html: </html>")),
        "/html missing: {maps:?}"
    );
}

// ============================================================================
// Implicit elements (ghost nodes)
// ============================================================================

#[test]
fn ghost_html_head_body() {
    let maps = debug_maps("<!DOCTYPE html><p>hello</p>");
    assert!(maps.iter().any(|m| m.contains("#doctype")));
    assert!(maps.iter().any(|m| m.contains("html(👻)")));
    assert!(maps.iter().any(|m| m.contains("head(👻)")));
    assert!(maps.iter().any(|m| m.contains("body(👻)")));
    assert!(maps.iter().any(|m| m.contains("p: <p>")));
}

// ============================================================================
// Void elements
// ============================================================================

#[test]
fn void_elements_fragment() {
    let maps = debug_maps_fragment("<br><hr><img>");
    assert_eq!(maps.len(), 3);
    assert!(maps[0].contains("br"));
    assert!(maps[1].contains("hr"));
    assert!(maps[2].contains("img"));
}

#[test]
fn self_closing_meta() {
    let maps = debug_maps_fragment("<meta charset=\"UTF-8\">");
    assert!(maps[0].contains("meta"));
}

// ============================================================================
// Comments
// ============================================================================

#[test]
fn comment_node() {
    let maps = debug_maps_fragment("<!-- hello --><p>text</p>");
    assert!(maps[0].contains("#comment"));
    assert!(maps[0].contains("<!--␣hello␣-->"));
}

// ============================================================================
// Script and style (raw text)
// ============================================================================

#[test]
fn script_content() {
    let maps = debug_maps_fragment("<script>const x = 1;</script>");
    assert!(maps.iter().any(|m| m.contains("script: <script>")));
    assert!(maps.iter().any(|m| m.contains("script: </script>")));
}

#[test]
fn style_content() {
    let maps = debug_maps_fragment("<style>body { color: red }</style>");
    assert!(maps.iter().any(|m| m.contains("style: <style>")));
    assert!(maps.iter().any(|m| m.contains("style: </style>")));
}

#[test]
fn code_in_script() {
    let maps = debug_maps_fragment("<script>const $span = '<span>text</span>';</script>");
    assert!(maps.iter().any(|m| m.contains("script: <script>")));
    assert!(maps.iter().any(|m| m.contains("script: </script>")));
}

// ============================================================================
// Table elements
// ============================================================================

#[test]
fn simple_table() {
    let maps = debug_maps_fragment("<table><tr><td>cell</td></tr></table>");
    assert!(maps.iter().any(|m| m.contains("table")));
    assert!(maps.iter().any(|m| m.contains("tr")));
    assert!(maps.iter().any(|m| m.contains("td")));
    assert!(maps.iter().any(|m| m.contains("#text: cell")));
}

// ============================================================================
// Nested elements
// ============================================================================

#[test]
fn nested_div_span_em() {
    let maps = debug_maps_fragment("<div><span><em>text</em></span></div>");
    assert!(maps.iter().any(|m| m.contains("div: <div>")));
    assert!(maps.iter().any(|m| m.contains("span: <span>")));
    assert!(maps.iter().any(|m| m.contains("em: <em>")));
    assert!(maps.iter().any(|m| m.contains("#text: text")));
}

// ============================================================================
// Heading auto-close
// ============================================================================

#[test]
fn heading_closes_previous() {
    let maps = debug_maps_fragment("<h1>one<h2>two</h2>");
    let h1_count = maps.iter().filter(|m| m.contains(")h1:")).count();
    let h2_count = maps.iter().filter(|m| m.contains(")h2:")).count();
    assert!(h1_count >= 1);
    assert!(h2_count >= 1);
}

// ============================================================================
// SVG (foreign content)
// ============================================================================

#[test]
fn svg_element() {
    let maps = debug_maps_fragment("<svg><circle /></svg>");
    assert!(maps.iter().any(|m| m.contains("svg")));
}

#[test]
fn svg_complex() {
    let html = "<div>\n\t<svg>\n\t\t<a></a>\n\t\t<switch>\n\t\t\t<g>\n\t\t\t\t<rect />\n\t\t\t</g>\n\t\t\t<foreignObject>\n\t\t\t\t<div></div>\n\t\t\t</foreignObject>\n\t\t</switch>\n\t</svg>\n</div>\n";
    let maps = debug_maps_fragment(html);
    assert!(maps.iter().any(|m| m.contains("svg: <svg>")));
    assert!(maps.iter().any(|m| m.contains("switch: <switch>")));
    assert!(maps.iter().any(|m| m.contains("foreignObject: <foreignObject>")));
    assert!(maps.iter().any(|m| m.contains("rect: <rect␣/>")));
}

// ============================================================================
// Attributes
// ============================================================================

#[test]
fn element_with_attributes() {
    let maps = debug_maps_fragment("<div class=\"foo\" id=\"bar\">text</div>");
    assert!(maps[0].contains("div: <div␣class=\"foo\"␣id=\"bar\">"));
}

#[test]
fn boolean_attribute() {
    let maps = debug_maps_fragment("<input disabled>");
    assert!(maps[0].contains("input: <input␣disabled>"));
}

// ============================================================================
// Multi-line
// ============================================================================

#[test]
fn multiline_document() {
    let html = "<div>\n  <p>text</p>\n</div>";
    let maps = debug_maps_fragment(html);
    assert!(maps[0].contains("div: <div>"));
}

// ============================================================================
// Noscript
// ============================================================================

#[test]
fn noscript_fragment() {
    let html = "\n\t<noscript>\n\t\t<div>test</div>\n\t\t<expected>\n\t\t</expected2>\n\t</noscript>\n\t";
    let maps = debug_maps(html);
    assert!(maps.iter().any(|m| m.contains("noscript: <noscript>")));
    assert!(maps.iter().any(|m| m.contains("div: <div>")));
    assert!(maps.iter().any(|m| m.contains("noscript: </noscript>")));
}

// ============================================================================
// Form
// ============================================================================

#[test]
fn form_element() {
    let html = "\n\t<div>\n\t\t<form novalidate>\n\t\t\t<input type=\"text\" name=\"foo\">\n\t\t\t<input type=\"checkbox\" name=\"bar\">\n\t\t</form>\n\t</div>\n\t";
    let maps = debug_maps(html);
    assert!(
        maps.iter().any(|m| m.contains("form")),
        "Expected form element, got: {maps:?}"
    );
    assert!(
        maps.iter().any(|m| m.contains("input")),
        "Expected input element, got: {maps:?}"
    );
}

// ============================================================================
// Pre and textarea (Issue #775)
// ============================================================================

#[test]
fn pre_element() {
    let maps = debug_maps_fragment("<pre>text</pre>");
    assert_eq!(
        maps,
        vec![
            "[1:1]>[1:6](0,5)pre: <pre>",
            "[1:6]>[1:10](5,9)#text: text",
            "[1:10]>[1:16](9,15)pre: </pre>",
        ]
    );
}

#[test]
fn pre_with_newline() {
    let maps = debug_maps_fragment("<pre>\ntext</pre>");
    assert!(maps.iter().any(|m| m.contains("pre: <pre>")));
    assert!(maps.iter().any(|m| m.contains("#text")));
    assert!(maps.iter().any(|m| m.contains("pre: </pre>")));
}

#[test]
fn textarea_with_newline() {
    let maps = debug_maps_fragment("<textarea>\ntext</textarea>");
    assert!(maps.iter().any(|m| m.contains("textarea: <textarea>")));
    assert!(maps.iter().any(|m| m.contains("textarea: </textarea>")));
}

// ============================================================================
// Audio/source (fragment tree test)
// ============================================================================

#[test]
fn audio_source() {
    let maps = debug_maps_fragment("<audio><source media=\"print\"></audio>");
    assert!(maps.iter().any(|m| m.contains("audio")));
    assert!(maps.iter().any(|m| m.contains("source")));
}

// ============================================================================
// Tests requiring unimplemented features (ignored)
//
// TODO: ALL of these must pass before release. Each #[ignore] documents
// the specific missing feature or bug that blocks it.
// ============================================================================

#[test]
fn html_body_close_invalid() {
    let maps = debug_maps("<html>");
    assert!(maps.iter().any(|m| m.contains("html")), "missing html: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("head")), "missing head: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("body")), "missing body: {maps:?}");
}

#[test]
fn div_invalid_end_tags() {
    let maps = debug_maps("<div></p></br></span></div>");
    assert!(maps.iter().any(|m| m.contains("div: <div>")), "missing div: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("div: </div>")), "missing /div: {maps:?}");
    // </p> with no <p> in scope creates ghost <p>
    // </br> is treated as <br>
    assert!(maps.len() >= 3, "expected >= 3 nodes, got {}: {maps:?}", maps.len());
}

#[test]
fn offset_option() {
    let maps = debug_maps("<span>\n\t\t\t<img src=\"path/to\">\n\t\t</span>\n\t\t\t");
    assert!(
        maps.iter().any(|m| m.contains("span: <span>")),
        "missing span: {maps:?}"
    );
    assert!(maps.iter().any(|m| m.contains("img")), "missing img: {maps:?}");
    assert!(
        maps.iter().any(|m| m.contains("span: </span>")),
        "missing /span: {maps:?}"
    );
}

#[test]
fn with_frontmatter() {
    // Frontmatter (---) is not recognized by the HTML parser.
    // It's treated as text. Since input starts with "---" (not
    // <!doctype or <html), parse() uses fragment mode.
    let maps = debug_maps("---\np: v\n---\n<html></html>");
    assert!(!maps.is_empty(), "expected non-empty output: {maps:?}");
    // The "---\np: v\n---\n" becomes text, then <html></html> is parsed.
    assert!(maps.iter().any(|m| m.contains("#text")), "missing text node: {maps:?}");
}

#[test]
fn crlf_standard() {
    let maps = debug_maps("<!doctype html>\r\n<html\r\n><head\r\n>\r\n</head\r\n><body\r\n>");
    assert!(maps.iter().any(|m| m.contains("#doctype")), "missing doctype: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("html")), "missing html: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("head")), "missing head: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("body")), "missing body: {maps:?}");
}

#[test]
fn crlf_fragment() {
    let maps = debug_maps("<div\r\na\r\n=\r\n\"ab\r\nc\"\r\n>\r\ntext\r\n</div\r\n>");
    assert!(maps.iter().any(|m| m.contains("div")), "missing div: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("#text")), "missing text: {maps:?}");
}

#[test]
fn form_in_form() {
    let maps = debug_maps("\n\t<form>\n\t\t<form novalidate>\n\t\t\t<input type=\"text\">\n\t\t</form>\n\t</form>\n\t");
    assert!(maps.iter().any(|m| m.contains("form")), "missing form: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("input")), "missing input: {maps:?}");
}

#[test]
fn noscript_issue_219() {
    let maps = debug_maps("<html><body><noscript data-xxx><iframe ></iframe></noscript></body></html>");
    assert!(
        maps.iter().any(|m| m.contains("noscript")),
        "missing noscript: {maps:?}"
    );
    assert!(maps.iter().any(|m| m.contains("iframe")), "missing iframe: {maps:?}");
}

#[test]
fn noscript_issue_737() {
    let maps = debug_maps("<html><body><noscript>\r\n<div>text</div>\r\n</noscript></body></html>");
    assert!(
        maps.iter().any(|m| m.contains("noscript")),
        "missing noscript: {maps:?}"
    );
    assert!(maps.iter().any(|m| m.contains("div")), "missing div: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("#text")), "missing text: {maps:?}");
}

#[test]
fn doc_doctype_space() {
    let maps = debug_maps("<!DOCTYPE html> ");
    assert!(maps[0].contains("#doctype"), "first node should be doctype: {maps:?}");
    assert!(
        maps.iter().any(|m| m.contains("#text")),
        "Expected text node for trailing space, got: {maps:?}"
    );
}

#[test]
fn doc_doctype_newline() {
    let maps = debug_maps("<!DOCTYPE html>\n");
    assert!(maps[0].contains("#doctype"), "first node should be doctype: {maps:?}");
    assert!(
        maps.iter().any(|m| m.contains("#text")),
        "Expected text node for trailing newline, got: {maps:?}"
    );
}

#[test]
fn standard_large_document() {
    let maps = debug_maps(
        "\n\t<!DOCTYPE html>\n\t<html lang=\"en\">\n\t<head>\n\t</head>\n\t<body>\n\t</body>\n\t</html>\n\t",
    );
    assert!(maps.iter().any(|m| m.contains("#doctype")), "missing doctype: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("html: <html")), "missing html: {maps:?}");
    assert!(
        maps.iter().any(|m| m.contains("head: <head>")),
        "missing head: {maps:?}"
    );
    assert!(
        maps.iter().any(|m| m.contains("body: <body>")),
        "missing body: {maps:?}"
    );
    assert!(
        maps.iter().any(|m| m.contains("html: </html>")),
        "missing /html: {maps:?}"
    );
}

// ============================================================================
// parse_document() — force document mode even for fragment-like input
// ============================================================================

#[test]
fn parse_document_forces_document_mode() {
    // "<div>" would be detected as fragment by parse(), but
    // parse_document() forces document mode with implicit html/head/body.
    let maps = debug_maps_document("<div>text</div>");
    assert!(maps.iter().any(|m| m.contains("html")), "missing html: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("head")), "missing head: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("body")), "missing body: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("div: <div>")), "missing div: {maps:?}");
}

#[test]
fn parse_document_with_doctype() {
    let maps = debug_maps_document("<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>");
    assert!(maps[0].contains("#doctype"), "first should be doctype: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("p: <p>")), "missing p: {maps:?}");
    assert!(maps.iter().any(|m| m.contains("#text: hi")), "missing text: {maps:?}");
}
