//! `table-row-column-alignment` rule: validates table grid consistency.
//!
//! For each `<table>` element, builds a 2D grid model accounting for
//! `colspan` and `rowspan` attributes, then checks that all rows have
//! a consistent number of columns.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `table-row-column-alignment` rule.
pub struct TableRowColumnAlignment;

/// Cell type in the grid model.
#[derive(Debug, Clone, PartialEq, Eq)]
enum CellType {
    /// Empty placeholder (not yet filled by any cell).
    Empty,
    /// A regular cell (or first cell of a colspan).
    Cell,
    /// A cell continued from a colspan (`→`).
    ColSpan,
    /// A cell continued from a rowspan (`↓`).
    RowSpan,
    /// Overlap: rowspan and colspan conflict.
    Overlap,
}

/// Find child element `NodeId`s matching any of the given tag names (case-insensitive).
fn find_child_elements_by_tags(arena: &DomArena, parent_id: NodeId, tags: &[&str]) -> Vec<NodeId> {
    let Some(node) = arena.get(parent_id) else {
        return vec![];
    };
    let children = node.children();
    children
        .iter()
        .filter(|&&id| {
            arena.get(id).is_some_and(|n| {
                n.as_element()
                    .is_some_and(|el| tags.iter().any(|t| el.base.node_name.eq_ignore_ascii_case(t)))
            })
        })
        .copied()
        .collect()
}

/// Get an attribute value from an element's attributes by name (case-insensitive).
fn get_attr_value(arena: &DomArena, el_id: NodeId, attr_name: &str) -> Option<String> {
    let el = arena.get(el_id)?.as_element()?;
    for attr in &el.attributes {
        if let MLASTAttr::HTMLAttr(html_attr) = attr
            && html_attr.name.raw.eq_ignore_ascii_case(attr_name)
        {
            return Some(html_attr.value.raw.clone());
        }
    }
    None
}

/// Parse an attribute as a positive integer, defaulting to `default_val`.
fn parse_span_attr(arena: &DomArena, el_id: NodeId, attr_name: &str, default_val: usize) -> usize {
    get_attr_value(arena, el_id, attr_name)
        .and_then(|v| v.parse::<usize>().ok())
        .filter(|&v| v >= 1)
        .unwrap_or(default_val)
}

/// Section-separated table rows.
struct TableSections {
    thead: Vec<NodeId>,
    tbody: Vec<NodeId>,
    tfoot: Vec<NodeId>,
}

impl TableSections {
    fn all_rows(&self) -> Vec<NodeId> {
        let mut rows = Vec::new();
        rows.extend_from_slice(&self.thead);
        rows.extend_from_slice(&self.tbody);
        rows.extend_from_slice(&self.tfoot);
        rows
    }
}

/// Collect `<tr>` rows within a table, separated by section (thead/tbody/tfoot).
/// Direct `<tr>` children are treated as tbody rows (matching TS behavior).
fn collect_sections(arena: &DomArena, table_id: NodeId) -> TableSections {
    let mut sections = TableSections {
        thead: Vec::new(),
        tbody: Vec::new(),
        tfoot: Vec::new(),
    };

    let Some(table_node) = arena.get(table_id) else {
        return sections;
    };

    for &child_id in table_node.children() {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        let Some(el) = child.as_element() else {
            continue;
        };
        let name = el.base.node_name.as_str();

        if name.eq_ignore_ascii_case("tr") {
            sections.tbody.push(child_id);
        } else if name.eq_ignore_ascii_case("thead") {
            sections
                .thead
                .extend(find_child_elements_by_tags(arena, child_id, &["tr"]));
        } else if name.eq_ignore_ascii_case("tfoot") {
            sections
                .tfoot
                .extend(find_child_elements_by_tags(arena, child_id, &["tr"]));
        } else if name.eq_ignore_ascii_case("tbody") {
            sections
                .tbody
                .extend(find_child_elements_by_tags(arena, child_id, &["tr"]));
        }
    }

    sections
}

/// Build a 2D grid from table rows, returning `(grid, row_node_ids)`.
///
/// The grid accounts for `colspan` and `rowspan` attributes.
///
/// Follows WHATWG §4.9.12.1 "Forming a table": rowspan extends `y_height`
/// beyond the number of actual `<tr>` elements when the span overflows.
fn build_grid(arena: &DomArena, rows: &[NodeId]) -> Vec<Vec<CellType>> {
    let mut grid: Vec<Vec<CellType>> = Vec::with_capacity(rows.len());

    // Initialize rows for actual <tr> elements
    for _ in 0..rows.len() {
        grid.push(Vec::new());
    }

    for (row_idx, &row_id) in rows.iter().enumerate() {
        let cells = find_child_elements_by_tags(arena, row_id, &["td", "th"]);
        let mut col_idx = 0;

        for &cell_id in &cells {
            let colspan = parse_span_attr(arena, cell_id, "colspan", 1);
            let rowspan = parse_span_attr(arena, cell_id, "rowspan", 1);

            // Find next available column (skip over rowspan-occupied cells)
            while col_idx < grid[row_idx].len() && grid[row_idx][col_idx] == CellType::RowSpan {
                col_idx += 1;
            }

            for c in 0..colspan {
                let actual_col = col_idx + c;
                let current_row_len = grid[row_idx].len();

                // Place cell in current row
                let cell_type = if c == 0 { CellType::Cell } else { CellType::ColSpan };
                if actual_col < current_row_len {
                    match grid[row_idx][actual_col] {
                        CellType::RowSpan => {
                            grid[row_idx][actual_col] = CellType::Overlap;
                        }
                        CellType::Empty => {
                            grid[row_idx][actual_col] = cell_type;
                        }
                        _ => {}
                    }
                } else {
                    while grid[row_idx].len() < actual_col {
                        grid[row_idx].push(CellType::Empty);
                    }
                    grid[row_idx].push(cell_type);
                }

                // WHATWG: "While y_current + cell_row_span − 1 ≥ y_height,
                //          increase y_height by 1."
                // Extend grid for rowspan overflow (add virtual rows).
                while grid.len() < row_idx + rowspan {
                    grid.push(Vec::new());
                }

                // Place rowspan continuations in subsequent rows
                for r in 1..rowspan {
                    let target_row = row_idx + r;
                    while grid[target_row].len() <= actual_col {
                        grid[target_row].push(CellType::Empty);
                    }
                    grid[target_row][actual_col] = CellType::RowSpan;
                }
            }

            col_idx += colspan;
        }
    }

    grid
}

/// Determine the base (expected) column count from a grid slice.
///
/// For grids with 3+ rows, picks the row length closest to the average.
/// Otherwise uses the first row's length.
fn get_base_col_length_from_grid(grid: &[Vec<CellType>]) -> usize {
    if grid.is_empty() {
        return 0;
    }

    if grid.len() >= 3 {
        let total: usize = grid.iter().map(Vec::len).sum();
        let average = (total + grid.len() / 2) / grid.len(); // rounded
        grid.iter()
            .map(Vec::len)
            .min_by_key(|&len| len.abs_diff(average))
            .unwrap_or(0)
    } else {
        grid[0].len()
    }
}

/// Find the position of a specific attribute on an element.
fn find_attr_position(el: &markuplint_dom::node::ElementData, attr_name: &str) -> Option<(u32, u32, String)> {
    for attr in &el.attributes {
        if let markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) = attr
            && html_attr.node_name.eq_ignore_ascii_case(attr_name)
        {
            return Some((html_attr.name.line, html_attr.name.col, html_attr.raw.clone()));
        }
    }
    None
}

/// Find the first cell that extends past `base_col_length` in a grid row.
/// Returns `(line, col, raw)` of the unexpected cell element.
fn find_unexpected_cell(
    arena: &DomArena,
    cells: &[NodeId],
    grid_row: &[CellType],
    base_col_length: usize,
) -> Option<(u32, u32, String)> {
    // Walk through grid columns, tracking which cell we're in.
    // When we cross base_col_length with a Cell (not RowSpan/ColSpan),
    // that's the unexpected cell.
    let mut cell_idx = 0;
    for (col, ct) in grid_row.iter().enumerate() {
        match ct {
            CellType::Cell => {
                if col >= base_col_length
                    && cell_idx < cells.len()
                    && let Some(el) = arena.get(cells[cell_idx]).and_then(|n| n.as_element())
                {
                    return Some((el.base.line, el.base.col, el.base.raw.clone()));
                }
                cell_idx += 1;
            }
            CellType::RowSpan | CellType::Empty | CellType::ColSpan | CellType::Overlap => {}
        }
    }
    None
}

/// Determine the base column count, using section priority: thead > tfoot > tbody.
/// Matches TS `Grid.getBaseColLength()`.
fn get_section_base_col_length(arena: &DomArena, sections: &TableSections) -> usize {
    // Priority: thead > tfoot > tbody (matching TS)
    if !sections.thead.is_empty() {
        let grid = build_grid(arena, &sections.thead);
        return get_base_col_length_from_grid(&grid);
    }
    if !sections.tfoot.is_empty() {
        let grid = build_grid(arena, &sections.tfoot);
        return get_base_col_length_from_grid(&grid);
    }
    let grid = build_grid(arena, &sections.tbody);
    get_base_col_length_from_grid(&grid)
}

impl Rule for TableRowColumnAlignment {
    fn id(&self) -> &'static str {
        "table-row-column-alignment"
    }

    #[allow(clippy::too_many_lines)]
    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let mut violations = Vec::new();

        // Find all <table> elements
        for i in 0..arena.len() {
            let Some(DomNode::Element(el)) = arena.get(i) else {
                continue;
            };
            if !el.base.node_name.eq_ignore_ascii_case("table") {
                continue;
            }

            let table_id = el.base.id;
            let sections = collect_sections(arena, table_id);
            let rows = sections.all_rows();

            if rows.is_empty() {
                continue;
            }

            // Check rowspan overflow per section (TS: getOverflowRowSpan)
            // A rowspan that extends beyond its section is an error.
            for section_rows in [&sections.thead, &sections.tbody, &sections.tfoot] {
                if section_rows.is_empty() {
                    continue;
                }
                let num_section_rows = section_rows.len();
                for (row_idx, &row_id) in section_rows.iter().enumerate() {
                    let cells = find_child_elements_by_tags(arena, row_id, &["td", "th"]);
                    for &cell_id in &cells {
                        let rowspan = parse_span_attr(arena, cell_id, "rowspan", 1);
                        if rowspan > 1 && row_idx + rowspan > num_section_rows {
                            // Find the rowspan attribute node for precise reporting
                            if let Some(cell_el) = arena.get(cell_id).and_then(|n| n.as_element()) {
                                let (line, col, raw) = find_attr_position(cell_el, "rowspan").unwrap_or((
                                    cell_el.base.line,
                                    cell_el.base.col,
                                    cell_el.base.raw.clone(),
                                ));
                                violations.push(Violation {
                                    rule_id: self.id().to_string(),
                                    name: None,
                                    severity: config.severity,
                                    message: "Exceeds available rows".to_string(),
                                    line,
                                    col,
                                    raw,
                                    reason: None,
                                });
                            }
                        }
                    }
                }
            }

            // Build grids per section (TS builds separate grids per thead/tbody/tfoot
            // so rowspan doesn't cross section boundaries).
            // Check overlaps and column misalignment per section.
            let base_col_length = get_section_base_col_length(arena, &sections);
            if base_col_length == 0 {
                continue;
            }

            let mut has_table_overlap = false;
            for section_rows in [&sections.thead, &sections.tbody, &sections.tfoot] {
                if section_rows.is_empty() {
                    continue;
                }
                let grid = build_grid(arena, section_rows);

                // Check for overlaps
                if grid.iter().any(|row| row.contains(&CellType::Overlap)) {
                    has_table_overlap = true;
                    break;
                }

                // Check each row for column count mismatch
                // Only check actual rows (skip virtual rows from rowspan overflow)
                for (row_idx, row) in grid.iter().enumerate() {
                    if row_idx >= section_rows.len() {
                        break; // Virtual row from rowspan overflow
                    }
                    let col_length = row.len();
                    let Some(row_node) = arena.get(section_rows[row_idx]) else {
                        continue;
                    };
                    let Some(row_el) = row_node.as_element() else {
                        continue;
                    };

                    if col_length > base_col_length {
                        let diff = col_length - base_col_length;
                        let col_word = if diff == 1 { "column" } else { "columns" };
                        let cells = find_child_elements_by_tags(arena, section_rows[row_idx], &["td", "th"]);
                        let unexpected = find_unexpected_cell(arena, &cells, &grid[row_idx], base_col_length);
                        let (line, col, raw) =
                            unexpected.unwrap_or((row_el.base.line, row_el.base.col, row_el.base.raw.clone()));
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: config.severity,
                            message: format!("{diff} extra {col_word} in a row"),
                            line,
                            col,
                            raw,
                            reason: None,
                        });
                    } else if col_length < base_col_length {
                        let diff = base_col_length - col_length;
                        let col_word = if diff == 1 { "column" } else { "columns" };
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: config.severity,
                            message: format!("{diff} missing {col_word} in a row"),
                            line: row_el.base.line,
                            col: row_el.base.col,
                            raw: row_el.base.raw.clone(),
                        reason: None,
            });
                    }
                }
            }

            if has_table_overlap {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: "Rowspan and colspan are causing cell overlap".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
            reason: None,
                });
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_token(raw: &str) -> MLASTToken {
        MLASTToken {
            uuid: String::new(),
            raw: raw.to_string(),
            offset: 0,
            line: 1,
            col: 1,
        }
    }

    fn make_html_attr(name: &str, value: &str) -> MLASTAttr {
        MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: format!("{name}=\"{value}\""),
            offset: 0,
            line: 1,
            col: 1,
            node_name: name.to_string(),
            spaces_before_name: make_token(""),
            name: make_token(name),
            spaces_before_equal: make_token(""),
            equal: make_token("="),
            spaces_after_equal: make_token(""),
            start_quote: make_token("\""),
            value: make_token(value),
            end_quote: make_token("\""),
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }))
    }

    fn make_element(
        builder: &mut DomArenaBuilder,
        tag: &str,
        parent: NodeId,
        line: u32,
        attrs: Vec<MLASTAttr>,
    ) -> NodeId {
        let el_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: format!("{tag}-{line}"),
                raw: format!("<{tag}>"),
                offset: 0,
                line,
                col: 1,
                node_name: tag.to_string(),
                parent: Some(parent),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: attrs,
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
        }
        el_id
    }

    /// Build a table arena with rows. Each row is a list of (colspan, rowspan) tuples.
    fn make_table_arena(rows: &[Vec<(usize, usize)>]) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let table_id = make_element(&mut builder, "table", doc_id, 1, vec![]);

        let mut row_ids = Vec::new();
        for (row_idx, cols) in rows.iter().enumerate() {
            let row_line = (row_idx as u32) + 2;
            let tr_id = make_element(&mut builder, "tr", table_id, row_line, vec![]);

            let mut cell_ids = Vec::new();
            for (col_idx, &(colspan, rowspan)) in cols.iter().enumerate() {
                let mut attrs = Vec::new();
                if colspan > 1 {
                    attrs.push(make_html_attr("colspan", &colspan.to_string()));
                }
                if rowspan > 1 {
                    attrs.push(make_html_attr("rowspan", &rowspan.to_string()));
                }
                let cell_line = row_line;
                let td_id = make_element(&mut builder, "td", tr_id, cell_line, attrs);
                // Adjust col for readability
                if let Some(DomNode::Element(e)) = builder.get_mut(td_id) {
                    e.base.col = (col_idx as u32) + 1;
                }
                cell_ids.push(td_id);
            }

            // Set tr children
            if let Some(DomNode::Element(e)) = builder.get_mut(tr_id) {
                e.base.children = cell_ids;
            }
            row_ids.push(tr_id);
        }

        // Set table children
        if let Some(DomNode::Element(e)) = builder.get_mut(table_id) {
            e.base.children = row_ids;
        }

        // Set doc children
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![table_id];
        }

        builder.finish()
    }

    #[test]
    fn valid_table_no_violations() {
        // 3 rows, each with 3 cells (no spans)
        let arena = make_table_arena(&[
            vec![(1, 1), (1, 1), (1, 1)],
            vec![(1, 1), (1, 1), (1, 1)],
            vec![(1, 1), (1, 1), (1, 1)],
        ]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "Expected no violations but got: {violations:?}");
    }

    #[test]
    fn mismatched_column_count() {
        // Row 1: 3 cells, Row 2: 2 cells → 1 missing column
        let arena = make_table_arena(&[vec![(1, 1), (1, 1), (1, 1)], vec![(1, 1), (1, 1)]]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Expected 1 violation but got: {violations:?}");
        assert!(
            violations[0].message.contains("missing"),
            "Expected missing column message: {}",
            violations[0].message
        );
    }

    #[test]
    fn colspan_correct_count() {
        // Row 1: 1 cell with colspan=3 → 3 columns
        // Row 2: 3 cells → 3 columns
        // Should be valid
        let arena = make_table_arena(&[vec![(3, 1)], vec![(1, 1), (1, 1), (1, 1)]]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "Expected no violations but got: {violations:?}");
    }

    #[test]
    fn extra_columns_in_row() {
        // Row 1: 2 cells, Row 2: 3 cells → Row 2 has 1 extra column
        let arena = make_table_arena(&[vec![(1, 1), (1, 1)], vec![(1, 1), (1, 1), (1, 1)]]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Expected 1 violation but got: {violations:?}");
        // The first row has fewer columns (2 vs 3 expected), so it reports missing
        // OR the second row has extra. The base_col_length is the first row's = 2,
        // so row 2 has 1 extra column.
        assert!(
            violations[0].message.contains("extra") || violations[0].message.contains("missing"),
            "Expected column mismatch message: {}",
            violations[0].message
        );
    }

    #[test]
    fn rowspan_valid() {
        // Row 1: cell with rowspan=2, cell
        // Row 2: cell (the rowspan occupies one slot)
        // Grid: row1=[2 cols], row2=[2 cols (1 from rowspan + 1 actual)]
        let arena = make_table_arena(&[vec![(1, 2), (1, 1)], vec![(1, 1)]]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "Expected no violations but got: {violations:?}");
    }

    #[test]
    fn table_with_thead_tbody() {
        // Table with <thead> and <tbody> sections
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let table_id = make_element(&mut builder, "table", doc_id, 1, vec![]);
        let thead_id = make_element(&mut builder, "thead", table_id, 2, vec![]);
        let tbody_id = make_element(&mut builder, "tbody", table_id, 4, vec![]);

        // thead: 1 row with 3 cells
        let tr1_id = make_element(&mut builder, "tr", thead_id, 2, vec![]);
        let th1 = make_element(&mut builder, "th", tr1_id, 2, vec![]);
        let th2 = make_element(&mut builder, "th", tr1_id, 2, vec![]);
        let th3 = make_element(&mut builder, "th", tr1_id, 2, vec![]);
        if let Some(DomNode::Element(e)) = builder.get_mut(tr1_id) {
            e.base.children = vec![th1, th2, th3];
        }

        // tbody: 1 row with 2 cells (missing 1)
        let tr2_id = make_element(&mut builder, "tr", tbody_id, 5, vec![]);
        let td1 = make_element(&mut builder, "td", tr2_id, 5, vec![]);
        let td2 = make_element(&mut builder, "td", tr2_id, 5, vec![]);
        if let Some(DomNode::Element(e)) = builder.get_mut(tr2_id) {
            e.base.children = vec![td1, td2];
        }

        if let Some(DomNode::Element(e)) = builder.get_mut(thead_id) {
            e.base.children = vec![tr1_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(tbody_id) {
            e.base.children = vec![tr2_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(table_id) {
            e.base.children = vec![thead_id, tbody_id];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![table_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Expected 1 violation but got: {violations:?}");
        assert!(
            violations[0].message.contains("missing"),
            "Expected missing: {}",
            violations[0].message
        );
    }

    #[test]
    fn three_rows_averaging_logic() {
        // 4 rows: 3 cols, 5 cols, 4 cols, 3 cols
        // Average = (3+5+4+3 + 2) / 4 = 17/4 = 4 (rounded)
        // Closest row length to average 4 is 4 (exact match from row 3)
        // So base = 4.
        // Row 1 (3 cols): 1 missing column
        // Row 2 (5 cols): 1 extra column
        // Row 3 (4 cols): matches base
        // Row 4 (3 cols): 1 missing column
        let arena = make_table_arena(&[
            vec![(1, 1), (1, 1), (1, 1)],
            vec![(1, 1), (1, 1), (1, 1), (1, 1), (1, 1)],
            vec![(1, 1), (1, 1), (1, 1), (1, 1)],
            vec![(1, 1), (1, 1), (1, 1)],
        ]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));

        // Expect 3 violations: rows 1, 2, and 4 deviate from base=4
        assert_eq!(
            violations.len(),
            3,
            "Expected 3 violations (rows with 3, 5, 3 cols vs base 4), got: {violations:?}"
        );

        let missing: Vec<_> = violations.iter().filter(|v| v.message.contains("missing")).collect();
        let extra: Vec<_> = violations.iter().filter(|v| v.message.contains("extra")).collect();
        assert_eq!(
            missing.len(),
            2,
            "Expected 2 missing-column violations, got: {missing:?}"
        );
        assert_eq!(extra.len(), 1, "Expected 1 extra-column violation, got: {extra:?}");
    }

    #[test]
    fn rowspan_overflow_in_thead_section() {
        // rowspan=3 in a 1-row thead produces "Exceeds available rows"
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let table_id = make_element(&mut builder, "table", doc_id, 1, vec![]);
        let thead_id = make_element(&mut builder, "thead", table_id, 2, vec![]);

        // thead: 1 row with 1 cell that has rowspan=3
        let tr_id = make_element(&mut builder, "tr", thead_id, 3, vec![]);
        let td_id = make_element(&mut builder, "td", tr_id, 3, vec![make_html_attr("rowspan", "3")]);
        if let Some(DomNode::Element(e)) = builder.get_mut(tr_id) {
            e.base.children = vec![td_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(thead_id) {
            e.base.children = vec![tr_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(table_id) {
            e.base.children = vec![thead_id];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![table_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.iter().any(|v| v.message == "Exceeds available rows"),
            "Expected 'Exceeds available rows' violation for rowspan=3 in 1-row thead, got: {violations:?}"
        );
    }

    #[test]
    fn thead_defines_base_column_count_over_tbody() {
        // thead has 3 columns, tbody has 2 columns → tbody gets "missing" violation
        // This tests section priority: thead defines the base column count
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let table_id = make_element(&mut builder, "table", doc_id, 1, vec![]);
        let thead_id = make_element(&mut builder, "thead", table_id, 2, vec![]);
        let tbody_id = make_element(&mut builder, "tbody", table_id, 5, vec![]);

        // thead: 1 row with 3 cells
        let tr1_id = make_element(&mut builder, "tr", thead_id, 3, vec![]);
        let th1 = make_element(&mut builder, "th", tr1_id, 3, vec![]);
        let th2 = make_element(&mut builder, "th", tr1_id, 3, vec![]);
        let th3 = make_element(&mut builder, "th", tr1_id, 3, vec![]);
        if let Some(DomNode::Element(e)) = builder.get_mut(tr1_id) {
            e.base.children = vec![th1, th2, th3];
        }

        // tbody: 1 row with 2 cells
        let tr2_id = make_element(&mut builder, "tr", tbody_id, 6, vec![]);
        let td1 = make_element(&mut builder, "td", tr2_id, 6, vec![]);
        let td2 = make_element(&mut builder, "td", tr2_id, 6, vec![]);
        if let Some(DomNode::Element(e)) = builder.get_mut(tr2_id) {
            e.base.children = vec![td1, td2];
        }

        if let Some(DomNode::Element(e)) = builder.get_mut(thead_id) {
            e.base.children = vec![tr1_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(tbody_id) {
            e.base.children = vec![tr2_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(table_id) {
            e.base.children = vec![thead_id, tbody_id];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![table_id];
        }

        let arena = builder.finish();
        let base = get_section_base_col_length(&arena, &collect_sections(&arena, 2));
        assert_eq!(base, 3, "Base column count should come from thead (3 columns)");

        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &spec(), &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Expected 1 violation, got: {violations:?}");
        assert!(
            violations[0].message.contains("missing"),
            "tbody row should have missing columns, got: {}",
            violations[0].message
        );
    }

    #[test]
    fn find_unexpected_cell_reports_at_td_position() {
        // Row with 3 cells, base=2 → extra column violation should report at td position
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let table_id = make_element(&mut builder, "table", doc_id, 1, vec![]);

        // Row 1: 2 cells (defines base=2)
        let tr1_id = make_element(&mut builder, "tr", table_id, 2, vec![]);
        let td1a = make_element(&mut builder, "td", tr1_id, 2, vec![]);
        let td1b = make_element(&mut builder, "td", tr1_id, 2, vec![]);
        if let Some(DomNode::Element(e)) = builder.get_mut(td1a) {
            e.base.col = 1;
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(td1b) {
            e.base.col = 2;
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(tr1_id) {
            e.base.children = vec![td1a, td1b];
        }

        // Row 2: 3 cells (1 extra)
        let tr2_id = make_element(&mut builder, "tr", table_id, 3, vec![]);
        let td2a = make_element(&mut builder, "td", tr2_id, 3, vec![]);
        let td2b = make_element(&mut builder, "td", tr2_id, 3, vec![]);
        let td2c = make_element(&mut builder, "td", tr2_id, 3, vec![]);
        if let Some(DomNode::Element(e)) = builder.get_mut(td2a) {
            e.base.col = 1;
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(td2b) {
            e.base.col = 2;
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(td2c) {
            e.base.col = 10; // Distinctive col value for the extra td
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(tr2_id) {
            e.base.children = vec![td2a, td2b, td2c];
        }

        if let Some(DomNode::Element(e)) = builder.get_mut(table_id) {
            e.base.children = vec![tr1_id, tr2_id];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![table_id];
        }

        let arena = builder.finish();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &spec(), &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Expected 1 violation, got: {violations:?}");
        assert!(
            violations[0].message.contains("extra"),
            "Expected extra column message: {}",
            violations[0].message
        );
        // The violation should report at the td position (col=10), not the tr position (col=1)
        assert_eq!(
            violations[0].col, 10,
            "Violation should report at the extra td's col position (10), not tr's (1)"
        );
    }

    #[test]
    fn empty_table_no_violation() {
        // <table></table> → no violation (no rows to check)
        let arena = make_table_arena(&[]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Empty table should have no violations, got: {violations:?}"
        );
    }
}
