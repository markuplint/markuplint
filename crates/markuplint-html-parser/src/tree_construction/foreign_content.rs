//! Foreign content processing per WHATWG §13.2.6.5.
//!
//! Handles SVG and `MathML` elements embedded in HTML.

use crate::input::Span;
use crate::tokenizer::token::{RawAttribute, Token};
use crate::tree::node::Namespace;

use super::TreeBuilder;

/// SVG tag name adjustments (camelCase).
const SVG_TAG_ADJUSTMENTS: &[(&str, &str)] = &[
    ("altglyph", "altGlyph"),
    ("altglyphdef", "altGlyphDef"),
    ("altglyphitem", "altGlyphItem"),
    ("animatecolor", "animateColor"),
    ("animatemotion", "animateMotion"),
    ("animatetransform", "animateTransform"),
    ("clippath", "clipPath"),
    ("feblend", "feBlend"),
    ("fecolormatrix", "feColorMatrix"),
    ("fecomponenttransfer", "feComponentTransfer"),
    ("fecomposite", "feComposite"),
    ("feconvolvematrix", "feConvolveMatrix"),
    ("fediffuselighting", "feDiffuseLighting"),
    ("fedisplacementmap", "feDisplacementMap"),
    ("fedistantlight", "feDistantLight"),
    ("fedropshadow", "feDropShadow"),
    ("feflood", "feFlood"),
    ("fefunca", "feFuncA"),
    ("fefuncb", "feFuncB"),
    ("fefuncg", "feFuncG"),
    ("fefuncr", "feFuncR"),
    ("fegaussianblur", "feGaussianBlur"),
    ("feimage", "feImage"),
    ("femerge", "feMerge"),
    ("femergenode", "feMergeNode"),
    ("femorphology", "feMorphology"),
    ("feoffset", "feOffset"),
    ("fepointlight", "fePointLight"),
    ("fespecularlighting", "feSpecularLighting"),
    ("fespotlight", "feSpotLight"),
    ("fetile", "feTile"),
    ("feturbulence", "feTurbulence"),
    ("foreignobject", "foreignObject"),
    ("glyphref", "glyphRef"),
    ("lineargradient", "linearGradient"),
    ("radialgradient", "radialGradient"),
    ("textpath", "textPath"),
];

/// Elements that cause a breakout from foreign content back to HTML.
const BREAKOUT_ELEMENTS: &[&str] = &[
    "b",
    "big",
    "blockquote",
    "body",
    "br",
    "center",
    "code",
    "dd",
    "div",
    "dl",
    "dt",
    "em",
    "embed",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "hr",
    "i",
    "img",
    "li",
    "listing",
    "menu",
    "meta",
    "nobr",
    "ol",
    "p",
    "pre",
    "ruby",
    "s",
    "small",
    "span",
    "strong",
    "strike",
    "sub",
    "sup",
    "table",
    "tt",
    "u",
    "ul",
    "var",
];

/// `MathML` text integration points.
const MATHML_TEXT_INTEGRATION: &[&str] = &["mi", "mo", "mn", "ms", "mtext"];

impl TreeBuilder<'_> {
    /// Check if we should process a token as foreign content.
    pub(super) fn should_process_as_foreign(&self) -> bool {
        let Some(current) = self.current_node() else {
            return false;
        };
        let node = self.arena.get(current);
        let ns = node.namespace();
        ns == Some(Namespace::Svg) || ns == Some(Namespace::MathML)
    }

    /// Process a token in foreign content mode.
    pub(super) fn process_foreign_content(&mut self, token: Token) {
        match &token {
            Token::Character { ch, offset, line, col } => {
                if *ch == '\0' {
                    self.insert_character(
                        '\u{FFFD}',
                        crate::input::Position {
                            offset: *offset,
                            line: *line,
                            col: *col,
                        },
                    );
                } else {
                    self.insert_character(
                        *ch,
                        crate::input::Position {
                            offset: *offset,
                            line: *line,
                            col: *col,
                        },
                    );
                }
            }
            Token::Comment { data, span } => {
                self.insert_comment(data, *span);
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                self_closing,
            } => {
                let tag = tag_name.as_str();

                // Check for breakout elements.
                if BREAKOUT_ELEMENTS.contains(&tag) || (tag == "font" && has_font_attrs(attributes)) {
                    // Pop until we're back in HTML namespace.
                    while let Some(id) = self.current_node() {
                        if self.arena.get(id).namespace() == Some(Namespace::Html) {
                            break;
                        }
                        self.open_elements.pop();
                    }
                    self.process_token(token);
                    return;
                }

                // Determine namespace from current node.
                let current_ns = self
                    .current_node()
                    .and_then(|id| self.arena.get(id).namespace())
                    .unwrap_or(Namespace::Html);

                let adjusted_name = if current_ns == Namespace::Svg {
                    adjust_svg_tag_name(tag)
                } else {
                    tag.to_owned()
                };

                self.insert_element_for_token(&adjusted_name, attributes, *span, current_ns);

                if *self_closing {
                    self.open_elements.pop();
                }
            }
            Token::EndTag { tag_name, span, .. } => {
                self.set_end_tag_span(tag_name, *span);
                // Simple: pop if current node matches.
                if let Some(id) = self.current_node() {
                    let node = self.arena.get(id);
                    if node.tag_name().is_some_and(|n| n.eq_ignore_ascii_case(tag_name)) {
                        self.open_elements.pop();
                    }
                }
            }
            _ => {}
        }
    }

    /// Handle `<svg>` start tag in `InBody`.
    pub(super) fn process_svg_start_tag(&mut self, attributes: &[RawAttribute], span: Span) {
        self.insert_element_for_token("svg", attributes, span, Namespace::Svg);
    }

    /// Handle `<math>` start tag in `InBody`.
    pub(super) fn process_math_start_tag(&mut self, attributes: &[RawAttribute], span: Span) {
        self.insert_element_for_token("math", attributes, span, Namespace::MathML);
    }
}

fn adjust_svg_tag_name(name: &str) -> String {
    for &(from, to) in SVG_TAG_ADJUSTMENTS {
        if name == from {
            return to.to_owned();
        }
    }
    name.to_owned()
}

fn has_font_attrs(attributes: &[RawAttribute]) -> bool {
    attributes
        .iter()
        .any(|a| matches!(a.raw_name.as_str(), "color" | "face" | "size"))
}

/// Check if a node is a `MathML` text integration point.
#[must_use]
pub fn is_mathml_text_integration_point(tag_name: &str) -> bool {
    MATHML_TEXT_INTEGRATION.contains(&tag_name)
}
