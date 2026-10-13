//! The table grid model shared by the four rules `table-row-column-alignment` was split into:
//! `no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track` and
//! `consistent-table-row-length`.
//!
//! Port of `packages/@markuplint/rules/src/table-row-column-alignment/grid.ts`. It models a
//! `<table>` as the slot grid of HTML LS
//! [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
//! rather than approximating it, because every table model error those rules report is defined
//! in terms of that algorithm: Step 6 decides which slot a cell is anchored to (a `colspan` after
//! a `rowspan` continuation does *not* start at the cell's ordinal position), Steps 7 and 11
//! decide how wide the table becomes, Step 14 defines cell overlap, and Step 20 defines rows and
//! columns that no cell is anchored to.
//!
//! Two things the spec has no name for are tracked alongside:
//!
//! - **Row width** ([`Row::slots`] length). Rows narrower or wider than the rest of the table
//!   are not a table model error, but they are `consistent-table-row-length`'s diagnostic.
//! - **Row group boundaries**. The spec's *ending a row group* algorithm clips a cell to its row
//!   group, so slots are covered per group; [`RowGroup::overflows`] keeps the cells that were
//!   clipped so `no-table-span-overflow` can report them.
//!
//! Every rule skips a table [`Grid::has_overlapped`] reports on except `no-table-cell-overlap`
//! itself: once two cells claim the same slot, every width and anchor derived from the grid is
//! speculative, and reporting them would bury the one error the author has to fix first.

use std::collections::{HashMap, HashSet};

use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::{DomNode, ElementData};
use serde_json::Value;

use crate::rule::RuleConfigSet;
use crate::violation::Violation;

/// HTML LS §4.9.12.1 Step 8 clamps `colspan` to the range 1–1000.
const MAX_COLSPAN: usize = 1000;

/// HTML LS §4.9.12.1 Step 9 clamps `rowspan` to the range 0–65534.
const MAX_ROWSPAN: usize = 65_534;

/// What covers one slot of the grid (TS `CellType`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Slot {
    /// `●`: a cell is anchored here and spans nothing else.
    Anchored,
    /// `◎`: a cell is anchored here and spans further columns and/or rows.
    AnchoredSpanning,
    /// `↓`: covered by a cell anchored in an earlier row.
    RowContinuation,
    /// `→`: covered by a cell anchored earlier in the same row.
    ColumnContinuation,
    /// `x`: covered by more than one cell (Step 14).
    Overlap,
}

/// A `<th>` / `<td>` anchored to a slot, together with the slots it covers.
#[derive(Debug, Clone)]
pub(crate) struct Anchor {
    /// The cell element.
    pub(crate) cell: NodeId,
    /// The slot column the cell is anchored to (spec: xcurrent when the cell was placed).
    pub(crate) x: usize,
    /// The slot row the cell is anchored to, counted within the owning row group (spec: ycurrent).
    pub(crate) y: usize,
    /// The clamped `colspan`.
    pub(crate) colspan: usize,
    /// The clamped `rowspan`, or the distance to the end of the row group for a downward-growing cell.
    pub(crate) rowspan: usize,
}

/// A contiguous slot column range together with the element that established it.
#[derive(Debug, Clone, Copy)]
pub(crate) struct ColumnRange {
    /// A `<col>` / `<colgroup>` for column markup, or the `<th>` / `<td>` whose `colspan`
    /// stretched the table to cover the range.
    pub(crate) source: NodeId,
    /// The leftmost column that is part of the range.
    pub(crate) left: usize,
    /// The first column to the right that is not part of the range.
    pub(crate) right: usize,
}

/// One row of slots, paired with the `<tr>` that established it.
#[derive(Debug)]
pub(crate) struct Row {
    /// The `<tr>` element.
    pub(crate) element: NodeId,
    /// The slots the row occupies. Its length is the row's width, which mirrors nu-validator's
    /// insertion point at the end of the row: the cells anchored in the row plus the run of slots
    /// that spans from earlier rows continue into.
    pub(crate) slots: Vec<Slot>,
    /// How many cells are anchored in this row (Step 20 counts rows by this).
    pub(crate) anchor_count: usize,
}

/// One row group: `<thead>`, `<tbody>`, `<tfoot>`, or the implicit `<tbody>` the parser inserts.
#[derive(Debug)]
pub(crate) struct RowGroup {
    /// The tag name of the element that established the group, lowercased.
    pub(crate) tag_name: String,
    /// The rows of the group, in document order.
    pub(crate) rows: Vec<Row>,
    /// Every cell anchored within the group, in document order.
    pub(crate) anchors: Vec<Anchor>,
    /// Anchors whose `rowspan` reaches past the last row of the group. HTML LS §4.9.12 forbids
    /// this ("A cell cannot cover slots that are from two or more row groups."), and the *ending
    /// a row group* algorithm clips the cell instead.
    pub(crate) overflows: Vec<Anchor>,
    /// Whether any slot of the group is covered twice (Step 14).
    pub(crate) has_overlap: bool,
}

/// A `<table>` modelled as the slot grid of HTML LS §4.9.12.1.
#[derive(Debug)]
pub(crate) struct Grid {
    /// Column ranges established by `<col>` / `<colgroup>`, in document order.
    pub(crate) column_markup: Vec<ColumnRange>,
    /// The row groups of the table, in document order.
    pub(crate) row_groups: Vec<RowGroup>,
    /// The number of slot columns in the table (spec: xwidth).
    pub(crate) xwidth: usize,
}

impl Grid {
    pub(crate) fn new(arena: &DomArena, table: NodeId) -> Self {
        let column_markup = collect_column_markup(arena, table);

        // Column markup establishes the initial xwidth (spec: the *processing column groups* step).
        let mut xwidth = column_markup.last().map_or(0, |range| range.right);

        let mut row_groups = Vec::new();
        for group in find_children(arena, table, &["thead", "tbody", "tfoot"]) {
            let (row_group, grown) = process_row_group(arena, group, xwidth);
            xwidth = grown;
            row_groups.push(row_group);
        }

        Self {
            column_markup,
            row_groups,
            xwidth,
        }
    }

    /// Every cell anchored in the table, in document order.
    pub(crate) fn anchors(&self) -> impl Iterator<Item = &Anchor> {
        self.row_groups.iter().flat_map(|group| group.anchors.iter())
    }

    /// Every row of the table, in document order.
    pub(crate) fn rows(&self) -> impl Iterator<Item = &Row> {
        self.row_groups.iter().flat_map(|group| group.rows.iter())
    }

    /// Whether any slot of the table is covered by more than one cell (Step 14).
    pub(crate) fn has_overlapped(&self) -> bool {
        self.row_groups.iter().any(|group| group.has_overlap)
    }

    /// The expected (base) column count that rows are compared against.
    ///
    /// Rows decide it, preferring `<thead>` then `<tfoot>` since a heading or footing row is the
    /// more deliberate declaration. Column markup is deliberately *not* consulted: Step 7 grows
    /// xwidth to fit a row that is wider than the `<col>` markup, so such a row is not an error,
    /// and a row narrower than the column markup is caught by the Step 20 column scan instead.
    pub(crate) fn base_col_length(&self) -> usize {
        let with_rows = |tag: &str| {
            self.row_groups
                .iter()
                .find(|group| group.tag_name == tag && !group.rows.is_empty())
        };
        with_rows("thead")
            .or_else(|| with_rows("tfoot"))
            .or_else(|| self.row_groups.iter().find(|group| !group.rows.is_empty()))
            .map_or(0, |group| base_col_length_of(&group.rows))
    }

    /// The columns that no cell is anchored to (Step 20), merging neighbouring columns that the
    /// same element established into one range so a `colspan` overshooting by four columns is
    /// reported once, not four times.
    pub(crate) fn columns_without_anchor(&self) -> Vec<ColumnRange> {
        let anchors: Vec<&Anchor> = self.anchors().collect();
        let anchored: HashSet<usize> = anchors.iter().map(|anchor| anchor.x).collect();
        let mut ranges: Vec<ColumnRange> = Vec::new();

        for x in 0..self.xwidth {
            if anchored.contains(&x) {
                continue;
            }
            let Some(source) = self.find_column_source(x, &anchors) else {
                continue;
            };
            if let Some(last) = ranges.last_mut()
                && last.source == source
                && last.right == x
            {
                last.right = x + 1;
                continue;
            }
            ranges.push(ColumnRange {
                source,
                left: x,
                right: x + 1,
            });
        }

        ranges
    }

    /// The element answerable for a column: the column markup that declared it, or else the cell
    /// whose `colspan` stretched the table over it.
    fn find_column_source(&self, x: usize, anchors: &[&Anchor]) -> Option<NodeId> {
        if let Some(markup) = self
            .column_markup
            .iter()
            .find(|range| range.left <= x && x < range.right)
        {
            return Some(markup.source);
        }
        anchors
            .iter()
            .find(|anchor| anchor.x < x && x < anchor.x + anchor.colspan)
            .map(|anchor| anchor.cell)
    }
}

/// Maps each slot of a row to the index of the `<th>` / `<td>` anchored to it (counted among the
/// row's own cells), or `None` for a slot the row does not anchor a cell to.
pub(crate) fn slot_cell_indexes(slots: &[Slot]) -> Vec<Option<usize>> {
    let mut counter = 0;
    slots
        .iter()
        .map(|slot| match slot {
            Slot::Anchored | Slot::AnchoredSpanning => {
                counter += 1;
                Some(counter - 1)
            }
            Slot::RowContinuation | Slot::ColumnContinuation | Slot::Overlap => None,
        })
        .collect()
}

/// The direct element children of `parent` whose name is one of `names` (TS `findChildren`).
pub(crate) fn find_children(arena: &DomArena, parent: NodeId, names: &[&str]) -> Vec<NodeId> {
    let Some(node) = arena.get(parent) else {
        return vec![];
    };
    node.children()
        .iter()
        .copied()
        .filter(|&id| {
            arena
                .get(id)
                .and_then(DomNode::as_element)
                .is_some_and(|el| names.iter().any(|name| el.base.node_name.eq_ignore_ascii_case(name)))
        })
        .collect()
}

/// The element `id` refers to. Every id the grid hands out is one.
pub(crate) fn element(arena: &DomArena, id: NodeId) -> Option<&ElementData> {
    arena.get(id).and_then(DomNode::as_element)
}

/// The HTML attribute `name` of `el` (TS `getAttributeNode`).
pub(crate) fn attr_node<'a>(el: &'a ElementData, name: &str) -> Option<&'a MLASTHTMLAttr> {
    el.attributes.iter().find_map(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr) if html_attr.node_name.eq_ignore_ascii_case(name) => Some(&**html_attr),
        _ => None,
    })
}

/// Every `<table>` the rule is enabled for, together with its grid.
///
/// The `<table>`'s own config decides, as TS `document.querySelectorAll('table')` reports through
/// the table's (or one of its descendants') rule settings.
pub(crate) fn tables<'a>(arena: &'a DomArena, config: &'a RuleConfigSet) -> impl Iterator<Item = (NodeId, Grid)> + 'a {
    arena.elements().filter_map(move |(node_id, el)| {
        if !el.base.node_name.eq_ignore_ascii_case("table") {
            return None;
        }
        let rule_config = config.get(node_id);
        if rule_config.disabled || rule_config.value == Value::Bool(false) {
            return None;
        }
        Some((node_id, Grid::new(arena, node_id)))
    })
}

/// A violation whose position and `raw` are the start tag of `el` (TS `scope: el`), with the
/// severity and reason `el`'s config gives it.
pub(crate) fn element_violation(
    rule_id: &str,
    config: &RuleConfigSet,
    node_id: NodeId,
    el: &ElementData,
    message: String,
) -> Violation {
    let rule_config = config.get(node_id);
    Violation {
        rule_id: rule_id.to_string(),
        name: None,
        severity: rule_config.severity,
        message,
        line: el.base.line,
        col: el.base.col,
        raw: el.base.raw.clone(),
        reason: rule_config.reason.clone(),
    }
}

/// A violation at an attribute of the element `node_id`, from its name to its end
/// (TS `scope: attr`).
pub(crate) fn attr_violation(
    rule_id: &str,
    config: &RuleConfigSet,
    node_id: NodeId,
    attr: &MLASTHTMLAttr,
    message: String,
) -> Violation {
    let rule_config = config.get(node_id);
    Violation {
        rule_id: rule_id.to_string(),
        name: None,
        severity: rule_config.severity,
        message,
        line: attr.name.line,
        col: attr.name.col,
        raw: attr.raw.clone(),
        reason: rule_config.reason.clone(),
    }
}

/// A count as the English message catalogue words it: `one` to `four` are spelled out
/// (`packages/@markuplint/i18n/locales/en.json` `keywords`), anything else stays a numeral.
pub(crate) fn count_word(count: usize) -> String {
    match count {
        1 => "one".to_string(),
        2 => "two".to_string(),
        3 => "three".to_string(),
        4 => "four".to_string(),
        n => n.to_string(),
    }
}

/// Upper-cases the first character, as the TS translator does to every message.
pub(crate) fn capitalize(message: &str) -> String {
    let mut chars = message.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}

/// Collects the column ranges that `<col>` and `<colgroup>` establish.
///
/// A `<colgroup>` contributes its own `span` only when it has no `<col>` children, mirroring
/// HTML LS §4.9.3: the `span` attribute of a `<colgroup>` "must not be specified if the element
/// contains one or more `col` elements".
fn collect_column_markup(arena: &DomArena, table: NodeId) -> Vec<ColumnRange> {
    let mut ranges = Vec::new();
    let mut left = 0;
    let mut append = |source: NodeId| {
        let span = element(arena, source).map_or(1, |el| {
            parse_span(helpers::get_attr_value_from_el(el, "span"), 1, 1, MAX_COLSPAN)
        });
        ranges.push(ColumnRange {
            source,
            left,
            right: left + span,
        });
        left += span;
    };

    for child in find_children(arena, table, &["colgroup", "col"]) {
        if element(arena, child).is_some_and(|el| el.base.node_name.eq_ignore_ascii_case("col")) {
            append(child);
            continue;
        }
        let cols = find_children(arena, child, &["col"]);
        if cols.is_empty() {
            append(child);
            continue;
        }
        for col in cols {
            append(col);
        }
    }

    ranges
}

/// The base column count of one row group's rows.
///
/// For groups with 3 or more rows, uses the row width closest to the average so a single
/// malformed row does not become the baseline. Otherwise uses the first row.
fn base_col_length_of(rows: &[Row]) -> usize {
    let first = rows.first().map_or(0, |row| row.slots.len());
    if rows.len() < 3 {
        return first;
    }

    let total: usize = rows.iter().map(|row| row.slots.len()).sum();
    // JS `Math.round` rounds halves up, which for a non-negative quotient is `(2t + n) / 2n`.
    let average = (2 * total + rows.len()) / (2 * rows.len());

    let mut closest = first;
    for row in rows {
        if row.slots.len().abs_diff(average) < closest.abs_diff(average) {
            closest = row.slots.len();
        }
    }
    closest
}

/// Parses a `colspan` / `rowspan` / `span` value the way HTML LS does: a value that is missing or
/// fails to parse falls back to the default, and a parsed value is clamped to the range the spec
/// allows. Leading ASCII whitespace is skipped and anything after the digits is ignored.
fn parse_span(value: Option<&str>, fallback: usize, min: usize, max: usize) -> usize {
    let Some(value) = value else {
        return fallback;
    };
    let digits = value
        .trim_start_matches(['\t', '\n', '\x0C', '\r', ' '])
        .bytes()
        .take_while(u8::is_ascii_digit);
    let mut parsed: Option<usize> = None;
    for digit in digits {
        let n = parsed.unwrap_or(0);
        parsed = Some(n.saturating_mul(10).saturating_add(usize::from(digit - b'0')));
    }
    parsed.map_or(fallback, |n| n.clamp(min, max))
}

/// What the slot `(x, y)`, covered only by `anchor`, holds.
fn slot_of(anchor: &Anchor, x: usize, y: usize) -> Slot {
    if anchor.x == x && anchor.y == y {
        if anchor.colspan > 1 || anchor.rowspan > 1 {
            Slot::AnchoredSpanning
        } else {
            Slot::Anchored
        }
    } else if anchor.y == y {
        Slot::ColumnContinuation
    } else {
        Slot::RowContinuation
    }
}

/// Runs the spec's *algorithm for processing rows* over one row group, returning the group and
/// the xwidth the group grew the table to.
fn process_row_group(arena: &DomArena, group: NodeId, initial_xwidth: usize) -> (RowGroup, usize) {
    let row_elements = find_children(arena, group, &["tr"]);
    let row_count = row_elements.len();

    // The index into `anchors` of the anchor covering each slot, keyed by `(row, column)`.
    let mut covered: HashMap<(usize, usize), usize> = HashMap::new();
    // Slots a second cell tried to cover (Step 14).
    let mut overlapped: HashSet<(usize, usize)> = HashSet::new();
    let mut anchors: Vec<Anchor> = Vec::new();
    let mut overflows: Vec<Anchor> = Vec::new();
    let mut widths = Vec::with_capacity(row_count);
    let mut anchor_counts = Vec::with_capacity(row_count);

    let mut xwidth = initial_xwidth;

    for (y, &row_element) in row_elements.iter().enumerate() {
        let mut xcurrent = 0;
        let mut anchor_count = 0;

        for cell in find_children(arena, row_element, &["th", "td"]) {
            let cell_el = element(arena, cell);
            let attr = |name: &str| cell_el.and_then(|el| helpers::get_attr_value_from_el(el, name));
            let colspan = parse_span(attr("colspan"), 1, 1, MAX_COLSPAN);
            let declared_rowspan = parse_span(attr("rowspan"), 1, 0, MAX_ROWSPAN);
            let grows_downward = declared_rowspan == 0;
            let rowspan = if grows_downward {
                (row_count - y).max(1)
            } else {
                declared_rowspan
            };

            // Step 6
            while xcurrent < xwidth && covered.contains_key(&(y, xcurrent)) {
                xcurrent += 1;
            }

            // Step 7
            if xcurrent == xwidth {
                xwidth += 1;
            }

            // Step 11
            xwidth = xwidth.max(xcurrent + colspan);

            let anchor = Anchor {
                cell,
                x: xcurrent,
                y,
                colspan,
                rowspan,
            };
            let anchor_index = anchors.len();
            anchors.push(anchor.clone());
            anchor_count += 1;

            // Steps 13 and 14. The bottom is clipped to the row group per *ending a row group*.
            let bottom = (y + rowspan).min(row_count);
            for cy in y..bottom {
                for cx in xcurrent..xcurrent + colspan {
                    if covered.contains_key(&(cy, cx)) {
                        overlapped.insert((cy, cx));
                        continue;
                    }
                    covered.insert((cy, cx), anchor_index);
                }
            }

            if !grows_downward && y + rowspan > row_count {
                overflows.push(anchor);
            }

            xcurrent += colspan;
        }

        // The row is as wide as its own cells plus the run of continuing spans that follows them.
        while covered.contains_key(&(y, xcurrent)) {
            xcurrent += 1;
        }

        widths.push(xcurrent);
        anchor_counts.push(anchor_count);
    }

    let rows = row_elements
        .iter()
        .enumerate()
        .map(|(y, &element)| {
            let slots = (0..widths[y])
                .filter_map(|x| {
                    if overlapped.contains(&(y, x)) {
                        return Some(Slot::Overlap);
                    }
                    Some(slot_of(&anchors[*covered.get(&(y, x))?], x, y))
                })
                .collect();
            Row {
                element,
                slots,
                anchor_count: anchor_counts[y],
            }
        })
        .collect();

    let tag_name = element(arena, group).map_or_else(String::new, |el| el.base.node_name.to_ascii_lowercase());

    (
        RowGroup {
            tag_name,
            rows,
            anchors,
            overflows,
            has_overlap: !overlapped.is_empty(),
        },
        xwidth,
    )
}
