//! Build script to generate the named character reference table from
//! WHATWG entities.json.

use std::collections::BTreeMap;
use std::env;
use std::fmt::Write;
use std::fs;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest = Path::new(&out_dir).join("entities_generated.rs");

    let json_path = Path::new("src/tokenizer/entities.json");
    println!("cargo:rerun-if-changed={}", json_path.display());

    let json_str = fs::read_to_string(json_path).expect("Failed to read entities.json");

    // Parse: { "&AElig;": { "codepoints": [198], "characters": "\u00C6" }, ... }
    let map: BTreeMap<String, Entity> = serde_json::from_str(&json_str).expect("Failed to parse entities.json");

    let mut entries: Vec<(String, Vec<u32>)> = map.into_iter().map(|(name, ent)| (name, ent.codepoints)).collect();

    // Sort by name for binary search.
    entries.sort_by(|a, b| a.0.cmp(&b.0));

    let mut code = String::new();
    code.push_str("/// Named character reference table.\n");
    code.push_str("/// Sorted by name for binary search lookup.\n");
    code.push_str("pub static NAMED_ENTITIES: &[(&str, &[char])] = &[\n");

    for (name, codepoints) in &entries {
        let chars: String = codepoints
            .iter()
            .map(|cp| format!("'\\u{{{cp:04X}}}'"))
            .collect::<Vec<_>>()
            .join(", ");
        let _ = writeln!(code, "    (\"{name}\", &[{chars}]),");
    }
    code.push_str("];\n");

    fs::write(&dest, code).expect("Failed to write generated entities");
}

#[derive(serde::Deserialize)]
struct Entity {
    codepoints: Vec<u32>,
    #[allow(dead_code)]
    characters: String,
}
