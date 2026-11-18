//! The questions that the candidates are measured with (`scripts/spec-baseline/packed/questions.ts` writes them with the
//! answers that the data gives), and the loops that answer them: from a packed spec, and from the plain `serde_json::Value`
//! objects of the JSON as the code of today reads them (the baseline), which has the best that an object can have: a
//! table that an index of names covers is looked up in a map that is made the first time it is needed, and kept.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

use serde::Deserialize;
use serde_json::Value;

use crate::format::{FLAGS, INDEX_MINIMUM, NONE};
use crate::read::{PackedSpec, digest_value};

/// The kinds of a step of a path.
const STEP_KEY: u32 = 0;
const STEP_INDEX: u32 = 1;

/// The kinds of an operation of a stream.
const OP_PATH: u32 = 0;
const OP_FLAG: u32 = 1;

/// What `questions.ts` writes (`QuestionsFile`).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionsFile {
    pub strings: Vec<String>,
    /// Three numbers for each question: 0 for a flag or 1 for a category, the position of the element, and the flag or the
    /// row of the category.
    pub bits: Vec<u32>,
    pub bit_answers: Vec<u32>,
    /// For each path: the region, the number of steps, and a kind and an argument for each step.
    pub paths: Vec<u32>,
    pub path_answers: Vec<u32>,
    /// For each operation: `[0, region, steps, ...]` as a path, `[1, element name, flag]`, or `[2, element name, category name]`.
    pub stream: Vec<u32>,
    pub stream_answers: Vec<u32>,
}

/// The first answer that is not the expected one, as a message.
///
/// # Errors
///
/// A difference.
pub fn first_difference(way: &str, got: &[u32], expected: &[u32]) -> Result<(), String> {
    if got.len() != expected.len() {
        return Err(format!(
            "The {way} way gave {} answers for {} questions",
            got.len(),
            expected.len()
        ));
    }
    match got.iter().zip(expected).position(|(got, expected)| got != expected) {
        Some(at) => Err(format!(
            "The {way} way answers differently at question {at}: {}, the data says {}",
            got[at], expected[at]
        )),
        None => Ok(()),
    }
}

/// Answers the questions of the bits.
pub fn ask_bits(packed: &PackedSpec, questions: &QuestionsFile) -> Vec<u32> {
    let mut answers = Vec::with_capacity(questions.bit_answers.len());
    for question in questions.bits.as_chunks::<3>().0 {
        answers.push(if question[0] == 0 {
            packed.flag(question[1], question[2])
        } else {
            packed.member(question[1], question[2])
        });
    }
    answers
}

/// Walks one path that starts at `at` of `words`, and gives its digest and the position after it.
fn walk_packed(packed: &PackedSpec, words: &[u32], start: usize, strings: &[String]) -> (u32, usize) {
    let region = words[start] as usize;
    let steps = words[start + 1] as usize;
    let mut at = start + 2;
    let mut node = packed.root(region);
    for _ in 0..steps {
        let kind = words[at];
        let argument = words[at + 1];
        at += 2;
        if node == NONE {
            continue;
        }
        node = match kind {
            STEP_KEY => packed.get(region, node, &strings[argument as usize]),
            STEP_INDEX => packed.at(region, node, argument),
            _ => packed.find(region, node, &strings[argument as usize]),
        };
    }
    (packed.digest(region, node), at)
}

/// Answers the questions of the paths.
pub fn ask_paths(packed: &PackedSpec, questions: &QuestionsFile) -> Vec<u32> {
    let mut answers = Vec::with_capacity(questions.path_answers.len());
    let mut at = 0;
    for _ in 0..questions.path_answers.len() {
        let (answer, next) = walk_packed(packed, &questions.paths, at, &questions.strings);
        answers.push(answer);
        at = next;
    }
    answers
}

/// Answers the operations of the stream.
pub fn ask_stream(packed: &PackedSpec, questions: &QuestionsFile) -> Vec<u32> {
    let stream = &questions.stream;
    let strings = &questions.strings;
    let mut answers = Vec::with_capacity(questions.stream_answers.len());
    let mut at = 0;
    for _ in 0..questions.stream_answers.len() {
        match stream[at] {
            OP_PATH => {
                let (answer, next) = walk_packed(packed, stream, at + 1, strings);
                answers.push(answer);
                at = next;
            }
            OP_FLAG => {
                let element = packed.position(0, packed.root(0), &strings[stream[at + 1] as usize]);
                answers.push(if element == NONE {
                    2
                } else {
                    packed.flag(element, stream[at + 2])
                });
                at += 3;
            }
            _ => {
                let element = packed.position(0, packed.root(0), &strings[stream[at + 1] as usize]);
                let row = packed.entry(3, packed.root(3), &strings[stream[at + 2] as usize]);
                answers.push(if element == NONE || row == NONE {
                    2
                } else {
                    packed.member(element, row)
                });
                at += 3;
            }
        }
    }
    answers
}

/// The regions of the JSON, and the tables that are made for them the first time.
pub struct ObjectSpec {
    pub regions: Vec<Value>,
    tables: RefCell<HashMap<usize, HashMap<String, usize>>>,
    sets: RefCell<HashMap<usize, HashSet<String>>>,
}

impl ObjectSpec {
    pub fn new(regions: Vec<Value>) -> Self {
        Self {
            regions,
            tables: RefCell::new(HashMap::new()),
            sets: RefCell::new(HashMap::new()),
        }
    }

    /// The object of an array that has the name, through a table when the array is long, as the code of today does.
    pub fn named<'a>(&self, array: &'a Value, name: &str) -> Option<&'a Value> {
        let items = array.as_array()?;
        if items.len() >= INDEX_MINIMUM {
            let address = std::ptr::from_ref(items) as usize;
            let mut tables = self.tables.borrow_mut();
            let table = tables.entry(address).or_insert_with(|| {
                let mut table = HashMap::new();
                for (position, item) in items.iter().enumerate() {
                    if let Some(item_name) = item.get("name").and_then(Value::as_str) {
                        table.entry(item_name.to_string()).or_insert(position);
                    }
                }
                table
            });
            return table.get(name).map(|position| &items[*position]);
        }
        items
            .iter()
            .find(|item| item.get("name").and_then(Value::as_str) == Some(name))
    }

    /// Whether a list of a category has a member.
    pub fn has_member(&self, list: &Value, name: &str) -> bool {
        let address = std::ptr::from_ref(list) as usize;
        let mut sets = self.sets.borrow_mut();
        sets.entry(address)
            .or_insert_with(|| {
                list.as_array().map_or_else(HashSet::new, |items| {
                    items
                        .iter()
                        .filter_map(|item| item.as_str().map(str::to_string))
                        .collect()
                })
            })
            .contains(name)
    }
}

fn walk_objects(spec: &ObjectSpec, words: &[u32], start: usize, strings: &[String]) -> (u32, usize) {
    let mut value = spec.regions.get(words[start] as usize);
    let steps = words[start + 1] as usize;
    let mut at = start + 2;
    for _ in 0..steps {
        let kind = words[at];
        let argument = words[at + 1];
        at += 2;
        let Some(current) = value else { continue };
        value = match kind {
            STEP_KEY => current
                .as_object()
                .and_then(|object| object.get(&strings[argument as usize])),
            STEP_INDEX => current.as_array().and_then(|items| items.get(argument as usize)),
            _ => spec.named(current, &strings[argument as usize]),
        };
    }
    (value.map_or(0, |found| digest_value(found).unwrap_or(0)), at)
}

/// Answers the questions of the paths from the objects.
pub fn ask_paths_objects(spec: &ObjectSpec, questions: &QuestionsFile) -> Vec<u32> {
    let mut answers = Vec::with_capacity(questions.path_answers.len());
    let mut at = 0;
    for _ in 0..questions.path_answers.len() {
        let (answer, next) = walk_objects(spec, &questions.paths, at, &questions.strings);
        answers.push(answer);
        at = next;
    }
    answers
}

/// Answers the operations of the stream from the objects.
pub fn ask_stream_objects(spec: &ObjectSpec, questions: &QuestionsFile) -> Vec<u32> {
    let stream = &questions.stream;
    let strings = &questions.strings;
    let specs = &spec.regions[0];
    let content = &spec.regions[3];
    let mut answers = Vec::with_capacity(questions.stream_answers.len());
    let mut at = 0;
    for _ in 0..questions.stream_answers.len() {
        match stream[at] {
            OP_PATH => {
                let (answer, next) = walk_objects(spec, stream, at + 1, strings);
                answers.push(answer);
                at = next;
            }
            OP_FLAG => {
                let element = spec.named(specs, &strings[stream[at + 1] as usize]);
                answers.push(element.map_or(2, |element| {
                    u32::from(element.get(FLAGS[stream[at + 2] as usize]) == Some(&Value::Bool(true)))
                }));
                at += 3;
            }
            _ => {
                let name = &strings[stream[at + 1] as usize];
                let element = spec.named(specs, name);
                let list = content.get(&strings[stream[at + 2] as usize]);
                answers.push(match (element, list) {
                    (Some(_), Some(list)) => u32::from(spec.has_member(list, name)),
                    _ => 2,
                });
                at += 3;
            }
        }
    }
    answers
}

/// Answers the questions of the bits from the objects.
pub fn ask_bits_objects(spec: &ObjectSpec, questions: &QuestionsFile) -> Vec<u32> {
    let specs = spec.regions[0].as_array().map_or(&[][..], Vec::as_slice);
    let content: Vec<&Value> = spec.regions[3]
        .as_object()
        .map_or_else(Vec::new, |object| object.values().collect());
    let mut answers = Vec::with_capacity(questions.bit_answers.len());
    for question in questions.bits.as_chunks::<3>().0 {
        let element = &specs[question[1] as usize];
        answers.push(if question[0] == 0 {
            u32::from(element.get(FLAGS[question[2] as usize]) == Some(&Value::Bool(true)))
        } else {
            let name = element.get("name").and_then(Value::as_str).unwrap_or_default();
            u32::from(spec.has_member(content[question[2] as usize], name))
        });
    }
    answers
}
