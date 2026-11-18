//! The questions that the candidates are measured with (`scripts/spec-baseline/packed/questions.ts` writes them with the
//! answers that the data gives), and the loops that answer them: from a packed spec, and from the plain `serde_json::Value`
//! objects of the JSON as the code of the packages reads them (the baseline), which has the best that an object can have: a
//! table that an index of names covers is looked up in a map that is made the first time it is needed, and kept.
//!
//! The questions are read as numbers, and a number that names nothing (a kind of step or of operation that is not one, a
//! string that the table does not have, a question that is cut short) is an error: it is never read as another question or as
//! an answer of 0.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

use serde::Deserialize;
use serde_json::Value;

use crate::format::{FLAGS, INDEX_MINIMUM, NONE};
use crate::read::{PackedSpec, digest_value};

/// The kinds of a question of the bits.
const BIT_FLAG: u32 = 0;
const BIT_CATEGORY: u32 = 1;

/// The kinds of a step of a path.
const STEP_KEY: u32 = 0;
const STEP_INDEX: u32 = 1;
const STEP_NAMED: u32 = 2;

/// The kinds of an operation of a stream.
const OP_PATH: u32 = 0;
const OP_FLAG: u32 = 1;
const OP_MEMBER: u32 = 2;

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

/// The number at a position of the numbers of the questions.
fn number(words: &[u32], index: usize) -> Result<u32, String> {
    words
        .get(index)
        .copied()
        .ok_or_else(|| format!("The questions are cut short at the number {index}"))
}

/// The string with a number in the table of the questions.
fn string(strings: &[String], index: u32) -> Result<&str, String> {
    strings
        .get(index as usize)
        .map(String::as_str)
        .ok_or_else(|| format!("There is no string {index} in the table of the questions"))
}

/// Answers the questions of the bits.
///
/// # Errors
///
/// A question that is cut short or of a kind that is not one.
pub fn ask_bits(packed: &PackedSpec, questions: &QuestionsFile) -> Result<Vec<u32>, String> {
    let mut answers = Vec::with_capacity(questions.bit_answers.len());
    let (chunks, rest) = questions.bits.as_chunks::<3>();
    if !rest.is_empty() {
        return Err("The questions of the bits are not three numbers each".to_string());
    }
    for question in chunks {
        answers.push(match question[0] {
            BIT_FLAG => packed.flag(question[1], question[2]),
            BIT_CATEGORY => packed.member(question[1], question[2]),
            kind => return Err(format!("There is no kind {kind} of a question of the bits")),
        });
    }
    Ok(answers)
}

/// Walks one path that starts at `at` of `words`, and gives its digest and the position after it.
fn walk_packed(packed: &PackedSpec, words: &[u32], start: usize, strings: &[String]) -> Result<(u32, usize), String> {
    let region = number(words, start)? as usize;
    let steps = number(words, start + 1)? as usize;
    let mut at = start + 2;
    let mut node = packed.root(region);
    for _ in 0..steps {
        let kind = number(words, at)?;
        let argument = number(words, at + 1)?;
        at += 2;
        // The step is read whether or not the walk has already found nothing
        let text = match kind {
            STEP_KEY | STEP_NAMED => string(strings, argument)?,
            STEP_INDEX => "",
            _ => return Err(format!("There is no kind {kind} of a step of a path")),
        };
        if node == NONE {
            continue;
        }
        node = match kind {
            STEP_KEY => packed.get(region, node, text),
            STEP_INDEX => packed.at(region, node, argument),
            _ => packed.find(region, node, text),
        };
    }
    Ok((packed.digest(region, node), at))
}

/// Answers the questions of the paths.
///
/// # Errors
///
/// A path that is cut short, of a step that is not one, or with a string that is not in the table.
pub fn ask_paths(packed: &PackedSpec, questions: &QuestionsFile) -> Result<Vec<u32>, String> {
    let mut answers = Vec::with_capacity(questions.path_answers.len());
    let mut at = 0;
    for _ in 0..questions.path_answers.len() {
        let (answer, next) = walk_packed(packed, &questions.paths, at, &questions.strings)?;
        answers.push(answer);
        at = next;
    }
    Ok(answers)
}

/// Answers the operations of the stream.
///
/// # Errors
///
/// An operation that is cut short or is not one, or a string that is not in the table.
pub fn ask_stream(packed: &PackedSpec, questions: &QuestionsFile) -> Result<Vec<u32>, String> {
    let stream = &questions.stream;
    let strings = &questions.strings;
    let mut answers = Vec::with_capacity(questions.stream_answers.len());
    let mut at = 0;
    for _ in 0..questions.stream_answers.len() {
        match number(stream, at)? {
            OP_PATH => {
                let (answer, next) = walk_packed(packed, stream, at + 1, strings)?;
                answers.push(answer);
                at = next;
            }
            OP_FLAG => {
                let element = packed.position(0, packed.root(0), string(strings, number(stream, at + 1)?)?);
                answers.push(if element == NONE {
                    2
                } else {
                    packed.flag(element, number(stream, at + 2)?)
                });
                at += 3;
            }
            OP_MEMBER => {
                let element = packed.position(0, packed.root(0), string(strings, number(stream, at + 1)?)?);
                let row = packed.entry(3, packed.root(3), string(strings, number(stream, at + 2)?)?);
                answers.push(if element == NONE || row == NONE {
                    2
                } else {
                    packed.member(element, row)
                });
                at += 3;
            }
            op => return Err(format!("There is no kind {op} of an operation of a stream")),
        }
    }
    Ok(answers)
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

    /// The object of an array that has the name, through a table when the array is long, as the code of the packages does.
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

fn walk_objects(spec: &ObjectSpec, words: &[u32], start: usize, strings: &[String]) -> Result<(u32, usize), String> {
    let region = number(words, start)? as usize;
    let mut value = Some(
        spec.regions
            .get(region)
            .ok_or_else(|| format!("There is no region {region}"))?,
    );
    let steps = number(words, start + 1)? as usize;
    let mut at = start + 2;
    for _ in 0..steps {
        let kind = number(words, at)?;
        let argument = number(words, at + 1)?;
        at += 2;
        let text = match kind {
            STEP_KEY | STEP_NAMED => string(strings, argument)?,
            STEP_INDEX => "",
            _ => return Err(format!("There is no kind {kind} of a step of a path")),
        };
        let Some(current) = value else { continue };
        value = match kind {
            STEP_KEY => current.as_object().and_then(|object| object.get(text)),
            STEP_INDEX => current.as_array().and_then(|items| items.get(argument as usize)),
            _ => spec.named(current, text),
        };
    }
    // A value that the format does not hold is an error, not a path that finds nothing
    let digest = value.map_or(Ok(0), digest_value)?;
    Ok((digest, at))
}

/// Answers the questions of the paths from the objects.
///
/// # Errors
///
/// A path that is cut short, of a step that is not one, with a string that is not in the table, or that ends at a number
/// that the format does not hold.
pub fn ask_paths_objects(spec: &ObjectSpec, questions: &QuestionsFile) -> Result<Vec<u32>, String> {
    let mut answers = Vec::with_capacity(questions.path_answers.len());
    let mut at = 0;
    for _ in 0..questions.path_answers.len() {
        let (answer, next) = walk_objects(spec, &questions.paths, at, &questions.strings)?;
        answers.push(answer);
        at = next;
    }
    Ok(answers)
}

/// Answers the operations of the stream from the objects.
///
/// # Errors
///
/// An operation that is cut short or is not one, a string that is not in the table, or a flag that is not one.
pub fn ask_stream_objects(spec: &ObjectSpec, questions: &QuestionsFile) -> Result<Vec<u32>, String> {
    let stream = &questions.stream;
    let strings = &questions.strings;
    let specs = &spec.regions[0];
    let content = &spec.regions[3];
    let mut answers = Vec::with_capacity(questions.stream_answers.len());
    let mut at = 0;
    for _ in 0..questions.stream_answers.len() {
        match number(stream, at)? {
            OP_PATH => {
                let (answer, next) = walk_objects(spec, stream, at + 1, strings)?;
                answers.push(answer);
                at = next;
            }
            OP_FLAG => {
                let element = spec.named(specs, string(strings, number(stream, at + 1)?)?);
                let flag = number(stream, at + 2)?;
                let flag = FLAGS
                    .get(flag as usize)
                    .ok_or_else(|| format!("There is no flag {flag}"))?;
                answers.push(element.map_or(2, |element| u32::from(element.get(*flag) == Some(&Value::Bool(true)))));
                at += 3;
            }
            OP_MEMBER => {
                let name = string(strings, number(stream, at + 1)?)?;
                let element = spec.named(specs, name);
                let list = content.get(string(strings, number(stream, at + 2)?)?);
                answers.push(match (element, list) {
                    (Some(_), Some(list)) => u32::from(spec.has_member(list, name)),
                    _ => 2,
                });
                at += 3;
            }
            op => return Err(format!("There is no kind {op} of an operation of a stream")),
        }
    }
    Ok(answers)
}

/// Answers the questions of the bits from the objects.
///
/// # Errors
///
/// A question that is cut short or of a kind that is not one, or that is about an element, a flag or a category that the
/// data does not have.
pub fn ask_bits_objects(spec: &ObjectSpec, questions: &QuestionsFile) -> Result<Vec<u32>, String> {
    let specs = spec.regions[0].as_array().map_or(&[][..], Vec::as_slice);
    let content: Vec<&Value> = spec.regions[3]
        .as_object()
        .map_or_else(Vec::new, |object| object.values().collect());
    let mut answers = Vec::with_capacity(questions.bit_answers.len());
    let (chunks, rest) = questions.bits.as_chunks::<3>();
    if !rest.is_empty() {
        return Err("The questions of the bits are not three numbers each".to_string());
    }
    for question in chunks {
        let element = specs
            .get(question[1] as usize)
            .ok_or_else(|| format!("There is no element {}", question[1]))?;
        answers.push(match question[0] {
            BIT_FLAG => {
                let flag = FLAGS
                    .get(question[2] as usize)
                    .ok_or_else(|| format!("There is no flag {}", question[2]))?;
                u32::from(element.get(*flag) == Some(&Value::Bool(true)))
            }
            BIT_CATEGORY => {
                let name = element.get("name").and_then(Value::as_str).unwrap_or_default();
                let list = content
                    .get(question[2] as usize)
                    .ok_or_else(|| format!("There is no category {}", question[2]))?;
                u32::from(spec.has_member(list, name))
            }
            kind => return Err(format!("There is no kind {kind} of a question of the bits")),
        });
    }
    Ok(answers)
}
