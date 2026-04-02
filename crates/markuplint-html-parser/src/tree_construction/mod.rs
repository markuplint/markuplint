//! HTML tree construction algorithm per WHATWG §13.2.6.
//!
//! The `TreeBuilder` consumes tokens from the tokenizer and builds
//! an arena-based tree. It implements the full insertion mode state
//! machine including implicit element creation, foster parenting,
//! and the adoption agency algorithm.

pub mod active_formatting;
pub mod adoption_agency;
pub mod foreign_content;
pub mod insertion_mode;
pub mod open_elements;
pub mod table_modes;

use crate::input::{Position, Span};
use crate::tables;
use crate::tokenizer::Tokenizer;
use crate::tokenizer::state::State as TokenizerState;
use crate::tokenizer::token::{RawAttribute, Token};
use crate::tree::Arena;
use crate::tree::node::{Attribute, Namespace, NodeId, NodeKind};
use active_formatting::{ActiveFormattingElements, FormatEntry};
use insertion_mode::InsertionMode;

/// WHATWG §13.2.4.2: Scope barrier elements for "has an element in scope".
/// These are NOT all special elements — only specific ones.
fn is_scope_barrier(name: &str, ns: Option<Namespace>) -> bool {
    match ns {
        Some(Namespace::Html) => matches!(
            name,
            "applet" | "caption" | "html" | "table" | "td" | "th" | "marquee" | "object" | "template"
        ),
        Some(Namespace::MathML) => matches!(name, "mi" | "mo" | "mn" | "ms" | "mtext" | "annotation-xml"),
        Some(Namespace::Svg) => matches!(name, "foreignObject" | "desc" | "title"),
        None => false,
    }
}
use open_elements::OpenElementsStack;

/// The tree builder: consumes tokens and builds a DOM tree.
#[allow(clippy::struct_excessive_bools)]
pub struct TreeBuilder<'a> {
    tokenizer: Tokenizer<'a>,
    pub arena: Arena,
    mode: InsertionMode,
    original_mode: Option<InsertionMode>,
    open_elements: OpenElementsStack,
    active_formatting: ActiveFormattingElements,
    head_element: Option<NodeId>,
    form_element: Option<NodeId>,
    frameset_ok: bool,
    #[allow(dead_code)]
    foster_parenting: bool,
    is_fragment: bool,
    /// Whether scripting is enabled (affects noscript parsing).
    pub scripting_enabled: bool,
    #[allow(dead_code)]
    pending_table_chars: Vec<(char, Position)>,
    template_insertion_modes: Vec<InsertionMode>,
    /// Guard against infinite reprocessing of the same token.
    reprocess_depth: u32,
    /// Skip next newline character (after `<pre>`, `<listing>`, `<textarea>`).
    skip_next_newline: bool,
    /// Whether the document is in quirks mode (affects p/table nesting).
    quirks_mode: bool,
    /// The fragment context tag name (for distinguishing "html" from "head" etc.).
    fragment_context: Option<String>,
    /// Tracked `<selectedcontent>` element for customizable `<select>`.
    selectedcontent_element: Option<NodeId>,
}

impl<'a> TreeBuilder<'a> {
    /// Create a tree builder for document mode.
    #[must_use]
    pub fn new(source: &'a str, is_fragment: bool) -> Self {
        Self::with_context(source, is_fragment, None, Namespace::Html)
    }

    /// Create a tree builder with an optional context element for
    /// fragment parsing per WHATWG §13.2.6.5.
    ///
    /// `context` is the tag name of the context element (e.g. "body",
    /// "table", "select"). `context_ns` is the namespace.
    /// If `None` and `is_fragment` is true, defaults to "body" in HTML.
    #[must_use]
    pub fn with_context(source: &'a str, is_fragment: bool, context: Option<&str>, context_ns: Namespace) -> Self {
        let mut builder = Self {
            tokenizer: Tokenizer::new(source),
            arena: Arena::new(),
            mode: InsertionMode::Initial,
            original_mode: None,
            open_elements: OpenElementsStack::new(),
            active_formatting: ActiveFormattingElements::new(),
            head_element: None,
            form_element: None,
            frameset_ok: true,
            foster_parenting: false,
            is_fragment,
            scripting_enabled: false,
            pending_table_chars: Vec::new(),
            template_insertion_modes: Vec::new(),
            reprocess_depth: 0,
            skip_next_newline: false,
            quirks_mode: false,
            fragment_context: None,
            selectedcontent_element: None,
        };
        if is_fragment {
            let ctx = context.unwrap_or("body");
            builder.fragment_context = Some(ctx.to_owned());
            builder.setup_fragment_parsing(ctx, context_ns);
        }
        builder
    }

    /// Run the tree construction algorithm to completion.
    pub fn run(&mut self) {
        let mut token_count = 0;
        let max_tokens = 1_000_000; // safety limit
        loop {
            // Update tokenizer's foreign context flag before each token.
            self.tokenizer.adjusted_current_node_is_foreign = self.should_process_as_foreign();
            let token = self.tokenizer.next_token();
            let is_eof = token == Token::Eof;

            // Skip leading newline after <pre>, <listing>, <textarea>.
            if self.skip_next_newline {
                self.skip_next_newline = false;
                if let Token::Character { ch: '\n', .. } = &token {
                    token_count += 1;
                    if is_eof || token_count >= max_tokens {
                        break;
                    }
                    continue;
                }
            }

            self.reprocess_depth = 0;
            self.process_token(token);
            token_count += 1;
            if is_eof || token_count >= max_tokens {
                break;
            }
        }
    }

    /// WHATWG §13.2.6.4: Fragment parsing algorithm.
    fn setup_fragment_parsing(&mut self, context_tag: &str, context_ns: Namespace) {
        // For SVG/MathML fragment context, create a ghost context element
        // so that should_process_as_foreign_for_token sees the correct
        // namespace on the adjusted current node.
        if context_ns != Namespace::Html {
            let pos = Position {
                offset: 0,
                line: 1,
                col: 1,
            };
            let ghost_id = self.arena.create_element(
                context_tag.to_owned(),
                context_ns,
                Vec::new(),
                false,
                Span::empty(pos),
                true, // is_implicit (ghost)
            );
            self.arena.append_child(self.arena.document_id(), ghost_id);
            self.open_elements.push(ghost_id);
            self.mode = InsertionMode::InBody;
            return;
        }

        // Push the document root onto the open elements stack.
        self.open_elements.push(self.arena.document_id());

        // Set the tokenizer state based on the context element.
        match context_tag {
            "title" | "textarea" => {
                self.tokenizer.set_state(TokenizerState::RcData);
            }
            "style" | "xmp" | "iframe" | "noembed" | "noframes" => {
                self.tokenizer.set_state(TokenizerState::RawText);
            }
            "script" => {
                self.tokenizer.set_state(TokenizerState::ScriptData);
            }
            // noscript: scripting disabled → normal parsing (no state change)
            "plaintext" => {
                self.tokenizer.set_state(TokenizerState::PlainText);
            }
            _ => {}
        }

        // Reset the insertion mode based on the context element.
        self.mode = match context_tag {
            "select" => InsertionMode::InSelect,
            "td" | "th" => InsertionMode::InCell,
            "tr" => InsertionMode::InRow,
            "tbody" | "thead" | "tfoot" => InsertionMode::InTableBody,
            "caption" => InsertionMode::InCaption,
            "colgroup" => InsertionMode::InColumnGroup,
            "table" => InsertionMode::InTable,
            "template" => InsertionMode::InTemplate,
            "head" => InsertionMode::InHead,
            "frameset" => InsertionMode::InFrameset,
            "html" => InsertionMode::BeforeHead,
            // "body" and everything else → InBody
            _ => InsertionMode::InBody,
        };

        // For template, push template insertion mode.
        if context_tag == "template" {
            self.template_insertion_modes.push(InsertionMode::InTemplate);
        }

        // Set the last start tag for RCDATA/RAWTEXT end tag matching.
        // NOTE: "script" is excluded — in ScriptData state, the fragment
        // context means the entire content is the script's text, so
        // </script> should NOT be recognized as an end tag.
        if matches!(
            context_tag,
            "title" | "textarea" | "style" | "xmp" | "iframe" | "noembed" | "noframes"
        ) {
            self.tokenizer.set_last_start_tag(context_tag);
        }
    }

    pub(super) fn process_token(&mut self, token: Token) {
        // Guard against infinite reprocessing (e.g. breakout loop at
        // a foreign fragment root with no integration point). The depth
        // counter is reset to 0 before each new token in `run()`, so
        // this limit is per-token, not cumulative. 50 is well above the
        // deepest legitimate reprocessing chain (~10 for nested template
        // EOF cleanup).
        self.reprocess_depth += 1;
        if self.reprocess_depth > 50 {
            return;
        }

        // WHATWG §13.2.6: Determine whether to process as foreign content.
        // Check the adjusted current node for foreign namespace, integration
        // points, and token-specific exceptions.
        if self.should_process_as_foreign_for_token(&token) {
            self.process_foreign_content(token);
            return;
        }

        // Dispatch to the current insertion mode.
        match self.mode {
            InsertionMode::Initial => self.process_initial(token),
            InsertionMode::BeforeHtml => self.process_before_html(token),
            InsertionMode::BeforeHead => self.process_before_head(token),
            InsertionMode::InHead => self.process_in_head(token),
            InsertionMode::InHeadNoscript => self.process_in_head_noscript(token),
            InsertionMode::AfterHead => self.process_after_head(token),
            InsertionMode::InBody => self.process_in_body(token),
            InsertionMode::Text => self.process_text(token),
            InsertionMode::InTable => self.process_in_table(token),
            InsertionMode::InTableText => self.process_in_table_text(token),
            InsertionMode::InCaption => self.process_in_caption(token),
            InsertionMode::InColumnGroup => self.process_in_column_group(token),
            InsertionMode::InTableBody => self.process_in_table_body(token),
            InsertionMode::InRow => self.process_in_row(token),
            InsertionMode::InCell => self.process_in_cell(token),
            InsertionMode::InSelect => self.process_in_select(token),
            InsertionMode::InSelectInTable => self.process_in_select_in_table(token),
            InsertionMode::InTemplate => self.process_in_template(token),
            InsertionMode::AfterBody => self.process_after_body(token),
            InsertionMode::InFrameset => self.process_in_frameset(token),
            InsertionMode::AfterFrameset => self.process_after_frameset(token),
            InsertionMode::AfterAfterBody => self.process_after_after_body(token),
            InsertionMode::AfterAfterFrameset => self.process_after_after_frameset(token),
        }
    }

    // ========================================================================
    // Helper methods
    // ========================================================================

    pub(super) fn current_node(&self) -> Option<NodeId> {
        self.open_elements.current_node()
    }

    /// Returns (`parent_id`, Option<`before_sibling_id`>).
    /// WHATWG §13.2.6.1 "the appropriate place for inserting a node".
    fn appropriate_insert_position(&self) -> (NodeId, Option<NodeId>) {
        if self.foster_parenting {
            // Find last template and last table in the stack (top-to-bottom).
            let mut last_template: Option<(usize, NodeId)> = None;
            let mut last_table: Option<(usize, NodeId)> = None;
            for (stack_idx, id) in self.open_elements.iter_top_to_bottom().enumerate() {
                let node = self.arena.get(*id);
                if last_template.is_none() && node.is_html_element("template") {
                    last_template = Some((stack_idx, *id));
                }
                if last_table.is_none() && node.is_html_element("table") {
                    last_table = Some((stack_idx, *id));
                }
                if last_template.is_some() && last_table.is_some() {
                    break;
                }
            }

            // WHATWG: If there is a last template and either there is no
            // last table, or last template is higher in the stack (closer
            // to top, i.e. smaller index in top-to-bottom iteration),
            // insert inside the template element.
            if let Some((tpl_idx, tpl_id)) = last_template
                && (last_table.is_none() || tpl_idx < last_table.unwrap().0)
            {
                return (tpl_id, None);
            }

            if let Some((_, tid)) = last_table {
                let current = self.current_node().unwrap_or(self.arena.document_id());
                // If current node was already foster-parented (not inside the table),
                // use normal insertion into current node.
                if current != tid && !self.is_descendant_of(current, tid) {
                    return (current, None);
                }
                if let Some(parent) = self.arena.get(tid).parent {
                    return (parent, Some(tid));
                }
                // No parent → insert into element above table in the stack.
                if let Some(pos) = self.open_elements.position(tid)
                    && pos > 0
                    && let Some(prev) = self.open_elements.get(pos - 1)
                {
                    return (prev, None);
                }
                // Fallback: first element in the stack (html).
                if let Some(first) = self.open_elements.get(0) {
                    return (first, None);
                }
            }
        }
        (self.current_node().unwrap_or(self.arena.document_id()), None)
    }

    fn is_descendant_of(&self, node_id: NodeId, ancestor_id: NodeId) -> bool {
        let mut current = node_id;
        for _ in 0..100 {
            if current == ancestor_id {
                return true;
            }
            match self.arena.get(current).parent {
                Some(parent) => current = parent,
                None => return false,
            }
        }
        false
    }

    /// Insert a node at the appropriate position (handles foster parenting).
    fn insert_at_appropriate_position(&mut self, child_id: NodeId) {
        let (parent, before) = self.appropriate_insert_position();
        if let Some(sibling) = before {
            self.arena.insert_before(parent, child_id, sibling);
        } else {
            self.arena.append_child(parent, child_id);
        }
    }

    fn insert_element_for_token(
        &mut self,
        tag_name: &str,
        attributes: &[RawAttribute],
        span: Span,
        namespace: Namespace,
    ) -> NodeId {
        let attrs = convert_attributes(attributes, span);
        let node_id = self
            .arena
            .create_element(tag_name.to_owned(), namespace, attrs, false, span, false);
        self.insert_at_appropriate_position(node_id);
        self.open_elements.push(node_id);
        node_id
    }

    pub(super) fn insert_html_element(&mut self, tag_name: &str, attributes: &[RawAttribute], span: Span) -> NodeId {
        self.insert_element_for_token(tag_name, attributes, span, Namespace::Html)
    }

    pub(super) fn insert_implicit_element(&mut self, tag_name: &str, pos: Position) -> NodeId {
        let span = Span::empty(pos);
        let node_id = self.arena.create_element(
            tag_name.to_owned(),
            Namespace::Html,
            Vec::new(),
            false,
            span,
            true, // implicit/ghost
        );
        self.insert_at_appropriate_position(node_id);
        self.open_elements.push(node_id);
        node_id
    }

    pub(super) fn insert_character(&mut self, ch: char, pos: Position) {
        let (target, before) = self.appropriate_insert_position();

        // Merge with existing adjacent text node if possible.
        // For foster parenting, check the node before the sibling.
        // For normal insertion, check the last child.
        let merge_target = if let Some(sibling) = before {
            // Find the child just before the sibling in parent's children.
            let children = &self.arena.get(target).children;
            children
                .iter()
                .position(|&id| id == sibling)
                .and_then(|pos| if pos > 0 { children.get(pos - 1).copied() } else { None })
        } else {
            self.arena.last_child(target)
        };
        if let Some(text_id) = merge_target {
            let node = self.arena.get_mut(text_id);
            if let crate::tree::node::NodeKind::Text { ref mut data } = node.kind {
                data.push(ch);
                node.span.end = Position {
                    offset: pos.offset + ch.len_utf8(),
                    line: pos.line,
                    col: pos.col + 1,
                };
                return;
            }
        }

        let span = Span::new(
            pos,
            Position {
                offset: pos.offset + ch.len_utf8(),
                line: pos.line,
                col: pos.col + 1,
            },
        );
        let text_id = self.arena.create_text(ch.to_string(), span);
        if let Some(sibling) = before {
            self.arena.insert_before(target, text_id, sibling);
        } else {
            self.arena.append_child(target, text_id);
        }
    }

    pub(super) fn insert_comment(&mut self, data: &str, span: Span) {
        let comment_id = self.arena.create_comment(data.to_owned(), span);
        self.insert_at_appropriate_position(comment_id);
    }

    fn insert_comment_to_document(&mut self, data: &str, span: Span) {
        let doc_id = self.arena.document_id();
        let comment_id = self.arena.create_comment(data.to_owned(), span);
        self.arena.append_child(doc_id, comment_id);
    }

    pub(super) fn generate_implied_end_tags(&mut self, exclude: Option<&str>) {
        loop {
            if let Some(id) = self.current_node()
                && let Some(name) = self.arena.get(id).tag_name()
                && tables::IMPLIED_END_TAG_ELEMENTS.contains(&name)
                && (exclude != Some(name))
            {
                self.open_elements.pop();
                continue;
            }
            break;
        }
    }

    /// Generate all implied end tags thoroughly per WHATWG §13.2.6.4.
    pub(super) fn generate_implied_end_tags_thoroughly(&mut self) {
        loop {
            if let Some(id) = self.current_node()
                && let Some(name) = self.arena.get(id).tag_name()
                && tables::IMPLIED_END_TAG_THOROUGHLY_ELEMENTS.contains(&name)
            {
                self.open_elements.pop();
                continue;
            }
            break;
        }
    }

    /// Reconstruct the active formatting elements per WHATWG §13.2.4.3.
    pub(super) fn reconstruct_active_formatting_elements(&mut self) {
        use active_formatting::FormatEntry;

        // Step 1: If empty, return.
        if self.active_formatting.is_empty() {
            return;
        }

        // Step 2: If last entry is a marker or in open elements, return.
        let entries = self.active_formatting.entries();
        let last = entries.last();
        match last {
            None | Some(FormatEntry::Marker) => return,
            Some(FormatEntry::Element(id)) => {
                if self.open_elements.contains(*id) {
                    return;
                }
            }
        }

        // Step 3-7: Walk backwards to find the first entry that's a marker
        // or is in open elements, then walk forward creating elements.
        let mut i = entries.len() - 1;

        // Step 4: Rewind.
        loop {
            if i == 0 {
                break;
            }
            i -= 1;
            match &entries[i] {
                FormatEntry::Marker => {
                    i += 1;
                    break;
                }
                FormatEntry::Element(id) => {
                    if self.open_elements.contains(*id) {
                        i += 1;
                        break;
                    }
                }
            }
        }

        // Step 7: Advance — create elements for entries[i..].
        let entries_to_reconstruct: Vec<NodeId> = entries[i..]
            .iter()
            .filter_map(|e| match e {
                FormatEntry::Element(id) => Some(*id),
                FormatEntry::Marker => None,
            })
            .collect();

        for &old_id in &entries_to_reconstruct {
            let new_id = self.clone_formatting_element(old_id);
            self.insert_at_appropriate_position(new_id);
            self.open_elements.push(new_id);
            self.active_formatting.replace(old_id, new_id);
        }
    }

    /// Clone a formatting element for reconstruction.
    fn clone_formatting_element(&mut self, node_id: NodeId) -> NodeId {
        let node = self.arena.get(node_id);
        let span = node.span;
        match &node.kind {
            crate::tree::node::NodeKind::Element {
                tag_name,
                namespace,
                attributes,
                self_closing,
            } => self.arena.create_element(
                tag_name.clone(),
                *namespace,
                attributes.clone(),
                *self_closing,
                span,
                false,
            ),
            _ => node_id,
        }
    }

    pub(super) fn current_node_is(&self, name: &str) -> bool {
        self.current_node()
            .is_some_and(|id| self.arena.get(id).is_html_element(name))
    }

    pub(super) fn has_element_in_scope(&self, target: &str) -> bool {
        // WHATWG §13.2.4.2: scope barriers for "has an element in scope"
        // are NOT all special elements — only specific ones.
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if node.is_html_element(target) {
                return true;
            }
            if let Some(name) = node.tag_name()
                && is_scope_barrier(name, node.namespace())
            {
                return false;
            }
        }
        false
    }

    pub(super) fn has_element_in_button_scope(&self, target: &str) -> bool {
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if node.is_html_element(target) {
                return true;
            }
            if let Some(name) = node.tag_name()
                && (is_scope_barrier(name, node.namespace()) || name == "button")
            {
                return false;
            }
        }
        false
    }

    /// WHATWG §13.2.4.2: "has an element in list item scope"
    /// Same as regular scope plus ol and ul as barriers.
    fn has_element_in_list_item_scope(&self, target: &str) -> bool {
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if node.is_html_element(target) {
                return true;
            }
            if let Some(name) = node.tag_name()
                && (is_scope_barrier(name, node.namespace()) || matches!(name, "ol" | "ul"))
            {
                return false;
            }
        }
        false
    }

    pub(super) fn has_element_in_table_scope(&self, target: &str) -> bool {
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if node.is_html_element(target) {
                return true;
            }
            if let Some(name) = node.tag_name()
                && node.namespace() == Some(Namespace::Html)
                && matches!(name, "html" | "table" | "template")
            {
                return false;
            }
        }
        false
    }

    pub(super) fn pop_until(&mut self, tag_name: &str) {
        while let Some(id) = self.open_elements.pop() {
            if self.arena.get(id).is_html_element(tag_name) {
                break;
            }
        }
    }

    pub(super) fn close_p_element(&mut self) {
        self.generate_implied_end_tags(Some("p"));
        // WHATWG: If the current node is not a p element, this is a parse error.
        // TS parser fails with "Broke mapping nodes" in this case, so we track it
        // to match TS behavior of returning only parse-error for such documents.
        if let Some(current_id) = self.current_node() {
            if !self.arena.get(current_id).is_html_element("p") {
                let node = self.arena.get(current_id);
                let tag_name = match &node.kind {
                    NodeKind::Element { tag_name, .. } => tag_name.clone(),
                    _ => String::new(),
                };
                self.arena.parse_errors.push((
                    tag_name.clone(),
                    format!(
                        "The {} is invalid element ({}:{}): Broke mapping nodes.",
                        tag_name, node.span.start.line, node.span.start.col
                    ),
                    node.span,
                ));
            }
        }
        self.pop_until("p");
    }

    /// Clone the selected `<option>`'s children into `<selectedcontent>`.
    /// Called when a `<select>` element is closed or at EOF in `InSelect`.
    fn clone_selected_into_selectedcontent(&mut self) {
        let Some(sc_id) = self.selectedcontent_element else {
            return;
        };
        // Find the select element on the stack.
        let mut select_id = None;
        for id in self.open_elements.iter_top_to_bottom() {
            if self.arena.get(*id).is_html_element("select") {
                select_id = Some(*id);
                break;
            }
        }
        let Some(select_id) = select_id else {
            self.selectedcontent_element = None;
            return;
        };
        // Walk select's descendants to find option elements.
        let selected = self.find_selected_option(select_id);
        if let Some(option_id) = selected {
            self.arena.clone_children_into(option_id, sc_id);
        }
        self.selectedcontent_element = None;
    }

    /// Find the selected option inside a select element.
    /// Returns the option with `selected` attribute, or the first option.
    fn find_selected_option(&self, select_id: NodeId) -> Option<NodeId> {
        let mut first_option = None;
        let mut selected_option = None;
        self.walk_for_options(select_id, &mut first_option, &mut selected_option);
        selected_option.or(first_option)
    }

    fn walk_for_options(
        &self,
        node_id: NodeId,
        first_option: &mut Option<NodeId>,
        selected_option: &mut Option<NodeId>,
    ) {
        let children: Vec<NodeId> = self.arena.get(node_id).children.clone();
        for child_id in children {
            let child = self.arena.get(child_id);
            if child.is_html_element("option") {
                if first_option.is_none() {
                    *first_option = Some(child_id);
                }
                if child.attribute_value("selected").is_some() {
                    *selected_option = Some(child_id);
                }
            }
            // Recurse into non-option children (e.g. optgroup).
            self.walk_for_options(child_id, first_option, selected_option);
        }
    }

    /// Check if an element with the given tag name exists on the open
    /// elements stack above the nearest `<select>` element. Used by
    /// customizable `<select>` to scope formatting end tag delegation:
    /// only tags INSIDE the select should be processed by `InBody`.
    fn is_element_above_select_on_stack(&self, tag_name: &str) -> bool {
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if node.is_html_element("select") {
                return false; // reached select boundary without finding it
            }
            if node.is_html_element(tag_name) {
                return true;
            }
        }
        false
    }

    pub(super) fn set_end_tag_span(&mut self, tag_name: &str, span: Span) {
        // Find the matching open element and set its end_tag_span.
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if node.is_html_element(tag_name) {
                self.arena.get_mut(*id).end_tag_span = Some(span);
                break;
            }
        }
    }

    pub(super) fn token_position(token: &Token) -> Position {
        match token {
            Token::StartTag { span, .. }
            | Token::EndTag { span, .. }
            | Token::Comment { span, .. }
            | Token::Doctype { span, .. } => span.start,
            Token::Character { offset, line, col, .. } => Position {
                offset: *offset,
                line: *line,
                col: *col,
            },
            Token::Eof => Position {
                offset: 0,
                line: 1,
                col: 1,
            },
        }
    }

    // ========================================================================
    // §13.2.6.4.1 Initial insertion mode
    // ========================================================================
    fn process_initial(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                // Ignore whitespace.
            }
            Token::Comment { data, span } => {
                self.insert_comment_to_document(data, *span);
            }
            Token::Doctype {
                name,
                public_id,
                system_id,
                span,
                ..
            } => {
                let doctype_id = self.arena.create_doctype(
                    name.clone().unwrap_or_default(),
                    public_id.clone().unwrap_or_default(),
                    system_id.clone().unwrap_or_default(),
                    *span,
                );
                let doc_id = self.arena.document_id();
                self.arena.append_child(doc_id, doctype_id);
                // Detect quirks mode per WHATWG §13.2.6.4.1.
                self.quirks_mode = is_quirks_mode_doctype(name.as_deref(), public_id.as_deref(), system_id.as_deref());
                self.mode = InsertionMode::BeforeHtml;
            }
            _ => {
                // Parse error. No DOCTYPE → quirks mode.
                self.quirks_mode = true;
                self.mode = InsertionMode::BeforeHtml;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.2 Before HTML
    // ========================================================================
    fn process_before_html(&mut self, token: Token) {
        match &token {
            Token::Doctype { .. } => {
                // Parse error. Ignore.
            }
            Token::Comment { data, span } => {
                self.insert_comment_to_document(data, *span);
            }
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                // WHATWG: Ignore whitespace before <html>.
                let _ = ch;
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "html" => {
                let html_id = self.insert_html_element(tag_name, attributes, *span);
                let _ = html_id;
                self.mode = InsertionMode::BeforeHead;
            }
            Token::EndTag { tag_name, span, .. } if !matches!(tag_name.as_str(), "head" | "body" | "html" | "br") => {
                // Parse error. Ignore. Record as orphaned.
                self.arena.orphaned_end_tags.push((tag_name.clone(), *span));
            }
            _ => {
                // Insert implicit <html>.
                let pos = Self::token_position(&token);
                self.insert_implicit_element("html", pos);
                self.mode = InsertionMode::BeforeHead;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.3 Before head
    // ========================================================================
    fn process_before_head(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {}
            Token::Comment { data, span } => {
                self.insert_comment(data, *span);
            }
            Token::Doctype { .. } => {}
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "html" => {
                // Process using InBody rules.
                self.process_in_body_start_tag_html(attributes, *span);
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "head" => {
                let head_id = self.insert_html_element(tag_name, attributes, *span);
                self.head_element = Some(head_id);
                self.mode = InsertionMode::InHead;
            }
            Token::EndTag { tag_name, span, .. } if !matches!(tag_name.as_str(), "head" | "body" | "html" | "br") => {
                // Parse error. Ignore. Record as orphaned.
                self.arena.orphaned_end_tags.push((tag_name.clone(), *span));
            }
            _ => {
                let pos = Self::token_position(&token);
                let head_id = self.insert_implicit_element("head", pos);
                self.head_element = Some(head_id);
                self.mode = InsertionMode::InHead;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.4 In head
    // ========================================================================
    #[allow(clippy::too_many_lines)]
    pub(super) fn process_in_head(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.insert_character(
                    *ch,
                    Position {
                        offset: match &token {
                            Token::Character { offset, .. } => *offset,
                            _ => 0,
                        },
                        line: match &token {
                            Token::Character { line, .. } => *line,
                            _ => 1,
                        },
                        col: match &token {
                            Token::Character { col, .. } => *col,
                            _ => 1,
                        },
                    },
                );
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
            } if matches!(tag_name.as_str(), "base" | "basefont" | "bgsound" | "link" | "meta") => {
                self.insert_html_element(tag_name, attributes, *span);
                self.open_elements.pop();
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "title" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.tokenizer.set_state(TokenizerState::RcData);
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::Text;
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if matches!(tag_name.as_str(), "noframes" | "style") => {
                self.insert_html_element(tag_name, attributes, *span);
                self.tokenizer.set_state(TokenizerState::RawText);
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::Text;
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "noscript" => {
                self.insert_html_element(tag_name, attributes, *span);
                if self.scripting_enabled {
                    // Scripting enabled → RAWTEXT (content is opaque text).
                    self.tokenizer.set_state(TokenizerState::RawText);
                    self.original_mode = Some(self.mode);
                    self.mode = InsertionMode::Text;
                } else {
                    // Scripting disabled → InHeadNoscript (parse as HTML).
                    self.mode = InsertionMode::InHeadNoscript;
                }
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "script" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.tokenizer.set_state(TokenizerState::ScriptData);
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::Text;
            }
            Token::EndTag { tag_name, span, .. } if tag_name == "head" => {
                self.set_end_tag_span("head", *span);
                self.open_elements.pop();
                self.mode = InsertionMode::AfterHead;
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "template" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.active_formatting.push_marker();
                self.frameset_ok = false;
                self.mode = InsertionMode::InTemplate;
                self.template_insertion_modes.push(InsertionMode::InTemplate);
            }
            Token::EndTag { tag_name, .. } if tag_name == "template" => {
                // WHATWG §13.2.6.4.4: An end tag whose tag name is "template".
                // Step 1: If there is no template element on the stack, ignore.
                if self.template_insertion_modes.is_empty() {
                    return;
                }
                // Step 2: Generate all implied end tags thoroughly.
                self.generate_implied_end_tags_thoroughly();
                // Step 3: Pop elements until a template element has been popped.
                self.pop_until("template");
                // Step 4: Clear the list of active formatting elements up to the last marker.
                self.active_formatting.clear_up_to_last_marker();
                // Step 5: Pop the current template insertion mode.
                self.template_insertion_modes.pop();
                // Step 6: Reset the insertion mode appropriately.
                self.reset_insertion_mode();
            }
            Token::EndTag { tag_name, span, .. } if !matches!(tag_name.as_str(), "body" | "html" | "br") => {
                // Parse error. Ignore. Record as orphaned.
                self.arena.orphaned_end_tags.push((tag_name.clone(), *span));
            }
            Token::StartTag { tag_name, .. } if tag_name == "head" => {
                // Parse error. Ignore.
            }
            _ => {
                // Act as if </head> was seen.
                self.open_elements.pop();
                self.mode = InsertionMode::AfterHead;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.5 In head noscript
    // ========================================================================
    pub(super) fn process_in_head_noscript(&mut self, token: Token) {
        match &token {
            Token::Doctype { .. } => {}
            Token::StartTag { tag_name, .. } if tag_name == "html" => {
                self.process_in_body(token);
            }
            Token::EndTag { tag_name, .. } if tag_name == "noscript" => {
                self.open_elements.pop();
                self.mode = InsertionMode::InHead;
            }
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.process_in_head(token);
            }
            Token::Comment { .. } => {
                self.process_in_head(token);
            }
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "basefont" | "bgsound" | "link" | "meta" | "noframes" | "style"
                ) =>
            {
                self.process_in_head(token);
            }
            Token::StartTag { tag_name, .. } if matches!(tag_name.as_str(), "head" | "noscript") => {
                // Parse error. Ignore.
            }
            Token::EndTag { tag_name, span, .. } if tag_name != "br" => {
                // Parse error. Ignore. Record as orphaned.
                self.arena.orphaned_end_tags.push((tag_name.clone(), *span));
            }
            _ => {
                // Parse error. Pop noscript, back to InHead, reprocess.
                self.open_elements.pop();
                self.mode = InsertionMode::InHead;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.6 After head
    // ========================================================================
    fn process_after_head(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.insert_character(
                    *ch,
                    Position {
                        offset: match &token {
                            Token::Character { offset, .. } => *offset,
                            _ => 0,
                        },
                        line: match &token {
                            Token::Character { line, .. } => *line,
                            _ => 1,
                        },
                        col: match &token {
                            Token::Character { col, .. } => *col,
                            _ => 1,
                        },
                    },
                );
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
            } if tag_name == "html" => {
                self.process_in_body_start_tag_html(attributes, *span);
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "body" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.frameset_ok = false;
                self.mode = InsertionMode::InBody;
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "frameset" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.mode = InsertionMode::InFrameset;
            }
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "base"
                        | "basefont"
                        | "bgsound"
                        | "link"
                        | "meta"
                        | "noframes"
                        | "script"
                        | "style"
                        | "template"
                        | "title"
                ) =>
            {
                // Push head back, process in InHead, then remove head.
                if let Some(head) = self.head_element {
                    self.open_elements.push(head);
                }
                self.process_in_head(token);
                if let Some(head) = self.head_element {
                    self.open_elements.remove(head);
                }
            }
            Token::EndTag { tag_name, .. } if tag_name == "template" => {
                self.process_in_head(token);
            }
            Token::EndTag { tag_name, span, .. } if !matches!(tag_name.as_str(), "body" | "html" | "br") => {
                // Parse error. Ignore. Record as orphaned.
                self.arena.orphaned_end_tags.push((tag_name.clone(), *span));
            }
            Token::StartTag { tag_name, .. } if tag_name == "head" => {
                // Parse error. Ignore.
            }
            Token::Eof if self.is_fragment && !matches!(self.fragment_context.as_deref(), Some("html") | None) => {
                // Fragment mode (non-html context): don't create implicit body on EOF.
                // For "html" context, body IS needed.
            }
            _ => {
                let pos = Self::token_position(&token);
                self.insert_implicit_element("body", pos);
                self.mode = InsertionMode::InBody;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.7 In body (simplified — core elements only)
    // ========================================================================
    #[allow(clippy::too_many_lines, clippy::needless_pass_by_value)]
    pub(super) fn process_in_body(&mut self, token: Token) {
        match &token {
            Token::Character { ch, offset, line, col } => {
                if *ch == '\0' {
                    // Parse error. Ignore.
                } else {
                    self.reconstruct_active_formatting_elements();
                    if !ch.is_ascii_whitespace() {
                        self.frameset_ok = false;
                    }
                    self.insert_character(
                        *ch,
                        Position {
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
            Token::Doctype { .. } => {
                // Parse error. Ignore.
            }
            Token::Eof => {
                // WHATWG §13.2.6.4.7: If the stack of template insertion
                // modes is not empty, process the token using the rules for
                // the "in template" insertion mode.
                if !self.template_insertion_modes.is_empty() {
                    self.process_in_template(token);
                }
                // Otherwise, stop parsing.
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                self_closing,
            } => {
                let tag = tag_name.clone();
                let attrs = attributes.clone();
                let s = *span;
                let sc = *self_closing;
                self.process_in_body_start_tag(&tag, &attrs, s, sc);
            }
            Token::EndTag { tag_name, span, .. } => {
                let tag = tag_name.clone();
                let s = *span;
                self.process_in_body_end_tag(&tag, s);
            }
        }
    }

    #[allow(clippy::too_many_lines)]
    pub(super) fn process_in_body_start_tag(
        &mut self,
        tag_name: &str,
        attributes: &[RawAttribute],
        span: Span,
        self_closing: bool,
    ) {
        match tag_name {
            "html" => {
                self.process_in_body_start_tag_html(attributes, span);
            }
            "base" | "basefont" | "bgsound" | "link" | "meta" | "noframes" | "script" | "style" | "template"
            | "title" => {
                // Process using InHead rules.
                let token = Token::StartTag {
                    tag_name: tag_name.to_owned(),
                    self_closing: false,
                    attributes: attributes.to_vec(),
                    span,
                };
                self.process_in_head(token);
            }
            "body" => {
                // WHATWG: If there is a template element on the stack of open
                // elements, or if the stack has only one node, or if the second
                // element is not body, or fragment case → ignore.
                let should_ignore = !self.template_insertion_modes.is_empty()
                    || self.open_elements.len() <= 1
                    || self.is_fragment
                    || !self
                        .open_elements
                        .get(1)
                        .is_some_and(|id| self.arena.get(id).is_html_element("body"));

                if !should_ignore {
                    // Merge attributes into existing body.
                    if !attributes.is_empty() {
                        for id in self.open_elements.iter_top_to_bottom() {
                            if self.arena.get(*id).is_html_element("body") {
                                let new_attrs = convert_attributes(attributes, span);
                                let node = self.arena.get_mut(*id);
                                if let crate::tree::node::NodeKind::Element {
                                    attributes: ref mut existing,
                                    ..
                                } = node.kind
                                {
                                    for attr in new_attrs {
                                        if !existing.iter().any(|a| a.name == attr.name) {
                                            existing.push(attr);
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                    self.frameset_ok = false;
                }
                // Else: parse error, ignore.
            }
            "frameset" => {
                // WHATWG: If frameset_ok is false or fragment mode, ignore.
                if !self.frameset_ok || self.is_fragment {
                    return;
                }
                // Remove the body element from the stack and document.
                // Find and remove body from open elements.
                let mut body_idx = None;
                for i in 0..self.open_elements.len() {
                    if let Some(id) = self.open_elements.get(i)
                        && self.arena.get(id).is_html_element("body")
                    {
                        body_idx = Some(i);
                        break;
                    }
                }
                if let Some(idx) = body_idx {
                    if let Some(body_id) = self.open_elements.get(idx) {
                        // Remove body from its parent.
                        if let Some(parent) = self.arena.get(body_id).parent {
                            let parent_node = self.arena.get_mut(parent);
                            parent_node.children.retain(|&id| id != body_id);
                        }
                    }
                    // Remove from open elements: pop back to html.
                    while self.open_elements.len() > idx {
                        self.open_elements.pop();
                    }
                }
                self.insert_html_element(tag_name, attributes, span);
                self.mode = InsertionMode::InFrameset;
            }
            "head" | "frame" | "caption" | "col" | "colgroup" | "tbody" | "td" | "tfoot" | "th" | "thead" | "tr" => {
                // Parse error. Ignore.
            }
            "address" | "article" | "aside" | "blockquote" | "center" | "details" | "dialog" | "dir" | "div" | "dl"
            | "fieldset" | "figcaption" | "figure" | "footer" | "header" | "hgroup" | "main" | "menu" | "nav"
            | "ol" | "p" | "search" | "section" | "summary" | "ul" => {
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
            }
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                // If current node is h1-h6, pop it.
                if let Some(id) = self.current_node()
                    && let Some(name) = self.arena.get(id).tag_name()
                    && matches!(name, "h1" | "h2" | "h3" | "h4" | "h5" | "h6")
                {
                    self.open_elements.pop();
                }
                self.insert_html_element(tag_name, attributes, span);
            }
            "plaintext" => {
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
                self.frameset_ok = false;
                self.tokenizer.set_state(TokenizerState::PlainText);
            }
            "pre" | "listing" => {
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
                self.frameset_ok = false;
                self.skip_next_newline = true;
            }
            "button" => {
                if self.has_element_in_scope("button") {
                    self.generate_implied_end_tags(None);
                    self.pop_until("button");
                }
                self.reconstruct_active_formatting_elements();
                self.insert_html_element(tag_name, attributes, span);
                self.frameset_ok = false;
            }
            "form" => {
                if self.form_element.is_some() && !self.has_element_in_scope("template") {
                    // Parse error. Ignore.
                } else {
                    if self.has_element_in_button_scope("p") {
                        self.close_p_element();
                    }
                    let form_id = self.insert_html_element(tag_name, attributes, span);
                    if !self.has_element_in_scope("template") {
                        self.form_element = Some(form_id);
                    }
                }
            }
            "li" => {
                self.frameset_ok = false;
                // Pop up to a matching li.
                let mut i = self.open_elements.len();
                while i > 0 {
                    i -= 1;
                    if let Some(id) = self.open_elements.get(i) {
                        let node = self.arena.get(id);
                        if node.is_html_element("li") {
                            self.generate_implied_end_tags(Some("li"));
                            self.pop_until("li");
                            break;
                        }
                        if let Some(name) = node.tag_name()
                            && node.namespace() == Some(Namespace::Html)
                            && tables::is_special_element_html(name)
                            && !matches!(name, "address" | "div" | "p")
                        {
                            break;
                        }
                    }
                }
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
            }
            "dd" | "dt" => {
                self.frameset_ok = false;
                let mut i = self.open_elements.len();
                while i > 0 {
                    i -= 1;
                    if let Some(id) = self.open_elements.get(i) {
                        let node = self.arena.get(id);
                        if node.is_html_element("dd") || node.is_html_element("dt") {
                            let name = node.tag_name().unwrap().to_owned();
                            self.generate_implied_end_tags(Some(&name));
                            self.pop_until(&name);
                            break;
                        }
                        if let Some(name) = node.tag_name()
                            && node.namespace() == Some(Namespace::Html)
                            && tables::is_special_element_html(name)
                            && !matches!(name, "address" | "div" | "p")
                        {
                            break;
                        }
                    }
                }
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
            }
            "a" => {
                // WHATWG §13.2.6.4.7: If AF has <a> after last marker,
                // run adoption agency, then remove from AF and stack.
                if let Some(existing_a) = self.active_formatting.find_last_element("a", &self.arena) {
                    self.run_adoption_agency("a");
                    self.active_formatting.remove(existing_a);
                    self.open_elements.remove(existing_a);
                }
                self.reconstruct_active_formatting_elements();
                // NOTE: <a> does NOT close <p> — only block elements do.
                let el_id = self.insert_html_element(tag_name, attributes, span);
                self.active_formatting
                    .push_with_noahs_ark(FormatEntry::Element(el_id), &self.arena);
            }
            "b" | "big" | "code" | "em" | "font" | "i" | "s" | "small" | "strike" | "strong" | "tt" | "u" => {
                self.reconstruct_active_formatting_elements();
                let el_id = self.insert_html_element(tag_name, attributes, span);
                self.active_formatting
                    .push_with_noahs_ark(FormatEntry::Element(el_id), &self.arena);
            }
            "nobr" => {
                self.reconstruct_active_formatting_elements();
                if self.has_element_in_scope("nobr") {
                    self.run_adoption_agency("nobr");
                    self.reconstruct_active_formatting_elements();
                }
                let el_id = self.insert_html_element(tag_name, attributes, span);
                self.active_formatting
                    .push_with_noahs_ark(FormatEntry::Element(el_id), &self.arena);
            }
            "applet" | "marquee" | "object" => {
                self.reconstruct_active_formatting_elements();
                self.insert_html_element(tag_name, attributes, span);
                self.active_formatting.push_marker();
                self.frameset_ok = false;
            }
            "table" => {
                // In quirks mode, <table> inside <p> doesn't close the <p>.
                if !self.quirks_mode && self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
                self.frameset_ok = false;
                self.mode = InsertionMode::InTable;
            }
            // WHATWG: <image> is a parse error — treat as <img>.
            "image" => {
                self.reconstruct_active_formatting_elements();
                self.insert_html_element("img", attributes, span);
                self.open_elements.pop();
                self.frameset_ok = false;
            }
            "area" | "br" | "embed" | "img" | "keygen" | "wbr" => {
                self.reconstruct_active_formatting_elements();
                self.insert_html_element(tag_name, attributes, span);
                self.open_elements.pop();
                self.frameset_ok = false;
            }
            "input" => {
                self.reconstruct_active_formatting_elements();
                self.insert_html_element(tag_name, attributes, span);
                self.open_elements.pop();
                // frameset_ok = false unless type=hidden.
                let is_hidden = attributes.iter().any(|a| {
                    a.raw_name.eq_ignore_ascii_case("type") && a.raw_value.trim().eq_ignore_ascii_case("hidden")
                });
                if !is_hidden {
                    self.frameset_ok = false;
                }
            }
            "param" | "source" | "track" => {
                self.insert_html_element(tag_name, attributes, span);
                self.open_elements.pop();
            }
            "hr" => {
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
                self.open_elements.pop();
                self.frameset_ok = false;
            }
            "textarea" => {
                self.insert_html_element(tag_name, attributes, span);
                self.skip_next_newline = true;
                self.tokenizer.set_state(TokenizerState::RcData);
                self.original_mode = Some(self.mode);
                self.frameset_ok = false;
                self.mode = InsertionMode::Text;
            }
            "xmp" => {
                if self.has_element_in_button_scope("p") {
                    self.close_p_element();
                }
                self.insert_html_element(tag_name, attributes, span);
                self.frameset_ok = false;
                self.tokenizer.set_state(TokenizerState::RawText);
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::Text;
            }
            "iframe" => {
                self.frameset_ok = false;
                self.insert_html_element(tag_name, attributes, span);
                self.tokenizer.set_state(TokenizerState::RawText);
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::Text;
            }
            "noembed" => {
                self.insert_html_element(tag_name, attributes, span);
                self.tokenizer.set_state(TokenizerState::RawText);
                self.original_mode = Some(self.mode);
                self.mode = InsertionMode::Text;
            }
            "noscript" if self.scripting_enabled => {
                // WHATWG: scripting enabled → handle like InHead (RAWTEXT).
                let token = Token::StartTag {
                    tag_name: tag_name.to_owned(),
                    self_closing: false,
                    attributes: attributes.to_vec(),
                    span,
                };
                self.process_in_head(token);
            }
            "select" => {
                self.insert_html_element(tag_name, attributes, span);
                self.frameset_ok = false;
                if matches!(
                    self.mode,
                    InsertionMode::InTable
                        | InsertionMode::InCaption
                        | InsertionMode::InTableBody
                        | InsertionMode::InRow
                        | InsertionMode::InCell
                ) {
                    self.mode = InsertionMode::InSelectInTable;
                } else {
                    self.mode = InsertionMode::InSelect;
                }
            }
            "optgroup" | "option" => {
                if self.current_node_is("option") {
                    self.open_elements.pop();
                }
                self.reconstruct_active_formatting_elements();
                self.insert_html_element(tag_name, attributes, span);
            }
            "rb" | "rtc" => {
                if self.has_element_in_scope("ruby") {
                    self.generate_implied_end_tags(None);
                }
                self.insert_html_element(tag_name, attributes, span);
            }
            "rp" | "rt" => {
                if self.has_element_in_scope("ruby") {
                    self.generate_implied_end_tags(Some("rtc"));
                }
                self.insert_html_element(tag_name, attributes, span);
            }
            "svg" => {
                self.reconstruct_active_formatting_elements();
                self.process_svg_start_tag(attributes, span);
                if self_closing {
                    self.open_elements.pop();
                }
            }
            "math" => {
                self.reconstruct_active_formatting_elements();
                self.process_math_start_tag(attributes, span);
                if self_closing {
                    self.open_elements.pop();
                }
            }
            _ => {
                // Any other start tag.
                self.reconstruct_active_formatting_elements();
                self.insert_html_element(tag_name, attributes, span);
            }
        }
    }

    #[allow(clippy::too_many_lines)]
    pub(super) fn process_in_body_end_tag(&mut self, tag_name: &str, span: Span) {
        match tag_name {
            "template" => {
                self.process_in_head(Token::EndTag {
                    tag_name: tag_name.to_owned(),
                    self_closing: false,
                    attributes: Vec::new(),
                    span,
                });
            }
            "body" => {
                if !self.has_element_in_scope("body") {
                    return;
                }
                self.set_end_tag_span("body", span);
                self.mode = InsertionMode::AfterBody;
            }
            "html" => {
                if !self.has_element_in_scope("body") {
                    return;
                }
                self.set_end_tag_span("html", span);
                self.mode = InsertionMode::AfterBody;
                self.process_token(Token::EndTag {
                    tag_name: "html".to_owned(),
                    self_closing: false,
                    attributes: Vec::new(),
                    span,
                });
            }
            "address" | "article" | "aside" | "blockquote" | "button" | "center" | "details" | "dialog" | "dir"
            | "div" | "dl" | "fieldset" | "figcaption" | "figure" | "footer" | "header" | "hgroup" | "listing"
            | "main" | "menu" | "nav" | "ol" | "pre" | "search" | "section" | "summary" | "ul" => {
                if !self.has_element_in_scope(tag_name) {
                    self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                    return;
                }
                self.generate_implied_end_tags(None);
                self.set_end_tag_span(tag_name, span);
                self.pop_until(tag_name);
            }
            "form" => {
                if self.has_element_in_scope("template") {
                    if !self.has_element_in_scope("form") {
                        self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                        return;
                    }
                    self.generate_implied_end_tags(None);
                    self.pop_until("form");
                } else {
                    let node = self.form_element.take();
                    if node.is_none() || !self.has_element_in_scope("form") {
                        self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                        return;
                    }
                    self.generate_implied_end_tags(None);
                    if let Some(form_id) = node {
                        self.open_elements.remove(form_id);
                    }
                }
            }
            "p" => {
                if !self.has_element_in_button_scope("p") {
                    // Parse error. Insert implicit <p>.
                    // Also record as orphaned end tag — TS reports these as
                    // orphaned even though the WHATWG parser creates an
                    // implicit element.
                    let pos = span.start;
                    self.insert_implicit_element("p", pos);
                    self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                }
                self.set_end_tag_span("p", span);
                self.close_p_element();
            }
            "li" => {
                if !self.has_element_in_list_item_scope("li") {
                    self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                    return;
                }
                self.generate_implied_end_tags(Some("li"));
                self.set_end_tag_span("li", span);
                self.pop_until("li");
            }
            "dd" | "dt" => {
                if !self.has_element_in_scope(tag_name) {
                    self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                    return;
                }
                self.generate_implied_end_tags(Some(tag_name));
                self.set_end_tag_span(tag_name, span);
                self.pop_until(tag_name);
            }
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
                if !self.has_element_in_scope("h1")
                    && !self.has_element_in_scope("h2")
                    && !self.has_element_in_scope("h3")
                    && !self.has_element_in_scope("h4")
                    && !self.has_element_in_scope("h5")
                    && !self.has_element_in_scope("h6")
                {
                    return;
                }
                self.generate_implied_end_tags(None);
                self.set_end_tag_span(tag_name, span);
                // Pop until h1-h6.
                while let Some(id) = self.open_elements.pop() {
                    if let Some(name) = self.arena.get(id).tag_name()
                        && matches!(name, "h1" | "h2" | "h3" | "h4" | "h5" | "h6")
                    {
                        break;
                    }
                }
            }
            "a" | "b" | "big" | "code" | "em" | "font" | "i" | "nobr" | "s" | "small" | "strike" | "strong" | "tt"
            | "u" => {
                self.set_end_tag_span(tag_name, span);
                if !self.run_adoption_agency(tag_name) {
                    self.process_any_other_end_tag(tag_name, span);
                }
            }
            "applet" | "marquee" | "object" => {
                if !self.has_element_in_scope(tag_name) {
                    // Parse error — orphaned end tag.
                    self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                    return;
                }
                self.generate_implied_end_tags(None);
                self.set_end_tag_span(tag_name, span);
                self.pop_until(tag_name);
                self.active_formatting.clear_up_to_last_marker();
            }
            "br" => {
                // Parse error. Treat as <br>. Record as orphaned end tag.
                self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                self.reconstruct_active_formatting_elements();
                self.insert_html_element("br", &[], span);
                self.open_elements.pop();
                self.frameset_ok = false;
            }
            _ => {
                // Any other end tag.
                self.process_any_other_end_tag(tag_name, span);
            }
        }
    }

    fn process_any_other_end_tag(&mut self, tag_name: &str, span: Span) {
        let mut i = self.open_elements.len();
        while i > 0 {
            i -= 1;
            if let Some(id) = self.open_elements.get(i) {
                let node = self.arena.get(id);
                if node.is_html_element(tag_name) {
                    self.set_end_tag_span(tag_name, span);
                    self.generate_implied_end_tags(Some(tag_name));
                    // Pop up to and including this element.
                    while self.open_elements.len() > i {
                        self.open_elements.pop();
                    }
                    return;
                }
                if let Some(name) = node.tag_name()
                    && node.namespace() == Some(Namespace::Html)
                    && tables::is_special_element_html(name)
                {
                    // No matching element found — this is an orphaned end tag
                    self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
                    return;
                }
            }
        }
        // Reached bottom of stack without match — orphaned
        self.arena.orphaned_end_tags.push((tag_name.to_owned(), span));
    }

    pub(super) fn process_in_body_start_tag_html(&mut self, new_attrs: &[RawAttribute], span: Span) {
        // WHATWG §13.2.6.4.7: If there is a template element on the stack
        // of open elements, then ignore the token.
        if !self.template_insertion_modes.is_empty() {
            return;
        }
        // Merge attributes into the existing <html> element.
        if new_attrs.is_empty() {
            return;
        }
        if let Some(html_id) = self.open_elements.get(0) {
            let attrs = convert_attributes(new_attrs, span);
            let node = self.arena.get_mut(html_id);
            if let crate::tree::node::NodeKind::Element {
                attributes: ref mut existing,
                ..
            } = node.kind
            {
                for attr in attrs {
                    if !existing.iter().any(|a| a.name == attr.name) {
                        existing.push(attr);
                    }
                }
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.8 Text insertion mode
    // ========================================================================
    fn process_text(&mut self, token: Token) {
        match &token {
            Token::Character { ch, offset, line, col } => {
                self.insert_character(
                    *ch,
                    Position {
                        offset: *offset,
                        line: *line,
                        col: *col,
                    },
                );
            }
            Token::Eof => {
                self.open_elements.pop();
                self.mode = self.original_mode.take().unwrap_or(InsertionMode::InBody);
                self.process_token(token);
            }
            Token::EndTag { span, .. } => {
                // Set end tag span on current element.
                if let Some(id) = self.current_node() {
                    self.arena.get_mut(id).end_tag_span = Some(*span);
                }
                self.open_elements.pop();
                self.mode = self.original_mode.take().unwrap_or(InsertionMode::InBody);
            }
            _ => {}
        }
    }

    // Table modes and adoption agency are in separate files:
    // - table_modes.rs: InTable, InTableText, InCaption, InColumnGroup,
    //                    InTableBody, InRow, InCell
    // - adoption_agency.rs: run_adoption_agency()

    #[allow(clippy::too_many_lines)]
    fn process_in_select(&mut self, token: Token) {
        match &token {
            Token::Character { ch, offset, line, col } => {
                if *ch != '\0' {
                    // Customizable <select>: reconstruct active formatting
                    // elements so that text inside formatted option content
                    // gets wrapped in the correct elements (e.g. <b>).
                    self.reconstruct_active_formatting_elements();
                    self.insert_character(
                        *ch,
                        Position {
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
            Token::Doctype { .. } => {
                // Parse error. Ignore.
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } => {
                match tag_name.as_str() {
                    "html" => {
                        self.process_in_body(token);
                    }
                    "option" => {
                        if self.current_node_is("option") {
                            self.open_elements.pop();
                        }
                        self.reconstruct_active_formatting_elements();
                        self.insert_html_element(tag_name, attributes, *span);
                    }
                    "optgroup" => {
                        if self.current_node_is("option") {
                            self.open_elements.pop();
                        }
                        if self.current_node_is("optgroup") {
                            self.open_elements.pop();
                        }
                        self.insert_html_element(tag_name, attributes, *span);
                    }
                    "hr" => {
                        // WHATWG: <hr> in select — close option/optgroup, insert void hr.
                        if self.current_node_is("option") {
                            self.open_elements.pop();
                        }
                        if self.current_node_is("optgroup") {
                            self.open_elements.pop();
                        }
                        self.insert_html_element(tag_name, attributes, *span);
                        self.open_elements.pop();
                    }
                    "select" => {
                        // Parse error. Close existing select and reset.
                        self.pop_until("select");
                        self.reset_insertion_mode();
                    }
                    "input" | "textarea" => {
                        // Parse error. Close select and reprocess.
                        self.pop_until("select");
                        self.reset_insertion_mode();
                        self.process_token(token);
                    }
                    "script" | "template" => {
                        self.process_in_head(token);
                    }
                    // Table-related start tags in InSelect (not InSelectInTable):
                    // parse error, ignore.
                    "caption" | "table" | "tbody" | "tfoot" | "thead" | "tr" | "td" | "th" => {
                        // Parse error. Ignore.
                    }
                    "div" => {
                        // New spec: <div> in select closes current option/optgroup.
                        if self.current_node_is("option") {
                            self.open_elements.pop();
                        }
                        if self.current_node_is("optgroup") {
                            self.open_elements.pop();
                        }
                        self.reconstruct_active_formatting_elements();
                        self.insert_html_element(tag_name, attributes, *span);
                    }
                    "button" => {
                        // New spec: <button> in select closes open button/div.
                        if self.has_element_in_scope("button") {
                            self.generate_implied_end_tags(None);
                            self.pop_until("button");
                        } else if self.has_element_in_scope("div") {
                            self.generate_implied_end_tags(None);
                            self.pop_until("div");
                        }
                        self.reconstruct_active_formatting_elements();
                        self.insert_html_element(tag_name, attributes, *span);
                    }
                    "selectedcontent" => {
                        let id = self.insert_html_element(tag_name, attributes, *span);
                        self.selectedcontent_element = Some(id);
                    }
                    "datalist" => {
                        self.insert_html_element(tag_name, attributes, *span);
                    }
                    "plaintext" => {
                        // Insert plaintext and switch to PLAINTEXT state.
                        self.insert_html_element(tag_name, attributes, *span);
                        self.tokenizer.set_state(TokenizerState::PlainText);
                    }
                    _ => {
                        // Parse error. Insert the element anyway.
                        // SVG/MathML elements keep their namespace.
                        let ns = match tag_name.as_str() {
                            "svg" => Namespace::Svg,
                            "math" => Namespace::MathML,
                            _ => Namespace::Html,
                        };
                        let el_id = self.insert_element_for_token(tag_name, attributes, *span, ns);
                        // Void elements should be immediately popped.
                        if matches!(
                            tag_name.as_str(),
                            "area" | "br" | "embed" | "img" | "keygen" | "wbr" | "input" | "param" | "source" | "track"
                        ) {
                            self.open_elements.pop();
                        } else if crate::tables::is_formatting_element(tag_name) {
                            self.active_formatting
                                .push_with_noahs_ark(FormatEntry::Element(el_id), &self.arena);
                        }
                    }
                }
            }
            Token::EndTag { tag_name, .. } => {
                match tag_name.as_str() {
                    "optgroup" => {
                        // If current is option whose parent is optgroup, pop option first.
                        if self.current_node_is("option") {
                            let stack_len = self.open_elements.len();
                            if stack_len >= 2
                                && self
                                    .open_elements
                                    .get(stack_len - 2)
                                    .is_some_and(|id| self.arena.get(id).is_html_element("optgroup"))
                            {
                                self.open_elements.pop();
                            }
                        }
                        if self.current_node_is("optgroup") {
                            self.open_elements.pop();
                        }
                    }
                    "option" => {
                        if self.current_node_is("option") {
                            self.open_elements.pop();
                        }
                    }
                    "select" => {
                        self.clone_selected_into_selectedcontent();
                        self.pop_until("select");
                        self.reset_insertion_mode();
                    }
                    "template" => {
                        self.process_in_head(token);
                    }
                    // New spec: </div>, </button>, </datalist> in select
                    // close their matching element.
                    "div" | "button" | "datalist" => {
                        if self.has_element_in_scope(tag_name) {
                            self.generate_implied_end_tags(Some(tag_name));
                            self.pop_until(tag_name);
                        }
                    }
                    _ => {
                        // Customizable <select>: formatting end tags inside
                        // <option> need InBody-style processing (adoption agency),
                        // but only if the element is INSIDE the select (above it
                        // on the stack). Elements below the select must be ignored.
                        if crate::tables::is_formatting_element(tag_name)
                            && self.is_element_above_select_on_stack(tag_name)
                        {
                            self.process_in_body(token);
                        }
                        // Other end tags: parse error, ignore.
                    }
                }
            }
            Token::Eof => {
                self.clone_selected_into_selectedcontent();
                self.process_in_body(token);
            }
        }
    }

    fn process_in_select_in_table(&mut self, token: Token) {
        // WHATWG §13.2.6.4.18: table-related tags close the select.
        match &token {
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "caption" | "table" | "tbody" | "tfoot" | "thead" | "tr" | "td" | "th"
                ) =>
            {
                // Parse error. Close select, reprocess.
                self.pop_until("select");
                self.reset_insertion_mode();
                self.process_token(token);
            }
            Token::EndTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "caption" | "table" | "tbody" | "tfoot" | "thead" | "tr" | "td" | "th"
                ) =>
            {
                if self.has_element_in_table_scope(tag_name) {
                    self.pop_until("select");
                    self.reset_insertion_mode();
                    self.process_token(token);
                }
            }
            _ => self.process_in_select(token),
        }
    }

    /// WHATWG §13.2.6.4.18 The "in template" insertion mode.
    fn process_in_template(&mut self, token: Token) {
        match &token {
            // Character, Comment, Doctype → process using InBody rules.
            Token::Character { .. } | Token::Comment { .. } | Token::Doctype { .. } => {
                self.process_in_body(token);
            }

            // Start tags handled by InHead: base, basefont, bgsound, link,
            // meta, noframes, script, style, template, title.
            Token::StartTag { tag_name, .. }
                if matches!(
                    tag_name.as_str(),
                    "base"
                        | "basefont"
                        | "bgsound"
                        | "link"
                        | "meta"
                        | "noframes"
                        | "script"
                        | "style"
                        | "template"
                        | "title"
                ) =>
            {
                self.process_in_head(token);
            }

            // End tag "template" → process using InHead rules.
            Token::EndTag { tag_name, .. } if tag_name == "template" => {
                self.process_in_head(token);
            }

            // Start tags that switch to table-related modes.
            Token::StartTag { tag_name, .. }
                if matches!(tag_name.as_str(), "caption" | "colgroup" | "tbody" | "tfoot" | "thead") =>
            {
                self.template_insertion_modes.pop();
                self.template_insertion_modes.push(InsertionMode::InTable);
                self.mode = InsertionMode::InTable;
                self.process_token(token);
            }

            // Start tag "col" → switch to InColumnGroup.
            Token::StartTag { tag_name, .. } if tag_name == "col" => {
                self.template_insertion_modes.pop();
                self.template_insertion_modes.push(InsertionMode::InColumnGroup);
                self.mode = InsertionMode::InColumnGroup;
                self.process_token(token);
            }

            // Start tag "tr" → switch to InTableBody.
            Token::StartTag { tag_name, .. } if tag_name == "tr" => {
                self.template_insertion_modes.pop();
                self.template_insertion_modes.push(InsertionMode::InTableBody);
                self.mode = InsertionMode::InTableBody;
                self.process_token(token);
            }

            // Start tags "td", "th" → switch to InRow.
            Token::StartTag { tag_name, .. } if matches!(tag_name.as_str(), "td" | "th") => {
                self.template_insertion_modes.pop();
                self.template_insertion_modes.push(InsertionMode::InRow);
                self.mode = InsertionMode::InRow;
                self.process_token(token);
            }

            // Any other start tag → switch to InBody.
            Token::StartTag { .. } => {
                self.template_insertion_modes.pop();
                self.template_insertion_modes.push(InsertionMode::InBody);
                self.mode = InsertionMode::InBody;
                self.process_token(token);
            }

            // Any other end tag → ignore.
            Token::EndTag { .. } => {}

            // EOF.
            Token::Eof => {
                // If there is no template element on the stack of open elements,
                // stop parsing (fragment case).
                if self.template_insertion_modes.is_empty() {
                    return;
                }
                // Pop elements until a template element has been popped.
                self.pop_until("template");
                self.active_formatting.clear_up_to_last_marker();
                self.template_insertion_modes.pop();
                self.reset_insertion_mode();
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.19 After body
    // ========================================================================
    fn process_after_body(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.process_in_body(token);
            }
            Token::Comment { data, span } => {
                // Insert as child of first element (html).
                let html_id = self.open_elements.get(0).unwrap_or(self.arena.document_id());
                let comment_id = self.arena.create_comment(data.clone(), *span);
                self.arena.append_child(html_id, comment_id);
            }
            Token::Doctype { .. } | Token::Eof => {}
            Token::StartTag { tag_name, .. } if tag_name == "html" => {
                self.process_in_body(token);
            }
            Token::EndTag { tag_name, span, .. } if tag_name == "html" => {
                self.set_end_tag_span("html", *span);
                self.mode = InsertionMode::AfterAfterBody;
            }
            _ => {
                self.mode = InsertionMode::InBody;
                self.process_token(token);
            }
        }
    }

    // ========================================================================
    // §13.2.6.4.20–21 Frameset modes
    // ========================================================================
    fn process_in_frameset(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.insert_character(*ch, Self::token_position(&token));
            }
            Token::Comment { data, span } => {
                self.insert_comment(data, *span);
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "frameset" => {
                self.insert_html_element(tag_name, attributes, *span);
            }
            Token::EndTag { tag_name, .. } if tag_name == "frameset" => {
                self.open_elements.pop();
                if !self.is_fragment && !self.current_node_is("frameset") {
                    self.mode = InsertionMode::AfterFrameset;
                }
            }
            Token::StartTag {
                tag_name,
                attributes,
                span,
                ..
            } if tag_name == "frame" => {
                self.insert_html_element(tag_name, attributes, *span);
                self.open_elements.pop();
            }
            Token::StartTag { tag_name, .. } if tag_name == "noframes" => {
                self.process_in_head(token);
            }
            _ => {}
        }
    }

    fn process_after_frameset(&mut self, token: Token) {
        match &token {
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.insert_character(*ch, Self::token_position(&token));
            }
            Token::Comment { data, span } => {
                self.insert_comment(data, *span);
            }
            Token::EndTag { tag_name, .. } if tag_name == "html" => {
                self.mode = InsertionMode::AfterAfterFrameset;
            }
            Token::StartTag { tag_name, .. } if tag_name == "noframes" => {
                self.process_in_head(token);
            }
            _ => {}
        }
    }

    // ========================================================================
    // After after body / after after frameset
    // ========================================================================
    fn process_after_after_body(&mut self, token: Token) {
        match &token {
            Token::Comment { data, span } => {
                self.insert_comment_to_document(data, *span);
            }
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.process_in_body(token);
            }
            Token::Doctype { .. } | Token::Eof => {
                // Parse error. Ignore.
            }
            Token::StartTag { tag_name, .. } if tag_name == "html" => {
                self.process_in_body(token);
            }
            _ => {
                self.mode = InsertionMode::InBody;
                self.process_token(token);
            }
        }
    }

    fn process_after_after_frameset(&mut self, token: Token) {
        match &token {
            Token::Comment { data, span } => {
                self.insert_comment_to_document(data, *span);
            }
            Token::Character { ch, .. } if ch.is_ascii_whitespace() => {
                self.process_in_body(token);
            }
            Token::StartTag { tag_name, .. } if tag_name == "html" => {
                self.process_in_body(token);
            }
            Token::StartTag { tag_name, .. } if tag_name == "noframes" => {
                self.process_in_head(token);
            }
            _ => {}
        }
    }

    pub(super) fn reset_insertion_mode(&mut self) {
        for id in self.open_elements.iter_top_to_bottom() {
            let node = self.arena.get(*id);
            if let Some(name) = node.tag_name() {
                match name {
                    "select" => {
                        // WHATWG: Walk ancestors of select to find table or template.
                        // If table is found before template → InSelectInTable.
                        let select_pos = self.open_elements.position(*id);
                        let mut mode = InsertionMode::InSelect;
                        if let Some(pos) = select_pos {
                            for i in (0..pos).rev() {
                                if let Some(ancestor_id) = self.open_elements.get(i) {
                                    let ancestor = self.arena.get(ancestor_id);
                                    if ancestor.is_html_element("template") {
                                        break;
                                    }
                                    if ancestor.is_html_element("table") {
                                        mode = InsertionMode::InSelectInTable;
                                        break;
                                    }
                                }
                            }
                        }
                        self.mode = mode;
                        return;
                    }
                    "td" | "th" => {
                        self.mode = InsertionMode::InCell;
                        return;
                    }
                    "tr" => {
                        self.mode = InsertionMode::InRow;
                        return;
                    }
                    "tbody" | "thead" | "tfoot" => {
                        self.mode = InsertionMode::InTableBody;
                        return;
                    }
                    "caption" => {
                        self.mode = InsertionMode::InCaption;
                        return;
                    }
                    "table" => {
                        self.mode = InsertionMode::InTable;
                        return;
                    }
                    "template" => {
                        // WHATWG: use the current template insertion mode.
                        // Fallback to InBody if the stack is unexpectedly empty.
                        self.mode = self
                            .template_insertion_modes
                            .last()
                            .copied()
                            .unwrap_or(InsertionMode::InBody);
                        return;
                    }
                    "head" => {
                        self.mode = InsertionMode::InHead;
                        return;
                    }
                    "body" => {
                        self.mode = InsertionMode::InBody;
                        return;
                    }
                    "frameset" => {
                        self.mode = InsertionMode::InFrameset;
                        return;
                    }
                    "html" => {
                        if self.head_element.is_none() {
                            self.mode = InsertionMode::BeforeHead;
                        } else {
                            self.mode = InsertionMode::AfterHead;
                        }
                        return;
                    }
                    _ => {}
                }
            }
        }
        self.mode = InsertionMode::InBody;
    }
}

/// Quirks-triggering public identifiers (exact match).
const QUIRKS_PUBLIC_IDS: &[&str] = &[
    "-//w3o//dtd w3 html strict 3.0//en//",
    "-/w3c/dtd html 4.0 transitional/en",
    "html",
];

/// Quirks-triggering public identifier prefixes.
const QUIRKS_PUBLIC_PREFIXES: &[&str] = &[
    "+//silmaril//dtd html pro v0r11 19970101//",
    "-//as//dtd html 3.0 aswedit 7.0//",
    "-//advasoft ltd//dtd html 3.0 aswedit 7.0//",
    "-//ietf//dtd html 2.0 level 1//",
    "-//ietf//dtd html 2.0 level 2//",
    "-//ietf//dtd html 2.0 strict level 1//",
    "-//ietf//dtd html 2.0 strict level 2//",
    "-//ietf//dtd html 2.0 strict//",
    "-//ietf//dtd html 2.0//",
    "-//ietf//dtd html 2.1e//",
    "-//ietf//dtd html 3.0//",
    "-//ietf//dtd html 3.2 final//",
    "-//ietf//dtd html 3.2//",
    "-//ietf//dtd html 3//",
    "-//ietf//dtd html level 0//",
    "-//ietf//dtd html level 1//",
    "-//ietf//dtd html level 2//",
    "-//ietf//dtd html level 3//",
    "-//ietf//dtd html strict level 0//",
    "-//ietf//dtd html strict level 1//",
    "-//ietf//dtd html strict level 2//",
    "-//ietf//dtd html strict level 3//",
    "-//ietf//dtd html strict//",
    "-//ietf//dtd html//",
    "-//metrius//dtd metrius presentational//",
    "-//microsoft//dtd internet explorer 2.0 html strict//",
    "-//microsoft//dtd internet explorer 2.0 html//",
    "-//microsoft//dtd internet explorer 2.0 tables//",
    "-//microsoft//dtd internet explorer 3.0 html strict//",
    "-//microsoft//dtd internet explorer 3.0 html//",
    "-//microsoft//dtd internet explorer 3.0 tables//",
    "-//netscape comm. corp.//dtd html//",
    "-//netscape comm. corp.//dtd strict html//",
    "-//o'reilly and associates//dtd html 2.0//",
    "-//o'reilly and associates//dtd html extended 1.0//",
    "-//o'reilly and associates//dtd html extended relaxed 1.0//",
    "-//sq//dtd html 2.0 hotmetal + extensions//",
    "-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//",
    "-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//",
    "-//spyglass//dtd html 2.0 extended//",
    "-//sun microsystems corp.//dtd hotjava html//",
    "-//sun microsystems corp.//dtd hotjava strict html//",
    "-//w3c//dtd html 3 1995-03-24//",
    "-//w3c//dtd html 3.2 draft//",
    "-//w3c//dtd html 3.2 final//",
    "-//w3c//dtd html 3.2//",
    "-//w3c//dtd html 3.2s draft//",
    "-//w3c//dtd html 4.0 frameset//",
    "-//w3c//dtd html 4.0 transitional//",
    "-//w3c//dtd html experimental 19960712//",
    "-//w3c//dtd html experimental 970421//",
    "-//w3c//dtd w3 html//",
    "-//w3o//dtd w3 html 3.0//",
    "-//webtechs//dtd mozilla html 2.0//",
    "-//webtechs//dtd mozilla html//",
];

/// Determine quirks mode from DOCTYPE per WHATWG §13.2.6.4.1.
fn is_quirks_mode_doctype(name: Option<&str>, public_id: Option<&str>, system_id: Option<&str>) -> bool {
    if name != Some("html") {
        return true;
    }

    let pub_id = public_id.unwrap_or("");
    let sys_id = system_id.unwrap_or("");
    let pub_lower = pub_id.to_ascii_lowercase();

    for &qid in QUIRKS_PUBLIC_IDS {
        if pub_lower == qid {
            return true;
        }
    }

    for &prefix in QUIRKS_PUBLIC_PREFIXES {
        if pub_lower.starts_with(prefix) {
            return true;
        }
    }

    // System identifier quirks: if system ID is missing and public ID
    // starts with specific prefixes.
    if sys_id.is_empty()
        && (pub_lower.starts_with("-//w3c//dtd html 4.01 frameset//")
            || pub_lower.starts_with("-//w3c//dtd html 4.01 transitional//"))
    {
        return true;
    }

    // System identifier that triggers quirks.
    if sys_id.eq_ignore_ascii_case("http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd") {
        return true;
    }

    false
}

/// Convert tokenizer `RawAttribute`s to tree `Attribute`s.
fn convert_attributes(raw_attrs: &[RawAttribute], _tag_span: Span) -> Vec<Attribute> {
    raw_attrs
        .iter()
        .map(|ra| Attribute {
            name: ra.raw_name.clone(),
            value: ra.raw_value.clone(),
            name_span: ra.name,
            value_span: ra.value,
            spaces_before_span: ra.spaces_before,
            spaces_before_eq_span: ra.spaces_before_eq,
            equal_span: ra.equal,
            spaces_after_eq_span: ra.spaces_after_eq,
            quote_start_span: ra.quote_start,
            quote_end_span: ra.quote_end,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_tree(html: &str) -> Arena {
        let is_fragment = is_fragment(html);
        let mut builder = TreeBuilder::new(html, is_fragment);
        builder.run();
        builder.arena
    }

    fn is_fragment(html: &str) -> bool {
        !html.trim_start().to_lowercase().starts_with("<!doctype")
            && !html.trim_start().to_lowercase().starts_with("<html")
    }

    fn child_tag_names(arena: &Arena, parent_id: NodeId) -> Vec<String> {
        arena
            .get(parent_id)
            .children
            .iter()
            .filter_map(|&id| arena.get(id).tag_name().map(str::to_owned))
            .collect()
    }

    #[test]
    fn simple_element() {
        let arena = parse_tree("<div>hello</div>");
        let doc = arena.get(arena.document_id());
        // Fragment: doc → div → "hello" (no ghost body)
        let div_id = doc.children[0];
        let div = arena.get(div_id);
        assert_eq!(div.tag_name(), Some("div"));
        assert!(!div.is_implicit);
    }

    #[test]
    fn full_document() {
        let arena = parse_tree("<!DOCTYPE html><html><head></head><body><p>text</p></body></html>");
        let doc = arena.get(arena.document_id());
        // doctype + html
        assert_eq!(doc.children.len(), 2);

        let html_id = doc.children[1];
        let html = arena.get(html_id);
        assert_eq!(html.tag_name(), Some("html"));
        assert!(!html.is_implicit);

        let children = child_tag_names(&arena, html_id);
        assert_eq!(children, vec!["head", "body"]);
    }

    #[test]
    fn implicit_html_head_body() {
        let arena = parse_tree("<!DOCTYPE html><p>hello</p>");
        let doc = arena.get(arena.document_id());
        // doctype + html(implicit)
        let html_id = doc.children[1];
        let html = arena.get(html_id);
        assert_eq!(html.tag_name(), Some("html"));
        assert!(html.is_implicit);

        let children = child_tag_names(&arena, html_id);
        assert_eq!(children, vec!["head", "body"]);

        // body has <p>
        let body_id = html.children[1];
        let p_id = arena.get(body_id).children[0];
        assert_eq!(arena.get(p_id).tag_name(), Some("p"));
    }

    #[test]
    fn void_elements() {
        let arena = parse_tree("<br><hr><img>");
        let doc = arena.get(arena.document_id());
        // Fragment: directly under document root
        let children = child_tag_names(&arena, arena.document_id());
        assert_eq!(children, vec!["br", "hr", "img"]);
        let _ = doc;
    }

    #[test]
    fn nested_elements() {
        let arena = parse_tree("<div><span><em>text</em></span></div>");
        let doc = arena.get(arena.document_id());
        let div_id = doc.children[0];
        let span_id = arena.get(div_id).children[0];
        let em_id = arena.get(span_id).children[0];
        assert_eq!(arena.get(em_id).tag_name(), Some("em"));
    }

    #[test]
    fn heading_closes_previous() {
        let arena = parse_tree("<h1>one<h2>two</h2>");
        let doc = arena.get(arena.document_id());
        let children = child_tag_names(&arena, doc.children[0].min(arena.document_id()));
        // Fragment: h1 and h2 directly under document
        let top_children = child_tag_names(&arena, arena.document_id());
        assert_eq!(top_children, vec!["h1", "h2"]);
        let _ = children;
    }

    #[test]
    fn comment_node() {
        let arena = parse_tree("<!-- hello --><p>text</p>");
        let doc = arena.get(arena.document_id());
        let first_child = doc.children[0];
        assert!(matches!(
            arena.get(first_child).kind,
            crate::tree::node::NodeKind::Comment { .. }
        ));
    }
}
