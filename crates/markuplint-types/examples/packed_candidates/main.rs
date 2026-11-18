//! The Rust half of the measurement of the packed candidates (`scripts/spec-baseline/packed/`): the ten candidates of a
//! packed form of the data of `@markuplint/html-spec` that is read without being parsed, read, checked, composed with an
//! extension and encoded here as the TypeScript side does, byte for byte, and measured.
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
//! - `check`: before any time is taken, what this program has to be equal to. It makes the candidate from the data and
//!   compares the bytes, opens the file and compares what it reads with the data, answers every question as the data does,
//!   composes every extension and compares the bytes, and refuses files that were changed or cut short. It prints no
//!   measurement.
//! - `load`: `packed-rust-open` (read the file and open it, the checksum included), `packed-rust-crc` (the checksum alone), and
//!   the bytes that the opened spec keeps and the most that were held while opening it (counted by the allocator of this process
//!   in one more load after the timed ones).
//! - `query`: `packed-rust-bits`, `packed-rust-paths`, `packed-rust-stream`: the questions of each kind, whole, answers stored.
//! - `value`: the same questions asked of the objects of `serde_json::Value` (the baseline), the cost of reading and
//!   parsing the data into them (`packed-rust-value-load`), and the bytes that the objects keep and the most that were held
//!   while reading them, counted as `load` counts.
//! - `compose`: `packed-rust-compose-<extension>` for each extension.
//! - `hash`: `packed-rust-hash-murmur3` and `packed-rust-hash-xxhash32`: every string of the questions hashed once.
//!
//! It has to be built with `--release` and with the whole workspace (`cargo build --release --workspace --example
//! packed_candidates`): `serde_json` is given `preserve_order` by the other crates of the workspace, and the order of the keys
//! is what the numbers of the strings and of the nodes follow, so that `check` stops for a build that does not have it.

// The counts, positions and offsets of a spec are far below 2^32, and the lengths of keys far below 2^32, so the casts
// between `usize` and `u32` are the same in every module; a cast of another kind says why in its own place.
#![allow(clippy::cast_possible_truncation, clippy::cast_possible_wrap, clippy::cast_sign_loss)]

mod compose;
mod encode;
mod format;
mod hash;
mod mphf;
mod questions;
mod read;

use std::alloc::{GlobalAlloc, Layout, System};
use std::cell::Cell;
use std::fs;
use std::hint::black_box;
use std::rc::Rc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::Instant;

use serde_json::{Map, Value, json};

use crate::compose::compose;
use crate::encode::{encode_spec, region_values};
use crate::format::{HEADER_WORDS, Variant};
use crate::hash::{murmur3, xxhash32};
use crate::questions::{
    ObjectSpec, QuestionsFile, ask_bits, ask_bits_objects, ask_paths, ask_paths_objects, ask_stream,
    ask_stream_objects, first_difference,
};
use crate::read::PackedSpec;

/// Counts the bytes that are held and the most that were held, so that the memory of the opened spec is a figure of this
/// process and not of the machine. It counts only on the thread that asked for a figure of memory (`counted`), and only the
/// blocks that it saw allocated while it counted: the address of each of them is in a table, so that a block that was
/// allocated before the counting began and is freed in it is not taken off, and a block that is freed after it is gone.
/// No time is taken then: the timed regions pay one load of a thread-local flag for each allocation, and nothing else.
struct Counting;

/// The slots of the table of the addresses of the counted blocks (a power of two), and what a slot holds when it has none
/// and when it had one.
const SLOTS: usize = 1 << 20;
const EMPTY: usize = 0;
const GONE: usize = usize::MAX;

static COUNTED: [AtomicUsize; SLOTS] = [const { AtomicUsize::new(EMPTY) }; SLOTS];
static HELD: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);
/// Set when the table has no room for a block: the figure is then not exact, and `counted` says so.
static FULL: AtomicBool = AtomicBool::new(false);

thread_local! {
    /// Whether the allocations of this thread are being counted.
    static COUNTING: Cell<bool> = const { Cell::new(false) };
}

fn counting() -> bool {
    COUNTING.try_with(Cell::get).unwrap_or(false)
}

/// Where an address starts to be looked for in the table.
fn home(pointer: usize) -> usize {
    // The top bits of a multiplication by a constant that is odd and has its bits spread: the index is below 2^20
    (((pointer as u64) >> 4).wrapping_mul(0x9e37_79b9_7f4a_7c15) >> 44) as usize
}

/// Adds an address to the table. `false` when there is no room.
fn remember(pointer: usize) -> bool {
    let mut slot = home(pointer);
    for _ in 0..SLOTS {
        let current = COUNTED[slot].load(Ordering::Relaxed);
        if current == EMPTY || current == GONE {
            COUNTED[slot].store(pointer, Ordering::Relaxed);
            return true;
        }
        slot = (slot + 1) % SLOTS;
    }
    false
}

/// Takes an address out of the table. `false` when it was not there.
fn forget(pointer: usize) -> bool {
    let mut slot = home(pointer);
    for _ in 0..SLOTS {
        let current = COUNTED[slot].load(Ordering::Relaxed);
        if current == pointer {
            COUNTED[slot].store(GONE, Ordering::Relaxed);
            return true;
        }
        if current == EMPTY {
            return false;
        }
        slot = (slot + 1) % SLOTS;
    }
    false
}

// SAFETY: every call is forwarded to `System` unchanged; the counters only observe the sizes.
unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // SAFETY: the caller upholds the contract of `GlobalAlloc::alloc`, and it is passed on as it is.
        let pointer = unsafe { System.alloc(layout) };
        if !pointer.is_null() && counting() {
            if remember(pointer as usize) {
                let held = HELD.fetch_add(layout.size(), Ordering::Relaxed) + layout.size();
                PEAK.fetch_max(held, Ordering::Relaxed);
            } else {
                FULL.store(true, Ordering::Relaxed);
            }
        }
        pointer
    }

    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        if counting() && forget(pointer as usize) {
            HELD.fetch_sub(layout.size(), Ordering::Relaxed);
        }
        // SAFETY: `pointer` came from `alloc` with this `layout`, as the contract says, and it is passed on as it is.
        unsafe { System.dealloc(pointer, layout) };
    }
}

#[global_allocator]
static ALLOCATOR: Counting = Counting;

/// Only one thread counts at a time: the table and the counters are shared.
static ONE_AT_A_TIME: Mutex<()> = Mutex::new(());

/// Runs `work` while the allocations of this thread are counted, and gives what it made, the bytes that it keeps (what is
/// held when it returns, before anything that it gave back is dropped) and the most that were held while it ran.
///
/// # Errors
///
/// What `work` gives, or a table of addresses that had no room for a block (the figure would not be exact).
fn counted<T>(work: impl FnOnce() -> Result<T, String>) -> Result<(T, usize, usize), String> {
    let _only = ONE_AT_A_TIME.lock().map_err(|error| error.to_string())?;
    for slot in &COUNTED {
        slot.store(EMPTY, Ordering::Relaxed);
    }
    HELD.store(0, Ordering::Relaxed);
    PEAK.store(0, Ordering::Relaxed);
    FULL.store(false, Ordering::Relaxed);
    COUNTING.with(|flag| flag.set(true));
    let result = work();
    let retained = HELD.load(Ordering::Relaxed);
    let peak = PEAK.load(Ordering::Relaxed);
    COUNTING.with(|flag| flag.set(false));
    if FULL.load(Ordering::Relaxed) {
        return Err(
            "The table of the addresses of the counted blocks is full: the figure of memory is not exact".to_string(),
        );
    }
    Ok((result?, retained, peak))
}

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

/// The regions of a spec as the objects that the baseline asks.
fn objects_of(spec: &Value) -> Result<ObjectSpec, String> {
    Ok(ObjectSpec::new(
        region_values(spec)?
            .into_iter()
            .map(std::borrow::Cow::into_owned)
            .collect(),
    ))
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
    first_difference("bits", &ask_bits(&base, &questions)?, &questions.bit_answers)?;
    first_difference("paths", &ask_paths(&base, &questions)?, &questions.path_answers)?;
    first_difference("stream", &ask_stream(&base, &questions)?, &questions.stream_answers)?;
    let objects = objects_of(&spec)?;
    first_difference(
        "objects bits",
        &ask_bits_objects(&objects, &questions)?,
        &questions.bit_answers,
    )?;
    first_difference(
        "objects paths",
        &ask_paths_objects(&objects, &questions)?,
        &questions.path_answers,
    )?;
    first_difference(
        "objects stream",
        &ask_stream_objects(&objects, &questions)?,
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

    // A file that was changed or cut short is refused, and never read: a byte of every word of the header, and one in every
    // sixtieth of the rest (every byte of a file is tried by the tests, on a file that is small)
    let stride = (file.len() / 60).max(1);
    for at in (0..4 * HEADER_WORDS).chain((0..file.len()).step_by(stride)) {
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

    // What one open costs in memory is read by one more, when the timing is over: what it keeps is the bytes of the file,
    // and its sections and regions
    let (spec, retained, peak) = counted(|| {
        let file = fs::read(&path).map_err(|error| format!("{path}: {error}"))?;
        open(file)
    })?;
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
    first_difference("bits", &ask_bits(&base, &questions)?, &questions.bit_answers)?;
    first_difference("paths", &ask_paths(&base, &questions)?, &questions.path_answers)?;
    first_difference("stream", &ask_stream(&base, &questions)?, &questions.stream_answers)?;

    let mut bits = Vec::with_capacity(iterations);
    let mut paths = Vec::with_capacity(iterations);
    let mut stream = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let answers = ask_bits(&base, &questions)?;
        bits.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_paths(&base, &questions)?;
        paths.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_stream(&base, &questions)?;
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

    // What the objects keep, counted as the packed spec is: the text is read and parsed, and then dropped
    let (kept, retained, peak) = counted(|| {
        let text = read_text(directory, "index.min.json")?;
        serde_json::from_str::<Value>(&text).map_err(|error| error.to_string())
    })?;
    black_box(kept.as_object().map(Map::len));

    let spec = read_json(directory, "index.min.json")?;
    let objects = objects_of(&spec)?;
    let questions = read_questions(directory)?;
    first_difference(
        "objects bits",
        &ask_bits_objects(&objects, &questions)?,
        &questions.bit_answers,
    )?;
    first_difference(
        "objects paths",
        &ask_paths_objects(&objects, &questions)?,
        &questions.path_answers,
    )?;
    first_difference(
        "objects stream",
        &ask_stream_objects(&objects, &questions)?,
        &questions.stream_answers,
    )?;

    let mut bits = Vec::with_capacity(iterations);
    let mut paths = Vec::with_capacity(iterations);
    let mut stream = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let answers = ask_bits_objects(&objects, &questions)?;
        bits.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_paths_objects(&objects, &questions)?;
        paths.push(millis(start));
        black_box(sum(&answers));

        let start = Instant::now();
        let answers = ask_stream_objects(&objects, &questions)?;
        stream.push(millis(start));
        black_box(sum(&answers));
    }
    Ok(vec![
        measurement("packed-rust-value-load", "ms", &loads),
        measurement("packed-rust-value-heap-after-load", "bytes", &[bytes(retained)]),
        measurement("packed-rust-value-heap-peak-load", "bytes", &[bytes(peak)]),
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
        // A composition is made once for a set of extensions and kept, so what is measured is a composition that has nothing
        // ready: a spec that is opened and not yet asked anything is made for each iteration (and is not timed), so that the
        // table from the strings to their numbers, which a composition makes and the base keeps, is made in each one
        let mut times = Vec::with_capacity(iterations);
        for _ in 0..iterations {
            let base = PackedSpec::open(&file)?;
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
mod tests;
