//! The Rust half of `yarn spec-baseline perf --rust` (`scripts/spec-baseline/`): what it costs to read the
//! data of `@markuplint/html-spec` and to ask it the basic questions, measured as the `lint` of v6 does it, so
//! that the format of a packed form is chosen from the numbers of both languages.
//!
//! It measures and decides nothing: it prints one line of JSON, `{"measurements":[{"name","unit","values"}]}`,
//! that `perf.ts` reads as it reads the line of `perf-child.ts`, and the statistics are those of the TypeScript
//! side (a process for each sample, the first iteration kept apart, a bootstrap interval). Four names are those of a
//! TypeScript scenario with a `rust-` in front and the same question behind them, so that a table puts the two side by
//! side: `file-json-read-parse`, `file-read-view`, `query-object` and `query-bits`. `rust-query-crate` is asked the way
//! `query-today` is (through the functions that the rules call), and the two heap figures count what the allocator of
//! this process holds, where the TypeScript ones (`heap-after-import`, `heap-after-merge`) are the heap of V8.
//!
//! ```text
//! spec_baseline <scenario> <index.json> <questions.json> <iterations>
//! ```
//!
//! `<index.json>` is the data as the TS side hands it to the Rust engine: minified (`perf.ts` writes that text, and the
//! file in the package is indented, which would be a larger input than v6 ever parses).
//!
//! - `load`: read the file and parse it with `load_spec` (the cost that every call of `lint` in v6 pays: the TS side
//!   hands the spec over as a JSON string and `load_spec` parses it again, with nothing kept between calls), and the
//!   bytes that the loaded spec keeps (`rust-heap-after-load`) and the most that were held at once while loading
//!   (`rust-heap-peak-load`), counted by the allocator of this process in one more load after the timed ones.
//! - `view`: the floor of a binary of the size of the JSON: read bytes of that size and read a 32-bit word of them,
//!   never parsing (`rust-file-read-view`). A `u32` of a byte slice is `u32::from_le_bytes` of four bytes, which the
//!   compiler turns into a load: nothing is copied or allocated for it.
//! - `query`: the questions of `layout.ts`, answered through the functions of this crate that the rules call
//!   (`get_spec`, `get_content_model_tags`), through the parsed structs, and through the bits (32-bit words,
//!   little-endian). The three must give the answers of the data as objects in the TypeScript file on every
//!   question before any time is taken, and the bits that this file builds from its own reading of the data must
//!   be the bits that the TypeScript file wrote: a faster answer that differs is not a measurement.
//!
//! It has to be built with `--release` and with the whole workspace (`cargo build --release --workspace --example
//! spec_baseline`): `serde_json` is given `preserve_order` and `unbounded_depth` by the other crates of the
//! workspace, and the `lint` of the addon is built with them, so a build of this crate alone would read the data with
//! other maps than the ones that v6 reads it with.

use std::alloc::{GlobalAlloc, Layout, System};
use std::collections::HashMap;
use std::fs;
use std::hint::black_box;
use std::io::Write;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::Instant;

use markuplint_types::spec::load_spec;
use markuplint_types::spec::lookup::{get_content_model_tags, get_spec};
use markuplint_types::spec::types::{ElementSpec, MLMLSpec, Obsolete};
use serde::Deserialize;
use serde_json::json;

/// Counts the bytes that are held and the most that were held, so that the memory of the loaded data is a figure of
/// this process and not of the machine. It answers for what `serde_json` and the structs allocate, which is what
/// the data costs; the operating system's own accounting (resident size) also counts the code and the stacks.
///
/// The addon of v6 has no such allocator, so it counts only while a figure of memory is being taken (`COUNTING`),
/// and no time is taken then: the timed regions pay one relaxed load of a flag for each allocation, and nothing else.
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

/// What `layout.ts` writes (`questionsFile`).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QuestionsFile {
    flag_names: Vec<String>,
    elements: Vec<String>,
    categories: Vec<String>,
    words_per_row: usize,
    flags: Vec<u32>,
    category_bits: Vec<u32>,
    /// Three numbers for each question: 0 for a flag and 1 for a category, the element, the flag or the category.
    questions: Vec<usize>,
    answers: Vec<u8>,
}

/// The bits of the data, by the rule of `buildLayout` of `layout.ts`.
#[derive(Debug, PartialEq, Eq)]
struct Bits {
    elements: Vec<String>,
    categories: Vec<String>,
    words_per_row: usize,
    flags: Vec<u32>,
    /// `categories.len()` rows of `words_per_row` words: the elements that are members of each category.
    members: Vec<u32>,
}

/// Whether an element has the flag, as the TypeScript reads it: `=== true`. An `obsolete` that carries an `alt` is
/// not `true` there, and is not a flag here.
fn flag_of(element: &ElementSpec, flag: &str) -> Result<bool, String> {
    match flag {
        "obsolete" => Ok(matches!(element.obsolete, Some(Obsolete::Flag(true)))),
        "deprecated" => Ok(element.deprecated == Some(true)),
        "nonStandard" => Ok(element.non_standard == Some(true)),
        "experimental" => Ok(element.experimental == Some(true)),
        other => Err(format!("There is no flag \"{other}\" in the data")),
    }
}

/// Builds the bits from the parsed data.
///
/// # Errors
///
/// A flag name that this file does not know.
fn build_bits(spec: &MLMLSpec, flag_names: &[String]) -> Result<Bits, String> {
    let elements: Vec<String> = spec.specs.iter().map(|element| element.name.clone()).collect();
    // `Map` of the TypeScript keeps the last position of a name, as `insert` does
    let mut index: HashMap<&str, usize> = HashMap::new();
    for (position, name) in elements.iter().enumerate() {
        index.insert(name.as_str(), position);
    }
    let mut categories: Vec<String> = spec.def.content_models.keys().cloned().collect();
    categories.sort();
    let words_per_row = elements.len().div_ceil(32);

    let mut flags = Vec::with_capacity(elements.len());
    for element in &spec.specs {
        let mut word = 0_u32;
        for (bit, name) in flag_names.iter().enumerate() {
            if flag_of(element, name)? {
                word |= 1 << bit;
            }
        }
        flags.push(word);
    }

    let mut members = vec![0_u32; categories.len() * words_per_row];
    for (row, category) in categories.iter().enumerate() {
        for member in &spec.def.content_models[category] {
            // A selector, or the name of something that is not an element (`#text`, `#custom`), is no bit
            if let Some(&position) = index.get(member.as_str()) {
                members[row * words_per_row + (position >> 5)] |= 1 << (position & 31);
            }
        }
    }
    Ok(Bits {
        elements,
        categories,
        words_per_row,
        flags,
        members,
    })
}

fn flag_name(file: &QuestionsFile, flag: usize) -> Result<&str, String> {
    file.flag_names
        .get(flag)
        .map(String::as_str)
        .ok_or_else(|| format!("There is no flag {flag}"))
}

/// The questions as `(kind, element, index)`.
fn questions(file: &QuestionsFile) -> impl Iterator<Item = (usize, usize, usize)> + '_ {
    file.questions
        .as_chunks::<3>()
        .0
        .iter()
        .map(|&[kind, element, index]| (kind, element, index))
}

/// Answers through the functions of this crate that the rules call.
fn ask_crate(spec: &MLMLSpec, file: &QuestionsFile) -> Result<Vec<u8>, String> {
    let mut answers = Vec::with_capacity(file.answers.len());
    for (kind, element, index) in questions(file) {
        let name = file
            .elements
            .get(element)
            .ok_or_else(|| format!("There is no element {element}"))?;
        let answer = if kind == 0 {
            match get_spec(spec, name) {
                Some(found) => flag_of(found, flag_name(file, index)?)?,
                None => false,
            }
        } else {
            let category = file
                .categories
                .get(index)
                .ok_or_else(|| format!("There is no category {index}"))?;
            get_content_model_tags(spec, category).is_some_and(|tags| tags.contains(name))
        };
        answers.push(u8::from(answer));
    }
    Ok(answers)
}

/// Answers from the parsed structs, by position.
fn ask_object(spec: &MLMLSpec, file: &QuestionsFile) -> Result<Vec<u8>, String> {
    let mut answers = Vec::with_capacity(file.answers.len());
    for (kind, element, index) in questions(file) {
        let found = spec
            .specs
            .get(element)
            .ok_or_else(|| format!("There is no element {element}"))?;
        let answer = if kind == 0 {
            flag_of(found, flag_name(file, index)?)?
        } else {
            let category = file
                .categories
                .get(index)
                .ok_or_else(|| format!("There is no category {index}"))?;
            spec.def
                .content_models
                .get(category)
                .is_some_and(|members| members.contains(&found.name))
        };
        answers.push(u8::from(answer));
    }
    Ok(answers)
}

/// Answers from the bits.
fn ask_bits(bits: &Bits, file: &QuestionsFile) -> Vec<u8> {
    let mut answers = Vec::with_capacity(file.answers.len());
    for (kind, element, index) in questions(file) {
        let word = if kind == 0 {
            bits.flags[element] >> index
        } else {
            bits.members[index * bits.words_per_row + (element >> 5)] >> (element & 31)
        };
        answers.push((word & 1) as u8);
    }
    answers
}

/// The first question that two answers differ at, as a message.
fn first_difference(name: &str, got: &[u8], expected: &[u8]) -> Result<(), String> {
    if got.len() != expected.len() {
        return Err(format!(
            "The {name} way gave {} answers for {} questions",
            got.len(),
            expected.len()
        ));
    }
    match got.iter().zip(expected).position(|(a, b)| a != b) {
        Some(at) => Err(format!("The {name} way answers differently at question {at}")),
        None => Ok(()),
    }
}

const USAGE: &str = "Usage: spec_baseline <scenario> <index.json> <questions.json> <iterations>";

/// What the arguments after the scenario name: the data, the questions and the number of iterations.
struct Inputs<'a> {
    index: &'a str,
    questions: &'a str,
    iterations: usize,
}

/// Reads the arguments after the scenario. Nothing is opened here: only the scenario that asks the questions reads
/// their file, and a scenario that is not one is refused before any file is.
fn read_inputs(args: &[String]) -> Result<Inputs<'_>, String> {
    let [index, questions, iterations] = args else {
        return Err(USAGE.to_string());
    };
    let iterations = iterations
        .parse::<usize>()
        .ok()
        .filter(|count| *count > 0)
        .ok_or_else(|| format!("The number of iterations is a positive integer, not \"{iterations}\""))?;
    Ok(Inputs {
        index,
        questions,
        iterations,
    })
}

fn read_questions(path: &str) -> Result<QuestionsFile, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{path}: {error}"))?;
    serde_json::from_str(&text).map_err(|error| format!("{path}: {error}"))
}

fn millis(start: Instant) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}

fn measurement(name: &str, unit: &str, values: &[f64]) -> serde_json::Value {
    json!({ "name": name, "unit": unit, "values": values })
}

#[allow(clippy::cast_precision_loss)] // a count of bytes is far below 2^52
fn bytes(value: usize) -> f64 {
    value as f64
}

fn load(index: &str, iterations: usize) -> Result<Vec<serde_json::Value>, String> {
    // The timed loads run with the counting off, as the addon of v6 has no counter
    let mut times = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let text = fs::read_to_string(index).map_err(|error| format!("{index}: {error}"))?;
        let spec = load_spec(&text).map_err(|error| format!("{index}: {error}"))?;
        times.push(millis(start));
        black_box(spec.specs.len());
    }

    // What one load costs in memory is read by one more, when the timing is over and nothing else of the data is alive:
    // the arguments and the list of times were allocated before the counting began, nothing is printed until the end,
    // and the only thing freed in between is the text of the file, so what is left over is what the loaded data holds.
    COUNTING.store(true, Ordering::Relaxed);
    let before = HELD.load(Ordering::Relaxed);
    PEAK.store(before, Ordering::Relaxed);
    let text = fs::read_to_string(index).map_err(|error| format!("{index}: {error}"))?;
    let spec = load_spec(&text).map_err(|error| format!("{index}: {error}"))?;
    let peak = PEAK.load(Ordering::Relaxed).saturating_sub(before);
    drop(text);
    let retained = HELD.load(Ordering::Relaxed).saturating_sub(before);
    COUNTING.store(false, Ordering::Relaxed);
    black_box(spec.specs.len());

    Ok(vec![
        measurement("rust-file-json-read-parse", "ms", &times),
        measurement("rust-heap-after-load", "bytes", &[bytes(retained)]),
        measurement("rust-heap-peak-load", "bytes", &[bytes(peak)]),
    ])
}

fn view(index: &str, iterations: usize) -> Result<Vec<serde_json::Value>, String> {
    // The size of the data as it is read: `perf.ts` gives the minified text to every scenario, as the TypeScript
    // scenario makes its bytes of the minified text, and as v6 hands the spec over
    let size = fs::metadata(index).map_err(|error| format!("{index}: {error}"))?.len();
    let size = usize::try_from(size).map_err(|error| format!("{index}: {error}"))?;
    let length = size - size % 4;
    let path = std::env::temp_dir().join(format!("spec-baseline-{}.bin", std::process::id()));
    // `create_new` does not open a file that is there already, nor follow a link that someone put at the name
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|error| format!("{}: {error}", path.display()))?;
    // The file is there from here on, and it is removed whether the write and the reads went well or not
    let times = (|| {
        file.write_all(&vec![1_u8; length])
            .map_err(|error| format!("{}: {error}", path.display()))?;
        (0..iterations)
            .map(|_| {
                let start = Instant::now();
                let data = fs::read(&path).map_err(|error| error.to_string())?;
                let word = data.last_chunk::<4>().map_or(0, |chunk| u32::from_le_bytes(*chunk));
                let elapsed = millis(start);
                black_box(word);
                Ok(elapsed)
            })
            .collect::<Result<Vec<f64>, String>>()
    })();
    drop(file);
    fs::remove_file(&path).map_err(|error| format!("{}: {error}", path.display()))?;
    Ok(vec![measurement("rust-file-read-view", "ms", &times?)])
}

fn query(index: &str, file: &QuestionsFile, iterations: usize) -> Result<Vec<serde_json::Value>, String> {
    let text = fs::read_to_string(index).map_err(|error| format!("{index}: {error}"))?;
    let spec = load_spec(&text).map_err(|error| format!("{index}: {error}"))?;
    drop(text);
    let bits = build_bits(&spec, &file.flag_names)?;

    // What is timed is worth something only if the readers agree on the layout and on every answer
    let expected = &file.answers;
    if bits.elements != file.elements || bits.categories != file.categories {
        return Err("The elements or the categories of the data are not those of the questions".to_string());
    }
    if bits.words_per_row != file.words_per_row || bits.flags != file.flags || bits.members != file.category_bits {
        return Err("The bits built from the data are not the bits that the questions were made with".to_string());
    }
    first_difference("crate", &ask_crate(&spec, file)?, expected)?;
    first_difference("object", &ask_object(&spec, file)?, expected)?;
    first_difference("bits", &ask_bits(&bits, file), expected)?;

    let mut crate_way = Vec::with_capacity(iterations);
    let mut object_way = Vec::with_capacity(iterations);
    let mut bits_way = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let start = Instant::now();
        let answers = ask_crate(&spec, file)?;
        crate_way.push(millis(start));
        black_box(answers.iter().map(|answer| usize::from(*answer)).sum::<usize>());

        let start = Instant::now();
        let answers = ask_object(&spec, file)?;
        object_way.push(millis(start));
        black_box(answers.iter().map(|answer| usize::from(*answer)).sum::<usize>());

        let start = Instant::now();
        let answers = ask_bits(&bits, file);
        bits_way.push(millis(start));
        black_box(answers.iter().map(|answer| usize::from(*answer)).sum::<usize>());
    }
    Ok(vec![
        measurement("rust-query-crate", "ms", &crate_way),
        measurement("rust-query-object", "ms", &object_way),
        measurement("rust-query-bits", "ms", &bits_way),
    ])
}

fn run(args: &[String]) -> Result<Vec<serde_json::Value>, String> {
    let (scenario, rest) = args.split_first().ok_or_else(|| USAGE.to_string())?;
    if !matches!(scenario.as_str(), "load" | "view" | "query") {
        return Err(format!(
            "Unknown scenario \"{scenario}\". It is one of: load, view, query"
        ));
    }
    let inputs = read_inputs(rest)?;
    match scenario.as_str() {
        "load" => load(inputs.index, inputs.iterations),
        "view" => view(inputs.index, inputs.iterations),
        _ => query(inputs.index, &read_questions(inputs.questions)?, inputs.iterations),
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
    use std::sync::{Mutex, PoisonError};

    use super::*;

    /// `view` writes a file whose name is the process, and the tests run on threads of one process: the two that use
    /// it take this one at a time.
    static VIEW_FILE: Mutex<()> = Mutex::new(());

    const SPEC: &str = r##"{
        "def": {
            "#globalAttrs": {},
            "#aria": {
                "1.1": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] },
                "1.2": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] },
                "1.3": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] }
            },
            "#contentModels": {
                "#phrasing": ["a", "span"],
                "#flow": ["a", "div", "a[href]", "svg:rect"],
                "#empty": []
            }
        },
        "specs": [
            { "name": "a" },
            { "name": "div" },
            { "name": "span", "deprecated": true },
            { "name": "font", "obsolete": true, "nonStandard": true },
            { "name": "marquee", "obsolete": { "alt": "CSS" } },
            { "name": "svg:rect", "experimental": true }
        ]
    }"##;

    const FLAGS: [&str; 4] = ["obsolete", "deprecated", "nonStandard", "experimental"];

    fn spec() -> MLMLSpec {
        load_spec(SPEC).unwrap()
    }

    fn flag_names() -> Vec<String> {
        FLAGS.iter().map(ToString::to_string).collect()
    }

    /// The questions file as `layout.ts` makes it for the data above: every flag of every element, then every
    /// category of every element, with the answers that the data as objects gives.
    fn file() -> QuestionsFile {
        let spec = spec();
        let bits = build_bits(&spec, &flag_names()).unwrap();
        let mut questions = Vec::new();
        let mut answers = Vec::new();
        for (element, found) in spec.specs.iter().enumerate() {
            for (flag, name) in FLAGS.iter().enumerate() {
                questions.extend([0, element, flag]);
                answers.push(u8::from(flag_of(found, name).unwrap()));
            }
        }
        for (element, name) in bits.elements.iter().enumerate() {
            for (category, category_name) in bits.categories.iter().enumerate() {
                questions.extend([1, element, category]);
                answers.push(u8::from(spec.def.content_models[category_name].contains(name)));
            }
        }
        QuestionsFile {
            flag_names: flag_names(),
            elements: bits.elements,
            categories: bits.categories,
            words_per_row: bits.words_per_row,
            flags: bits.flags,
            category_bits: bits.members,
            questions,
            answers,
        }
    }

    #[test]
    fn sets_one_flag_bit_for_each_flag_in_the_order_of_the_names() {
        let bits = build_bits(&spec(), &flag_names()).unwrap();
        assert_eq!(bits.flags, [0, 0, 0b0010, 0b0101, 0, 0b1000]);
    }

    #[test]
    fn does_not_take_an_obsolete_that_carries_an_alt_for_the_flag() {
        // TypeScript reads `obsolete === true`, and `{ alt }` is not `true`
        let bits = build_bits(&spec(), &flag_names()).unwrap();
        assert_eq!(bits.flags[4] & 1, 0);
    }

    #[test]
    fn sorts_the_categories_and_sets_a_bit_for_each_member_that_is_an_element() {
        let bits = build_bits(&spec(), &flag_names()).unwrap();
        assert_eq!(bits.categories, ["#empty", "#flow", "#phrasing"]);
        assert_eq!(bits.words_per_row, 1);
        // #flow: a, div, svg:rect (`a[href]` is a selector); #phrasing: a, span
        assert_eq!(bits.members, [0, 0b10_0011, 0b00_0101]);
    }

    /// `count` elements `e0`, `e1`, …, and one category `#all` that has the last of them as its only member.
    fn spec_of(count: usize) -> MLMLSpec {
        let specs = (0..count)
            .map(|i| format!(r#"{{"name":"e{i}"}}"#))
            .collect::<Vec<_>>()
            .join(",");
        let json = SPEC.replace(r#""specs": ["#, &format!(r#""specs": [{specs}],"unused":["#));
        let json = json.replace(
            r##""#empty": []"##,
            &format!(r##""#empty": [], "#all": ["e{}"]"##, count - 1),
        );
        load_spec(&json).unwrap()
    }

    #[test]
    fn puts_the_bit_of_an_element_in_the_word_and_the_place_that_its_position_says() {
        // (elements, words in a row): the boundary of a word is at 32, 64 and 96
        for (count, words) in [(31, 1), (32, 1), (33, 2), (63, 2), (64, 2), (65, 3)] {
            let bits = build_bits(&spec_of(count), &flag_names()).unwrap();
            assert_eq!(bits.words_per_row, words, "{count} elements");
            let row = bits.categories.iter().position(|name| name == "#all").unwrap();
            let last = count - 1;
            let word = bits.members[row * words + (last >> 5)];
            assert_eq!(word, 1 << (last & 31), "{count} elements: the bit of e{last}");
            // no other bit of the row is set
            let others: u32 = bits.members[row * words..(row + 1) * words]
                .iter()
                .enumerate()
                .filter(|(at, _)| *at != last >> 5)
                .map(|(_, word)| *word)
                .sum();
            assert_eq!(others, 0, "{count} elements");
        }
    }

    #[test]
    fn refuses_a_flag_that_it_does_not_know() {
        let error = build_bits(&spec(), &["hidden".to_string()]).unwrap_err();
        assert!(error.contains("hidden"));
    }

    #[test]
    fn the_three_ways_give_the_answers_of_the_file() {
        let spec = spec();
        let file = file();
        let bits = build_bits(&spec, &file.flag_names).unwrap();
        assert_eq!(ask_crate(&spec, &file).unwrap(), file.answers);
        assert_eq!(ask_object(&spec, &file).unwrap(), file.answers);
        assert_eq!(ask_bits(&bits, &file), file.answers);
    }

    #[test]
    fn a_way_that_answers_differently_is_named_with_the_question() {
        let message = first_difference("bits", &[1, 0, 1], &[1, 1, 1]).unwrap_err();
        assert!(message.contains("bits") && message.contains("question 1"));
    }

    #[test]
    fn answers_that_are_not_one_for_each_question_are_refused() {
        let message = first_difference("crate", &[1], &[1, 0]).unwrap_err();
        assert!(message.contains("1 answers for 2 questions"));
    }

    #[test]
    fn a_question_that_points_outside_the_data_is_refused_and_not_answered_as_no() {
        let spec = spec();
        let mut file = file();
        file.questions = vec![0, 99, 0];
        assert!(ask_object(&spec, &file).is_err());
        assert!(ask_crate(&spec, &file).is_err());
        file.questions = vec![1, 0, 99];
        assert!(ask_object(&spec, &file).is_err());
    }

    #[test]
    fn the_arguments_are_checked_before_any_file_is_opened() {
        let args = |scenario: &str, iterations: &str| [scenario, "a", "b", iterations].map(String::from).to_vec();
        assert!(read_inputs(&[]).is_err());
        let unknown = run(&args("lint", "1")).unwrap_err();
        assert!(unknown.contains("Unknown scenario \"lint\""), "{unknown}");
        let iterations = run(&args("load", "0")).unwrap_err();
        assert!(iterations.contains("positive integer"), "{iterations}");
    }

    #[test]
    fn only_the_scenario_that_asks_the_questions_reads_their_file() {
        let error = run(&["query", "a", "questions-that-are-not-there.json", "1"].map(String::from)).unwrap_err();
        assert!(error.contains("questions-that-are-not-there.json"), "{error}");
        // `load` opens the data first, and says that it is the data that is missing
        let error = run(&[
            "load",
            "data-that-is-not-there.json",
            "questions-that-are-not-there.json",
            "1",
        ]
        .map(String::from))
        .unwrap_err();
        assert!(error.contains("data-that-is-not-there.json"), "{error}");
    }

    #[test]
    fn the_file_of_the_view_scenario_is_not_opened_when_something_is_at_its_name() {
        let _one_at_a_time = VIEW_FILE.lock().unwrap_or_else(PoisonError::into_inner);
        let index = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../packages/@markuplint/html-spec/index.json"
        );
        let path = std::env::temp_dir().join(format!("spec-baseline-{}.bin", std::process::id()));
        fs::write(&path, b"someone else's").unwrap();
        let error = view(index, 1).unwrap_err();
        let kept = fs::read(&path).unwrap();
        fs::remove_file(&path).unwrap();
        assert!(error.contains("spec-baseline-"), "{error}");
        assert_eq!(kept, b"someone else's");
    }

    /// Writes a file that is gone when the value is dropped, at a name that is the process and the name of the test.
    struct Scratch(std::path::PathBuf);

    impl Scratch {
        fn new(name: &str, content: &str) -> Self {
            let path = std::env::temp_dir().join(format!("spec-baseline-test-{}-{name}", std::process::id()));
            fs::write(&path, content).unwrap();
            Self(path)
        }

        fn path(&self) -> &str {
            self.0.to_str().unwrap()
        }
    }

    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.0);
        }
    }

    #[test]
    fn the_view_scenario_reads_a_file_of_the_size_of_the_data_and_removes_it() {
        let _one_at_a_time = VIEW_FILE.lock().unwrap_or_else(PoisonError::into_inner);
        let index = Scratch::new("view-ok.json", SPEC);
        let measurements = view(index.path(), 3).unwrap();
        assert_eq!(measurements[0]["name"], "rust-file-read-view");
        assert_eq!(measurements[0]["values"].as_array().unwrap().len(), 3);
        let path = std::env::temp_dir().join(format!("spec-baseline-{}.bin", std::process::id()));
        assert!(!path.exists());
    }

    #[test]
    fn the_query_scenario_times_the_three_ways_when_they_agree_with_the_file() {
        let index = Scratch::new("query-ok.json", SPEC);
        let measurements = query(index.path(), &file(), 2).unwrap();
        let names: Vec<&str> = measurements.iter().map(|m| m["name"].as_str().unwrap()).collect();
        assert_eq!(names, ["rust-query-crate", "rust-query-object", "rust-query-bits"]);
        assert!(measurements.iter().all(|m| m["values"].as_array().unwrap().len() == 2));
    }

    #[test]
    fn the_query_scenario_stops_before_any_time_when_the_file_is_of_other_data() {
        let index = Scratch::new("query-other.json", SPEC);
        let mut other = file();
        other.elements.reverse();
        let error = query(index.path(), &other, 2).unwrap_err();
        assert!(error.contains("not those of the questions"), "{error}");

        let mut other = file();
        other.category_bits[1] ^= 1;
        let error = query(index.path(), &other, 2).unwrap_err();
        assert!(
            error.contains("not the bits that the questions were made with"),
            "{error}"
        );

        let mut other = file();
        other.answers[0] ^= 1;
        let error = query(index.path(), &other, 2).unwrap_err();
        assert!(error.contains("answers differently at question 0"), "{error}");
    }

    #[test]
    fn the_load_scenario_reports_the_time_of_each_load_and_what_one_load_holds() {
        let index = Scratch::new("load.json", SPEC);
        let measurements = load(index.path(), 3).unwrap();
        let by_name = |name: &str| measurements.iter().find(|m| m["name"] == name).unwrap();
        assert_eq!(
            by_name("rust-file-json-read-parse")["values"].as_array().unwrap().len(),
            3
        );
        // the counting is on for one load only, and what it holds is more than nothing
        assert!(by_name("rust-heap-after-load")["values"][0].as_f64().unwrap() > 0.0);
        assert!(
            by_name("rust-heap-peak-load")["values"][0].as_f64().unwrap()
                >= by_name("rust-heap-after-load")["values"][0].as_f64().unwrap()
        );
    }

    #[test]
    fn a_measurement_is_written_in_the_shape_that_perf_ts_reads() {
        let value = measurement("rust-x", "ms", &[1.0, 2.0]);
        assert_eq!(value, json!({ "name": "rust-x", "unit": "ms", "values": [1.0, 2.0] }));
    }
}
