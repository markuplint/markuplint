//! The Rust half of the measurement of the packed candidates (`scripts/spec-baseline/packed/`): the ten candidates of a
//! packed form of the data of `@markuplint/html-spec` (issue #4639), read, checked, composed with an extension and
//! encoded here as the TypeScript side does, byte for byte, and measured.
//!
//! It measures and decides nothing: it prints one line of JSON, `{"measurements":[{"name","unit","values"}]}`, that
//! `perf.ts` reads as it reads the line of `perf-child.ts`, and the statistics are those of the TypeScript side (a process
//! for each sample, the first iteration kept apart, a bootstrap interval).
//!
//! ```text
//! packed_candidates <scenario> <candidate> <directory> <iterations>
//! ```
//!
//! `<directory>` is what `scripts/spec-baseline/packed/prepare.ts` writes: `index.min.json` (the data), `questions.json`
//! (the questions with the answers of the data), `extensions.json` (the extended specs by name), `<candidate>.bin` for each
//! candidate, and `<candidate>.<extension>.bin` for each of them composed with an extension, which the TypeScript side made.
//! `<candidate>` is the name of one with `-` for `/` (`rows-sorted-murmur3`), and a scenario that is not about one takes `-`.
//!
//! - `check`: before any time is taken, what this program has to be equal to. It makes the candidate again from the data and
//!   compares the bytes, opens the file and compares what it reads with the data, answers every question as the data does,
//!   composes every extension and compares the bytes, and refuses files that were changed. It prints no measurement.
//! - `load`: `packed-rust-open` (read the file and open it, the checksum included), `packed-rust-crc` (the checksum alone), and
//!   the bytes that the opened spec keeps and the most that were held while opening it (counted by the allocator of this process
//!   in one more load after the timed ones).
//! - `query`: `packed-rust-bits`, `packed-rust-paths`, `packed-rust-stream`: the questions of each kind, whole, answers stored.
//! - `value`: the same questions asked of the objects of `serde_json::Value` (the baseline), and the cost of reading
//!   and parsing the data into them (`packed-rust-value-load`).
//! - `compose`: `packed-rust-compose-<extension>` for each extension.
//! - `hash`: `packed-rust-hash-murmur3` and `packed-rust-hash-xxhash32`: every string of the questions hashed once.
//!
//! It has to be built with `--release` and with the whole workspace (`cargo build --release --workspace --example
//! packed_candidates`): `serde_json` is given `preserve_order` by the other crates of the workspace, and the order of the keys
//! is what the numbers of the strings and of the nodes follow, so that `check` stops for a build that does not have it.

// The counts, positions and offsets of a spec are far below 2^32, and the lengths of keys far below 2^32: where a cast
// is not obviously harmless it says why in its own place.
#![allow(clippy::cast_possible_truncation, clippy::cast_possible_wrap, clippy::cast_sign_loss)]

mod compose;
mod encode;
mod format;
mod hash;
mod mphf;
mod questions;
mod read;

use std::alloc::{GlobalAlloc, Layout, System};
use std::fs;
use std::hint::black_box;
use std::rc::Rc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::Instant;

use serde_json::{Map, Value, json};

use crate::compose::compose;
use crate::encode::{encode_spec, region_values};
use crate::format::Variant;
use crate::hash::{murmur3, xxhash32};
use crate::questions::{
    ObjectSpec, QuestionsFile, ask_bits, ask_bits_objects, ask_paths, ask_paths_objects, ask_stream,
    ask_stream_objects, first_difference,
};
use crate::read::PackedSpec;

/// Counts the bytes that are held and the most that were held, so that the memory of the opened spec is a figure of this
/// process and not of the machine. It counts only while a figure of memory is being taken (`COUNTING`), and no time is
/// taken then: the timed regions pay one relaxed load of a flag for each allocation, and nothing else.
struct Counting;

static COUNTING: AtomicBool = AtomicBool::new(false);
static HELD: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);

// SAFETY: every call is forwarded to `System` unchanged; the counters only observe the sizes.
unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // SAFETY: the caller upholds the contract of `GlobalAlloc::alloc`, and it is passed on as it is.
        let pointer = unsafe { System.alloc(layout) };
        if !pointer.is_null() && COUNTING.load(Ordering::Relaxed) {
            let held = HELD.fetch_add(layout.size(), Ordering::Relaxed) + layout.size();
            PEAK.fetch_max(held, Ordering::Relaxed);
        }
        pointer
    }

    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        // SAFETY: `pointer` came from `alloc` with this `layout`, as the contract says, and it is passed on as it is.
        unsafe { System.dealloc(pointer, layout) };
        if COUNTING.load(Ordering::Relaxed) {
            // A block that was allocated before the counting began is not in `HELD`: it is not taken off either.
            // The program has one thread, so a load and a store do not race.
            HELD.store(
                HELD.load(Ordering::Relaxed).saturating_sub(layout.size()),
                Ordering::Relaxed,
            );
        }
    }
}

#[global_allocator]
static ALLOCATOR: Counting = Counting;

const USAGE: &str =
    "Usage: packed_candidates <check|load|query|value|compose|hash> <candidate> <directory> [<iterations>]";

fn millis(start: Instant) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}

fn measurement(name: &str, unit: &str, values: &[f64]) -> Value {
    json!({ "name": name, "unit": unit, "values": values })
}

#[allow(clippy::cast_precision_loss)] // a count of bytes is far below 2^52
fn bytes(value: usize) -> f64 {
    value as f64
}

fn read_file(directory: &str, name: &str) -> Result<Vec<u8>, String> {
    let path = format!("{directory}/{name}");
    fs::read(&path).map_err(|error| format!("{path}: {error}"))
}

fn read_text(directory: &str, name: &str) -> Result<String, String> {
    let path = format!("{directory}/{name}");
    fs::read_to_string(&path).map_err(|error| format!("{path}: {error}"))
}

fn read_json(directory: &str, name: &str) -> Result<Value, String> {
    serde_json::from_str(&read_text(directory, name)?).map_err(|error| format!("{directory}/{name}: {error}"))
}

fn read_questions(directory: &str) -> Result<QuestionsFile, String> {
    serde_json::from_str(&read_text(directory, "questions.json")?)
        .map_err(|error| format!("{directory}/questions.json: {error}"))
}

/// The numbers of the strings and of the nodes follow the order of the keys of the JSON text, which a build of
/// `serde_json` without `preserve_order` does not keep.
fn require_preserve_order() -> Result<(), String> {
    let probe: Value = serde_json::from_str(r#"{"b":1,"a":2}"#).map_err(|error| error.to_string())?;
    if probe
        .as_object()
        .and_then(|object| object.keys().next())
        .map(String::as_str)
        == Some("b")
    {
        Ok(())
    } else {
        Err("serde_json does not keep the order of the keys: build with `cargo build --release --workspace --example packed_candidates`".to_string())
    }
}

/// The first byte at which two files differ, as a message.
fn same_bytes(what: &str, got: &[u8], expected: &[u8]) -> Result<(), String> {
    if got.len() != expected.len() {
        let common = got.iter().zip(expected).position(|(got, expected)| got != expected);
        return Err(format!(
            "{what}: {} bytes, the other side has {}; the first difference is at {}",
            got.len(),
            expected.len(),
            common.map_or("the end of the shorter".to_string(), |at| format!(
                "byte {at} (word {})",
                at / 4
            )),
        ));
    }
    match got.iter().zip(expected).position(|(got, expected)| got != expected) {
        Some(at) => Err(format!(
            "{what}: the bytes differ from byte {at} (word {}): {} and {}",
            at / 4,
            got[at],
            expected[at]
        )),
        None => Ok(()),
    }
}

fn open(file: Vec<u8>) -> Result<PackedSpec, String> {
    PackedSpec::open(&Rc::new(file))
}

fn check(stem: &str, directory: &str) -> Result<Vec<Value>, String> {
    require_preserve_order()?;
    let variant = Variant::from_stem(stem)?;
    let spec = read_json(directory, "index.min.json")?;
    let file = read_file(directory, &format!("{stem}.bin"))?;

    // The encoder makes the file that the TypeScript one made
    same_bytes("encode", &encode_spec(&spec, variant)?.serialize(), &file)?;

    // The reader reads the data back
    let base = open(file.clone())?;
    if base.variant != variant {
        return Err(format!("The file is of {:?}, not of {variant:?}", base.variant));
    }
    if base.to_json() != spec {
        return Err("open: what the reader reads is not the data".to_string());
    }
    if base.element_count() as usize != spec["specs"].as_array().map_or(0, Vec::len) {
        return Err("open: the bits are not of as many elements as the data has".to_string());
    }

    // Every question is answered as the data does, by the candidate and by the objects
    let questions = read_questions(directory)?;
    first_difference("bits", &ask_bits(&base, &questions), &questions.bit_answers)?;
    first_difference("paths", &ask_paths(&base, &questions), &questions.path_answers)?;
    first_difference("stream", &ask_stream(&base, &questions), &questions.stream_answers)?;
    let objects = ObjectSpec::new(
        region_values(&spec)?
            .into_iter()
            .map(std::borrow::Cow::into_owned)
            .collect(),
    );
    first_difference(
        "objects bits",
        &ask_bits_objects(&objects, &questions),
        &questions.bit_answers,
    )?;
    first_difference(
        "objects paths",
        &ask_paths_objects(&objects, &questions),
        &questions.path_answers,
    )?;
    first_difference(
        "objects stream",
        &ask_stream_objects(&objects, &questions),
        &questions.stream_answers,
    )?;

    // The composition makes the files that the TypeScript one made
    let extensions = read_json(directory, "extensions.json")?;
    for (name, extension) in extensions.as_object().ok_or("extensions.json is an object")? {
        let composed = compose(&base, std::slice::from_ref(extension))?;
        let expected = read_file(directory, &format!("{stem}.{name}.bin"))?;
        same_bytes(&format!("compose {name}"), &composed.serialize(), &expected)?;
        // and what it makes is a file that opens
        if open(composed.serialize())?.to_json() != composed.to_json() {
            return Err(format!(
                "compose {name}: the file that it makes does not read back as it is"
            ));
        }
    }

    // A file that was changed, cut short or is of another version is refused, and never read
    let stride = (file.len() / 60).max(1);
    for at in (0..file.len()).step_by(stride) {
        let mut changed = file.clone();
        changed[at] ^= 0x01;
        if open(changed).is_ok() {
            return Err(format!("open: a file with the byte {at} changed was opened"));
        }
    }
    for length in [file.len() - 4, file.len() - 1, 40, 0] {
        if open(file[..length].to_vec()).is_ok() {
            return Err(format!("open: a file cut to {length} bytes was opened"));
        }
    }
    Ok(Vec::new())
}

fn load(stem: &str, directory: &str, iterations: usize) -> Result<Vec<Value>, String> {
    Variant::from_stem(stem)?;
    let path = format!("{directory}/{stem}.bin");
    let mut opened = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let file = fs::read(&path).map_err(|error| format!("{path}: {error}"))?;
        let spec = open(file)?;
        opened.push(millis(start));
        black_box(spec.string_count());
    }

    let file = fs::read(&path).map_err(|error| format!("{path}: {error}"))?;
    let words = file.len() / 4 - 1;
    let mut checksums = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let crc = hash::crc32c_words(&file, words);
        checksums.push(millis(start));
        black_box(crc);
    }

    // What one open costs in memory is read by one more, when the timing is over: the arguments and the lists of times
    // were allocated before the counting began, nothing is printed until the end, and what is left over is what the
    // opened spec holds (the bytes of the file, and its sections and regions)
    COUNTING.store(true, Ordering::Relaxed);
    let before = HELD.load(Ordering::Relaxed);
    PEAK.store(before, Ordering::Relaxed);
    let file = fs::read(&path).map_err(|error| format!("{path}: {error}"))?;
    let spec = open(file)?;
    let peak = PEAK.load(Ordering::Relaxed).saturating_sub(before);
    let retained = HELD.load(Ordering::Relaxed).saturating_sub(before);
    COUNTING.store(false, Ordering::Relaxed);
    black_box(spec.string_count());

    Ok(vec![
        measurement("packed-rust-open", "ms", &opened),
        measurement("packed-rust-crc", "ms", &checksums),
        measurement("packed-rust-heap-after-open", "bytes", &[bytes(retained)]),
        measurement("packed-rust-heap-peak-open", "bytes", &[bytes(peak)]),
    ])
}

fn sum(answers: &[u32]) -> u64 {
    answers.iter().map(|answer| u64::from(*answer)).sum()
}

fn query(stem: &str, directory: &str, iterations: usize) -> Result<Vec<Value>, String> {
    Variant::from_stem(stem)?;
    let base = open(read_file(directory, &format!("{stem}.bin"))?)?;
    let questions = read_questions(directory)?;

    // What is timed is worth something only if the candidate gives the answers of the data
    first_difference("bits", &ask_bits(&base, &questions), &questions.bit_answers)?;
    first_difference("paths", &ask_paths(&base, &questions), &questions.path_answers)?;
    first_difference("stream", &ask_stream(&base, &questions), &questions.stream_answers)?;

    let mut bits = Vec::with_capacity(iterations);
    let mut paths = Vec::with_capacity(iterations);
    let mut stream = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let answers = ask_bits(&base, &questions);
        bits.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_paths(&base, &questions);
        paths.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_stream(&base, &questions);
        stream.push(millis(start));
        black_box(sum(&answers));
    }
    Ok(vec![
        measurement("packed-rust-bits", "ms", &bits),
        measurement("packed-rust-paths", "ms", &paths),
        measurement("packed-rust-stream", "ms", &stream),
    ])
}

fn value(directory: &str, iterations: usize) -> Result<Vec<Value>, String> {
    let mut loads = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let text = read_text(directory, "index.min.json")?;
        let spec: Value = serde_json::from_str(&text).map_err(|error| error.to_string())?;
        loads.push(millis(start));
        black_box(spec.as_object().map(Map::len));
    }

    let spec = read_json(directory, "index.min.json")?;
    let objects = ObjectSpec::new(
        region_values(&spec)?
            .into_iter()
            .map(std::borrow::Cow::into_owned)
            .collect(),
    );
    let questions = read_questions(directory)?;
    first_difference(
        "objects bits",
        &ask_bits_objects(&objects, &questions),
        &questions.bit_answers,
    )?;
    first_difference(
        "objects paths",
        &ask_paths_objects(&objects, &questions),
        &questions.path_answers,
    )?;
    first_difference(
        "objects stream",
        &ask_stream_objects(&objects, &questions),
        &questions.stream_answers,
    )?;

    let mut bits = Vec::with_capacity(iterations);
    let mut paths = Vec::with_capacity(iterations);
    let mut stream = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let answers = ask_bits_objects(&objects, &questions);
        bits.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_paths_objects(&objects, &questions);
        paths.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_stream_objects(&objects, &questions);
        stream.push(millis(start));
        black_box(sum(&answers));
    }
    Ok(vec![
        measurement("packed-rust-value-load", "ms", &loads),
        measurement("packed-rust-value-bits", "ms", &bits),
        measurement("packed-rust-value-paths", "ms", &paths),
        measurement("packed-rust-value-stream", "ms", &stream),
    ])
}

fn compose_scenario(stem: &str, directory: &str, iterations: usize) -> Result<Vec<Value>, String> {
    Variant::from_stem(stem)?;
    let file = Rc::new(read_file(directory, &format!("{stem}.bin"))?);
    let extensions = read_json(directory, "extensions.json")?;
    let mut measurements = Vec::new();
    for (name, extension) in extensions.as_object().ok_or("extensions.json is an object")? {
        // Each extension has a base of its own that is opened and not yet asked anything, so that the table from the strings
        // to their numbers, which a composition makes and the base keeps, is made in the first iteration of each
        let base = PackedSpec::open(&file)?;
        let mut times = Vec::with_capacity(iterations);
        for _ in 0..iterations {
            let start = Instant::now();
            let composed = compose(&base, std::slice::from_ref(extension))?;
            times.push(millis(start));
            black_box(composed.string_count());
        }
        measurements.push(measurement(&format!("packed-rust-compose-{name}"), "ms", &times));
    }
    Ok(measurements)
}

fn hash_scenario(directory: &str, iterations: usize) -> Result<Vec<Value>, String> {
    let questions = read_questions(directory)?;
    let mut murmur = Vec::with_capacity(iterations);
    let mut xxhash = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let mut total = 0_u32;
        for text in &questions.strings {
            total ^= murmur3(text.as_bytes(), 0);
        }
        murmur.push(millis(start));
        black_box(total);

        let start = Instant::now();
        let mut total = 0_u32;
        for text in &questions.strings {
            total ^= xxhash32(text.as_bytes(), 0);
        }
        xxhash.push(millis(start));
        black_box(total);
    }
    Ok(vec![
        measurement("packed-rust-hash-murmur3", "ms", &murmur),
        measurement("packed-rust-hash-xxhash32", "ms", &xxhash),
    ])
}

fn run(args: &[String]) -> Result<Vec<Value>, String> {
    let (scenario, rest) = args.split_first().ok_or_else(|| USAGE.to_string())?;
    if !matches!(
        scenario.as_str(),
        "check" | "load" | "query" | "value" | "compose" | "hash"
    ) {
        return Err(format!(
            "Unknown scenario \"{scenario}\". It is one of: check, load, query, value, compose, hash"
        ));
    }
    let [candidate, directory, iterations @ ..] = rest else {
        return Err(USAGE.to_string());
    };
    // `check` takes no number of iterations; the others take one
    let iterations = match iterations {
        [] if scenario == "check" => 1,
        [iterations] => iterations
            .parse::<usize>()
            .ok()
            .filter(|count| *count > 0)
            .ok_or_else(|| format!("The number of iterations is a positive integer, not \"{iterations}\""))?,
        _ => return Err(USAGE.to_string()),
    };
    match scenario.as_str() {
        "check" => check(candidate, directory),
        "load" => load(candidate, directory, iterations),
        "query" => query(candidate, directory, iterations),
        "value" => value(directory, iterations),
        "compose" => compose_scenario(candidate, directory, iterations),
        _ => hash_scenario(directory, iterations),
    }
}

fn main() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let measurements = run(&args)?;
    println!("\n{}", json!({ "measurements": measurements }));
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::LazyLock;

    use super::*;
    use crate::format::{NONE, variants};
    use crate::read::digest_value;

    /// The data of `@markuplint/html-spec`, read where it is in the repository.
    static SPEC: LazyLock<Value> = LazyLock::new(|| {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../packages/@markuplint/html-spec/index.json"
        );
        serde_json::from_str(&fs::read_to_string(path).expect("the data of html-spec")).expect("JSON")
    });

    /// A spec of a few elements, with the names of an index (eight or more) and one that is not ASCII.
    fn small() -> Value {
        let specs: Vec<Value> = (0..12)
            .map(|index| {
                let name = if index == 11 { "x-\u{65e5}\u{672c}".to_string() } else { format!("el{index}") };
                let mut element = json!({
                    "name": name,
                    "cite": format!("https://example.test/#el{index}"),
                    "attributes": (0..if index % 3 == 0 { 9 } else { 2 })
                        .map(|a| (format!("attr{a}"), json!({ "type": if a % 2 == 0 { json!("Any") } else { json!({ "enum": ["a", "b"] }) } })))
                        .collect::<Map<String, Value>>(),
                });
                if index % 4 == 0 {
                    element["obsolete"] = json!(true);
                }
                if index == 3 {
                    element["deprecated"] = json!(true);
                    element["experimental"] = json!(true);
                }
                element
            })
            .collect();
        json!({
            "def": {
                "#globalAttrs": { "#HTMLGlobalAttrs": { "id": { "type": "DOMID" } } },
                "#aria": {
                    "1.1": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] },
                    "1.2": { "roles": [{ "name": "button", "deprecated": false, "n": 3 }], "props": [], "graphicsRoles": [], "dpubRoles": [] },
                    "1.3": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] }
                },
                "#contentModels": { "#flow": ["el0", "el3", "x-\u{65e5}\u{672c}", "el3[href]", "#text"], "#empty": [] }
            },
            "specs": specs,
            "acceptedAttrNames": ["a", "b"]
        })
    }

    fn words(spec: &PackedSpec) -> Rc<Vec<u8>> {
        Rc::new(spec.serialize())
    }

    #[test]
    fn every_candidate_reads_back_the_data_of_html_spec() {
        for variant in variants() {
            let packed = encode_spec(&SPEC, variant).unwrap();
            assert!(packed.to_json() == *SPEC, "{}", variant.stem());
            let opened = PackedSpec::open(&words(&packed)).unwrap();
            assert_eq!(opened.variant, variant);
            assert_eq!(opened.serialize(), packed.serialize());
        }
    }

    #[test]
    fn a_candidate_makes_the_same_bytes_from_the_same_spec() {
        for variant in variants().into_iter().step_by(3) {
            assert_eq!(
                encode_spec(&SPEC, variant).unwrap().serialize(),
                encode_spec(&SPEC, variant).unwrap().serialize()
            );
        }
    }

    #[test]
    fn a_name_that_is_not_ascii_is_held_and_indexed() {
        for variant in variants() {
            let packed = encode_spec(&small(), variant).unwrap();
            assert!(packed.to_json() == small(), "{}", variant.stem());
            let found = packed.find(0, packed.root(0), "x-\u{65e5}\u{672c}");
            assert_ne!(found, NONE);
            assert_eq!(packed.to_value(0, found)["name"], json!("x-\u{65e5}\u{672c}"));
            assert_eq!(packed.find(0, packed.root(0), "x-\u{65e6}\u{672c}"), NONE);
            assert_eq!(packed.position(0, packed.root(0), "el5"), 5);
        }
    }

    #[test]
    fn every_element_is_found_by_its_name_and_no_name_that_is_not_one() {
        for variant in variants() {
            let packed = encode_spec(&SPEC, variant).unwrap();
            for (position, element) in SPEC["specs"].as_array().unwrap().iter().enumerate() {
                let name = element["name"].as_str().unwrap();
                assert_eq!(packed.position(0, packed.root(0), name) as usize, position, "{name}");
                assert_eq!(
                    packed.find(0, packed.root(0), name),
                    packed.at(0, packed.root(0), u32::try_from(position).unwrap())
                );
            }
            for name in ["", "nope", "svg:", "DIV", "div ", "svg:rec", "mml:mi\u{e9}"] {
                assert_eq!(packed.find(0, packed.root(0), name), NONE, "{name:?}");
            }
        }
    }

    #[test]
    fn the_bits_answer_as_the_data_does() {
        let elements = SPEC["specs"].as_array().unwrap();
        let categories = SPEC["def"]["#contentModels"].as_object().unwrap();
        for variant in variants().into_iter().step_by(4) {
            let packed = encode_spec(&SPEC, variant).unwrap();
            assert_eq!(packed.element_count() as usize, elements.len());
            for (position, element) in elements.iter().enumerate() {
                let position = u32::try_from(position).unwrap();
                for (flag, name) in crate::format::FLAGS.iter().enumerate() {
                    assert_eq!(
                        packed.flag(position, u32::try_from(flag).unwrap()),
                        u32::from(element[*name] == json!(true)),
                        "{} {name}",
                        element["name"]
                    );
                }
                for (row, (category, members)) in categories.iter().enumerate() {
                    let expected = members.as_array().unwrap().contains(&element["name"]);
                    assert_eq!(
                        packed.member(position, u32::try_from(row).unwrap()),
                        u32::from(expected),
                        "{} {category}",
                        element["name"]
                    );
                }
            }
        }
    }

    #[test]
    fn a_file_that_was_changed_cut_short_or_of_another_version_is_refused() {
        let file = encode_spec(&small(), variants()[1]).unwrap().serialize();
        for at in (0..file.len()).step_by((file.len() / 400).max(1)) {
            let mut changed = file.clone();
            changed[at + 1 - (at + 1).min(1)] ^= 0x01;
            assert!(PackedSpec::open(&Rc::new(changed)).is_err(), "byte {at}");
        }
        assert!(PackedSpec::open(&Rc::new(file[..file.len() - 4].to_vec())).is_err());
        assert_eq!(
            PackedSpec::open(&Rc::new(file[..40].to_vec())).unwrap_err(),
            "The file is shorter than the header of a packed spec"
        );
        assert_eq!(
            PackedSpec::open(&Rc::new(file[..file.len() - 1].to_vec())).unwrap_err(),
            "A packed spec is made of whole words"
        );
        let mut magic = file.clone();
        magic[0] = 1;
        assert!(PackedSpec::open(&Rc::new(magic)).unwrap_err().contains("magic"));
        let mut version = file.clone();
        version[4] = 2;
        assert!(PackedSpec::open(&Rc::new(version)).unwrap_err().contains("version 2"));
        let mut section = file;
        let at = 4 * (5 + 2 * crate::format::section::ARIA);
        section[at..at + 4].copy_from_slice(&0x7fff_ffff_u32.to_le_bytes());
        assert!(PackedSpec::open(&Rc::new(section)).unwrap_err().contains("section 5"));
    }

    #[test]
    fn a_number_that_the_format_does_not_hold_is_refused() {
        let variant = variants()[0];
        for spec in [
            json!({ "specs": [-1] }),
            json!({ "specs": [1.5] }),
            json!({ "specs": [4_294_967_296_u64] }),
        ] {
            assert!(encode_spec(&spec, variant).is_err(), "{spec}");
        }
        assert!(encode_spec(&json!({ "def": { "#other": {} } }), variant).is_err());
        // a region that the spec lacks is the empty value of its kind
        assert_eq!(
            encode_spec(&json!({}), variant).unwrap().to_json(),
            json!({
                "def": { "#globalAttrs": {}, "#aria": {}, "#contentModels": {} },
                "specs": []
            })
        );
    }

    /// The paths of a few of everything, and what the objects answer to them.
    fn hand_made_questions() -> QuestionsFile {
        // [region, steps, (kind, argument)...] with the strings in `strings`
        let strings: Vec<String> = [
            "input",
            "attributes",
            "autocomplete",
            "no-such-attribute",
            "#HTMLGlobalAttrs",
            "id",
            "1.2",
            "roles",
            "button",
        ]
        .iter()
        .map(|text| (*text).to_string())
        .collect();
        let paths: Vec<u32> = vec![
            0, 3, 2, 0, 0, 1, 0, 2, // specs / input / attributes / autocomplete
            0, 3, 2, 0, 0, 1, 0, 3, // specs / input / attributes / no-such-attribute
            1, 2, 0, 4, 0, 5, //       #globalAttrs / #HTMLGlobalAttrs / id
            2, 3, 0, 6, 0, 7, 2, 8, // aria / 1.2 / roles / button
            0, 1, 1, 0, //             specs[0]
            0, 1, 1, 100_000, //       specs[100000]
        ];
        // [kind, ...] 1 flag by name, 2 member by name
        let stream: Vec<u32> = vec![0, 0, 3, 2, 0, 0, 1, 0, 2, 1, 0, 0, 1, 0, 2, 0, 3, 3, 4];
        QuestionsFile {
            strings,
            bits: vec![0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 2, 5],
            bit_answers: Vec::new(),
            paths,
            path_answers: vec![0; 6],
            stream: [stream.as_slice(), &[1, 0, 1, 2, 0, 2]].concat(),
            stream_answers: vec![0; 4],
        }
    }

    #[test]
    fn the_loops_answer_what_the_digest_of_the_value_says() {
        let questions = hand_made_questions();
        let specs = SPEC["specs"].as_array().unwrap();
        let input = specs.iter().find(|element| element["name"] == "input").unwrap();
        let expected = [
            digest_value(&input["attributes"]["autocomplete"]).unwrap(),
            0,
            digest_value(&SPEC["def"]["#globalAttrs"]["#HTMLGlobalAttrs"]["id"]).unwrap(),
            digest_value(
                SPEC["def"]["#aria"]["1.2"]["roles"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|role| role["name"] == "button")
                    .unwrap(),
            )
            .unwrap(),
            digest_value(&specs[0]).unwrap(),
            0,
        ];
        let objects = ObjectSpec::new(
            region_values(&SPEC)
                .unwrap()
                .into_iter()
                .map(std::borrow::Cow::into_owned)
                .collect(),
        );
        assert_eq!(ask_paths_objects(&objects, &questions), expected);
        for variant in variants() {
            let packed = encode_spec(&SPEC, variant).unwrap();
            assert_eq!(ask_paths(&packed, &questions), expected, "{}", variant.stem());
        }
        assert_ne!(expected[0], 0);
    }

    #[test]
    fn the_stream_and_the_bits_agree_between_the_candidates_and_the_objects() {
        let mut questions = hand_made_questions();
        // flags of the first elements, and a category of each
        questions.bits = (0..40)
            .flat_map(|element| [u32::from(element % 3 == 0), element, element % 4])
            .collect();
        let objects = ObjectSpec::new(
            region_values(&SPEC)
                .unwrap()
                .into_iter()
                .map(std::borrow::Cow::into_owned)
                .collect(),
        );
        questions.stream_answers = vec![0; 4];
        let expected_bits = ask_bits_objects(&objects, &questions);
        let expected_stream = ask_stream_objects(&objects, &questions);
        assert_eq!(expected_stream.len(), 4);
        for variant in variants() {
            let packed = encode_spec(&SPEC, variant).unwrap();
            assert_eq!(ask_bits(&packed, &questions), expected_bits, "{}", variant.stem());
            assert_eq!(ask_stream(&packed, &questions), expected_stream, "{}", variant.stem());
        }
    }

    fn extension() -> Value {
        json!({
            "def": {
                "#globalAttrs": { "#extends": { "x-new": { "type": "Any" }, "id": { "type": "Any" } } },
                "#aria": {
                    "1.1": { "roles": [], "props": [] },
                    "1.2": { "roles": [{ "name": "Button", "x": 1 }, { "name": "new-role" }], "props": [] },
                    "1.3": { "roles": [], "props": [] }
                },
                "#contentModels": { "#flow": ["x-element"], "#new": ["EL1"] }
            },
            "specs": [
                { "name": "EL1", "attributes": { "attr0": { "type": "Boolean" }, "new": { "type": "Any" } }, "extra": true },
                { "name": "not-in-the-base" }
            ],
            "movedToHead": ["head-element"],
            "acceptedAttrNames": ["(x)"],
            "templateContent": false,
            "literalValues": { "attrs": { "class": { "k": "v" } }, "customElements": { "attrs": { "x": { "y": "z" } } } }
        })
    }

    #[test]
    fn a_composition_means_what_a_hand_written_expectation_says() {
        let mut spec = small();
        spec["def"]["#aria"] = json!({
            "1.1": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] },
            "1.2": { "roles": [{ "name": "button", "deprecated": false, "n": 3 }], "props": [], "graphicsRoles": [], "dpubRoles": [] },
            "1.3": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] }
        });
        spec["def"]["#globalAttrs"]["#HTMLGlobalAttrs"]["lang"] = json!({ "type": "Any" });
        spec["directivePatterns"] = json!([{ "a": 1 }]);
        for variant in variants().into_iter().step_by(3) {
            let base = encode_spec(&spec, variant).unwrap();
            let composed = compose(&base, &[extension()]).unwrap().to_json();

            // `specs`: the element that has the name (without regard to case) is merged and keeps its place; the other is dropped
            let specs = composed["specs"].as_array().unwrap();
            assert_eq!(specs.len(), 12);
            assert_eq!(specs[1]["name"], json!("EL1"));
            assert_eq!(specs[1]["extra"], json!(true));
            assert_eq!(specs[1]["cite"], json!("https://example.test/#el1"));
            assert_eq!(specs[1]["attributes"]["attr0"], json!({ "type": "Boolean" }));
            assert_eq!(specs[1]["attributes"]["new"], json!({ "type": "Any" }));
            assert!(specs.iter().all(|element| element["name"] != json!("not-in-the-base")));
            assert_eq!(specs[0]["name"], json!("el0"));
            // the `globalAttrs` and the `attributes` that the merge sets are on the elements that were merged
            assert_eq!(specs[1]["globalAttrs"], json!({}));

            // `#globalAttrs`: the extension is merged into `#HTMLGlobalAttrs`, and what it has overrides the whole attribute
            let global = &composed["def"]["#globalAttrs"]["#HTMLGlobalAttrs"];
            assert_eq!(global["id"], json!({ "type": "Any" }));
            assert_eq!(global["lang"], json!({ "type": "Any" }));
            assert_eq!(global["x-new"], json!({ "type": "Any" }));

            // `#aria`: a role is merged by name without regard to case, the merged one goes to the end, and a new one is added
            let roles = composed["def"]["#aria"]["1.2"]["roles"].as_array().unwrap();
            assert_eq!(roles.len(), 2);
            assert_eq!(
                roles[0],
                json!({ "name": "Button", "deprecated": false, "n": 3, "x": 1 })
            );
            assert_eq!(roles[1], json!({ "name": "new-role" }));

            // `#contentModels`: the arrays of the base and then those of the extension
            let flow = &composed["def"]["#contentModels"]["#flow"];
            assert_eq!(flow.as_array().unwrap().last().unwrap(), &json!("x-element"));
            assert_eq!(flow.as_array().unwrap().len(), 6);
            assert_eq!(composed["def"]["#contentModels"]["#new"], json!(["EL1"]));

            // the rest
            assert_eq!(composed["directivePatterns"], json!([{ "a": 1 }]));
            assert_eq!(composed["movedToHead"], json!(["head-element"]));
            assert_eq!(composed["acceptedAttrNames"], json!(["(x)"]));
            assert_eq!(composed["templateContent"], json!(false));
            assert_eq!(
                composed["literalValues"],
                json!({ "attrs": { "class": { "k": "v" } }, "customElements": { "attrs": { "x": { "y": "z" } } } })
            );

            // and the bits are of the composed spec, by exact name: the element that the extension renamed `EL1` is a member of the new category
            let composed_spec = compose(&base, &[extension()]).unwrap();
            let rows = composed["def"]["#contentModels"].as_object().unwrap();
            let new = rows.keys().position(|key| key == "#new").unwrap();
            assert_eq!(composed_spec.member(1, u32::try_from(new).unwrap()), 1);
            assert_eq!(composed_spec.member(0, u32::try_from(new).unwrap()), 0);
        }
    }

    #[test]
    fn a_composition_shares_what_it_does_not_touch_and_keeps_the_numbers_of_the_strings() {
        let base = encode_spec(&small(), variants()[0]).unwrap();
        let before = base.serialize();
        let composed = compose(&base, &[json!({ "def": { "#contentModels": { "#flow": ["el9"] } } })]).unwrap();
        assert_eq!(
            composed.to_json()["def"]["#contentModels"]["#flow"]
                .as_array()
                .unwrap()
                .len(),
            6
        );
        assert_eq!(base.serialize(), before);
        for sid in 0..base.string_count() {
            let sid = u32::try_from(sid).unwrap();
            assert_eq!(composed.string_bytes(sid), base.string_bytes(sid));
        }
        // no extension, or one that touches nothing, is the base itself
        assert_eq!(compose(&base, &[]).unwrap().serialize(), before);
        assert_eq!(compose(&base, &[json!({})]).unwrap().serialize(), before);
        // and a composition can be composed again, and opened as a file
        let twice = compose(&composed, &[extension()]).unwrap();
        assert_eq!(PackedSpec::open(&words(&twice)).unwrap().to_json(), twice.to_json());
    }

    #[test]
    fn a_composition_of_an_extension_that_schema_to_spec_would_refuse_is_refused() {
        let base = encode_spec(&small(), variants()[0]).unwrap();
        // the ARIA of an extension that lacks a version
        assert!(compose(&base, &[json!({ "def": { "#aria": { "1.1": {} } } })]).is_err());
        // an extension that names an item with something that is not a name
        assert!(compose(&base, &[json!({ "specs": [{ "name": 3 }] })]).is_err());
    }

    #[test]
    fn the_scenario_names_and_the_arguments_are_checked_first() {
        let words = |list: &[&str]| list.iter().map(|word| (*word).to_string()).collect::<Vec<_>>();
        assert!(
            run(&words(&["nope", "-", "dir", "1"]))
                .unwrap_err()
                .contains("Unknown scenario")
        );
        assert!(
            run(&words(&["load", "-", "dir", "0"]))
                .unwrap_err()
                .contains("positive integer")
        );
        assert!(run(&words(&["load", "-"])).unwrap_err().contains("Usage"));
        assert!(
            run(&words(&["load", "no-such", "dir", "1"]))
                .unwrap_err()
                .contains("is not a candidate")
        );
    }
}
