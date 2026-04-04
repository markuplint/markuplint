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

/// `MathML` attribute name adjustments per WHATWG §13.2.6.5.
const MATHML_ATTR_ADJUSTMENTS: &[(&str, &str)] = &[("definitionurl", "definitionURL")];

/// SVG attribute name adjustments per WHATWG §13.2.6.5.
const SVG_ATTR_ADJUSTMENTS: &[(&str, &str)] = &[
    ("attributename", "attributeName"),
    ("attributetype", "attributeType"),
    ("basefrequency", "baseFrequency"),
    ("baseprofile", "baseProfile"),
    ("calcmode", "calcMode"),
    ("clippathunits", "clipPathUnits"),
    ("diffuseconstant", "diffuseConstant"),
    ("edgemode", "edgeMode"),
    ("filterunits", "filterUnits"),
    ("glyphref", "glyphRef"),
    ("gradienttransform", "gradientTransform"),
    ("gradientunits", "gradientUnits"),
    ("kernelmatrix", "kernelMatrix"),
    ("kernelunitlength", "kernelUnitLength"),
    ("keypoints", "keyPoints"),
    ("keysplines", "keySplines"),
    ("keytimes", "keyTimes"),
    ("lengthadjust", "lengthAdjust"),
    ("limitingconeangle", "limitingConeAngle"),
    ("markerheight", "markerHeight"),
    ("markerunits", "markerUnits"),
    ("markerwidth", "markerWidth"),
    ("maskcontentunits", "maskContentUnits"),
    ("maskunits", "maskUnits"),
    ("numoctaves", "numOctaves"),
    ("pathlength", "pathLength"),
    ("patterncontentunits", "patternContentUnits"),
    ("patterntransform", "patternTransform"),
    ("patternunits", "patternUnits"),
    ("pointsatx", "pointsAtX"),
    ("pointsaty", "pointsAtY"),
    ("pointsatz", "pointsAtZ"),
    ("preservealpha", "preserveAlpha"),
    ("preserveaspectratio", "preserveAspectRatio"),
    ("primitiveunits", "primitiveUnits"),
    ("refx", "refX"),
    ("refy", "refY"),
    ("repeatcount", "repeatCount"),
    ("repeatdur", "repeatDur"),
    ("requiredextensions", "requiredExtensions"),
    ("requiredfeatures", "requiredFeatures"),
    ("specularconstant", "specularConstant"),
    ("specularexponent", "specularExponent"),
    ("spreadmethod", "spreadMethod"),
    ("startoffset", "startOffset"),
    ("stddeviation", "stdDeviation"),
    ("stitchtiles", "stitchTiles"),
    ("surfacescale", "surfaceScale"),
    ("systemlanguage", "systemLanguage"),
    ("tablevalues", "tableValues"),
    ("targetx", "targetX"),
    ("targety", "targetY"),
    ("textlength", "textLength"),
    ("viewbox", "viewBox"),
    ("viewtarget", "viewTarget"),
    ("xchannelselector", "xChannelSelector"),
    ("ychannelselector", "yChannelSelector"),
    ("zoomandpan", "zoomAndPan"),
];

impl TreeBuilder<'_> {
    /// Check if we should process a token as foreign content.
    /// Simple check: is the adjusted current node in a foreign namespace?
    pub(super) fn should_process_as_foreign(&self) -> bool {
        let Some(current) = self.current_node() else {
            return false;
        };
        let node = self.arena.get(current);
        let ns = node.namespace();
        ns == Some(Namespace::Svg) || ns == Some(Namespace::MathML)
    }

    /// WHATWG §13.2.6: Full dispatch check including integration points.
    /// Returns true if the token should be processed as foreign content.
    pub(super) fn should_process_as_foreign_for_token(&self, token: &Token) -> bool {
        let Some(current) = self.current_node() else {
            return false;
        };
        let node = self.arena.get(current);
        let ns = node.namespace();

        // If not in a foreign namespace, never process as foreign.
        if ns != Some(Namespace::Svg) && ns != Some(Namespace::MathML) {
            return false;
        }

        // EOF always goes to the current insertion mode.
        if matches!(token, Token::Eof) {
            return false;
        }

        // MathML text integration point: start tags (except mglyph/malignmark)
        // and character tokens go to the current insertion mode.
        if node.is_mathml_text_integration_point() {
            match token {
                Token::StartTag { tag_name, .. } if tag_name != "mglyph" && tag_name != "malignmark" => {
                    return false;
                }
                Token::Character { .. } => return false,
                _ => {}
            }
        }

        // MathML annotation-xml with <svg> start tag → current insertion mode.
        if ns == Some(Namespace::MathML)
            && node.tag_name() == Some("annotation-xml")
            && matches!(token, Token::StartTag { tag_name, .. } if tag_name == "svg")
        {
            return false;
        }

        // HTML integration point: start tags and character tokens go to
        // the current insertion mode.
        if node.is_html_integration_point() {
            match token {
                Token::StartTag { .. } | Token::Character { .. } => return false,
                _ => {}
            }
        }

        true
    }

    /// Process a token in foreign content mode.
    #[allow(clippy::too_many_lines)]
    pub(super) fn process_foreign_content(&mut self, token: Token) {
        match &token {
            Token::Character {
                ch,
                offset,
                line,
                col,
                source_offset,
                source_line,
                source_col,
            } => {
                let pos = crate::input::Position {
                    offset: *offset,
                    line: *line,
                    col: *col,
                };
                let source_pos = crate::input::Position {
                    offset: *source_offset,
                    line: *source_line,
                    col: *source_col,
                };
                if *ch == '\0' {
                    self.insert_character_with_source('\u{FFFD}', pos, source_pos);
                } else {
                    if !ch.is_ascii_whitespace() {
                        self.frameset_ok = false;
                    }
                    self.insert_character_with_source(*ch, pos, source_pos);
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

                // Check for breakout elements (and special end-tag-like start tags).
                if BREAKOUT_ELEMENTS.contains(&tag) || (tag == "font" && has_font_attrs(attributes)) {
                    // Pop until MathML text integration point, HTML integration
                    // point, or HTML namespace element per WHATWG §13.2.6.5.
                    let mut hit_fragment_root = false;
                    while let Some(id) = self.current_node() {
                        let node = self.arena.get(id);
                        if node.namespace() == Some(Namespace::Html)
                            || node.is_mathml_text_integration_point()
                            || node.is_html_integration_point()
                        {
                            break;
                        }
                        if self.is_fragment && self.open_elements.len() <= 1 {
                            hit_fragment_root = true;
                            break;
                        }
                        self.open_elements.pop();
                    }
                    if hit_fragment_root {
                        // Fragment context root is foreign with no integration
                        // point. Process directly in InBody to avoid infinite
                        // re-entry into foreign content.
                        self.process_in_body(token);
                    } else {
                        self.process_token(token);
                    }
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

                // Adjust attribute names: SVG/MathML-specific + foreign namespace attrs.
                let adjusted_attrs = if current_ns == Namespace::Svg {
                    let svg_adjusted = adjust_svg_attributes(attributes);
                    adjust_foreign_attributes(&svg_adjusted)
                } else if current_ns == Namespace::MathML {
                    let math_adjusted = adjust_mathml_attributes(attributes);
                    adjust_foreign_attributes(&math_adjusted)
                } else {
                    adjust_foreign_attributes(attributes)
                };

                self.insert_element_for_token_with_self_closing(
                    &adjusted_name,
                    &adjusted_attrs,
                    *span,
                    current_ns,
                    *self_closing,
                );

                if *self_closing {
                    self.open_elements.pop();
                }
            }
            Token::EndTag { tag_name, span, .. } => {
                // WHATWG §13.2.6.5 specifies end-tag breakout only for
                // </br> and </p>. However, html5lib-tests expects ALL
                // breakout-list end tags (</div>, </span>, etc.) to also
                // trigger a pop-to-HTML before reprocessing. The spec text
                // only mentions "br" and "p", but browser implementations
                // (and thus the conformance tests) apply the breakout to
                // the full list. We follow the test suite here.
                //
                // Spec: https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
                // html5lib-tests: tree-construction/tests26.dat, pending-spec-changes.dat
                if BREAKOUT_ELEMENTS.contains(&tag_name.as_str()) {
                    // Pop until integration point or HTML namespace.
                    let mut hit_fragment_root = false;
                    while let Some(id) = self.current_node() {
                        let node = self.arena.get(id);
                        if node.namespace() == Some(Namespace::Html)
                            || node.is_mathml_text_integration_point()
                            || node.is_html_integration_point()
                        {
                            break;
                        }
                        if self.is_fragment && self.open_elements.len() <= 1 {
                            hit_fragment_root = true;
                            break;
                        }
                        self.open_elements.pop();
                    }
                    if hit_fragment_root {
                        self.process_in_body(token);
                    } else {
                        self.process_token(token);
                    }
                    return;
                }

                self.set_end_tag_span(tag_name, *span);

                // WHATWG §13.2.6.5: End tag in foreign content.
                // Walk the stack from top looking for a match.
                // In fragment mode, never pop the bottom element (context root).
                let mut found = false;
                let stack_len = self.open_elements.len();
                let bottom = usize::from(self.is_fragment);
                for i in (bottom..stack_len).rev() {
                    let Some(node_id) = self.open_elements.get(i) else {
                        continue;
                    };
                    let node = self.arena.get(node_id);

                    // If this node's tag matches (case-insensitive), pop
                    // down to and including it.
                    if node.tag_name().is_some_and(|n| n.eq_ignore_ascii_case(tag_name)) {
                        // Pop elements from top to this node.
                        while self.open_elements.len() > i {
                            self.open_elements.pop();
                        }
                        found = true;
                        break;
                    }

                    // If we hit an HTML-namespace element, stop searching
                    // and reprocess the end tag in InBody.
                    if node.namespace() == Some(Namespace::Html) {
                        self.process_token(token);
                        return;
                    }
                }

                if !found {
                    // No match found. Reprocess in current mode.
                    self.process_token(token);
                }
            }
            _ => {}
        }
    }

    /// Handle `<svg>` start tag in `InBody`.
    pub(super) fn process_svg_start_tag(&mut self, attributes: &[RawAttribute], span: Span) {
        let adjusted = adjust_svg_attributes(attributes);
        let adjusted = adjust_foreign_attributes(&adjusted);
        self.insert_element_for_token("svg", &adjusted, span, Namespace::Svg);
    }

    /// Handle `<math>` start tag in `InBody`.
    pub(super) fn process_math_start_tag(&mut self, attributes: &[RawAttribute], span: Span) {
        let adjusted = adjust_mathml_attributes(attributes);
        let adjusted = adjust_foreign_attributes(&adjusted);
        self.insert_element_for_token("math", &adjusted, span, Namespace::MathML);
    }
}

/// Foreign content attribute namespace adjustments per WHATWG §13.2.6.5.
/// These map `xlink:href` → `xlink href`, `xml:lang` → `xml lang`, etc.
const FOREIGN_ATTR_ADJUSTMENTS: &[(&str, &str)] = &[
    ("xlink:actuate", "xlink actuate"),
    ("xlink:arcrole", "xlink arcrole"),
    ("xlink:href", "xlink href"),
    ("xlink:role", "xlink role"),
    ("xlink:show", "xlink show"),
    ("xlink:title", "xlink title"),
    ("xlink:type", "xlink type"),
    ("xml:lang", "xml lang"),
    ("xml:space", "xml space"),
    ("xmlns", "xmlns"),
    ("xmlns:xlink", "xmlns xlink"),
];

fn adjust_svg_attributes(attrs: &[RawAttribute]) -> Vec<RawAttribute> {
    attrs
        .iter()
        .map(|attr| {
            let adjusted_name = SVG_ATTR_ADJUSTMENTS
                .iter()
                .find(|(from, _)| *from == attr.raw_name)
                .map_or_else(|| attr.raw_name.clone(), |(_, to)| (*to).to_owned());
            RawAttribute {
                raw_name: adjusted_name,
                ..attr.clone()
            }
        })
        .collect()
}

fn adjust_mathml_attributes(attrs: &[RawAttribute]) -> Vec<RawAttribute> {
    attrs
        .iter()
        .map(|attr| {
            let adjusted_name = MATHML_ATTR_ADJUSTMENTS
                .iter()
                .find(|(from, _)| *from == attr.raw_name)
                .map_or_else(|| attr.raw_name.clone(), |(_, to)| (*to).to_owned());
            RawAttribute {
                raw_name: adjusted_name,
                ..attr.clone()
            }
        })
        .collect()
}

fn adjust_foreign_attributes(attrs: &[RawAttribute]) -> Vec<RawAttribute> {
    attrs
        .iter()
        .map(|attr| {
            let adjusted_name = FOREIGN_ATTR_ADJUSTMENTS
                .iter()
                .find(|(from, _)| *from == attr.raw_name)
                .map_or_else(|| attr.raw_name.clone(), |(_, to)| (*to).to_owned());
            RawAttribute {
                raw_name: adjusted_name,
                ..attr.clone()
            }
        })
        .collect()
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
