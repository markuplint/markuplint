//! HTML tokenizer implementing WHATWG §13.2.5.

pub mod char_ref;
pub mod state;
pub mod token;

use crate::input::{Input, Position, Span};
use state::State;
use token::{RawAttribute, Token};

#[allow(clippy::struct_excessive_bools)]
pub struct Tokenizer<'a> {
    input: Input<'a>,
    state: State,
    return_state: State,
    /// Set by tree builder when adjusted current node is in a foreign namespace.
    /// Affects CDATA section handling in `MarkupDeclarationOpen` state.
    pub adjusted_current_node_is_foreign: bool,
    pending_tokens: Vec<Token>,
    is_end_tag: bool,
    current_tag_name: String,
    current_self_closing: bool,
    current_attributes: Vec<RawAttribute>,
    current_tag_start: Position,
    current_attr_spaces_start: Position,
    current_attr_name_start: Position,
    /// Position just past the last character of the current attribute name.
    /// Set when transitioning out of `AttributeName` state.
    current_attr_name_end: Position,
    current_attr_name: String,
    current_attr_spaces_before_eq: Span,
    current_attr_equal: Option<Span>,
    current_attr_spaces_after_eq: Span,
    current_attr_value_start: Position,
    current_attr_value: String,
    current_attr_quote: Option<char>,
    current_comment: String,
    current_comment_start: Position,
    current_doctype_name: Option<String>,
    current_doctype_public_id: Option<String>,
    current_doctype_system_id: Option<String>,
    current_doctype_force_quirks: bool,
    current_doctype_start: Position,
    /// Temporary buffer (used by RCDATA/RAWTEXT/ScriptData end tag matching).
    temp_buffer: String,
    /// The last emitted start tag name (for "appropriate end tag token" checks).
    last_start_tag_name: Option<String>,
    /// Character reference: code point being accumulated.
    char_ref_code: u32,
    /// Source position of the `&` that started the current character reference.
    /// Used to pass source position to emitted Character tokens so that
    /// downstream consumers can slice the original source text.
    char_ref_start: Position,
}

impl<'a> Tokenizer<'a> {
    #[must_use]
    pub fn new(source: &'a str) -> Self {
        Self {
            input: Input::new(source),
            state: State::Data,
            return_state: State::Data,
            adjusted_current_node_is_foreign: false,
            pending_tokens: Vec::new(),
            is_end_tag: false,
            current_tag_name: String::new(),
            current_self_closing: false,
            current_attributes: Vec::new(),
            current_tag_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            current_attr_spaces_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            current_attr_name_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            current_attr_name_end: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            current_attr_name: String::new(),
            current_attr_spaces_before_eq: Span::empty(Position {
                offset: 0,
                line: 1,
                col: 1,
            }),
            current_attr_equal: None,
            current_attr_spaces_after_eq: Span::empty(Position {
                offset: 0,
                line: 1,
                col: 1,
            }),
            current_attr_value_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            current_attr_value: String::new(),
            current_attr_quote: None,
            current_comment: String::new(),
            current_comment_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            current_doctype_name: None,
            current_doctype_public_id: None,
            current_doctype_system_id: None,
            current_doctype_force_quirks: false,
            current_doctype_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
            temp_buffer: String::new(),
            last_start_tag_name: None,
            char_ref_code: 0,
            char_ref_start: Position {
                offset: 0,
                line: 1,
                col: 1,
            },
        }
    }

    /// Set the tokenizer state (used by the tree constructor to switch
    /// between `Data`, `RcData`, `RawText`, `ScriptData`, `PlainText`).
    pub fn set_state(&mut self, state: State) {
        self.state = state;
    }

    /// Set the last start tag name (used for "appropriate end tag" matching).
    pub fn set_last_start_tag(&mut self, name: &str) {
        self.last_start_tag_name = Some(name.to_owned());
    }

    pub fn next_token(&mut self) -> Token {
        loop {
            if let Some(token) = self.pending_tokens.pop() {
                if let Token::StartTag { ref tag_name, .. } = token {
                    self.last_start_tag_name = Some(tag_name.clone());
                }
                return token;
            }
            self.run_state();
        }
    }

    fn emit(&mut self, token: Token) {
        // We insert at position 0 so that pop() returns tokens in order.
        self.pending_tokens.insert(0, token);
    }

    fn emit_char(&mut self, ch: char, pos: Position) {
        self.emit(Token::Character {
            ch,
            offset: pos.offset,
            line: pos.line,
            col: pos.col,
            source_offset: pos.offset,
            source_line: pos.line,
            source_col: pos.col,
        });
    }

    fn emit_char_with_source_pos(&mut self, ch: char, pos: Position, source_pos: Position) {
        self.emit(Token::Character {
            ch,
            offset: pos.offset,
            line: pos.line,
            col: pos.col,
            source_offset: source_pos.offset,
            source_line: source_pos.line,
            source_col: source_pos.col,
        });
    }

    fn emit_current_tag(&mut self) {
        let pos = self.input.position();
        let span = Span::new(self.current_tag_start, pos);
        let tag_name = std::mem::take(&mut self.current_tag_name);
        let attributes = std::mem::take(&mut self.current_attributes);
        let self_closing = self.current_self_closing;
        self.current_self_closing = false;

        if self.is_end_tag {
            self.emit(Token::EndTag {
                tag_name,
                self_closing,
                attributes,
                span,
            });
        } else {
            self.emit(Token::StartTag {
                tag_name,
                self_closing,
                attributes,
                span,
            });
        }
    }

    fn emit_current_comment(&mut self) {
        let pos = self.input.position();
        let span = Span::new(self.current_comment_start, pos);
        let data = std::mem::take(&mut self.current_comment);
        self.emit(Token::Comment { data, span });
    }

    fn emit_current_doctype(&mut self) {
        let pos = self.input.position();
        let span = Span::new(self.current_doctype_start, pos);
        let name = self.current_doctype_name.take();
        let public_id = self.current_doctype_public_id.take();
        let system_id = self.current_doctype_system_id.take();
        let force_quirks = self.current_doctype_force_quirks;
        self.current_doctype_force_quirks = false;
        self.emit(Token::Doctype {
            name,
            public_id,
            system_id,
            force_quirks,
            span,
        });
    }

    fn create_start_tag(&mut self, pos: Position) {
        self.is_end_tag = false;
        self.current_tag_name.clear();
        self.current_self_closing = false;
        self.current_attributes.clear();
        self.current_tag_start = pos;
    }

    fn create_end_tag(&mut self, pos: Position) {
        self.is_end_tag = true;
        self.current_tag_name.clear();
        self.current_self_closing = false;
        self.current_attributes.clear();
        self.current_tag_start = pos;
    }

    fn start_new_attribute(&mut self) {
        self.current_attr_spaces_start = self.input.prev_position();
        self.current_attr_name_start = self.input.prev_position();
        self.current_attr_name_end = self.input.prev_position();
        self.current_attr_name.clear();
        self.current_attr_value.clear();
        self.current_attr_quote = None;
        let empty = Span::empty(self.input.position());
        self.current_attr_spaces_before_eq = empty;
        self.current_attr_equal = None;
        self.current_attr_spaces_after_eq = empty;
        self.current_attr_value_start = self.input.position();
    }

    fn finish_attribute(&mut self) {
        // Skip empty attribute names (can happen when whitespace before > is
        // reconsumed through BeforeAttributeName → AfterAttributeName).
        if self.current_attr_name.is_empty() {
            return;
        }
        // WHATWG: If an attribute with the same name already exists,
        // this is a parse error. Per html5lib, the duplicate is dropped from
        // the token. However, markuplint needs to know about duplicates for
        // linting (e.g. attr-duplication rule), so we keep them as
        // "is_duplicatable" attributes. The html5lib test harness uses
        // a HashMap that deduplicates by key, so duplicates don't affect
        // html5lib conformance — only the first attribute with a given name
        // is used for comparison.
        let pos = self.input.position();
        let spaces_before = Span::new(self.current_attr_spaces_start, self.current_attr_name_start);
        let name_end = if self.current_attr_equal.is_some() {
            self.current_attr_spaces_before_eq.start
        } else {
            // Boolean attribute: use the recorded name end position,
            // not the current position (which may be past `>` or whitespace).
            self.current_attr_name_end
        };
        let name = Span::new(self.current_attr_name_start, name_end);

        let (quote_start, value, quote_end) = if let Some(q) = self.current_attr_quote {
            let q_len = q.len_utf8();
            let vs = self.current_attr_value_start;
            // quote_start is 1 char before value_start
            let qs_pos = Position {
                offset: vs.offset.saturating_sub(q_len),
                line: vs.line,
                col: vs.col.saturating_sub(1),
            };
            let qs = Span::new(qs_pos, vs);
            let ve = pos;
            let v = Span::new(
                vs,
                Position {
                    offset: ve.offset.saturating_sub(q_len),
                    line: ve.line,
                    col: ve.col.saturating_sub(1),
                },
            );
            let qe = Span::new(
                Position {
                    offset: ve.offset.saturating_sub(q_len),
                    line: ve.line,
                    col: ve.col.saturating_sub(1),
                },
                ve,
            );
            (Some(qs), Some(v), Some(qe))
        } else if self.current_attr_equal.is_some() {
            // Unquoted value: end at prev_position (the terminating '>' or whitespace
            // has already been consumed by next_char, so position() is past it).
            let v = Span::new(self.current_attr_value_start, self.input.prev_position());
            (None, Some(v), None)
        } else {
            // Boolean attribute: no value
            (None, None, None)
        };

        self.current_attributes.push(RawAttribute {
            spaces_before,
            name,
            raw_name: std::mem::take(&mut self.current_attr_name),
            spaces_before_eq: self.current_attr_spaces_before_eq,
            equal: self.current_attr_equal,
            spaces_after_eq: self.current_attr_spaces_after_eq,
            quote_start,
            value,
            raw_value: std::mem::take(&mut self.current_attr_value),
            quote_end,
        });
    }

    fn emit_temp_buffer_as_chars(&mut self, base_offset: usize, base_line: u32, base_col: u32) {
        let buf: Vec<char> = self.temp_buffer.chars().collect();
        let mut off = base_offset;
        let mut col = base_col;
        for ch in buf {
            self.emit_char(
                ch,
                Position {
                    offset: off,
                    line: base_line,
                    col,
                },
            );
            off += ch.len_utf8();
            col += 1;
        }
    }

    fn is_appropriate_end_tag(&self) -> bool {
        self.is_end_tag
            && self
                .last_start_tag_name
                .as_ref()
                .is_some_and(|name| *name == self.current_tag_name)
    }

    #[allow(clippy::too_many_lines)]
    fn run_state(&mut self) {
        match self.state {
            State::Data => self.state_data(),
            State::RcData => self.state_rcdata(),
            State::RawText => self.state_rawtext(),
            State::ScriptData => self.state_script_data(),
            State::PlainText => self.state_plaintext(),
            State::TagOpen => self.state_tag_open(),
            State::EndTagOpen => self.state_end_tag_open(),
            State::TagName => self.state_tag_name(),
            State::RcDataLessThanSign => self.state_rcdata_less_than_sign(),
            State::RcDataEndTagOpen => self.state_rcdata_end_tag_open(),
            State::RcDataEndTagName => self.state_rcdata_end_tag_name(),
            State::RawTextLessThanSign => self.state_rawtext_less_than_sign(),
            State::RawTextEndTagOpen => self.state_rawtext_end_tag_open(),
            State::RawTextEndTagName => self.state_rawtext_end_tag_name(),
            State::ScriptDataLessThanSign => self.state_script_data_less_than_sign(),
            State::ScriptDataEndTagOpen => self.state_script_data_end_tag_open(),
            State::ScriptDataEndTagName => self.state_script_data_end_tag_name(),
            State::ScriptDataEscapeStart => self.state_script_data_escape_start(),
            State::ScriptDataEscapeStartDash => self.state_script_data_escape_start_dash(),
            State::ScriptDataEscaped => self.state_script_data_escaped(),
            State::ScriptDataEscapedDash => self.state_script_data_escaped_dash(),
            State::ScriptDataEscapedDashDash => self.state_script_data_escaped_dash_dash(),
            State::ScriptDataEscapedLessThanSign => {
                self.state_script_data_escaped_less_than_sign();
            }
            State::ScriptDataEscapedEndTagOpen => self.state_script_data_escaped_end_tag_open(),
            State::ScriptDataEscapedEndTagName => self.state_script_data_escaped_end_tag_name(),
            State::ScriptDataDoubleEscapeStart => self.state_script_data_double_escape_start(),
            State::ScriptDataDoubleEscaped => self.state_script_data_double_escaped(),
            State::ScriptDataDoubleEscapedDash => self.state_script_data_double_escaped_dash(),
            State::ScriptDataDoubleEscapedDashDash => {
                self.state_script_data_double_escaped_dash_dash();
            }
            State::ScriptDataDoubleEscapedLessThanSign => {
                self.state_script_data_double_escaped_less_than_sign();
            }
            State::ScriptDataDoubleEscapeEnd => self.state_script_data_double_escape_end(),
            State::BeforeAttributeName => self.state_before_attribute_name(),
            State::AttributeName => self.state_attribute_name(),
            State::AfterAttributeName => self.state_after_attribute_name(),
            State::BeforeAttributeValue => self.state_before_attribute_value(),
            State::AttributeValueDoubleQuoted => self.state_attribute_value_double_quoted(),
            State::AttributeValueSingleQuoted => self.state_attribute_value_single_quoted(),
            State::AttributeValueUnquoted => self.state_attribute_value_unquoted(),
            State::AfterAttributeValueQuoted => self.state_after_attribute_value_quoted(),
            State::SelfClosingStartTag => self.state_self_closing_start_tag(),
            State::BogusComment => self.state_bogus_comment(),
            State::MarkupDeclarationOpen => self.state_markup_declaration_open(),
            State::CommentStart => self.state_comment_start(),
            State::CommentStartDash => self.state_comment_start_dash(),
            State::Comment => self.state_comment(),
            State::CommentLessThanSign => self.state_comment_less_than_sign(),
            State::CommentLessThanSignBang => self.state_comment_less_than_sign_bang(),
            State::CommentLessThanSignBangDash => self.state_comment_less_than_sign_bang_dash(),
            State::CommentLessThanSignBangDashDash => {
                self.state_comment_less_than_sign_bang_dash_dash();
            }
            State::CommentEndDash => self.state_comment_end_dash(),
            State::CommentEnd => self.state_comment_end(),
            State::CommentEndBang => self.state_comment_end_bang(),
            State::Doctype => self.state_doctype(),
            State::BeforeDoctypeName => self.state_before_doctype_name(),
            State::DoctypeName => self.state_doctype_name(),
            State::AfterDoctypeName => self.state_after_doctype_name(),
            State::AfterDoctypePublicKeyword => self.state_after_doctype_public_keyword(),
            State::BeforeDoctypePublicIdentifier => self.state_before_doctype_public_identifier(),
            State::DoctypePublicIdentifierDoubleQuoted => {
                self.state_doctype_public_identifier_double_quoted();
            }
            State::DoctypePublicIdentifierSingleQuoted => {
                self.state_doctype_public_identifier_single_quoted();
            }
            State::AfterDoctypePublicIdentifier => self.state_after_doctype_public_identifier(),
            State::BetweenDoctypePublicAndSystemIdentifiers => {
                self.state_between_doctype_public_and_system_identifiers();
            }
            State::AfterDoctypeSystemKeyword => self.state_after_doctype_system_keyword(),
            State::BeforeDoctypeSystemIdentifier => self.state_before_doctype_system_identifier(),
            State::DoctypeSystemIdentifierDoubleQuoted => {
                self.state_doctype_system_identifier_double_quoted();
            }
            State::DoctypeSystemIdentifierSingleQuoted => {
                self.state_doctype_system_identifier_single_quoted();
            }
            State::AfterDoctypeSystemIdentifier => self.state_after_doctype_system_identifier(),
            State::BogusDoctype => self.state_bogus_doctype(),
            State::CDataSection => self.state_cdata_section(),
            State::CDataSectionBracket => self.state_cdata_section_bracket(),
            State::CDataSectionEnd => self.state_cdata_section_end(),
            State::CharacterReference => self.state_character_reference(),
            State::NamedCharacterReference => self.state_named_character_reference(),
            State::AmbiguousAmpersand => self.state_ambiguous_ampersand(),
            State::NumericCharacterReference => self.state_numeric_character_reference(),
            State::HexadecimalCharacterReferenceStart => {
                self.state_hexadecimal_character_reference_start();
            }
            State::DecimalCharacterReferenceStart => {
                self.state_decimal_character_reference_start();
            }
            State::HexadecimalCharacterReference => self.state_hexadecimal_character_reference(),
            State::DecimalCharacterReference => self.state_decimal_character_reference(),
            State::NumericCharacterReferenceEnd => self.state_numeric_character_reference_end(),
        }
    }

    // ========================================================================
    // §13.2.5.1 Data state
    // ========================================================================
    fn state_data(&mut self) {
        match self.input.next_char() {
            Some('&') => {
                self.return_state = State::Data;
                self.state = State::CharacterReference;
            }
            Some('<') => {
                self.state = State::TagOpen;
            }
            Some('\0') => {
                // WHATWG §13.2.5.1: "Parse error. Emit the current input
                // character as a character token." — emit raw \0, not FFFD.
                let pos = self.input.prev_position();
                self.emit_char('\0', pos);
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                let pos = self.input.prev_position();
                self.emit_char(c, pos);
            }
        }
    }

    // ========================================================================
    // §13.2.5.2 RCDATA state
    // ========================================================================
    fn state_rcdata(&mut self) {
        match self.input.next_char() {
            Some('&') => {
                self.return_state = State::RcData;
                self.state = State::CharacterReference;
            }
            Some('<') => {
                self.state = State::RcDataLessThanSign;
            }
            Some('\0') => {
                let pos = self.input.prev_position();
                self.emit_char('\u{FFFD}', pos);
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                let pos = self.input.prev_position();
                self.emit_char(c, pos);
            }
        }
    }

    // ========================================================================
    // §13.2.5.3 RAWTEXT state
    // ========================================================================
    fn state_rawtext(&mut self) {
        match self.input.next_char() {
            Some('<') => {
                self.state = State::RawTextLessThanSign;
            }
            Some('\0') => {
                let pos = self.input.prev_position();
                self.emit_char('\u{FFFD}', pos);
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                let pos = self.input.prev_position();
                self.emit_char(c, pos);
            }
        }
    }

    // ========================================================================
    // §13.2.5.4 Script data state
    // ========================================================================
    fn state_script_data(&mut self) {
        match self.input.next_char() {
            Some('<') => {
                self.state = State::ScriptDataLessThanSign;
            }
            Some('\0') => {
                let pos = self.input.prev_position();
                self.emit_char('\u{FFFD}', pos);
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                let pos = self.input.prev_position();
                self.emit_char(c, pos);
            }
        }
    }

    // ========================================================================
    // §13.2.5.5 PLAINTEXT state
    // ========================================================================
    fn state_plaintext(&mut self) {
        match self.input.next_char() {
            Some('\0') => {
                let pos = self.input.prev_position();
                self.emit_char('\u{FFFD}', pos);
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                let pos = self.input.prev_position();
                self.emit_char(c, pos);
            }
        }
    }

    // ========================================================================
    // §13.2.5.6 Tag open state
    // ========================================================================
    fn state_tag_open(&mut self) {
        match self.input.next_char() {
            Some('!') => {
                self.state = State::MarkupDeclarationOpen;
            }
            Some('/') => {
                self.state = State::EndTagOpen;
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.create_start_tag(Position {
                    offset: self.input.prev_position().offset - 1,
                    line: self.input.prev_position().line,
                    col: self.input.prev_position().col - 1,
                });
                self.input.reconsume();
                self.state = State::TagName;
            }
            Some('?') => {
                // Parse error. Create a comment token.
                self.current_comment.clear();
                self.current_comment_start = Position {
                    offset: self.input.prev_position().offset - 1,
                    line: self.input.prev_position().line,
                    col: self.input.prev_position().col - 1,
                };
                self.input.reconsume();
                self.state = State::BogusComment;
            }
            None => {
                // Parse error. Emit '<' and EOF.
                let pos = Position {
                    offset: self.input.position().offset - 1,
                    line: self.input.position().line,
                    col: self.input.position().col - 1,
                };
                self.emit_char('<', pos);
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Parse error. Emit '<' and reconsume.
                let pos = Position {
                    offset: self.input.prev_position().offset - 1,
                    line: self.input.prev_position().line,
                    col: self.input.prev_position().col - 1,
                };
                self.emit_char('<', pos);
                self.input.reconsume();
                self.state = State::Data;
            }
        }
    }

    // ========================================================================
    // §13.2.5.7 End tag open state
    // ========================================================================
    fn state_end_tag_open(&mut self) {
        match self.input.next_char() {
            Some(c) if c.is_ascii_alphabetic() => {
                // The `</` started 2 characters before current.
                let current = self.input.prev_position();
                self.create_end_tag(Position {
                    offset: current.offset - 2,
                    line: current.line,
                    col: current.col - 2,
                });
                self.input.reconsume();
                self.state = State::TagName;
            }
            Some('>') => {
                // Parse error. Switch to data.
                self.state = State::Data;
            }
            None => {
                let offset = self.input.position().offset;
                let lt_pos = Position {
                    offset: offset - 2,
                    line: self.input.position().line,
                    col: self.input.position().col - 2,
                };
                let slash_pos = Position {
                    offset: offset - 1,
                    line: self.input.position().line,
                    col: self.input.position().col - 1,
                };
                self.emit_char('<', lt_pos);
                self.emit_char('/', slash_pos);
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Parse error. Create a bogus comment.
                self.current_comment.clear();
                self.current_comment_start = Position {
                    offset: self.input.prev_position().offset - 2,
                    line: self.input.prev_position().line,
                    col: self.input.prev_position().col - 2,
                };
                self.input.reconsume();
                self.state = State::BogusComment;
            }
        }
    }

    // ========================================================================
    // §13.2.5.8 Tag name state
    // ========================================================================
    fn state_tag_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::BeforeAttributeName;
            }
            Some('/') => {
                self.state = State::SelfClosingStartTag;
            }
            Some('>') => {
                self.state = State::Data;
                self.emit_current_tag();
            }
            Some('\0') => {
                self.current_tag_name.push('\u{FFFD}');
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_tag_name.push(c.to_ascii_lowercase());
            }
        }
    }

    // ========================================================================
    // §13.2.5.9–11 RCDATA less-than sign / end tag open / end tag name
    // ========================================================================
    fn state_rcdata_less_than_sign(&mut self) {
        if self.input.peek() == Some('/') {
            self.input.next_char();
            self.temp_buffer.clear();
            self.state = State::RcDataEndTagOpen;
        } else {
            let pos = Position {
                offset: self.input.position().offset - 1,
                line: self.input.position().line,
                col: self.input.position().col - 1,
            };
            self.emit_char('<', pos);
            self.state = State::RcData;
        }
    }

    fn state_rcdata_end_tag_open(&mut self) {
        match self.input.peek() {
            Some(c) if c.is_ascii_alphabetic() => {
                let pos = self.input.position();
                self.create_end_tag(Position {
                    offset: pos.offset - 2,
                    line: pos.line,
                    col: pos.col - 2,
                });
                self.state = State::RcDataEndTagName;
            }
            _ => {
                let pos = Position {
                    offset: self.input.position().offset - 2,
                    line: self.input.position().line,
                    col: self.input.position().col - 2,
                };
                self.emit_char('<', pos);
                self.emit_char(
                    '/',
                    Position {
                        offset: pos.offset + 1,
                        line: pos.line,
                        col: pos.col + 1,
                    },
                );
                self.state = State::RcData;
            }
        }
    }

    fn state_rcdata_end_tag_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') if self.is_appropriate_end_tag() => {
                self.state = State::BeforeAttributeName;
            }
            Some('/') if self.is_appropriate_end_tag() => {
                self.state = State::SelfClosingStartTag;
            }
            Some('>') if self.is_appropriate_end_tag() => {
                self.state = State::Data;
                self.emit_current_tag();
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.current_tag_name.push(c.to_ascii_lowercase());
                self.temp_buffer.push(c);
            }
            _ => {
                // Not an appropriate end tag. Emit `</` + buffer as characters.
                let base_offset = self.current_tag_start.offset;
                let base_line = self.current_tag_start.line;
                let base_col = self.current_tag_start.col;
                self.emit_char(
                    '<',
                    Position {
                        offset: base_offset,
                        line: base_line,
                        col: base_col,
                    },
                );
                self.emit_char(
                    '/',
                    Position {
                        offset: base_offset + 1,
                        line: base_line,
                        col: base_col + 1,
                    },
                );
                self.emit_temp_buffer_as_chars(base_offset + 2, base_line, base_col + 2);
                // Only reconsume if we consumed an actual character (not EOF).
                self.input.reconsume();
                self.state = State::RcData;
            }
        }
    }

    // ========================================================================
    // §13.2.5.12–14 RAWTEXT less-than sign / end tag open / end tag name
    // ========================================================================
    fn state_rawtext_less_than_sign(&mut self) {
        if self.input.peek() == Some('/') {
            self.input.next_char();
            self.temp_buffer.clear();
            self.state = State::RawTextEndTagOpen;
        } else {
            let pos = Position {
                offset: self.input.position().offset - 1,
                line: self.input.position().line,
                col: self.input.position().col - 1,
            };
            self.emit_char('<', pos);
            self.state = State::RawText;
        }
    }

    fn state_rawtext_end_tag_open(&mut self) {
        match self.input.peek() {
            Some(c) if c.is_ascii_alphabetic() => {
                let pos = self.input.position();
                self.create_end_tag(Position {
                    offset: pos.offset - 2,
                    line: pos.line,
                    col: pos.col - 2,
                });
                self.state = State::RawTextEndTagName;
            }
            _ => {
                let pos = Position {
                    offset: self.input.position().offset - 2,
                    line: self.input.position().line,
                    col: self.input.position().col - 2,
                };
                self.emit_char('<', pos);
                self.emit_char(
                    '/',
                    Position {
                        offset: pos.offset + 1,
                        line: pos.line,
                        col: pos.col + 1,
                    },
                );
                self.state = State::RawText;
            }
        }
    }

    fn state_rawtext_end_tag_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') if self.is_appropriate_end_tag() => {
                self.state = State::BeforeAttributeName;
            }
            Some('/') if self.is_appropriate_end_tag() => {
                self.state = State::SelfClosingStartTag;
            }
            Some('>') if self.is_appropriate_end_tag() => {
                self.state = State::Data;
                self.emit_current_tag();
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.current_tag_name.push(c.to_ascii_lowercase());
                self.temp_buffer.push(c);
            }
            _ => {
                let base_offset = self.current_tag_start.offset;
                let base_line = self.current_tag_start.line;
                let base_col = self.current_tag_start.col;
                self.emit_char(
                    '<',
                    Position {
                        offset: base_offset,
                        line: base_line,
                        col: base_col,
                    },
                );
                self.emit_char(
                    '/',
                    Position {
                        offset: base_offset + 1,
                        line: base_line,
                        col: base_col + 1,
                    },
                );
                self.emit_temp_buffer_as_chars(base_offset + 2, base_line, base_col + 2);
                self.input.reconsume();
                self.state = State::RawText;
            }
        }
    }

    // ========================================================================
    // §13.2.5.15–31 Script data states
    // ========================================================================
    fn state_script_data_less_than_sign(&mut self) {
        match self.input.next_char() {
            Some('/') => {
                self.temp_buffer.clear();
                self.state = State::ScriptDataEndTagOpen;
            }
            Some('!') => {
                let lt_pos = Position {
                    offset: self.input.prev_position().offset - 1,
                    line: self.input.prev_position().line,
                    col: self.input.prev_position().col - 1,
                };
                self.emit_char('<', lt_pos);
                self.emit_char('!', self.input.prev_position());
                self.state = State::ScriptDataEscapeStart;
            }
            _ => {
                let lt_pos = Position {
                    offset: self.input.position().offset - 1,
                    line: self.input.position().line,
                    col: self.input.position().col - 1,
                };
                self.emit_char('<', lt_pos);
                self.input.reconsume();
                self.state = State::ScriptData;
            }
        }
    }

    fn state_script_data_end_tag_open(&mut self) {
        match self.input.peek() {
            Some(c) if c.is_ascii_alphabetic() => {
                let pos = self.input.position();
                self.create_end_tag(Position {
                    offset: pos.offset - 2,
                    line: pos.line,
                    col: pos.col - 2,
                });
                self.state = State::ScriptDataEndTagName;
            }
            _ => {
                let pos = Position {
                    offset: self.input.position().offset - 2,
                    line: self.input.position().line,
                    col: self.input.position().col - 2,
                };
                self.emit_char('<', pos);
                self.emit_char(
                    '/',
                    Position {
                        offset: pos.offset + 1,
                        line: pos.line,
                        col: pos.col + 1,
                    },
                );
                self.state = State::ScriptData;
            }
        }
    }

    fn state_script_data_end_tag_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') if self.is_appropriate_end_tag() => {
                self.state = State::BeforeAttributeName;
            }
            Some('/') if self.is_appropriate_end_tag() => {
                self.state = State::SelfClosingStartTag;
            }
            Some('>') if self.is_appropriate_end_tag() => {
                self.state = State::Data;
                self.emit_current_tag();
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.current_tag_name.push(c.to_ascii_lowercase());
                self.temp_buffer.push(c);
            }
            _ => {
                let base_offset = self.current_tag_start.offset;
                let base_line = self.current_tag_start.line;
                let base_col = self.current_tag_start.col;
                self.emit_char(
                    '<',
                    Position {
                        offset: base_offset,
                        line: base_line,
                        col: base_col,
                    },
                );
                self.emit_char(
                    '/',
                    Position {
                        offset: base_offset + 1,
                        line: base_line,
                        col: base_col + 1,
                    },
                );
                self.emit_temp_buffer_as_chars(base_offset + 2, base_line, base_col + 2);
                self.input.reconsume();
                self.state = State::ScriptData;
            }
        }
    }

    // Script data escape states (§13.2.5.18–31)
    fn state_script_data_escape_start(&mut self) {
        if self.input.peek() == Some('-') {
            self.input.next_char();
            self.emit_char('-', self.input.prev_position());
            self.state = State::ScriptDataEscapeStartDash;
        } else {
            self.state = State::ScriptData;
        }
    }

    fn state_script_data_escape_start_dash(&mut self) {
        if self.input.peek() == Some('-') {
            self.input.next_char();
            self.emit_char('-', self.input.prev_position());
            self.state = State::ScriptDataEscapedDashDash;
        } else {
            self.state = State::ScriptData;
        }
    }

    fn state_script_data_escaped(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.emit_char('-', self.input.prev_position());
                self.state = State::ScriptDataEscapedDash;
            }
            Some('<') => {
                self.state = State::ScriptDataEscapedLessThanSign;
            }
            Some('\0') => {
                self.emit_char('\u{FFFD}', self.input.prev_position());
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.emit_char(c, self.input.prev_position());
            }
        }
    }

    fn state_script_data_escaped_dash(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.emit_char('-', self.input.prev_position());
                self.state = State::ScriptDataEscapedDashDash;
            }
            Some('<') => {
                self.state = State::ScriptDataEscapedLessThanSign;
            }
            Some('\0') => {
                self.emit_char('\u{FFFD}', self.input.prev_position());
                self.state = State::ScriptDataEscaped;
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.emit_char(c, self.input.prev_position());
                self.state = State::ScriptDataEscaped;
            }
        }
    }

    fn state_script_data_escaped_dash_dash(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.emit_char('-', self.input.prev_position());
            }
            Some('<') => {
                self.state = State::ScriptDataEscapedLessThanSign;
            }
            Some('>') => {
                self.emit_char('>', self.input.prev_position());
                self.state = State::ScriptData;
            }
            Some('\0') => {
                self.emit_char('\u{FFFD}', self.input.prev_position());
                self.state = State::ScriptDataEscaped;
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.emit_char(c, self.input.prev_position());
                self.state = State::ScriptDataEscaped;
            }
        }
    }

    fn state_script_data_escaped_less_than_sign(&mut self) {
        match self.input.peek() {
            Some('/') => {
                self.input.next_char();
                self.temp_buffer.clear();
                self.state = State::ScriptDataEscapedEndTagOpen;
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.temp_buffer.clear();
                let lt_pos = Position {
                    offset: self.input.position().offset - 1,
                    line: self.input.position().line,
                    col: self.input.position().col - 1,
                };
                self.emit_char('<', lt_pos);
                self.state = State::ScriptDataDoubleEscapeStart;
            }
            _ => {
                let lt_pos = Position {
                    offset: self.input.position().offset - 1,
                    line: self.input.position().line,
                    col: self.input.position().col - 1,
                };
                self.emit_char('<', lt_pos);
                self.state = State::ScriptDataEscaped;
            }
        }
    }

    fn state_script_data_escaped_end_tag_open(&mut self) {
        match self.input.peek() {
            Some(c) if c.is_ascii_alphabetic() => {
                let pos = self.input.position();
                self.create_end_tag(Position {
                    offset: pos.offset - 2,
                    line: pos.line,
                    col: pos.col - 2,
                });
                self.state = State::ScriptDataEscapedEndTagName;
            }
            _ => {
                let pos = Position {
                    offset: self.input.position().offset - 2,
                    line: self.input.position().line,
                    col: self.input.position().col - 2,
                };
                self.emit_char('<', pos);
                self.emit_char(
                    '/',
                    Position {
                        offset: pos.offset + 1,
                        line: pos.line,
                        col: pos.col + 1,
                    },
                );
                self.state = State::ScriptDataEscaped;
            }
        }
    }

    fn state_script_data_escaped_end_tag_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') if self.is_appropriate_end_tag() => {
                self.state = State::BeforeAttributeName;
            }
            Some('/') if self.is_appropriate_end_tag() => {
                self.state = State::SelfClosingStartTag;
            }
            Some('>') if self.is_appropriate_end_tag() => {
                self.state = State::Data;
                self.emit_current_tag();
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.current_tag_name.push(c.to_ascii_lowercase());
                self.temp_buffer.push(c);
            }
            _ => {
                let base = self.current_tag_start;
                self.emit_char('<', base);
                self.emit_char(
                    '/',
                    Position {
                        offset: base.offset + 1,
                        line: base.line,
                        col: base.col + 1,
                    },
                );
                self.emit_temp_buffer_as_chars(base.offset + 2, base.line, base.col + 2);
                self.input.reconsume();
                self.state = State::ScriptDataEscaped;
            }
        }
    }

    fn state_script_data_double_escape_start(&mut self) {
        match self.input.next_char() {
            Some(c @ ('\t' | '\n' | '\x0C' | ' ' | '/' | '>')) => {
                self.emit_char(c, self.input.prev_position());
                if self.temp_buffer == "script" {
                    self.state = State::ScriptDataDoubleEscaped;
                } else {
                    self.state = State::ScriptDataEscaped;
                }
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.temp_buffer.push(c.to_ascii_lowercase());
                self.emit_char(c, self.input.prev_position());
            }
            _ => {
                self.input.reconsume();
                self.state = State::ScriptDataEscaped;
            }
        }
    }

    fn state_script_data_double_escaped(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.emit_char('-', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscapedDash;
            }
            Some('<') => {
                self.emit_char('<', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscapedLessThanSign;
            }
            Some('\0') => {
                self.emit_char('\u{FFFD}', self.input.prev_position());
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.emit_char(c, self.input.prev_position());
            }
        }
    }

    fn state_script_data_double_escaped_dash(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.emit_char('-', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscapedDashDash;
            }
            Some('<') => {
                self.emit_char('<', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscapedLessThanSign;
            }
            Some('\0') => {
                self.emit_char('\u{FFFD}', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscaped;
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.emit_char(c, self.input.prev_position());
                self.state = State::ScriptDataDoubleEscaped;
            }
        }
    }

    fn state_script_data_double_escaped_dash_dash(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.emit_char('-', self.input.prev_position());
            }
            Some('<') => {
                self.emit_char('<', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscapedLessThanSign;
            }
            Some('>') => {
                self.emit_char('>', self.input.prev_position());
                self.state = State::ScriptData;
            }
            Some('\0') => {
                self.emit_char('\u{FFFD}', self.input.prev_position());
                self.state = State::ScriptDataDoubleEscaped;
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.emit_char(c, self.input.prev_position());
                self.state = State::ScriptDataDoubleEscaped;
            }
        }
    }

    fn state_script_data_double_escaped_less_than_sign(&mut self) {
        if self.input.peek() == Some('/') {
            self.input.next_char();
            self.temp_buffer.clear();
            self.emit_char('/', self.input.prev_position());
            self.state = State::ScriptDataDoubleEscapeEnd;
        } else {
            self.state = State::ScriptDataDoubleEscaped;
        }
    }

    fn state_script_data_double_escape_end(&mut self) {
        match self.input.next_char() {
            Some(c @ ('\t' | '\n' | '\x0C' | ' ' | '/' | '>')) => {
                self.emit_char(c, self.input.prev_position());
                if self.temp_buffer == "script" {
                    self.state = State::ScriptDataEscaped;
                } else {
                    self.state = State::ScriptDataDoubleEscaped;
                }
            }
            Some(c) if c.is_ascii_alphabetic() => {
                self.temp_buffer.push(c.to_ascii_lowercase());
                self.emit_char(c, self.input.prev_position());
            }
            _ => {
                self.input.reconsume();
                self.state = State::ScriptDataDoubleEscaped;
            }
        }
    }

    // ========================================================================
    // §13.2.5.32 Before attribute name state
    // ========================================================================
    fn state_before_attribute_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                // Ignore whitespace.
            }
            Some('/' | '>') | None => {
                self.input.reconsume();
                self.state = State::AfterAttributeName;
            }
            Some('=') => {
                // Parse error. Start new attribute with '=' as first char of name.
                self.start_new_attribute();
                self.current_attr_name.push('=');
                self.state = State::AttributeName;
            }
            Some(_) => {
                self.start_new_attribute();
                self.input.reconsume();
                self.state = State::AttributeName;
            }
        }
    }

    // ========================================================================
    // §13.2.5.33 Attribute name state
    // ========================================================================
    fn state_attribute_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ' | '/' | '>') | None => {
                // Record attribute name end before reconsuming the delimiter.
                // prev_position() points to the delimiter char, which is the
                // first char after the attribute name.
                self.current_attr_name_end = self.input.prev_position();
                self.input.reconsume();
                self.state = State::AfterAttributeName;
            }
            Some('=') => {
                let eq_start = self.input.prev_position();
                self.current_attr_name_end = eq_start;
                self.current_attr_spaces_before_eq = Span::empty(eq_start);
                self.current_attr_equal = Some(Span::new(eq_start, self.input.position()));
                self.state = State::BeforeAttributeValue;
            }
            Some('\0') => {
                self.current_attr_name.push('\u{FFFD}');
            }
            Some(c @ ('"' | '\'' | '<')) => {
                // Parse error but treated as attribute name chars.
                self.current_attr_name.push(c);
            }
            Some(c) => {
                self.current_attr_name.push(c.to_ascii_lowercase());
            }
        }
    }

    // ========================================================================
    // §13.2.5.34 After attribute name state
    // ========================================================================
    fn state_after_attribute_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                // Ignore whitespace.
            }
            Some('/') => {
                self.finish_attribute();
                self.state = State::SelfClosingStartTag;
            }
            Some('=') => {
                let eq_start = self.input.prev_position();
                self.current_attr_spaces_before_eq = Span::empty(eq_start);
                self.current_attr_equal = Some(Span::new(eq_start, self.input.position()));
                self.state = State::BeforeAttributeValue;
            }
            Some('>') => {
                self.finish_attribute();
                self.state = State::Data;
                self.emit_current_tag();
            }
            None => {
                self.finish_attribute();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.finish_attribute();
                self.start_new_attribute();
                self.input.reconsume();
                self.state = State::AttributeName;
            }
        }
    }

    // ========================================================================
    // §13.2.5.35 Before attribute value state
    // ========================================================================
    fn state_before_attribute_value(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                // Ignore whitespace, but track for spaces_after_eq.
            }
            Some('"') => {
                self.current_attr_quote = Some('"');
                self.current_attr_spaces_after_eq = Span::empty(self.input.prev_position());
                self.current_attr_value_start = self.input.position();
                self.state = State::AttributeValueDoubleQuoted;
            }
            Some('\'') => {
                self.current_attr_quote = Some('\'');
                self.current_attr_spaces_after_eq = Span::empty(self.input.prev_position());
                self.current_attr_value_start = self.input.position();
                self.state = State::AttributeValueSingleQuoted;
            }
            Some('>') => {
                // Parse error. Missing attribute value.
                self.current_attr_spaces_after_eq = Span::empty(self.input.prev_position());
                self.current_attr_value_start = self.input.prev_position();
                self.finish_attribute();
                self.state = State::Data;
                self.emit_current_tag();
            }
            _ => {
                self.current_attr_quote = None;
                self.current_attr_spaces_after_eq = Span::empty(self.input.prev_position());
                self.current_attr_value_start = self.input.prev_position();
                self.input.reconsume();
                self.state = State::AttributeValueUnquoted;
            }
        }
    }

    // ========================================================================
    // §13.2.5.36 Attribute value (double-quoted) state
    // ========================================================================
    fn state_attribute_value_double_quoted(&mut self) {
        match self.input.next_char() {
            Some('"') => {
                self.finish_attribute();
                self.state = State::AfterAttributeValueQuoted;
            }
            Some('&') => {
                self.return_state = State::AttributeValueDoubleQuoted;
                self.state = State::CharacterReference;
            }
            Some('\0') => {
                self.current_attr_value.push('\u{FFFD}');
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_attr_value.push(c);
            }
        }
    }

    // ========================================================================
    // §13.2.5.37 Attribute value (single-quoted) state
    // ========================================================================
    fn state_attribute_value_single_quoted(&mut self) {
        match self.input.next_char() {
            Some('\'') => {
                self.finish_attribute();
                self.state = State::AfterAttributeValueQuoted;
            }
            Some('&') => {
                self.return_state = State::AttributeValueSingleQuoted;
                self.state = State::CharacterReference;
            }
            Some('\0') => {
                self.current_attr_value.push('\u{FFFD}');
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_attr_value.push(c);
            }
        }
    }

    // ========================================================================
    // §13.2.5.38 Attribute value (unquoted) state
    // ========================================================================
    fn state_attribute_value_unquoted(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.finish_attribute();
                self.state = State::BeforeAttributeName;
            }
            Some('&') => {
                self.return_state = State::AttributeValueUnquoted;
                self.state = State::CharacterReference;
            }
            Some('>') => {
                self.finish_attribute();
                self.state = State::Data;
                self.emit_current_tag();
            }
            Some('\0') => {
                self.current_attr_value.push('\u{FFFD}');
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_attr_value.push(c);
            }
        }
    }

    // ========================================================================
    // §13.2.5.39 After attribute value (quoted) state
    // ========================================================================
    fn state_after_attribute_value_quoted(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::BeforeAttributeName;
            }
            Some('/') => {
                self.state = State::SelfClosingStartTag;
            }
            Some('>') => {
                self.state = State::Data;
                self.emit_current_tag();
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Parse error. Reconsume in before attribute name.
                self.input.reconsume();
                self.state = State::BeforeAttributeName;
            }
        }
    }

    // ========================================================================
    // §13.2.5.40 Self-closing start tag state
    // ========================================================================
    fn state_self_closing_start_tag(&mut self) {
        match self.input.next_char() {
            Some('>') => {
                self.current_self_closing = true;
                self.state = State::Data;
                self.emit_current_tag();
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Parse error. Reconsume in before attribute name.
                self.input.reconsume();
                self.state = State::BeforeAttributeName;
            }
        }
    }

    // ========================================================================
    // §13.2.5.41 Bogus comment state
    // ========================================================================
    fn state_bogus_comment(&mut self) {
        match self.input.next_char() {
            Some('>') => {
                self.emit_current_comment();
                self.state = State::Data;
            }
            Some('\0') => {
                self.current_comment.push('\u{FFFD}');
            }
            None => {
                self.emit_current_comment();
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_comment.push(c);
            }
        }
    }

    // ========================================================================
    // §13.2.5.42 Markup declaration open state
    // ========================================================================
    fn state_markup_declaration_open(&mut self) {
        let pos = self.input.position();
        if self.input.starts_with("--") {
            self.input.advance(2);
            self.current_comment.clear();
            self.current_comment_start = Position {
                offset: pos.offset - 2,
                line: pos.line,
                col: pos.col - 2,
            };
            self.state = State::CommentStart;
        } else if self.input.starts_with_ci("DOCTYPE") {
            // Record the start of <! for accurate doctype span.
            self.current_doctype_start = Position {
                offset: pos.offset.saturating_sub(2),
                line: pos.line,
                col: pos.col.saturating_sub(2),
            };
            self.input.advance(7);
            self.state = State::Doctype;
        } else if self.input.starts_with("[CDATA[") {
            self.input.advance(7);
            if self.adjusted_current_node_is_foreign {
                // CDATA section in foreign content (SVG/MathML).
                self.state = State::CDataSection;
            } else {
                // For HTML, CDATA is a parse error. Treat as bogus comment.
                self.current_comment.clear();
                self.current_comment.push_str("[CDATA[");
                self.current_comment_start = Position {
                    offset: pos.offset - 2,
                    line: pos.line,
                    col: pos.col - 2,
                };
                self.state = State::BogusComment;
            }
        } else {
            // Parse error. Bogus comment.
            self.current_comment.clear();
            self.current_comment_start = Position {
                offset: pos.offset - 2,
                line: pos.line,
                col: pos.col - 2,
            };
            self.state = State::BogusComment;
        }
    }

    // ========================================================================
    // §13.2.5.43–52 Comment states
    // ========================================================================
    fn state_comment_start(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.state = State::CommentStartDash;
            }
            Some('>') => {
                // Parse error. Emit empty comment.
                self.emit_current_comment();
                self.state = State::Data;
            }
            _ => {
                self.input.reconsume();
                self.state = State::Comment;
            }
        }
    }

    fn state_comment_start_dash(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.state = State::CommentEnd;
            }
            Some('>') => {
                // Parse error.
                self.emit_current_comment();
                self.state = State::Data;
            }
            None => {
                self.emit_current_comment();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_comment.push('-');
                self.input.reconsume();
                self.state = State::Comment;
            }
        }
    }

    fn state_comment(&mut self) {
        match self.input.next_char() {
            Some('<') => {
                self.current_comment.push('<');
                self.state = State::CommentLessThanSign;
            }
            Some('-') => {
                self.state = State::CommentEndDash;
            }
            Some('\0') => {
                self.current_comment.push('\u{FFFD}');
            }
            None => {
                self.emit_current_comment();
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_comment.push(c);
            }
        }
    }

    fn state_comment_less_than_sign(&mut self) {
        match self.input.next_char() {
            Some('!') => {
                self.current_comment.push('!');
                self.state = State::CommentLessThanSignBang;
            }
            Some('<') => {
                self.current_comment.push('<');
            }
            _ => {
                self.input.reconsume();
                self.state = State::Comment;
            }
        }
    }

    fn state_comment_less_than_sign_bang(&mut self) {
        if let Some('-') = self.input.next_char() {
            self.state = State::CommentLessThanSignBangDash;
        } else {
            self.input.reconsume();
            self.state = State::Comment;
        }
    }

    fn state_comment_less_than_sign_bang_dash(&mut self) {
        if let Some('-') = self.input.next_char() {
            self.state = State::CommentLessThanSignBangDashDash;
        } else {
            self.input.reconsume();
            self.state = State::CommentEndDash;
        }
    }

    fn state_comment_less_than_sign_bang_dash_dash(&mut self) {
        match self.input.peek() {
            Some('>') | None => {
                self.state = State::CommentEnd;
            }
            _ => {
                // Parse error.
                self.state = State::CommentEnd;
            }
        }
    }

    fn state_comment_end_dash(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.state = State::CommentEnd;
            }
            None => {
                self.emit_current_comment();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_comment.push('-');
                self.input.reconsume();
                self.state = State::Comment;
            }
        }
    }

    fn state_comment_end(&mut self) {
        match self.input.next_char() {
            Some('>') => {
                self.emit_current_comment();
                self.state = State::Data;
            }
            Some('!') => {
                self.state = State::CommentEndBang;
            }
            Some('-') => {
                self.current_comment.push('-');
            }
            None => {
                self.emit_current_comment();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_comment.push('-');
                self.current_comment.push('-');
                self.input.reconsume();
                self.state = State::Comment;
            }
        }
    }

    fn state_comment_end_bang(&mut self) {
        match self.input.next_char() {
            Some('-') => {
                self.current_comment.push('-');
                self.current_comment.push('-');
                self.current_comment.push('!');
                self.state = State::CommentEndDash;
            }
            Some('>') => {
                self.emit_current_comment();
                self.state = State::Data;
            }
            None => {
                self.emit_current_comment();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_comment.push('-');
                self.current_comment.push('-');
                self.current_comment.push('!');
                self.input.reconsume();
                self.state = State::Comment;
            }
        }
    }

    // ========================================================================
    // §13.2.5.53–68 DOCTYPE states
    // ========================================================================
    fn state_doctype(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::BeforeDoctypeName;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.input.reconsume();
                self.state = State::BeforeDoctypeName;
            }
        }
    }

    fn state_before_doctype_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {}
            Some('\0') => {
                self.current_doctype_name = Some("\u{FFFD}".to_owned());
                self.state = State::DoctypeName;
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(c) => {
                self.current_doctype_name = Some(c.to_ascii_lowercase().to_string());
                self.state = State::DoctypeName;
            }
        }
    }

    fn state_doctype_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::AfterDoctypeName;
            }
            Some('>') => {
                self.emit_current_doctype();
                self.state = State::Data;
            }
            Some('\0') => {
                if let Some(ref mut name) = self.current_doctype_name {
                    name.push('\u{FFFD}');
                }
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(c) => {
                if let Some(ref mut name) = self.current_doctype_name {
                    name.push(c.to_ascii_lowercase());
                }
            }
        }
    }

    fn state_after_doctype_name(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                // Ignore.
            }
            Some('>') => {
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Check for PUBLIC or SYSTEM keywords.
                self.input.reconsume();
                if self.input.starts_with_ci("PUBLIC") {
                    self.input.advance(6);
                    self.state = State::AfterDoctypePublicKeyword;
                } else if self.input.starts_with_ci("SYSTEM") {
                    self.input.advance(6);
                    self.state = State::AfterDoctypeSystemKeyword;
                } else {
                    self.current_doctype_force_quirks = true;
                    self.input.next_char(); // consume the erroneous char
                    self.state = State::BogusDoctype;
                }
            }
        }
    }

    fn state_after_doctype_public_keyword(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::BeforeDoctypePublicIdentifier;
            }
            Some('"') => {
                self.current_doctype_public_id = Some(String::new());
                self.state = State::DoctypePublicIdentifierDoubleQuoted;
            }
            Some('\'') => {
                self.current_doctype_public_id = Some(String::new());
                self.state = State::DoctypePublicIdentifierSingleQuoted;
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_doctype_force_quirks = true;
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_before_doctype_public_identifier(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {}
            Some('"') => {
                self.current_doctype_public_id = Some(String::new());
                self.state = State::DoctypePublicIdentifierDoubleQuoted;
            }
            Some('\'') => {
                self.current_doctype_public_id = Some(String::new());
                self.state = State::DoctypePublicIdentifierSingleQuoted;
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_doctype_force_quirks = true;
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_doctype_public_identifier_double_quoted(&mut self) {
        match self.input.next_char() {
            Some('"') => {
                self.state = State::AfterDoctypePublicIdentifier;
            }
            Some('\0') => {
                if let Some(ref mut id) = self.current_doctype_public_id {
                    id.push('\u{FFFD}');
                }
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(c) => {
                if let Some(ref mut id) = self.current_doctype_public_id {
                    id.push(c);
                }
            }
        }
    }

    fn state_doctype_public_identifier_single_quoted(&mut self) {
        match self.input.next_char() {
            Some('\'') => {
                self.state = State::AfterDoctypePublicIdentifier;
            }
            Some('\0') => {
                if let Some(ref mut id) = self.current_doctype_public_id {
                    id.push('\u{FFFD}');
                }
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(c) => {
                if let Some(ref mut id) = self.current_doctype_public_id {
                    id.push(c);
                }
            }
        }
    }

    fn state_after_doctype_public_identifier(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::BetweenDoctypePublicAndSystemIdentifiers;
            }
            Some('>') => {
                self.emit_current_doctype();
                self.state = State::Data;
            }
            Some('"') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierDoubleQuoted;
            }
            Some('\'') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierSingleQuoted;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_doctype_force_quirks = true;
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_between_doctype_public_and_system_identifiers(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {}
            Some('>') => {
                self.emit_current_doctype();
                self.state = State::Data;
            }
            Some('"') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierDoubleQuoted;
            }
            Some('\'') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierSingleQuoted;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_doctype_force_quirks = true;
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_after_doctype_system_keyword(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {
                self.state = State::BeforeDoctypeSystemIdentifier;
            }
            Some('"') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierDoubleQuoted;
            }
            Some('\'') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierSingleQuoted;
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_doctype_force_quirks = true;
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_before_doctype_system_identifier(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {}
            Some('"') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierDoubleQuoted;
            }
            Some('\'') => {
                self.current_doctype_system_id = Some(String::new());
                self.state = State::DoctypeSystemIdentifierSingleQuoted;
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                self.current_doctype_force_quirks = true;
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_doctype_system_identifier_double_quoted(&mut self) {
        match self.input.next_char() {
            Some('"') => {
                self.state = State::AfterDoctypeSystemIdentifier;
            }
            Some('\0') => {
                if let Some(ref mut id) = self.current_doctype_system_id {
                    id.push('\u{FFFD}');
                }
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(c) => {
                if let Some(ref mut id) = self.current_doctype_system_id {
                    id.push(c);
                }
            }
        }
    }

    fn state_doctype_system_identifier_single_quoted(&mut self) {
        match self.input.next_char() {
            Some('\'') => {
                self.state = State::AfterDoctypeSystemIdentifier;
            }
            Some('\0') => {
                if let Some(ref mut id) = self.current_doctype_system_id {
                    id.push('\u{FFFD}');
                }
            }
            Some('>') => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(c) => {
                if let Some(ref mut id) = self.current_doctype_system_id {
                    id.push(c);
                }
            }
        }
    }

    fn state_after_doctype_system_identifier(&mut self) {
        match self.input.next_char() {
            Some('\t' | '\n' | '\x0C' | ' ') => {}
            Some('>') => {
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.current_doctype_force_quirks = true;
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Parse error. NOT force quirks.
                self.input.reconsume();
                self.state = State::BogusDoctype;
            }
        }
    }

    fn state_bogus_doctype(&mut self) {
        match self.input.next_char() {
            Some('>') => {
                self.emit_current_doctype();
                self.state = State::Data;
            }
            None => {
                self.emit_current_doctype();
                self.emit(Token::Eof);
            }
            Some(_) => {
                // Parse error for \0; ignore all other chars.
            }
        }
    }

    // ========================================================================
    // §13.2.5.69–71 CDATA section states
    // ========================================================================
    fn state_cdata_section(&mut self) {
        match self.input.next_char() {
            Some(']') => {
                self.state = State::CDataSectionBracket;
            }
            None => {
                self.emit(Token::Eof);
            }
            Some(c) => {
                let pos = self.input.prev_position();
                self.emit_char(c, pos);
            }
        }
    }

    fn state_cdata_section_bracket(&mut self) {
        if self.input.peek() == Some(']') {
            self.input.next_char();
            self.state = State::CDataSectionEnd;
        } else {
            self.emit_char(']', self.input.prev_position());
            self.state = State::CDataSection;
        }
    }

    fn state_cdata_section_end(&mut self) {
        match self.input.peek() {
            Some(']') => {
                self.input.next_char();
                self.emit_char(']', self.input.prev_position());
            }
            Some('>') => {
                self.input.next_char();
                self.state = State::Data;
            }
            _ => {
                self.emit_char(']', self.input.prev_position());
                self.emit_char(']', self.input.prev_position());
                self.state = State::CDataSection;
            }
        }
    }

    // ========================================================================
    // §13.2.5.72–80 Character reference states
    // ========================================================================
    fn state_character_reference(&mut self) {
        // Record the source position of '&' for Character token metadata.
        // prev_position() points to '&' which was consumed before entering this state.
        self.char_ref_start = self.input.prev_position();
        self.temp_buffer.clear();
        self.temp_buffer.push('&');

        match self.input.peek() {
            Some(c) if c.is_ascii_alphanumeric() => {
                self.state = State::NamedCharacterReference;
            }
            Some('#') => {
                self.temp_buffer.push('#');
                self.input.next_char();
                self.state = State::NumericCharacterReference;
            }
            _ => {
                self.flush_code_points_consumed_as_char_ref();
                self.state = self.return_state;
            }
        }
    }

    fn state_named_character_reference(&mut self) {
        // Per WHATWG §13.2.5.73: use the remaining input (starting from after '&')
        // to find the longest match in the entity table.
        //
        // Strategy: peek at the remaining source, find longest match, then
        // advance the input by exactly the matched length (minus the '&').
        let amp_offset = self.input.position().offset - 1; // '&' was already consumed
        let remaining = self.input.slice(amp_offset, self.input.source().len());

        if let Some((chars, match_len)) = char_ref::find_longest_match(remaining) {
            let matched_text = &remaining[..match_len];
            let ends_with_semicolon = matched_text.ends_with(';');

            // Advance input past the matched entity (minus the '&' already consumed).
            let chars_to_advance = match_len - 1; // subtract the '&'
            self.input.advance(chars_to_advance);

            // In attribute context: if no trailing ';' and next char is '=' or alnum,
            // treat as non-reference per spec.
            let next_is_eq_or_alnum = self.input.peek().is_some_and(|c| c == '=' || c.is_ascii_alphanumeric());
            if self.is_return_state_attribute() && !ends_with_semicolon && next_is_eq_or_alnum {
                // Don't consume as a reference. Put the matched text in temp_buffer.
                self.temp_buffer.clear();
                self.temp_buffer.push_str(matched_text);
                self.flush_code_points_consumed_as_char_ref();
                self.state = self.return_state;
                return;
            }

            // Replace temp_buffer with the resolved characters.
            self.temp_buffer.clear();
            for &ch in chars {
                self.temp_buffer.push(ch);
            }
            self.flush_code_points_consumed_as_char_ref();
        } else {
            // No match found. Consume alphanumeric chars into temp_buffer
            // (they were not consumed yet since we used peek/slice).
            loop {
                match self.input.peek() {
                    Some(c) if c.is_ascii_alphanumeric() => {
                        self.input.next_char();
                        self.temp_buffer.push(c);
                    }
                    Some(';') => {
                        self.input.next_char();
                        self.temp_buffer.push(';');
                        break;
                    }
                    _ => break,
                }
            }
            self.flush_code_points_consumed_as_char_ref();
        }
        self.state = self.return_state;
    }

    fn state_ambiguous_ampersand(&mut self) {
        match self.input.next_char() {
            Some(c) if c.is_ascii_alphanumeric() => {
                if self.is_return_state_attribute() {
                    self.current_attr_value.push(c);
                } else {
                    self.emit_char(c, self.input.prev_position());
                }
            }
            Some(';') => {
                // Parse error. Reconsume in return state.
                self.input.reconsume();
                self.state = self.return_state;
            }
            _ => {
                self.input.reconsume();
                self.state = self.return_state;
            }
        }
    }

    fn state_numeric_character_reference(&mut self) {
        self.char_ref_code = 0;
        match self.input.peek() {
            Some('x' | 'X') => {
                self.temp_buffer.push(self.input.peek().unwrap());
                self.input.next_char();
                self.state = State::HexadecimalCharacterReferenceStart;
            }
            _ => {
                self.state = State::DecimalCharacterReferenceStart;
            }
        }
    }

    fn state_hexadecimal_character_reference_start(&mut self) {
        match self.input.peek() {
            Some(c) if c.is_ascii_hexdigit() => {
                self.state = State::HexadecimalCharacterReference;
            }
            _ => {
                // Parse error.
                self.flush_code_points_consumed_as_char_ref();
                self.state = self.return_state;
            }
        }
    }

    fn state_decimal_character_reference_start(&mut self) {
        match self.input.peek() {
            Some(c) if c.is_ascii_digit() => {
                self.state = State::DecimalCharacterReference;
            }
            _ => {
                self.flush_code_points_consumed_as_char_ref();
                self.state = self.return_state;
            }
        }
    }

    fn state_hexadecimal_character_reference(&mut self) {
        match self.input.next_char() {
            Some(c) if c.is_ascii_hexdigit() => {
                // Use saturating arithmetic to cap at u32::MAX on overflow.
                // numeric_character_reference_end handles values > 0x10FFFF.
                self.char_ref_code = self
                    .char_ref_code
                    .saturating_mul(16)
                    .saturating_add(c.to_digit(16).unwrap());
            }
            Some(';') | None => {
                self.state = State::NumericCharacterReferenceEnd;
            }
            Some(_) => {
                // Parse error. Reconsume.
                self.input.reconsume();
                self.state = State::NumericCharacterReferenceEnd;
            }
        }
    }

    fn state_decimal_character_reference(&mut self) {
        match self.input.next_char() {
            Some(c) if c.is_ascii_digit() => {
                self.char_ref_code = self
                    .char_ref_code
                    .saturating_mul(10)
                    .saturating_add(c.to_digit(10).unwrap());
            }
            Some(';') | None => {
                self.state = State::NumericCharacterReferenceEnd;
            }
            Some(_) => {
                self.input.reconsume();
                self.state = State::NumericCharacterReferenceEnd;
            }
        }
    }

    fn state_numeric_character_reference_end(&mut self) {
        let ch = match self.char_ref_code {
            0x00 => '\u{FFFD}',
            c if c > 0x10_FFFF => '\u{FFFD}',
            c if (0xD800..=0xDFFF).contains(&c) => '\u{FFFD}',
            // Numeric character reference end: check the replacements table.
            0x80 => '\u{20AC}',
            0x82 => '\u{201A}',
            0x83 => '\u{0192}',
            0x84 => '\u{201E}',
            0x85 => '\u{2026}',
            0x86 => '\u{2020}',
            0x87 => '\u{2021}',
            0x88 => '\u{02C6}',
            0x89 => '\u{2030}',
            0x8A => '\u{0160}',
            0x8B => '\u{2039}',
            0x8C => '\u{0152}',
            0x8E => '\u{017D}',
            0x91 => '\u{2018}',
            0x92 => '\u{2019}',
            0x93 => '\u{201C}',
            0x94 => '\u{201D}',
            0x95 => '\u{2022}',
            0x96 => '\u{2013}',
            0x97 => '\u{2014}',
            0x98 => '\u{02DC}',
            0x99 => '\u{2122}',
            0x9A => '\u{0161}',
            0x9B => '\u{203A}',
            0x9C => '\u{0153}',
            0x9E => '\u{017E}',
            0x9F => '\u{0178}',
            // Noncharacters and control characters are parse errors but
            // are NOT replaced — emit the character as-is per WHATWG §13.2.5.80.
            c => char::from_u32(c).unwrap_or('\u{FFFD}'),
        };

        self.temp_buffer.clear();
        self.temp_buffer.push(ch);
        self.flush_code_points_consumed_as_char_ref();
        self.state = self.return_state;
    }

    fn flush_code_points_consumed_as_char_ref(&mut self) {
        let buf: Vec<char> = self.temp_buffer.chars().collect();
        if self.is_return_state_attribute() {
            for ch in buf {
                self.current_attr_value.push(ch);
            }
        } else {
            let pos = self.input.prev_position();
            let source_pos = self.char_ref_start;
            for ch in buf {
                self.emit_char_with_source_pos(ch, pos, source_pos);
            }
        }
    }

    fn is_return_state_attribute(&self) -> bool {
        matches!(
            self.return_state,
            State::AttributeValueDoubleQuoted | State::AttributeValueSingleQuoted | State::AttributeValueUnquoted
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tokenize(html: &str) -> Vec<Token> {
        let mut tokenizer = Tokenizer::new(html);
        let mut tokens = Vec::new();
        loop {
            let token = tokenizer.next_token();
            if token == Token::Eof {
                break;
            }
            tokens.push(token);
        }
        tokens
    }

    fn collect_tag_names(tokens: &[Token]) -> Vec<(&str, bool)> {
        tokens
            .iter()
            .filter_map(|t| match t {
                Token::StartTag { tag_name, .. } => Some((tag_name.as_str(), false)),
                Token::EndTag { tag_name, .. } => Some((tag_name.as_str(), true)),
                _ => None,
            })
            .collect()
    }

    fn collect_text(tokens: &[Token]) -> String {
        tokens
            .iter()
            .filter_map(|t| match t {
                Token::Character { ch, .. } => Some(*ch),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn simple_start_tag() {
        let tokens = tokenize("<div>");
        assert_eq!(collect_tag_names(&tokens), vec![("div", false)]);
    }

    #[test]
    fn simple_end_tag() {
        let tokens = tokenize("</div>");
        assert_eq!(collect_tag_names(&tokens), vec![("div", true)]);
    }

    #[test]
    fn self_closing_tag() {
        let tokens = tokenize("<br />");
        assert_eq!(tokens.len(), 1);
        match &tokens[0] {
            Token::StartTag {
                tag_name, self_closing, ..
            } => {
                assert_eq!(tag_name, "br");
                assert!(self_closing);
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn tag_with_attributes() {
        let tokens = tokenize(r#"<div class="foo" id='bar'>"#);
        assert_eq!(tokens.len(), 1);
        match &tokens[0] {
            Token::StartTag { attributes, .. } => {
                assert_eq!(attributes.len(), 2);
                assert_eq!(attributes[0].raw_name, "class");
                assert_eq!(attributes[0].raw_value, "foo");
                assert_eq!(attributes[1].raw_name, "id");
                assert_eq!(attributes[1].raw_value, "bar");
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn boolean_attribute() {
        let tokens = tokenize("<input disabled>");
        match &tokens[0] {
            Token::StartTag { attributes, .. } => {
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].raw_name, "disabled");
                assert_eq!(attributes[0].raw_value, "");
                assert!(attributes[0].equal.is_none());
                // name span must NOT include the trailing ">"
                let name_raw = &"<input disabled>"[attributes[0].name.start.offset..attributes[0].name.end.offset];
                assert_eq!(name_raw, "disabled", "name span includes trailing '>'");
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn boolean_attribute_name_span_multiple() {
        // Multiple boolean attributes: each name span must be exact
        let html = "<audio controls autoplay>";
        let tokens = tokenize(html);
        match &tokens[0] {
            Token::StartTag { attributes, .. } => {
                assert_eq!(attributes.len(), 2);
                let name0 = &html[attributes[0].name.start.offset..attributes[0].name.end.offset];
                let name1 = &html[attributes[1].name.start.offset..attributes[1].name.end.offset];
                assert_eq!(name0, "controls");
                assert_eq!(name1, "autoplay");
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn boolean_attribute_before_value_attribute() {
        // Boolean attribute followed by a value attribute
        let html = r#"<audio controls src="test.mp3">"#;
        let tokens = tokenize(html);
        match &tokens[0] {
            Token::StartTag { attributes, .. } => {
                assert_eq!(attributes.len(), 2);
                let name0 = &html[attributes[0].name.start.offset..attributes[0].name.end.offset];
                assert_eq!(name0, "controls");
                assert_eq!(attributes[0].raw_name, "controls");
                assert_eq!(attributes[1].raw_name, "src");
                assert_eq!(attributes[1].raw_value, "test.mp3");
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn boolean_attribute_self_closing() {
        let html = "<input disabled />";
        let tokens = tokenize(html);
        match &tokens[0] {
            Token::StartTag {
                attributes,
                self_closing,
                ..
            } => {
                assert!(*self_closing);
                let name = &html[attributes[0].name.start.offset..attributes[0].name.end.offset];
                assert_eq!(name, "disabled");
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn text_content() {
        let tokens = tokenize("hello");
        assert_eq!(collect_text(&tokens), "hello");
    }

    #[test]
    fn element_with_text() {
        let tokens = tokenize("<p>hello</p>");
        assert_eq!(collect_tag_names(&tokens), vec![("p", false), ("p", true)]);
        let text: String = tokens
            .iter()
            .filter_map(|t| match t {
                Token::Character { ch, .. } => Some(*ch),
                _ => None,
            })
            .collect();
        assert_eq!(text, "hello");
    }

    #[test]
    fn comment() {
        let tokens = tokenize("<!-- hello -->");
        assert_eq!(tokens.len(), 1);
        match &tokens[0] {
            Token::Comment { data, .. } => {
                assert_eq!(data, " hello ");
            }
            _ => panic!("expected Comment"),
        }
    }

    #[test]
    fn doctype() {
        let tokens = tokenize("<!DOCTYPE html>");
        assert_eq!(tokens.len(), 1);
        match &tokens[0] {
            Token::Doctype { name, force_quirks, .. } => {
                assert_eq!(name.as_deref(), Some("html"));
                assert!(!force_quirks);
            }
            _ => panic!("expected Doctype"),
        }
    }

    #[test]
    fn uppercase_tag_lowercased() {
        let tokens = tokenize("<DIV>");
        assert_eq!(collect_tag_names(&tokens), vec![("div", false)]);
    }

    #[test]
    fn character_positions() {
        let tokens = tokenize("ab");
        assert_eq!(tokens.len(), 2);
        match &tokens[0] {
            Token::Character {
                ch, offset, line, col, ..
            } => {
                assert_eq!(*ch, 'a');
                assert_eq!(*offset, 0);
                assert_eq!(*line, 1);
                assert_eq!(*col, 1);
            }
            _ => panic!("expected Character"),
        }
        match &tokens[1] {
            Token::Character {
                ch, offset, line, col, ..
            } => {
                assert_eq!(*ch, 'b');
                assert_eq!(*offset, 1);
                assert_eq!(*line, 1);
                assert_eq!(*col, 2);
            }
            _ => panic!("expected Character"),
        }
    }

    #[test]
    fn tag_span() {
        let tokens = tokenize("<div>");
        match &tokens[0] {
            Token::StartTag { span, .. } => {
                assert_eq!(span.start.offset, 0);
                assert_eq!(span.end.offset, 5);
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn unquoted_attribute() {
        let tokens = tokenize("<div class=foo>");
        match &tokens[0] {
            Token::StartTag { attributes, .. } => {
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].raw_name, "class");
                assert_eq!(attributes[0].raw_value, "foo");
                assert!(attributes[0].quote_start.is_none());
            }
            _ => panic!("expected StartTag"),
        }
    }

    #[test]
    fn rawtext_style() {
        let mut tokenizer = Tokenizer::new("<style>a { color: red }</style>");
        // First get the start tag.
        let start = tokenizer.next_token();
        assert!(matches!(start, Token::StartTag { .. }));
        // Switch to RAWTEXT as tree builder would.
        tokenizer.set_state(State::RawText);
        // Collect remaining.
        let mut chars = String::new();
        loop {
            let tok = tokenizer.next_token();
            match tok {
                Token::Character { ch, .. } => chars.push(ch),
                Token::EndTag { tag_name, .. } => {
                    assert_eq!(tag_name, "style");
                    break;
                }
                Token::Eof => break,
                _ => {}
            }
        }
        assert_eq!(chars, "a { color: red }");
    }
}
