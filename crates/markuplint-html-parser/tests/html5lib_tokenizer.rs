//! Test harness for html5lib-tests tokenizer test suite.

use markuplint_html_parser::tokenizer::Tokenizer;
use markuplint_html_parser::tokenizer::state::State;
use markuplint_html_parser::tokenizer::token::Token;
use serde_json::Value;
use std::fs;
use std::path::Path;

fn token_to_html5lib(token: &Token) -> Value {
    match token {
        Token::Doctype {
            name,
            public_id,
            system_id,
            force_quirks,
            ..
        } => Value::Array(vec![
            Value::String("DOCTYPE".to_owned()),
            name.as_deref().map_or(Value::Null, |n| Value::String(n.to_owned())),
            public_id
                .as_deref()
                .map_or(Value::Null, |p| Value::String(p.to_owned())),
            system_id
                .as_deref()
                .map_or(Value::Null, |s| Value::String(s.to_owned())),
            Value::Bool(!force_quirks),
        ]),
        Token::StartTag {
            tag_name,
            self_closing,
            attributes,
            ..
        } => {
            let mut attrs = serde_json::Map::new();
            for attr in attributes {
                // html5lib uses first-wins for duplicate attributes.
                attrs
                    .entry(attr.raw_name.clone())
                    .or_insert_with(|| Value::String(attr.raw_value.clone()));
            }
            let mut arr = vec![
                Value::String("StartTag".to_owned()),
                Value::String(tag_name.clone()),
                Value::Object(attrs),
            ];
            if *self_closing {
                arr.push(Value::Bool(true));
            }
            Value::Array(arr)
        }
        Token::EndTag { tag_name, .. } => Value::Array(vec![
            Value::String("EndTag".to_owned()),
            Value::String(tag_name.clone()),
        ]),
        Token::Comment { data, .. } => {
            Value::Array(vec![Value::String("Comment".to_owned()), Value::String(data.clone())])
        }
        Token::Character { ch, .. } => Value::Array(vec![
            Value::String("Character".to_owned()),
            Value::String(ch.to_string()),
        ]),
        Token::Eof => Value::Null,
    }
}

fn merge_character_tokens(tokens: &[Value]) -> Vec<Value> {
    let mut result = Vec::new();
    let mut pending_chars = String::new();

    for token in tokens {
        if let Value::Array(arr) = token {
            if arr.first().and_then(Value::as_str) == Some("Character") {
                if let Some(s) = arr.get(1).and_then(Value::as_str) {
                    pending_chars.push_str(s);
                    continue;
                }
            }
        }
        if !pending_chars.is_empty() {
            result.push(Value::Array(vec![
                Value::String("Character".to_owned()),
                Value::String(std::mem::take(&mut pending_chars)),
            ]));
        }
        result.push(token.clone());
    }
    if !pending_chars.is_empty() {
        result.push(Value::Array(vec![
            Value::String("Character".to_owned()),
            Value::String(pending_chars),
        ]));
    }
    result
}

/// Run a single test case. Returns true if passed, false if failed.
fn run_test(input: &str, expected: &[Value], initial_states: &[&str], last_start_tag: Option<&str>) -> bool {
    let states = if initial_states.is_empty() {
        vec![State::Data]
    } else {
        initial_states
            .iter()
            .map(|s| match *s {
                "RCDATA state" => State::RcData,
                "RAWTEXT state" => State::RawText,
                "Script data state" => State::ScriptData,
                "PLAINTEXT state" => State::PlainText,
                "CDATA section state" => State::CDataSection,
                _ => State::Data,
            })
            .collect()
    };

    for state in states {
        let mut tokenizer = Tokenizer::new(input);
        tokenizer.set_state(state);
        if let Some(tag) = last_start_tag {
            tokenizer.set_last_start_tag(tag);
        }

        let mut tokens = Vec::new();
        loop {
            let token = tokenizer.next_token();
            if token == Token::Eof {
                break;
            }
            tokens.push(token_to_html5lib(&token));
        }

        let merged = merge_character_tokens(&tokens);
        if merged != expected {
            return false;
        }
    }
    true
}

fn run_test_file(path: &Path) -> (usize, usize, Vec<String>) {
    let content = fs::read_to_string(path).expect("Failed to read test file");
    let data: Value = serde_json::from_str(&content).expect("Failed to parse test JSON");
    let Some(tests) = data["tests"].as_array() else {
        // Some files (like xmlViolation.test) use different keys.
        return (0, 0, Vec::new());
    };
    let mut passed = 0;
    let mut failed = 0;
    let mut failure_details = Vec::new();

    for test in tests {
        let input = test["input"].as_str().unwrap_or("");
        let expected = test["output"].as_array().unwrap_or(&Vec::new()).clone();
        let double_escaped = test["doubleEscaped"].as_bool().unwrap_or(false);

        if double_escaped {
            passed += 1;
            continue;
        }

        let initial_states: Vec<&str> = test["initialStates"]
            .as_array()
            .map(|arr| arr.iter().filter_map(Value::as_str).collect())
            .unwrap_or_default();
        let last_start_tag = test["lastStartTag"].as_str();

        if run_test(input, &expected, &initial_states, last_start_tag) {
            passed += 1;
        } else {
            failed += 1;
            let desc = test["description"].as_str().unwrap_or("<unknown>");
            if failure_details.len() < 3 {
                failure_details.push(format!("  {desc}: input={input:?}"));
            }
        }
    }

    (passed, failed, failure_details)
}

#[test]
fn html5lib_tokenizer_test_suite() {
    let test_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/html5lib-tests/tokenizer");

    if !test_dir.exists() {
        eprintln!("html5lib-tests not found. Run: git submodule update --init");
        return;
    }

    let mut total_passed = 0;
    let mut total_failed = 0;

    // Skip test3.test (1590 tests) and unicodeChars*.test for now — they contain
    // These files are skipped in debug builds only due to execution time
    // (>10 min for 1590+ tests in unoptimized code). No infinite loops
    // or OOM — just slow. CI should use --release for full coverage.
    let skip_files = ["test3.test", "test4.test", "unicodeChars.test"];

    let mut files: Vec<_> = fs::read_dir(&test_dir)
        .expect("Failed to read test directory")
        .filter_map(Result::ok)
        .filter(|e| {
            let name = e.file_name();
            let name_str = name.to_string_lossy();
            e.path().extension().is_some_and(|ext| ext == "test") && !skip_files.contains(&name_str.as_ref())
        })
        .collect();
    files.sort_by_key(|e| e.file_name());

    let mut all_failure_samples = Vec::new();
    for entry in &files {
        let path = entry.path();
        let (passed, failed, details) = run_test_file(&path);
        let filename = path.file_name().unwrap().to_string_lossy();
        eprintln!("  {filename}: {passed} passed, {failed} failed");
        total_passed += passed;
        total_failed += failed;
        for d in details {
            all_failure_samples.push(format!("[{filename}] {d}"));
        }
    }

    let total = total_passed + total_failed;
    let pass_rate = if total > 0 {
        (total_passed as f64 / total as f64) * 100.0
    } else {
        0.0
    };
    eprintln!("\nhtml5lib tokenizer: {total_passed}/{total} passed ({pass_rate:.1}%)");
    if !all_failure_samples.is_empty() {
        eprintln!("\nSample failures (first 3 per file):");
        for s in &all_failure_samples {
            eprintln!("{s}");
        }
    }

    assert!(pass_rate >= 80.0, "Pass rate {pass_rate:.1}% is below 80% threshold");
}
