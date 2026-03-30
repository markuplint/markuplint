//! `table-row-column-alignment` rule: validates table grid consistency.
//!
//! For each `<table>` element, builds a 2D grid model accounting for
//! `colspan` and `rowspan` attributes, then checks that all rows have
//! a consistent number of columns.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `table-row-column-alignment` rule.
pub struct TableRowColumnAlignment;

/// Cell type in the grid model.
#[derive(Debug, Clone, PartialEq, Eq)]
enum CellType {
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

/// Collect all `<tr>` rows within a table, searching inside `<thead>`, `<tbody>`, `<tfoot>`,
/// and also direct `<tr>` children.
fn collect_rows(arena: &DomArena, table_id: NodeId) -> Vec<NodeId> {
    let mut rows = Vec::new();
    let section_tags = ["thead", "tbody", "tfoot"];

    let Some(table_node) = arena.get(table_id) else {
        return rows;
    };

    for &child_id in table_node.children() {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        let Some(el) = child.as_element() else {
            continue;
        };

        if el.base.node_name.eq_ignore_ascii_case("tr") {
            rows.push(child_id);
        } else if section_tags.iter().any(|t| el.base.node_name.eq_ignore_ascii_case(t)) {
            let section_rows = find_child_elements_by_tags(arena, child_id, &["tr"]);
            rows.extend(section_rows);
        }
    }

    rows
}

/// Build a 2D grid from table rows, returning `(grid, row_node_ids)`.
///
/// The grid accounts for `colspan` and `rowspan` attributes.
fn build_grid(arena: &DomArena, rows: &[NodeId]) -> Vec<Vec<CellType>> {
    let num_rows = rows.len();
    let mut grid: Vec<Vec<CellType>> = Vec::with_capacity(num_rows);

    // Initialize empty rows
    for _ in 0..num_rows {
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
                if actual_col < current_row_len {
                    // Position already occupied (overlap)
                    if grid[row_idx][actual_col] == CellType::RowSpan {
                        grid[row_idx][actual_col] = CellType::Overlap;
                    }
                } else {
                    // Extend the row to reach actual_col
                    let cell_type = if c == 0 { CellType::Cell } else { CellType::ColSpan };
                    // Pad with ColSpan if needed, then push the actual cell
                    while grid[row_idx].len() < actual_col {
                        grid[row_idx].push(CellType::ColSpan);
                    }
                    grid[row_idx].push(cell_type);
                }

                // Place rowspan continuations in subsequent rows
                for r in 1..rowspan {
                    let target_row = row_idx + r;
                    if target_row < num_rows {
                        while grid[target_row].len() <= actual_col {
                            grid[target_row].push(CellType::RowSpan);
                        }
                        grid[target_row][actual_col] = CellType::RowSpan;
                    }
                }
            }

            col_idx += colspan;
        }
    }

    grid
}

/// Determine the base (expected) column count from a grid.
///
/// For grids with 3+ rows, picks the row length closest to the average.
/// Otherwise uses the first row's length.
fn get_base_col_length(grid: &[Vec<CellType>]) -> usize {
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

impl Rule for TableRowColumnAlignment {
    fn id(&self) -> &'static str {
        "table-row-column-alignment"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
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
            let rows = collect_rows(arena, table_id);

            if rows.is_empty() {
                continue;
            }

            let grid = build_grid(arena, &rows);

            // Check for overlaps
            let has_overlap = grid.iter().any(|row| row.contains(&CellType::Overlap));
            if has_overlap {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    severity: config.severity.clone(),
                    message: "Rowspan and colspan are causing cell overlap".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                });
                continue; // Skip further checks for this table
            }

            let base_col_length = get_base_col_length(&grid);

            if base_col_length == 0 {
                continue;
            }

            // Check each row for column count mismatch
            for (row_idx, row) in grid.iter().enumerate() {
                let col_length = row.len();
                let Some(row_node) = arena.get(rows[row_idx]) else {
                    continue;
                };
                let Some(row_el) = row_node.as_element() else {
                    continue;
                };

                if col_length > base_col_length {
                    let diff = col_length - base_col_length;
                    let col_word = if diff == 1 { "column" } else { "columns" };
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: format!("{diff} extra {col_word} in a row"),
                        line: row_el.base.line,
                        col: row_el.base.col,
                        raw: row_el.base.raw.clone(),
                    });
                } else if col_length < base_col_length {
                    let diff = base_col_length - col_length;
                    let col_word = if diff == 1 { "column" } else { "columns" };
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: format!("{diff} missing {col_word} in a row"),
                        line: row_el.base.line,
                        col: row_el.base.col,
                        raw: row_el.base.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty(), "Expected no violations but got: {violations:?}");
    }

    #[test]
    fn mismatched_column_count() {
        // Row 1: 3 cells, Row 2: 2 cells → 1 missing column
        let arena = make_table_arena(&[vec![(1, 1), (1, 1), (1, 1)], vec![(1, 1), (1, 1)]]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty(), "Expected no violations but got: {violations:?}");
    }

    #[test]
    fn extra_columns_in_row() {
        // Row 1: 2 cells, Row 2: 3 cells → Row 2 has 1 extra column
        let arena = make_table_arena(&[vec![(1, 1), (1, 1)], vec![(1, 1), (1, 1), (1, 1)]]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());

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
    fn empty_table_no_violation() {
        // <table></table> → no violation (no rows to check)
        let arena = make_table_arena(&[]);
        let s = spec();
        let rule = TableRowColumnAlignment;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(
            violations.is_empty(),
            "Empty table should have no violations, got: {violations:?}"
        );
    }
}
