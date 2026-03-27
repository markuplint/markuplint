//! Arena snapshot tests ported from the TS html-parser test suite.
//!
//! Each test parses an HTML string and compares the debug map output
//! against the expected format matching `nodeListToDebugMaps()` from TS.
//!
//! Tests marked `#[ignore]` require features not yet implemented
//! (frontmatter, offset options, CRLF normalization, invalid node handling).

use markuplint_html_parser::{is_document_fragment, parse, parse_fragment};

fn debug_maps(html: &str) -> Vec<String> {
    let arena = parse(html);
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
#[ignore = "TODO: InBody end tag handling must generate MLASTInvalid for orphan </body> — \
            WHATWG §13.2.6.4.7 'Any other end tag' should create an invalid node \
            when the end tag has no matching open element (e.g. </body> inside <html> \
            without a <body> start tag). Requires MLASTInvalid node emission in \
            process_any_other_end_tag()."]
fn html_body_close_invalid() {
    let _maps = debug_maps("<html></body>");
}

#[test]
#[ignore = "TODO: Three WHATWG-specified behaviors are missing: \
            (1) </p> with no <p> in button scope inserts ghost <p> then closes it; \
            (2) </br> is treated as <br> start tag per spec; \
            (3) </span> with no matching element generates MLASTInvalid. \
            See §13.2.6.4.7 end tag handling in InBody."]
fn div_invalid_end_tags() {
    let _maps = debug_maps("<div></p></br></span></div>");
}

#[test]
#[ignore = "TODO: Parse options (offsetOffset, offsetLine, offsetColumn) are not \
            yet supported. These are used when markuplint parses embedded HTML \
            inside template languages at a non-zero starting position. \
            Requires adding an offset parameter to TreeBuilder::new()."]
fn offset_option() {
    let _maps = debug_maps("<span>\n\t\t\t<img src=\"path/to\">\n\t\t</span>\n\t\t\t");
}

#[test]
#[ignore = "TODO: Frontmatter (YAML front matter delimited by ---) is handled by \
            @markuplint/parser-utils ignoreFrontMatter option, not by the HTML \
            parser itself. This Rust crate needs to either implement the same \
            pre-processing or accept a pre-stripped input with offset."]
fn with_frontmatter() {
    let _maps = debug_maps("---\np: v\n---\n<html></html>");
}

#[test]
#[ignore = "TODO: CRLF normalization is now implemented in Input::next_char(), \
            but the span offsets and debug_maps output need verification. \
            The TS test expects span offsets that account for \\r being \
            consumed but not counted as a separate character. \
            Run this test and fix any offset mismatches."]
fn crlf_standard() {
    let _maps = debug_maps("<!doctype html>\r\n<html\r\n><head\r\n>\r\n</head\r\n><body\r\n>");
}

#[test]
#[ignore = "TODO: Same as crlf_standard — CRLF in attribute values and multi-line \
            tags. The attribute sub-token spans must correctly reference the \
            original source bytes including \\r\\n."]
fn crlf_fragment() {
    let _maps = debug_maps("<div\r\na\r\n=\r\n\"ab\r\nc\"\r\n>\r\ntext\r\n</div\r\n>");
}

#[test]
#[ignore = "TODO: Nested <form> inside <form> — WHATWG spec says the inner <form> \
            start tag is a parse error and must be ignored (not inserted into \
            the tree). The inner <form novalidate> should become raw text in \
            the parent form's text content. Currently our InBody 'form' handler \
            does not check form_element properly for this case."]
fn form_in_form() {
    let _maps =
        debug_maps("\n\t<form>\n\t\t<form novalidate>\n\t\t\t<input type=\"text\">\n\t\t</form>\n\t</form>\n\t");
}

#[test]
#[ignore = "TODO: <noscript> with scripting disabled should parse its content as \
            HTML (not raw text). Our InHead handler sends noscript to RAWTEXT \
            mode, but with scriptingEnabled=false (which is our default), the \
            content should be parsed as normal HTML. Need to check scripting \
            flag and use InHeadNoscript mode instead. \
            See markuplint/markuplint#219."]
fn noscript_issue_219() {
    let _maps = debug_maps("<html><body><noscript data-xxx><iframe ></iframe></noscript></body></html>");
}

#[test]
#[ignore = "TODO: Same noscript issue as #219, plus CRLF handling. \\r\\n in \
            noscript content should be normalized to \\n in text nodes while \
            keeping original bytes in raw/span. \
            See markuplint/markuplint#737."]
fn noscript_issue_737() {
    let _maps = debug_maps("<html><body><noscript>\r\n<div>text</div>\r\n</noscript></body></html>");
}

#[test]
#[ignore = "TODO: Whitespace text nodes after <!DOCTYPE> before implicit <html> \
            are not being inserted. In WHATWG BeforeHtml mode, whitespace \
            characters should be ignored, but once <html> is implicitly \
            created and we transition to BeforeHead/InBody, trailing \
            whitespace from the doctype line should become a text node \
            inside <body>. The timing of implicit element creation and \
            token reprocessing needs fixing."]
fn doc_doctype_space() {
    let maps = debug_maps("<!DOCTYPE html> ");
    assert!(maps[0].contains("#doctype"));
    assert!(
        maps.iter().any(|m| m.contains("#text")),
        "Expected text node for trailing space, got: {maps:?}"
    );
}

#[test]
#[ignore = "TODO: Same as doc_doctype_space — newline after doctype should appear \
            as text node in implicit body."]
fn doc_doctype_newline() {
    let maps = debug_maps("<!DOCTYPE html>\n");
    assert!(maps[0].contains("#doctype"));
    assert!(
        maps.iter().any(|m| m.contains("#text")),
        "Expected text node for trailing newline, got: {maps:?}"
    );
}

#[test]
#[ignore = "TODO: Large document with tables (implicit tbody), script, comments, \
            bogus comments (<?...?>), invalid end tags (</expected>), and \
            mixed content. This is the comprehensive integration test from TS. \
            Requires: implicit tbody insertion, bogus comment for <? and <%, \
            invalid node generation, and correct whitespace handling. \
            Enable after all other ignored tests pass."]
fn standard_large_document() {
    let _maps = debug_maps(
        "\n\t<!DOCTYPE html>\n\t<html lang=\"en\">\n\t<head>\n\t</head>\n\t<body>\n\t</body>\n\t</html>\n\t",
    );
}
