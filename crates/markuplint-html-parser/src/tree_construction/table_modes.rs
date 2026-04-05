//! Table-related insertion modes per WHATWG §13.2.6.4.9–16.
//!
//! Implements `InTable`, `InTableText`, `InCaption`, `InColumnGroup`,
//! `InTableBody`, `InRow`, `InCell`.

use crate::input::Position;
use crate::tokenizer::token::Token;

use super::TreeBuilder;
use super::insertion_mode::InsertionMode;

impl TreeBuilder<'_> {
    // ========================================================================
    // §13.2.6.4.9 In table
    // ========================================================================
    #[allow(clippy::too_many_lines)]
    pub(super) fn process_in_table(&mut self, token: Token) {
        match &token {
            Token::Character { .. }
                if self.current_node().is_some_and(|id| {
                    let n = self.arena.get(id);
                    n.namespace() == Some(crate::tree::node::Namespace::Html)
                        && matches!(n.tag_name(), Some("table" | "tbody" | "tfoot" | "thead" | "tr"))
                }) =>
            {
                // WHATWG §13.2.6.4.9: current node is table/tbody/tfoot/thead/tr →
                // switch to InTableText.
                self.pending_table_chars.clear();
                // Save the actual current mode (may be InRow, InTableBody, etc.)
                // not always InTable — delegating modes call process_in_table
                // without changing self.mode.
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::InTableText;
                self.process_token(token);
            }
            Token::Character { .. } => {
                // Current node is NOT a table element (e.g., foreign content).
                // Foster parent via InBody.
                self.foster_parenting = true;
                self.process_in_body(token);
                self.foster_parenting = false;
            }
            Token::Comment { data, span } => {
                self.insert_comment(data, *span);
            }
            Token::Doctype { .. } => {}
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } => match tag_name.as_str() {
                "caption" => {
                    self.clear_stack_to_table_context();
                    self.active_formatting.push_marker();
                    self.insert_html_element(tag_name, attributes, *span);
                    self.mode = InsertionMode::InCaption;
                }
                "colgroup" => {
                    self.clear_stack_to_table_context();
                    self.insert_html_element(tag_name, attributes, *span);
                    self.mode = InsertionMode::InColumnGroup;
                }
                "col" => {
                    self.clear_stack_to_table_context();
                    self.insert_implicit_element("colgroup", span.start);
                    self.mode = InsertionMode::InColumnGroup;
                    self.process_token(token);
                }
                "tbody" | "tfoot" | "thead" => {
                    self.clear_stack_to_table_context();
                    self.insert_html_element(tag_name, attributes, *span);
                    self.mode = InsertionMode::InTableBody;
                }
                "td" | "th" | "tr" => {
                    self.clear_stack_to_table_context();
                    self.insert_implicit_element("tbody", span.start);
                    self.mode = InsertionMode::InTableBody;
                    self.process_token(token);
                }
                "table" => {
                    // Parse error. Close current table if in scope and reprocess.
                    if self.has_element_in_table_scope("table") {
                        self.pop_until("table");
                        self.reset_insertion_mode();
                        self.process_token(token);
                    }
                }
                "style" | "script" | "template" => {
                    self.process_in_head(token);
                }
                "input" => {
                    // Only type=hidden is inserted directly; others foster parent.
                    let is_hidden = attributes
                        .iter()
                        .any(|a| a.raw_name.eq_ignore_ascii_case("type") && a.raw_value.eq_ignore_ascii_case("hidden"));
                    if is_hidden {
                        self.insert_html_element(tag_name, attributes, *span);
                        self.open_elements.pop();
                    } else {
                        self.foster_parenting = true;
                        self.process_in_body(token);
                        self.foster_parenting = false;
                    }
                }
                "form" => {
                    if self.form_element.is_some() || self.has_element_in_scope("template") {
                        return;
                    }
                    let form_id = self.insert_html_element(tag_name, attributes, *span);
                    self.form_element = Some(form_id);
                    self.open_elements.pop();
                }
                _ => {
                    // Parse error. Foster parenting via InBody.
                    self.foster_parenting = true;
                    self.process_in_body(token);
                    self.foster_parenting = false;
                }
            },
            Token::EndTag { tag_name, span, .. } => match tag_name.as_str() {
                "table" => {
                    if !self.has_element_in_table_scope("table") {
                        return;
                    }
                    self.set_end_tag_span("table", *span);
                    self.pop_until("table");
                    self.reset_insertion_mode();
                }
                "body" | "caption" | "col" | "colgroup" | "html" | "tbody" | "td" | "tfoot" | "th" | "thead" | "tr" => {
                    // Parse error. Ignore.
                }
                "template" => {
                    self.process_in_head(token);
                }
                _ => {
                    self.foster_parenting = true;
                    self.process_in_body(token);
                    self.foster_parenting = false;
                }
            },
            Token::Eof => {
                self.process_in_body(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.10 In table text
    // ========================================================================
    pub(super) fn process_in_table_text(&mut self, token: Token) {
        if let Token::Character {
            ch, offset, line, col, ..
        } = &token
        {
            if *ch == '\0' {
                // Parse error. Ignore.
            } else {
                self.pending_table_chars.push((
                    *ch,
                    Position {
                        offset: *offset,
                        line: *line,
                        col: *col,
                    },
                ));
            }
        } else {
            // Flush pending table characters.
            let has_non_space = self.pending_table_chars.iter().any(|(ch, _)| !ch.is_ascii_whitespace());
            let chars: Vec<(char, Position)> = std::mem::take(&mut self.pending_table_chars);
            if has_non_space {
                // Parse error. Process each through InBody with foster parenting.
                // Per WHATWG: "process the token using the rules for the
                // 'in body' insertion mode" with foster parenting enabled.
                for (ch, pos) in chars {
                    let char_token = Token::Character {
                        ch,
                        offset: pos.offset,
                        line: pos.line,
                        col: pos.col,
                        source_offset: pos.offset,
                        source_line: pos.line,
                        source_col: pos.col,
                    };
                    self.foster_parenting = true;
                    self.process_in_body(char_token);
                    self.foster_parenting = false;
                }
            } else {
                // Whitespace-only: insert normally into the table.
                for (ch, pos) in chars {
                    self.insert_character(ch, pos);
                }
            }
            self.mode = self.original_mode.take().unwrap_or(InsertionMode::InTable);
            self.process_token(token);
        }
    }

    // ========================================================================
    // §13.2.6.4.11 In caption
    // ========================================================================
    pub(super) fn process_in_caption(&mut self, token: Token) {
        match &token {
            Token::EndTag { tag_name, span, .. } if tag_name == "caption" => {
                if !self.has_element_in_table_scope("caption") {
                    return;
                }
                self.generate_implied_end_tags(None);
                self.set_end_tag_span("caption", *span);
                self.pop_until("caption");
                self.active_formatting.clear_up_to_last_marker();
                self.mode = InsertionMode::InTable;
            }
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "caption" | "col" | "colgroup" | "tbody" | "td" | "tfoot" | "th" | "thead" | "tr"
                ) =>
            {
                if !self.has_element_in_table_scope("caption") {
                    return;
                }
                self.generate_implied_end_tags(None);
                self.pop_until("caption");
                self.active_formatting.clear_up_to_last_marker();
                self.mode = InsertionMode::InTable;
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. } if tag_name == "table" => {
                if !self.has_element_in_table_scope("caption") {
                    return;
                }
                self.generate_implied_end_tags(None);
                self.pop_until("caption");
                self.active_formatting.clear_up_to_last_marker();
                self.mode = InsertionMode::InTable;
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "body" | "col" | "colgroup" | "html" | "tbody" | "td" | "tfoot" | "th" | "thead" | "tr"
                ) =>
            {
                // Parse error. Ignore.
            }
            _ => {
                self.process_in_body(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.12 In column group
    // ========================================================================
    pub(super) fn process_in_column_group(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.insert_character(*ch, Self::token_position(&token));
            }
            Token::Comment { data, span } => {
                self.insert_comment(data, *span);
            }
            Token::Doctype { .. } => {}
            Token::StartTag { tag_name, .. } if tag_name == "html" => {
                self.process_in_body(token);
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "col" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.open_elements.pop();
            }
            Token::StartTag { tag_name, .. } if tag_name == "template" => {
                self.process_in_head(token);
            }
            Token::EndTag { tag_name, .. } if tag_name == "template" => {
                self.process_in_head(token);
            }
            Token::EndTag { tag_name, .. } if tag_name == "colgroup" => {
                if self.current_node_is("colgroup") {
                    self.open_elements.pop();
                    self.mode = InsertionMode::InTable;
                }
            }
            Token::EndTag { tag_name, .. } if tag_name == "col" => {
                // Parse error. Ignore.
            }
            Token::Eof => {
                // WHATWG §13.2.6.4.13: EOF → process using InBody rules.
                self.process_in_body(token);
            }
            _ => {
                if self.current_node_is("colgroup") {
                    self.open_elements.pop();
                    self.mode = InsertionMode::InTable;
                    self.process_token(token);
                }
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.13 In table body
    // ========================================================================
    pub(super) fn process_in_table_body(&mut self, token: Token) {
        match &token {
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "tr" => {
                self.clear_stack_to_table_body_context();
                self.insert_html_element(tag_name, attributes, *span);
                self.mode = InsertionMode::InRow;
            }
            Token::StartTag { tag_name, .. } if matches!(tag_name.as_str(), "th" | "td") => {
                // Parse error. Implicit <tr>.
                self.clear_stack_to_table_body_context();
                let pos = Self::token_position(&token);
                self.insert_implicit_element("tr", pos);
                self.mode = InsertionMode::InRow;
                self.process_token(token);
            }
            Token::EndTag { tag_name, span, .. } if matches!(tag_name.as_str(), "tbody" | "tfoot" | "thead") => {
                if !self.has_element_in_table_scope(tag_name) {
                    return;
                }
                self.clear_stack_to_table_body_context();
                self.set_end_tag_span(tag_name, *span);
                self.open_elements.pop();
                self.mode = InsertionMode::InTable;
            }
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "caption" | "col" | "colgroup" | "tbody" | "tfoot" | "thead"
                ) =>
            {
                if !self.has_element_in_table_scope("tbody")
                    && !self.has_element_in_table_scope("thead")
                    && !self.has_element_in_table_scope("tfoot")
                {
                    return;
                }
                self.clear_stack_to_table_body_context();
                self.open_elements.pop();
                self.mode = InsertionMode::InTable;
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. } if tag_name == "table" => {
                if !self.has_element_in_table_scope("tbody")
                    && !self.has_element_in_table_scope("thead")
                    && !self.has_element_in_table_scope("tfoot")
                {
                    return;
                }
                self.clear_stack_to_table_body_context();
                self.open_elements.pop();
                self.mode = InsertionMode::InTable;
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "body" | "caption" | "col" | "colgroup" | "html" | "td" | "th" | "tr"
                ) =>
            {
                // Parse error. Ignore.
            }
            _ => {
                self.process_in_table(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.14 In row
    // ========================================================================
    pub(super) fn process_in_row(&mut self, token: Token) {
        match &token {
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if matches!(tag_name.as_str(), "th" | "td") => {
                self.clear_stack_to_table_row_context();
                self.insert_html_element(tag_name, attributes, *span);
                self.mode = InsertionMode::InCell;
                self.active_formatting.push_marker();
            }
            Token::EndTag { tag_name, span, .. } if tag_name == "tr" => {
                if !self.has_element_in_table_scope("tr") {
                    return;
                }
                self.clear_stack_to_table_row_context();
                self.set_end_tag_span("tr", *span);
                self.open_elements.pop();
                self.mode = InsertionMode::InTableBody;
            }
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "caption" | "col" | "colgroup" | "tbody" | "tfoot" | "thead" | "tr"
                ) =>
            {
                if !self.has_element_in_table_scope("tr") {
                    return;
                }
                self.clear_stack_to_table_row_context();
                self.open_elements.pop();
                self.mode = InsertionMode::InTableBody;
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. } if tag_name == "table" => {
                if !self.has_element_in_table_scope("tr") {
                    return;
                }
                self.clear_stack_to_table_row_context();
                self.open_elements.pop();
                self.mode = InsertionMode::InTableBody;
                self.process_token(token);
            }
            Token::EndTag { tag_name, span, .. } if matches!(tag_name.as_str(), "tbody" | "tfoot" | "thead") => {
                if !self.has_element_in_table_scope(tag_name) {
                    return;
                }
                if !self.has_element_in_table_scope("tr") {
                    return;
                }
                self.clear_stack_to_table_row_context();
                self.set_end_tag_span("tr", *span);
                self.open_elements.pop();
                self.mode = InsertionMode::InTableBody;
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "body" | "caption" | "col" | "colgroup" | "html" | "td" | "th"
                ) =>
            {
                // Parse error. Ignore.
            }
            _ => {
                self.process_in_table(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.15 In cell
    // ========================================================================
    pub(super) fn process_in_cell(&mut self, token: Token) {
        match &token {
            Token::EndTag { tag_name, span, .. } if matches!(tag_name.as_str(), "td" | "th") => {
                if !self.has_element_in_table_scope(tag_name) {
                    return;
                }
                self.generate_implied_end_tags(None);
                self.set_end_tag_span(tag_name, *span);
                self.pop_until(tag_name);
                self.active_formatting.clear_up_to_last_marker();
                self.mode = InsertionMode::InRow;
            }
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "caption" | "col" | "colgroup" | "tbody" | "td" | "tfoot" | "th" | "thead" | "tr"
                ) =>
            {
                if !self.has_element_in_table_scope("td") && !self.has_element_in_table_scope("th") {
                    return;
                }
                self.close_cell();
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. }
                if matches!(tag_name.as_str(), "body" | "caption" | "col" | "colgroup" | "html") =>
            {
                // Parse error. Ignore.
            }
            Token::EndTag { tag_name, .. }
                if matches!(tag_name.as_str(), "table" | "tbody" | "tfoot" | "thead" | "tr") =>
            {
                if !self.has_element_in_table_scope(tag_name) {
                    return;
                }
                self.close_cell();
                self.process_token(token);
            }
            _ => {
                self.process_in_body(token);
            }
        }
    }

    // ========================================================================
    // Helper: clear stack to table context
    // ========================================================================
    pub(super) fn clear_stack_to_table_context(&mut self) {
        loop {
            if let Some(id) = self.current_node() {
                let node = self.arena.get(id);
                if let Some(name) = node.tag_name()
                    && matches!(name, "table" | "template" | "html")
                {
                    return;
                }
                self.open_elements.pop();
            } else {
                return;
            }
        }
    }

    pub(super) fn clear_stack_to_table_body_context(&mut self) {
        loop {
            if let Some(id) = self.current_node() {
                let node = self.arena.get(id);
                if let Some(name) = node.tag_name()
                    && matches!(name, "tbody" | "tfoot" | "thead" | "template" | "html")
                {
                    return;
                }
                self.open_elements.pop();
            } else {
                return;
            }
        }
    }

    pub(super) fn clear_stack_to_table_row_context(&mut self) {
        loop {
            if let Some(id) = self.current_node() {
                let node = self.arena.get(id);
                if let Some(name) = node.tag_name()
                    && matches!(name, "tr" | "template" | "html")
                {
                    return;
                }
                self.open_elements.pop();
            } else {
                return;
            }
        }
    }

    fn close_cell(&mut self) {
        self.generate_implied_end_tags(None);
        // Pop until td or th.
        while let Some(id) = self.open_elements.pop() {
            let node = self.arena.get(id);
            if node.is_html_element("td") || node.is_html_element("th") {
                break;
            }
        }
        self.active_formatting.clear_up_to_last_marker();
        self.mode = InsertionMode::InRow;
    }
}
