//! The encoder of a packed spec, the same as `scripts/spec-baseline/packed/encode.ts`: a spec that this makes is the
//! same bytes as the TypeScript one. The strings are numbered in the order that the regions are encoded (`specs`,
//! `#globalAttrs`, `#aria`, `#contentModels`, the rest) and, inside a region, in the order that the walk meets them (for
//! an object a key and then what it holds, for an array each item); a node, a list and an index are numbered when they
//! are made, which is after what they refer to, and one that is the same as an earlier one is not made again.
//! The order of the keys of an object is the order of the JSON text (`serde_json` has `preserve_order` when the
//! workspace is built together).

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
        #[allow(clippy::cast_possible_truncation)]
        let sid = (self.base_count + self.added.len()) as u32;
        self.added.push(text.as_bytes().to_vec());
        self.added_ids.insert(text.to_string(), sid);
        sid
    }

    /// The bytes of a string.
    pub fn bytes(&self, sid: u32) -> &[u8] {
        match (sid as usize).checked_sub(self.base_count) {
            None => self.base.map_or(&[][..], |base| base.string_bytes(sid)),
            Some(position) => self.added.get(position).map_or(&[][..], Vec::as_slice),
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
            #[allow(clippy::cast_possible_truncation)]
            offsets.push(bytes.len() as u32);
            #[allow(clippy::cast_possible_truncation)]
            bytes.extend_from_slice(self.bytes(sid as u32));
        }
        #[allow(clippy::cast_possible_truncation)]
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

/// Makes the words of one region.
struct RegionEncoder<'s, 'a> {
    strings: &'s mut StringTable<'a>,
    variant: Variant,
    nodes: Vec<u32>,
    node_ids: HashMap<[u32; 4], u32>,
    lists: Vec<u32>,
    list_ids: HashMap<Vec<u32>, u32>,
    indexes: Vec<u32>,
    index_ids: HashMap<Vec<u32>, u32>,
}

/// A count or a position in a region is far below 2^32.
#[allow(clippy::cast_possible_truncation)]
fn to_word(value: usize) -> u32 {
    value as u32
}

impl<'s, 'a> RegionEncoder<'s, 'a> {
    fn new(strings: &'s mut StringTable<'a>, variant: Variant) -> Self {
        Self {
            strings,
            variant,
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
        let id = to_word(self.nodes.len() / 4);
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
        let offset = to_word(self.lists.len());
        self.lists.extend_from_slice(words);
        self.list_ids.insert(words.to_vec(), offset);
        offset
    }

    /// Makes the index of entries with these keys, and gives its position.
    fn index(&mut self, keys: &[u32]) -> Result<u32, String> {
        if let Some(known) = self.index_ids.get(keys) {
            return Ok(*known);
        }
        let words = index_words(self.strings, self.variant, keys)?;
        let offset = to_word(self.indexes.len());
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
            Value::Array(items) => self.encode_array(items),
            Value::Object(object) => {
                let mut keys: Vec<u32> = Vec::with_capacity(object.len());
                let mut values: Vec<u32> = Vec::with_capacity(object.len());
                for (key, item) in object {
                    keys.push(self.strings.intern(key));
                    values.push(self.encode(item)?);
                }
                let words: Vec<u32> = if self.variant.columns {
                    keys.iter().chain(values.iter()).copied().collect()
                } else {
                    keys.iter()
                        .zip(values.iter())
                        .flat_map(|(key, value)| [*key, *value])
                        .collect()
                };
                let index = if keys.len() >= INDEX_MINIMUM {
                    self.index(&keys)? + 1
                } else {
                    0
                };
                let list = self.list(&words);
                Ok(self.node(tag::OBJECT, list, to_word(keys.len()), index))
            }
        }
    }

    fn encode_array(&mut self, items: &[Value]) -> Result<u32, String> {
        let nodes = items
            .iter()
            .map(|item| self.encode(item))
            .collect::<Result<Vec<u32>, String>>()?;
        let named = items.len() >= INDEX_MINIMUM && items.iter().all(is_named_object);
        let index = if named {
            let keys: Vec<u32> = items
                .iter()
                .map(|item| self.strings.intern(item["name"].as_str().unwrap_or_default()))
                .collect();
            self.index(&keys)? + 1
        } else {
            0
        };
        let list = self.list(&nodes);
        Ok(self.node(tag::ARRAY, list, to_word(nodes.len()), index))
    }

    /// The words of the region.
    fn finish(&self, root: u32) -> Vec<u8> {
        let count = self.nodes.len() / 4;
        let mut words: Vec<u32> = Vec::with_capacity(4 + self.nodes.len() + self.lists.len() + self.indexes.len());
        words.push(to_word(count));
        words.push(to_word(self.lists.len()));
        words.push(to_word(self.indexes.len()));
        words.push(root);
        if self.variant.columns {
            for field in 0..4 {
                for node in 0..count {
                    words.push(self.nodes[4 * node + field]);
                }
            }
        } else {
            words.extend_from_slice(&self.nodes);
        }
        words.extend_from_slice(&self.lists);
        words.extend_from_slice(&self.indexes);
        words_to_bytes(&words)
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
    let mut encoder = RegionEncoder::new(strings, variant);
    let root = encoder.encode(value)?;
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
    let draft = PackedSpec::new(variant, sections)?;
    let bits = words_to_bytes(&draft.compute_bits());
    draft.replace(vec![(section::BITS, bits)])
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
