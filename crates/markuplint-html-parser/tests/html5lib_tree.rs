//! Test harness for html5lib-tests tree-construction test suite.
//!
//! Reads `.dat` files from `tests/html5lib-tests/tree-construction/`
//! and compares our parser output against the expected tree structure.

use markuplint_html_parser::tree::Arena;
use markuplint_html_parser::tree::node::{NodeId, NodeKind};
use markuplint_html_parser::tree_construction::TreeBuilder;
use std::fs;
use std::path::Path;

// ============================================================================
// .dat file parser
// ============================================================================

#[derive(Debug)]
struct TreeTest {
    data: String,
    expected: String,
    is_fragment: bool,
    context_element: Option<String>,
}

fn parse_dat_file(content: &str) -> Vec<TreeTest> {
    let mut tests = Vec::new();
    let mut sections = content.split("\n#data\n");

    // Skip content before first #data.
    sections.next();

    for section in sections {
        let mut data = String::new();
        let mut expected = String::new();
        let mut is_fragment = false;
        let mut context_element = None;
        let mut current = "data";

        for line in section.lines() {
            match line {
                "#errors" | "#new-errors" => current = "errors",
                "#document" => current = "document",
                "#document-fragment" => {
                    current = "fragment";
                    is_fragment = true;
                }
                _ => match current {
                    "data" => {
                        if !data.is_empty() {
                            data.push('\n');
                        }
                        data.push_str(line);
                    }
                    "document" => {
                        if !expected.is_empty() {
                            expected.push('\n');
                        }
                        expected.push_str(line);
                    }
                    "fragment" => {
                        if context_element.is_none() {
                            context_element = Some(line.to_owned());
                            current = "errors"; // next section
                        }
                    }
                    _ => {} // skip errors
                },
            }
        }

        if !data.is_empty() || !expected.is_empty() {
            tests.push(TreeTest {
                data,
                expected: expected.trim_end().to_owned(),
                is_fragment,
                context_element,
            });
        }
    }

    tests
}

// ============================================================================
// Arena → html5lib tree serialization
// ============================================================================

fn serialize_tree(arena: &Arena, source: &str) -> String {
    let doc = arena.get(arena.document_id());
    let mut output = String::new();
    for &child_id in &doc.children {
        serialize_node(arena, source, child_id, 0, &mut output);
    }
    output.trim_end_matches('\n').to_owned()
}

fn serialize_node(arena: &Arena, source: &str, node_id: NodeId, depth: usize, output: &mut String) {
    let node = arena.get(node_id);
    let indent = "  ".repeat(depth);

    match &node.kind {
        NodeKind::Document => {
            for &child_id in &node.children {
                serialize_node(arena, source, child_id, depth, output);
            }
        }
        NodeKind::Doctype {
            name,
            public_id,
            system_id,
        } => {
            if public_id.is_empty() && system_id.is_empty() {
                output.push_str(&format!("| {indent}<!DOCTYPE {name}>\n"));
            } else {
                output.push_str(&format!(
                    "| {indent}<!DOCTYPE {name} \"{public_id}\" \"{system_id}\">\n"
                ));
            }
        }
        NodeKind::Element {
            tag_name,
            namespace,
            attributes,
            ..
        } => {
            let ns_prefix = match namespace {
                markuplint_html_parser::tree::node::Namespace::Svg => "svg ",
                markuplint_html_parser::tree::node::Namespace::MathML => "math ",
                markuplint_html_parser::tree::node::Namespace::Html => "",
            };
            output.push_str(&format!("| {indent}<{ns_prefix}{tag_name}>\n"));

            // Attributes sorted by name.
            let mut sorted_attrs: Vec<_> = attributes.iter().collect();
            sorted_attrs.sort_by_key(|a| &a.name);
            for attr in sorted_attrs {
                output.push_str(&format!("| {indent}  {0}=\"{1}\"\n", attr.name, attr.value));
            }

            // Children.
            for &child_id in &node.children {
                serialize_node(arena, source, child_id, depth + 1, output);
            }
        }
        NodeKind::Text { data } => {
            output.push_str(&format!("| {indent}\"{data}\"\n"));
        }
        NodeKind::Comment { data } => {
            output.push_str(&format!("| {indent}<!-- {data} -->\n"));
        }
    }
}

// ============================================================================
// Test runner
// ============================================================================

fn run_tree_test(test: &TreeTest) -> bool {
    let mut builder = if let Some(ref context) = test.context_element {
        // Fragment with specific context element.
        TreeBuilder::with_context(&test.data, true, Some(context))
    } else if test.is_fragment {
        TreeBuilder::new(&test.data, true)
    } else {
        TreeBuilder::new(&test.data, false)
    };
    builder.run();
    let arena = builder.arena;

    let actual = serialize_tree(&arena, &test.data);
    actual == test.expected
}

struct TreeFileResult {
    passed: usize,
    failed: usize,
    skipped: usize,
    failure_samples: Vec<String>,
}

fn run_test_file(path: &Path) -> TreeFileResult {
    let content = fs::read_to_string(path).expect("Failed to read test file");
    let tests = parse_dat_file(&content);
    let mut passed = 0;
    let mut failed = 0;
    let mut skipped = 0;
    let mut failure_samples = Vec::new();

    for test in &tests {
        if run_tree_test(test) {
            passed += 1;
        } else {
            failed += 1;
            if failure_samples.len() < 50 {
                failure_samples.push(format!("  FAIL: {:?}", &test.data[..test.data.len().min(60)]));
            }
        }
    }

    TreeFileResult {
        passed,
        failed,
        skipped,
        failure_samples,
    }
}

#[test]
fn html5lib_tree_construction_test_suite() {
    let test_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/html5lib-tests/tree-construction");

    if !test_dir.exists() {
        eprintln!("html5lib-tests not found. Run: git submodule update --init");
        return;
    }

    // Skipped: features not yet implemented (each documented).
    let skip_files = [
        "template.dat",                               // InTemplate not fully implemented
        "domjs-unsafe.dat",                           // null bytes in unsafe contexts
        "plain-text-unsafe.dat",                      // null bytes in PLAINTEXT
        "pending-spec-changes-plain-text-unsafe.dat", // same
        "tests_innerHTML_1.dat",                      // innerHTML fragment parsing
    ];

    let mut total_passed = 0;
    let mut total_failed = 0;
    let mut total_skipped = 0;
    let mut total_file_skipped = 0;
    let mut all_samples = Vec::new();

    let all_files: Vec<_> = fs::read_dir(&test_dir)
        .expect("Failed to read test directory")
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "dat"))
        .collect();
    let total_files = all_files.len();

    let mut files: Vec<_> = all_files
        .into_iter()
        .filter(|e| {
            let name = e.file_name();
            let name_str = name.to_string_lossy();
            if skip_files.contains(&name_str.as_ref()) {
                total_file_skipped += 1;
                false
            } else {
                true
            }
        })
        .collect();
    files.sort_by_key(|e| e.file_name());

    for entry in &files {
        let path = entry.path();
        let result = run_test_file(&path);
        let filename = path.file_name().unwrap().to_string_lossy();
        if result.failed > 0 || result.skipped > 0 {
            eprintln!(
                "  {filename}: {} passed, {} failed, {} skipped",
                result.passed, result.failed, result.skipped
            );
        }
        total_passed += result.passed;
        total_failed += result.failed;
        total_skipped += result.skipped;
        for s in result.failure_samples {
            all_samples.push(format!("[{filename}] {s}"));
        }
    }

    let executed = total_passed + total_failed;
    let _total = executed + total_skipped;
    eprintln!(
        "\nhtml5lib tree-construction: {total_passed}/{executed} executed, \
         {total_skipped} skipped (fragment), {total_file_skipped}/{total_files} files skipped"
    );

    if !all_samples.is_empty() {
        eprintln!("\nSample failures:");
        for s in &all_samples[..all_samples.len().min(10)] {
            eprintln!("{s}");
        }
    }

    // Require >= 80% of executed tests to pass. Currently ~81%.
    // Remaining failures are edge cases (quirks mode, advanced table
    // foster parenting, deeply nested adoption agency, etc.).
    let pass_rate = if executed > 0 {
        (total_passed as f64 / executed as f64) * 100.0
    } else {
        0.0
    };
    eprintln!("Pass rate: {pass_rate:.1}%");
    assert!(
        pass_rate >= 80.0,
        "Pass rate {pass_rate:.1}% is below 80%. {total_failed} test(s) failed."
    );
}

/// Adoption agency test: <b><p></b>TEST
#[test]
fn adoption_agency_basic() {
    let html = "<b><p></b>TEST";
    let expected = "\
| <html>
|   <head>
|   <body>
|     <b>
|     <p>
|       <b>
|       \"TEST\"";

    let mut builder = TreeBuilder::new(html, false);
    builder.run();
    let actual = serialize_tree(&builder.arena, html);
    assert_eq!(actual, expected, "Tree mismatch for {html:?}");
}

/// Smoke test: tests1.dat must have 111/111 pass, 0 fail, 0 skip.
#[test]
fn html5lib_tree_smoke_test() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/html5lib-tests/tree-construction/tests1.dat");
    if !path.exists() {
        return;
    }
    let result = run_test_file(&path);
    eprintln!(
        "tests1.dat: {} passed, {} failed, {} skipped",
        result.passed, result.failed, result.skipped
    );
    for s in &result.failure_samples {
        eprintln!("{s}");
    }
    // Strict: tests1.dat has 111 tests, 0 fragments. All must pass.
    assert_eq!(result.failed, 0, "tests1.dat: {} test(s) failed", result.failed);
    assert_eq!(
        result.passed, 111,
        "tests1.dat: expected 111 passed, got {}",
        result.passed
    );
    assert_eq!(
        result.skipped, 0,
        "tests1.dat: {} test(s) unexpectedly skipped",
        result.skipped
    );
}
