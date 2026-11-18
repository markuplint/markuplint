//! The encoder of a packed spec, the same as `scripts/spec-baseline/packed/encode.ts`: a spec that this makes is the
//! same bytes as the TypeScript one. The strings are numbered in the order that the regions are encoded (`specs`,
//! `#globalAttrs`, `#aria`, `#contentModels`, the rest) and, inside a region, in the order that the walk meets them (for
//! an object a key and then what it holds, for an array each item); a node, a list and an index are numbered when they
//! are made, which is after what they refer to, and one that is the same as an earlier one is made once.
//! The order of the keys of an object is the order of the JSON text (`serde_json` has `preserve_order` when the
//! workspace is built together).
//!
//! A region that a composition changes is appended to (see the paragraph "A region that a composition changes is not made
//! again" of `format.ts`): the encoder then has the region of the base, a [`Tree`] that has a reference ([`Tree::Ref`]) for
//! what the merge left as it was, new nodes, lists and indexes that are numbered on from those of the region, and an
//! index that is the one that the region has when its keys are the same.

use std::borrow::Cow;
use std::collections::{HashMap, HashSet};

use serde_json::Value;

use crate::format::{INDEX_MINIMUM, IndexKind, NONE, REGIONS, SECTION_COUNT, Variant, section, tag};
use crate::hash::{HashFn, murmur3, xxhash32};
use crate::mphf::{Mode, build_mphf};
use crate::read::{PackedSpec, Section, words_to_bytes};

/// What the format holds of the top level of a spec: the keys of `def` that it knows.
const DEF_KEYS: [&str; 3] = ["#globalAttrs", "#aria", "#contentModels"];

/// The strings of a spec: those of a base, which keep their numbers, and the ones that are added after them.
pub struct StringTable<'a> {
    base: Option<&'a PackedSpec>,
    added: Vec<Vec<u8>>,
    added_ids: HashMap<String, u32>,
    base_count: usize,
}

impl<'a> StringTable<'a> {
    pub fn new(base: Option<&'a PackedSpec>) -> Self {
        Self {
            base,
            added: Vec::new(),
            added_ids: HashMap::new(),
            base_count: base.map_or(0, PackedSpec::string_count),
        }
    }

    /// The number of a string, which is added when it is new.
    pub fn intern(&mut self, text: &str) -> u32 {
        if let Some(known) = self.base.and_then(|base| base.string_id(text)) {
            return known;
        }
        if let Some(known) = self.added_ids.get(text) {
            return *known;
        }
        // A table of strings has fewer than 2^32 entries
        let sid = (self.base_count + self.added.len()) as u32;
        self.added.push(text.as_bytes().to_vec());
        self.added_ids.insert(text.to_string(), sid);
        sid
    }

    /// The bytes of a string.
    ///
    /// # Panics
    ///
    /// For a number that is not the number of a string of the base or of an added one: an encoder that asks for it has a
    /// defect, and bytes that are not there would write another file.
    pub fn bytes(&self, sid: u32) -> &[u8] {
        match (sid as usize).checked_sub(self.base_count) {
            None => self
                .base
                .unwrap_or_else(|| panic!("There is no string {sid}"))
                .string_bytes(sid),
            Some(position) => self
                .added
                .get(position)
                .unwrap_or_else(|| panic!("There is no string {sid}")),
        }
    }

    /// Whether a string was added to those of the base.
    pub fn grown(&self) -> bool {
        !self.added.is_empty()
    }

    /// The sections of the strings: the offsets, and the bytes padded to whole words.
    pub fn sections(&self) -> (Vec<u8>, Vec<u8>) {
        let count = self.base_count + self.added.len();
        let mut offsets: Vec<u32> = Vec::with_capacity(count + 1);
        let mut bytes: Vec<u8> = Vec::new();
        for sid in 0..count {
            // A total of bytes is far below 2^32
            offsets.push(bytes.len() as u32);
            bytes.extend_from_slice(self.bytes(sid as u32));
        }
        offsets.push(bytes.len() as u32);
        while !bytes.len().is_multiple_of(4) {
            bytes.push(0);
        }
        (words_to_bytes(&offsets), bytes)
    }
}

fn is_named_object(value: &Value) -> bool {
    value
        .as_object()
        .is_some_and(|object| object.get("name").is_some_and(Value::is_string))
}

/// What is encoded when a region is appended to: the value that a merge made, with a reference to the node of the region
/// for each array and object that it left as it was. A number, a boolean, null and a string are never references, so that
/// they are made as new nodes.
#[derive(Clone, Debug, PartialEq)]
pub enum Tree {
    /// An array or an object (an empty one too) of the region of the base that has this position in `REGIONS`: its node.
    Ref(usize, u32),
    /// A value, whose arrays and objects are new.
    Json(Value),
    /// A new array.
    Array(Vec<Tree>),
    /// A new object: its entries in order.
    Object(Vec<(String, Tree)>),
}

/// The region of a base that is appended to.
struct Base<'p> {
    spec: &'p PackedSpec,
    region: usize,
    nodes: u32,
    lists: u32,
    indexes: u32,
}

/// Makes the words of one region.
struct RegionEncoder<'s, 'a, 'p> {
    strings: &'s mut StringTable<'a>,
    variant: Variant,
    base: Option<Base<'p>>,
    /// Whether the indexes of the base are in `index_ids`.
    seeded: bool,
    nodes: Vec<u32>,
    node_ids: HashMap<[u32; 4], u32>,
    lists: Vec<u32>,
    list_ids: HashMap<Vec<u32>, u32>,
    indexes: Vec<u32>,
    index_ids: HashMap<Vec<u32>, u32>,
}

/// A count or a position in a region is far below 2^32.
fn to_word(value: usize) -> u32 {
    value as u32
}

impl<'s, 'a, 'p> RegionEncoder<'s, 'a, 'p> {
    fn new(strings: &'s mut StringTable<'a>, variant: Variant, base: Option<(&'p PackedSpec, usize)>) -> Self {
        Self {
            strings,
            variant,
            base: base.map(|(spec, region)| {
                let (nodes, lists, indexes) = spec.region_counts(region);
                Base {
                    spec,
                    region,
                    nodes,
                    lists,
                    indexes,
                }
            }),
            seeded: false,
            nodes: Vec::new(),
            node_ids: HashMap::new(),
            lists: Vec::new(),
            list_ids: HashMap::new(),
            indexes: Vec::new(),
            index_ids: HashMap::new(),
        }
    }

    fn node(&mut self, tag: u32, a: u32, b: u32, c: u32) -> u32 {
        let key = [tag, a, b, c];
        if let Some(known) = self.node_ids.get(&key) {
            return *known;
        }
        let id = self.base.as_ref().map_or(0, |base| base.nodes) + to_word(self.nodes.len() / 4);
        self.nodes.extend_from_slice(&key);
        self.node_ids.insert(key, id);
        id
    }

    fn list(&mut self, words: &[u32]) -> u32 {
        if words.is_empty() {
            return 0;
        }
        if let Some(known) = self.list_ids.get(words) {
            return *known;
        }
        let offset = self.base.as_ref().map_or(0, |base| base.lists) + to_word(self.lists.len());
        self.lists.extend_from_slice(words);
        self.list_ids.insert(words.to_vec(), offset);
        offset
    }

    /// Makes the index of entries with these keys, and gives its position.
    fn index(&mut self, keys: &[u32]) -> Result<u32, String> {
        if !self.seeded {
            // The indexes that the region had, for those that have the same keys: the first of them is the one that is used
            if let Some(base) = &self.base {
                for (known, at) in base.spec.region_index_keys(base.region)? {
                    self.index_ids.entry(known).or_insert(at);
                }
            }
            self.seeded = true;
        }
        if let Some(known) = self.index_ids.get(keys) {
            return Ok(*known);
        }
        let words = index_words(self.strings, self.variant, keys)?;
        let offset = self.base.as_ref().map_or(0, |base| base.indexes) + to_word(self.indexes.len());
        self.indexes.extend_from_slice(&words);
        self.index_ids.insert(keys.to_vec(), offset);
        Ok(offset)
    }

    /// Encodes a value, and the values in it.
    fn encode(&mut self, value: &Value) -> Result<u32, String> {
        match value {
            Value::Null => Ok(self.node(tag::NULL, 0, 0, 0)),
            Value::Bool(true) => Ok(self.node(tag::TRUE, 0, 0, 0)),
            Value::Bool(false) => Ok(self.node(tag::FALSE, 0, 0, 0)),
            Value::Number(number) => {
                let value = number
                    .as_u64()
                    .and_then(|value| u32::try_from(value).ok())
                    .ok_or_else(|| format!("The format holds a non-negative integer below 2^32, not {number}"))?;
                Ok(self.node(tag::UINT, value, 0, 0))
            }
            Value::String(text) => {
                let sid = self.strings.intern(text);
                Ok(self.node(tag::STRING, sid, 0, 0))
            }
            Value::Array(items) => {
                let nodes = items
                    .iter()
                    .map(|item| self.encode(item))
                    .collect::<Result<Vec<u32>, String>>()?;
                let names = if items.len() >= INDEX_MINIMUM && items.iter().all(is_named_object) {
                    Some(
                        items
                            .iter()
                            .map(|item| item["name"].as_str().unwrap_or_default().to_string())
                            .collect(),
                    )
                } else {
                    None
                };
                self.array_node(&nodes, names)
            }
            Value::Object(object) => {
                let mut keys: Vec<u32> = Vec::with_capacity(object.len());
                let mut values: Vec<u32> = Vec::with_capacity(object.len());
                for (key, item) in object {
                    keys.push(self.strings.intern(key));
                    values.push(self.encode(item)?);
                }
                self.object_node(&keys, &values)
            }
        }
    }

    /// The node of an array of these nodes, which has an index when `names` (the names of its objects) is given.
    fn array_node(&mut self, nodes: &[u32], names: Option<Vec<String>>) -> Result<u32, String> {
        let index = if let Some(names) = names {
            let keys: Vec<u32> = names.iter().map(|name| self.strings.intern(name)).collect();
            self.index(&keys)? + 1
        } else {
            0
        };
        let list = self.list(nodes);
        Ok(self.node(tag::ARRAY, list, to_word(nodes.len()), index))
    }

    /// The node of an object that has these keys (the numbers of their strings) and these nodes.
    fn object_node(&mut self, keys: &[u32], values: &[u32]) -> Result<u32, String> {
        let words: Vec<u32> = if self.variant.columns {
            keys.iter().chain(values.iter()).copied().collect()
        } else {
            keys.iter()
                .zip(values.iter())
                .flat_map(|(key, value)| [*key, *value])
                .collect()
        };
        let index = if keys.len() >= INDEX_MINIMUM {
            self.index(keys)? + 1
        } else {
            0
        };
        let list = self.list(&words);
        Ok(self.node(tag::OBJECT, list, to_word(keys.len()), index))
    }

    /// The name of an object of a tree, when it has one that is a string.
    fn name_of(&self, tree: &Tree) -> Option<String> {
        match tree {
            Tree::Ref(region, node) => {
                let base = self.base.as_ref().filter(|base| base.region == *region)?;
                let name = base.spec.get(*region, *node, "name");
                (name != NONE && base.spec.tag(*region, name) == tag::STRING)
                    .then(|| base.spec.string_at(base.spec.string_of(*region, name)))
            }
            Tree::Json(value) => is_named_object(value).then(|| value["name"].as_str().unwrap_or_default().to_string()),
            Tree::Object(entries) => entries.iter().find_map(|(key, value)| match (key.as_str(), value) {
                ("name", Tree::Json(Value::String(name))) => Some(name.clone()),
                _ => None,
            }),
            Tree::Array(_) => None,
        }
    }

    /// Encodes a tree, and what is in it: a reference is the node that it is, and makes nothing.
    fn encode_tree(&mut self, tree: &Tree) -> Result<u32, String> {
        match tree {
            Tree::Ref(region, node) => match &self.base {
                Some(base) if base.region == *region => Ok(*node),
                _ => Err("A reference is to a node of the region that is appended to".to_string()),
            },
            Tree::Json(value) => self.encode(value),
            Tree::Array(items) => {
                let nodes = items
                    .iter()
                    .map(|item| self.encode_tree(item))
                    .collect::<Result<Vec<u32>, String>>()?;
                let names: Option<Vec<String>> = if items.len() >= INDEX_MINIMUM {
                    items.iter().map(|item| self.name_of(item)).collect()
                } else {
                    None
                };
                self.array_node(&nodes, names)
            }
            Tree::Object(entries) => {
                let mut keys: Vec<u32> = Vec::with_capacity(entries.len());
                let mut values: Vec<u32> = Vec::with_capacity(entries.len());
                for (key, item) in entries {
                    keys.push(self.strings.intern(key));
                    values.push(self.encode_tree(item)?);
                }
                self.object_node(&keys, &values)
            }
        }
    }

    /// The words of the region: those of the base, if there is one, and then the new ones.
    fn finish(&self, root: u32) -> Vec<u8> {
        let (base_nodes, base_lists, base_indexes) = self
            .base
            .as_ref()
            .map_or((0, 0, 0), |base| (base.nodes, base.lists, base.indexes));
        let mut nodes: Vec<[u32; 4]> = Vec::with_capacity((base_nodes as usize) + self.nodes.len() / 4);
        if let Some(base) = &self.base {
            nodes.extend((0..base_nodes).map(|node| base.spec.node_words(base.region, node)));
        }
        nodes.extend(self.nodes.as_chunks::<4>().0.iter().copied());
        let count = nodes.len();
        let mut words: Vec<u32> = Vec::with_capacity(4 + 4 * count);
        words.push(to_word(count));
        words.push(base_lists + to_word(self.lists.len()));
        words.push(base_indexes + to_word(self.indexes.len()));
        words.push(root);
        if self.variant.columns {
            for field in 0..4 {
                words.extend(nodes.iter().map(|node| node[field]));
            }
        } else {
            words.extend(nodes.iter().flatten());
        }
        let mut bytes = words_to_bytes(&words);
        if let Some(base) = &self.base {
            bytes.extend_from_slice(base.spec.region_lists(base.region));
        }
        bytes.extend(words_to_bytes(&self.lists));
        if let Some(base) = &self.base {
            bytes.extend_from_slice(base.spec.region_indexes(base.region));
        }
        bytes.extend(words_to_bytes(&self.indexes));
        bytes
    }
}

fn hash_of(variant: Variant) -> HashFn {
    match variant.hash {
        crate::format::HashKind::Murmur3 => murmur3,
        crate::format::HashKind::Xxhash32 => xxhash32,
    }
}

/// The words of the index of entries with these keys (see `format.ts`).
fn index_words(strings: &StringTable<'_>, variant: Variant, keys: &[u32]) -> Result<Vec<u32>, String> {
    let bytes: Vec<&[u8]> = keys.iter().map(|sid| strings.bytes(*sid)).collect();
    let mut seen: HashSet<u32> = HashSet::new();
    let mut distinct: Vec<usize> = Vec::new();
    for (position, sid) in keys.iter().enumerate() {
        if seen.insert(*sid) {
            distinct.push(position);
        }
    }
    let mut words: Vec<u32> = vec![to_word(keys.len()), to_word(distinct.len())];
    if variant.index == IndexKind::Sorted {
        let mut order = distinct.clone();
        order.sort_by(|x, y| bytes[*x].cmp(bytes[*y]));
        words.extend(order.into_iter().map(to_word));
    } else {
        let mode = if variant.index == IndexKind::Minimal {
            Mode::Minimal
        } else {
            Mode::Pow2
        };
        let distinct_keys: Vec<&[u8]> = distinct.iter().map(|position| bytes[*position]).collect();
        let mphf = build_mphf(&distinct_keys, hash_of(variant), mode)?;
        words.extend([mphf.seed, mphf.buckets, mphf.slots]);
        for pair in 0..(mphf.buckets as usize).div_ceil(2) {
            let low = u32::from(mphf.pilots[2 * pair]);
            let high = mphf.pilots.get(2 * pair + 1).map_or(0, |pilot| u32::from(*pilot));
            words.push(low | (high << 16));
        }
        for entry in &mphf.slot_entry {
            words.push(if *entry == NONE {
                NONE
            } else {
                to_word(distinct[*entry as usize])
            });
        }
    }
    words.extend_from_slice(keys);
    Ok(words)
}

/// Encodes one region.
///
/// # Errors
///
/// A value that the format does not hold.
pub fn encode_region(value: &Value, strings: &mut StringTable<'_>, variant: Variant) -> Result<Vec<u8>, String> {
    let mut encoder = RegionEncoder::new(strings, variant, None);
    let root = encoder.encode(value)?;
    Ok(encoder.finish(root))
}

/// Encodes a region of a spec by appending to it: what the tree has as a reference is the node that it is, and the new
/// nodes, lists and indexes go after those of the region.
///
/// # Errors
///
/// A value that the format does not hold, or a reference to another region.
pub fn append_region(
    tree: &Tree,
    strings: &mut StringTable<'_>,
    base: &PackedSpec,
    region: usize,
) -> Result<Vec<u8>, String> {
    let mut encoder = RegionEncoder::new(strings, base.variant, Some((base, region)));
    let root = encoder.encode_tree(tree)?;
    Ok(encoder.finish(root))
}

/// The value of a key of a spec, or the empty value of its kind when it has none (`??` of the TypeScript).
fn or(value: Option<&Value>, default: Value) -> Cow<'_, Value> {
    match value {
        None | Some(Value::Null) => Cow::Owned(default),
        Some(value) => Cow::Borrowed(value),
    }
}

/// The values of the regions of a spec, in the order of `REGIONS`. A region that the spec lacks is the empty value of
/// its kind: an empty array for `specs`, and an empty object for the others.
///
/// # Errors
///
/// A spec that is not an object, or a key of `def` that the format does not hold.
pub fn region_values(spec: &Value) -> Result<Vec<Cow<'_, Value>>, String> {
    let object = spec.as_object().ok_or_else(|| "A spec is an object".to_string())?;
    let def = object.get("def").and_then(Value::as_object);
    if let Some(def) = def {
        for key in def.keys() {
            if !DEF_KEYS.contains(&key.as_str()) {
                return Err(format!("The format holds no \"{key}\" in def"));
            }
        }
    }
    let rest: serde_json::Map<String, Value> = object
        .iter()
        .filter(|(key, _)| key.as_str() != "def" && key.as_str() != "specs")
        .map(|(key, value)| (key.clone(), value.clone()))
        .collect();
    let empty_object = || Value::Object(serde_json::Map::new());
    Ok(vec![
        or(object.get("specs"), Value::Array(Vec::new())),
        or(def.and_then(|def| def.get("#globalAttrs")), empty_object()),
        or(def.and_then(|def| def.get("#aria")), empty_object()),
        or(def.and_then(|def| def.get("#contentModels")), empty_object()),
        Cow::Owned(Value::Object(rest)),
    ])
}

/// Puts the strings and the regions together into a spec, with its bits.
///
/// # Errors
///
/// Sections that are not those of a spec.
pub fn assemble(variant: Variant, strings: &StringTable<'_>, regions: &[Vec<u8>]) -> Result<PackedSpec, String> {
    let (offsets, bytes) = strings.sections();
    let mut sections: Vec<Section> = (0..SECTION_COUNT).map(|_| Section::from_words(&[0, 0, 0])).collect();
    sections[section::STRING_OFFSETS] = Section::from_bytes(offsets);
    sections[section::STRING_BYTES] = Section::from_bytes(bytes);
    for (position, id) in REGIONS.iter().enumerate() {
        sections[*id] = Section::from_bytes(regions[position].clone());
    }
    PackedSpec::with_bits(variant, sections)
}

/// Encodes a spec.
///
/// # Errors
///
/// A spec that the format does not hold.
pub fn encode_spec(spec: &Value, variant: Variant) -> Result<PackedSpec, String> {
    let mut strings = StringTable::new(None);
    let mut regions = Vec::with_capacity(REGIONS.len());
    for value in region_values(spec)? {
        regions.push(encode_region(&value, &mut strings, variant)?);
    }
    assemble(variant, &strings, &regions)
}
