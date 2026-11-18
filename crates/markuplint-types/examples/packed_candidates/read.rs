//! The reader of a packed spec, the same as `scripts/spec-baseline/packed/read.ts` and the one that the format is judged
//! by: it opens the bytes of a file, checks them, and answers from them without copying and without parsing. `open` checks
//! the magic, the version, the table of sections, the checksum, the offsets of the strings and the header of every region;
//! the nodes, lists and indexes that a region holds are trusted after the checksum.
//!
//! A word is read from a byte slice with `u32::from_le_bytes` at a computed offset, which the compiler turns into one
//! load: that is the reader of a `&[u32]` that does not copy, in safe code, and it needs no alignment (a file that is
//! `include_bytes!`ed has none). A read past the end of a section is a panic of the bounds check and never an answer, and
//! nothing here is `unsafe` or `get_unchecked`.
//!
//! The sections are shared by `Rc`: a spec that is composed with an extension has the sections of its base for what the
//! extension does not touch.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use serde_json::{Map, Value};

use crate::format::{FLAGS, HEADER_WORDS, MAGIC, NONE, REGIONS, SECTION_COUNT, VERSION, Variant, section, tag};
use crate::hash::{HashFn, crc32c_words, fmix32, fnv1a32, murmur3, xxhash32};
use crate::mphf::{Mode, reduce, slot_of};

/// The word `index` of `bytes`.
#[inline]
pub fn word(bytes: &[u8], index: usize) -> u32 {
    let at = 4 * index;
    u32::from_le_bytes(bytes[at..at + 4].try_into().expect("a slice of four bytes"))
}

/// The little-endian bytes of words.
pub fn words_to_bytes(words: &[u32]) -> Vec<u8> {
    words.iter().flat_map(|word| word.to_le_bytes()).collect()
}

/// A part of a buffer that is shared: a section of a file, or the words that a composition made.
#[derive(Clone, Debug)]
pub struct Section {
    data: Rc<Vec<u8>>,
    start: usize,
    length: usize,
}

impl Section {
    /// A section that is all of these bytes.
    pub fn from_bytes(bytes: Vec<u8>) -> Self {
        let length = bytes.len();
        Self {
            data: Rc::new(bytes),
            start: 0,
            length,
        }
    }

    /// A section of these words.
    pub fn from_words(words: &[u32]) -> Self {
        Self::from_bytes(words_to_bytes(words))
    }

    /// The bytes.
    #[inline]
    pub fn bytes(&self) -> &[u8] {
        &self.data[self.start..self.start + self.length]
    }
}

/// The digest of a value, which is what a question about a path is answered with: the same for the packed tree and for
/// the JSON that it came from, so that a reader is wrong exactly when its answer differs. It is never 0 (0 is "there
/// is no such value").
pub fn digest_of(tag: u32, payload: u32) -> u32 {
    let value = fmix32((tag + 1).wrapping_mul(0x9e37_79b1) ^ payload);
    if value == 0 { 1 } else { value }
}

/// The digest of a JSON value.
///
/// # Errors
///
/// A number that the format does not hold.
pub fn digest_value(value: &Value) -> Result<u32, String> {
    Ok(match value {
        Value::Null => digest_of(tag::NULL, 0),
        Value::Bool(true) => digest_of(tag::TRUE, 0),
        Value::Bool(false) => digest_of(tag::FALSE, 0),
        Value::Number(number) => digest_of(
            tag::UINT,
            number
                .as_u64()
                .and_then(|value| u32::try_from(value).ok())
                .ok_or_else(|| format!("The format holds a non-negative integer below 2^32, not {number}"))?,
        ),
        Value::String(text) => digest_of(tag::STRING, fnv1a32(text.as_bytes())),
        // A count of items is below 2^32
        Value::Array(items) => digest_of(tag::ARRAY, items.len() as u32),
        Value::Object(entries) => digest_of(tag::OBJECT, entries.len() as u32),
    })
}

/// One region: where the nodes, the lists and the indexes are in its section.
#[derive(Clone, Debug)]
pub struct Region {
    section: usize,
    /// Where the lists start, in words of the section.
    lists_at: usize,
    /// Where the indexes start, in words of the section.
    indexes_at: usize,
    root: u32,
    /// The word of field `f` of node `n` is `4 + n * node_stride + f * field_stride`.
    node_stride: usize,
    field_stride: usize,
}

impl Region {
    fn new(section: usize, bytes: &[u8], columns: bool) -> Result<Self, String> {
        let words = bytes.len() / 4;
        if words < 4 {
            return Err("A region is shorter than its header".to_string());
        }
        let count = word(bytes, 0) as usize;
        let lists = word(bytes, 1) as usize;
        let indexes = word(bytes, 2) as usize;
        let root = word(bytes, 3);
        if 4 + 4 * count + lists + indexes != words {
            return Err("A region is not as long as its header says".to_string());
        }
        if root as usize >= count {
            return Err("The root of a region is not a node of it".to_string());
        }
        Ok(Self {
            section,
            lists_at: 4 + 4 * count,
            indexes_at: 4 + 4 * count + lists,
            root,
            node_stride: if columns { 1 } else { 4 },
            field_stride: if columns { count } else { 1 },
        })
    }

    #[inline]
    fn field(&self, bytes: &[u8], node: u32, field: usize) -> u32 {
        word(bytes, 4 + node as usize * self.node_stride + field * self.field_stride)
    }
}

/// A packed spec: the sections of a file, which a composed spec shares with its base for those it did not change.
#[derive(Debug)]
pub struct PackedSpec {
    pub variant: Variant,
    sections: Vec<Section>,
    regions: Vec<Region>,
    mode: Option<Mode>,
    hash: HashFn,
    rows: bool,
    ids: RefCell<Option<HashMap<String, u32>>>,
}

impl PackedSpec {
    /// Makes the spec of these sections.
    ///
    /// # Errors
    ///
    /// Sections that are not those of a spec.
    pub fn new(variant: Variant, sections: Vec<Section>) -> Result<Self, String> {
        if sections.len() != SECTION_COUNT {
            return Err(format!(
                "A packed spec has {SECTION_COUNT} sections, not {}",
                sections.len()
            ));
        }
        let offsets = sections[section::STRING_OFFSETS].bytes();
        if offsets.len() < 4 {
            return Err("The table of the offsets of the strings is empty".to_string());
        }
        if word(offsets, 0) != 0 {
            return Err("The table of string offsets does not start at 0".to_string());
        }
        let offset_count = offsets.len() / 4;
        if (1..offset_count).any(|index| word(offsets, index) < word(offsets, index - 1)) {
            return Err("The table of string offsets is not in order".to_string());
        }
        let length = word(offsets, offset_count - 1) as usize;
        let string_words = sections[section::STRING_BYTES].bytes().len() / 4;
        if length > string_words * 4 || (string_words > 0 && length <= (string_words - 1) * 4) {
            return Err("The bytes of the strings are not as long as their offsets say".to_string());
        }
        let regions = REGIONS
            .iter()
            .map(|id| Region::new(*id, sections[*id].bytes(), variant.columns))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self {
            variant,
            sections,
            regions,
            mode: match variant.index {
                crate::format::IndexKind::Sorted => None,
                crate::format::IndexKind::Minimal => Some(Mode::Minimal),
                crate::format::IndexKind::Pow2 => Some(Mode::Pow2),
            },
            hash: match variant.hash {
                crate::format::HashKind::Murmur3 => murmur3,
                crate::format::HashKind::Xxhash32 => xxhash32,
            },
            rows: !variant.columns,
            ids: RefCell::new(None),
        })
    }

    /// Opens a file: checks the header, the table of sections and the checksum, and views the sections.
    ///
    /// # Errors
    ///
    /// A file that is not a packed spec, of another version, cut short, or changed.
    pub fn open(file: &Rc<Vec<u8>>) -> Result<Self, String> {
        let bytes = file.as_slice();
        if !bytes.len().is_multiple_of(4) {
            return Err("A packed spec is made of whole words".to_string());
        }
        let words = bytes.len() / 4;
        if words < HEADER_WORDS + 1 {
            return Err("The file is shorter than the header of a packed spec".to_string());
        }
        if word(bytes, 0) != MAGIC {
            return Err("The file is not a packed spec (the magic is wrong)".to_string());
        }
        if word(bytes, 1) != VERSION {
            return Err(format!(
                "The version {} of the format is not the one that this reader has ({VERSION})",
                word(bytes, 1)
            ));
        }
        let variant = Variant::from_word(word(bytes, 2))?;
        if word(bytes, 3) as usize != SECTION_COUNT {
            return Err(format!("The file has {} sections, not {SECTION_COUNT}", word(bytes, 3)));
        }
        let end = words - 1;
        let mut next = HEADER_WORDS;
        let mut sections = Vec::with_capacity(SECTION_COUNT);
        for id in 0..SECTION_COUNT {
            let offset = word(bytes, 4 + 2 * id) as usize;
            let length = word(bytes, 5 + 2 * id) as usize;
            if offset != next || offset + length > end {
                return Err(format!("The section {id} is not inside the file"));
            }
            sections.push(Section {
                data: Rc::clone(file),
                start: 4 * offset,
                length: 4 * length,
            });
            next = offset + length;
        }
        if next != end {
            return Err("There are words between the last section and the checksum".to_string());
        }
        if crc32c_words(bytes, end) != word(bytes, end) {
            return Err("The checksum of the file is not the one it holds".to_string());
        }
        Self::new(variant, sections)
    }

    /// The spec again, which shares every section with this one.
    pub fn share(&self) -> Self {
        Self {
            variant: self.variant,
            sections: self.sections.clone(),
            regions: self.regions.clone(),
            mode: self.mode,
            hash: self.hash,
            rows: self.rows,
            ids: RefCell::new(None),
        }
    }

    /// Makes the spec that has these sections in place of the ones it has. A table of strings that is given has to
    /// continue the one that this spec has (the numbers of the strings it has are the same, and so are their bytes),
    /// because the sections that are kept refer to them.
    ///
    /// # Errors
    ///
    /// Offsets of strings that do not start with the offsets of the old ones, bytes of strings that do not start with the
    /// bytes of the old ones, or sections that are not those of a spec.
    pub fn replace(&self, changes: Vec<(usize, Vec<u8>)>) -> Result<Self, String> {
        Self::new(self.variant, self.changed_sections(changes)?)
    }

    /// Like [`PackedSpec::replace`], and the section of the bits is made from the regions that the new spec has, in the
    /// same construction: a spec whose `specs` or `#contentModels` changed is made once, with the bits that its regions give.
    ///
    /// # Errors
    ///
    /// As [`PackedSpec::replace`].
    pub fn replace_with_bits(&self, changes: Vec<(usize, Vec<u8>)>) -> Result<Self, String> {
        let mut spec = Self::new(self.variant, self.changed_sections(changes)?)?;
        spec.make_bits();
        Ok(spec)
    }

    /// Makes a spec of sections, with the bits that its regions give in place of the section of the bits that is given.
    ///
    /// # Errors
    ///
    /// Sections that are not those of a spec.
    pub fn with_bits(variant: Variant, sections: Vec<Section>) -> Result<Self, String> {
        let mut spec = Self::new(variant, sections)?;
        spec.make_bits();
        Ok(spec)
    }

    fn make_bits(&mut self) {
        let bits = words_to_bytes(&self.compute_bits());
        self.sections[section::BITS] = Section::from_bytes(bits);
    }

    /// The sections of this spec with the new words of some, which the table of strings of a new spec has to continue.
    fn changed_sections(&self, changes: Vec<(usize, Vec<u8>)>) -> Result<Vec<Section>, String> {
        let mut sections = self.sections.clone();
        for (id, bytes) in changes {
            let old = self.sections[id].bytes();
            if id == section::STRING_OFFSETS {
                if bytes.len() < old.len() {
                    return Err("The new table of strings is shorter than the one it replaces".to_string());
                }
                if bytes[..old.len()] != *old {
                    return Err("The new table of strings does not continue the one it replaces".to_string());
                }
            } else if id == section::STRING_BYTES {
                // The strings end where the last offset says; what follows is the padding to whole words
                let used = word(self.sections[section::STRING_OFFSETS].bytes(), self.string_count()) as usize;
                if bytes.len() < used || bytes[..used] != old[..used] {
                    return Err("The new table of string bytes does not continue the one it replaces".to_string());
                }
            }
            sections[id] = Section::from_bytes(bytes);
        }
        Ok(sections)
    }

    /// The bytes of the file that holds this spec: the header, the sections and the checksum.
    pub fn serialize(&self) -> Vec<u8> {
        let total = HEADER_WORDS
            + self
                .sections
                .iter()
                .map(|section| section.bytes().len() / 4)
                .sum::<usize>()
            + 1;
        let mut words = vec![0_u32; total];
        words[0] = MAGIC;
        words[1] = VERSION;
        words[2] = self.variant.word();
        // The number of sections, the offsets and the lengths are far below 2^32
        words[3] = SECTION_COUNT as u32;
        let mut at = HEADER_WORDS;
        for (id, section) in self.sections.iter().enumerate() {
            let length = section.bytes().len() / 4;
            words[4 + 2 * id] = at as u32;
            words[5 + 2 * id] = length as u32;
            for (index, chunk) in section.bytes().as_chunks::<4>().0.iter().enumerate() {
                words[at + index] = u32::from_le_bytes(*chunk);
            }
            at += length;
        }
        let bytes = words_to_bytes(&words[..total - 1]);
        let checksum = crc32c_words(&bytes, total - 1);
        let mut out = bytes;
        out.extend_from_slice(&checksum.to_le_bytes());
        out
    }

    #[inline]
    fn bytes_of(&self, id: usize) -> &[u8] {
        self.sections[id].bytes()
    }

    /// The bytes of a section.
    #[cfg(test)]
    pub fn section_bytes(&self, id: usize) -> &[u8] {
        self.bytes_of(id)
    }

    /// How many strings the table has.
    pub fn string_count(&self) -> usize {
        self.bytes_of(section::STRING_OFFSETS).len() / 4 - 1
    }

    /// The bytes of the string with this number.
    #[inline]
    pub fn string_bytes(&self, sid: u32) -> &[u8] {
        let offsets = self.bytes_of(section::STRING_OFFSETS);
        let start = word(offsets, sid as usize) as usize;
        let end = word(offsets, sid as usize + 1) as usize;
        &self.bytes_of(section::STRING_BYTES)[start..end]
    }

    /// The string with this number.
    pub fn string_at(&self, sid: u32) -> String {
        String::from_utf8_lossy(self.string_bytes(sid)).into_owned()
    }

    /// The number of a string. A composition keeps the numbers of the strings of this spec and adds the new ones after them,
    /// so it asks for the number of a string that may be here: the table from the strings to the numbers is made the first
    /// time it is asked, and is kept.
    pub fn string_id(&self, text: &str) -> Option<u32> {
        let mut ids = self.ids.borrow_mut();
        let table = ids.get_or_insert_with(|| {
            // A table of strings has fewer than 2^32 entries
            (0..self.string_count())
                .map(|sid| (self.string_at(sid as u32), sid as u32))
                .collect()
        });
        table.get(text).copied()
    }

    /// The root of a region, by its position in `REGIONS`.
    pub fn root(&self, region: usize) -> u32 {
        self.regions[region].root
    }

    /// How many nodes, words of lists and words of indexes a region has: what a composition that appends to it goes on from.
    pub fn region_counts(&self, region: usize) -> (u32, u32, u32) {
        let bytes = self.bytes_of(self.regions[region].section);
        (word(bytes, 0), word(bytes, 1), word(bytes, 2))
    }

    /// The four words of a node of a region (its tag, `a`, `b` and `c`), whatever the arrangement of the region.
    pub fn node_words(&self, region: usize, node: u32) -> [u32; 4] {
        let region = &self.regions[region];
        let bytes = self.bytes_of(region.section);
        [0, 1, 2, 3].map(|field| region.field(bytes, node, field))
    }

    /// The bytes of the lists of a region.
    pub fn region_lists(&self, region: usize) -> &[u8] {
        let region = &self.regions[region];
        &self.bytes_of(region.section)[4 * region.lists_at..4 * region.indexes_at]
    }

    /// The bytes of the indexes of a region.
    pub fn region_indexes(&self, region: usize) -> &[u8] {
        let region = &self.regions[region];
        &self.bytes_of(region.section)[4 * region.indexes_at..]
    }

    /// The indexes of a region, each with the string numbers of its keys and its position among the indexes: they are walked from
    /// the start, and a record is `2 + n + entries` words for a sorted index and `5 + ceil(buckets / 2) + slots + entries` for a
    /// perfect hash, from the counts at its start, and ends with the key of each entry.
    ///
    /// # Errors
    ///
    /// A record that is not inside the indexes of the region.
    pub fn region_index_keys(&self, region: usize) -> Result<Vec<(Vec<u32>, u32)>, String> {
        let bytes = self.region_indexes(region);
        let words = bytes.len() / 4;
        let mut found = Vec::new();
        let mut at = 0;
        while at < words {
            if (at + 5 > words && self.mode.is_some()) || at + 2 > words {
                return Err("An index is cut short".to_string());
            }
            let entries = word(bytes, at) as usize;
            let distinct = word(bytes, at + 1) as usize;
            let length = if self.mode.is_none() {
                2 + distinct + entries
            } else {
                5 + (word(bytes, at + 3) as usize).div_ceil(2) + word(bytes, at + 4) as usize + entries
            };
            if at + length > words || entries > length {
                return Err("An index is not inside the indexes of its region".to_string());
            }
            let keys = (at + length - entries..at + length)
                .map(|index| word(bytes, index))
                .collect();
            // A position among the indexes is below 2^32
            found.push((keys, at as u32));
            at += length;
        }
        Ok(found)
    }

    #[inline]
    fn entry_key_at(&self, a: usize, j: usize) -> usize {
        if self.rows { a + 2 * j } else { a + j }
    }

    #[inline]
    fn entry_value_at(&self, a: usize, b: usize, j: usize) -> usize {
        if self.rows { a + 2 * j + 1 } else { a + b + j }
    }

    /// Finds the position of a key in an index.
    fn find_entry(&self, region: &Region, bytes: &[u8], index: usize, query: &[u8]) -> u32 {
        let base = region.indexes_at + index;
        let entries = word(bytes, base);
        let distinct = word(bytes, base + 1) as usize;
        let Some(mode) = self.mode else {
            let order_at = base + 2;
            let keys_at = order_at + distinct;
            // The keys that may be the name are `[low, high)` of the order
            let mut low = 0;
            let mut high = distinct;
            while low < high {
                let middle = low + (high - low) / 2;
                let position = word(bytes, order_at + middle);
                let key = word(bytes, keys_at + position as usize);
                match self.string_bytes(key).cmp(query) {
                    std::cmp::Ordering::Equal => return position,
                    std::cmp::Ordering::Less => low = middle + 1,
                    std::cmp::Ordering::Greater => high = middle,
                }
            }
            return NONE;
        };
        let seed = word(bytes, base + 2);
        let buckets = word(bytes, base + 3);
        let slots = word(bytes, base + 4);
        let pilots_at = base + 5;
        let slots_at = pilots_at + (buckets as usize).div_ceil(2);
        let keys_at = slots_at + slots as usize;
        let hash = (self.hash)(query, seed);
        let bucket = reduce(hash, buckets) as usize;
        let pilot = (word(bytes, pilots_at + (bucket >> 1)) >> ((bucket & 1) << 4)) & 0xffff;
        let position = word(bytes, slots_at + slot_of(hash, pilot, slots, mode) as usize);
        if position == NONE || position >= entries {
            return NONE;
        }
        if self.string_bytes(word(bytes, keys_at + position as usize)) == query {
            position
        } else {
            NONE
        }
    }

    /// The tag of a node (the tag of [`NONE`] is null).
    pub fn tag(&self, region: usize, node: u32) -> u32 {
        if node == NONE {
            return tag::NULL;
        }
        let region = &self.regions[region];
        region.field(self.bytes_of(region.section), node, 0)
    }

    /// The position of a key among the entries of an object, which is where its value is, and, for `#contentModels`,
    /// the row of the bits of the category. [`NONE`] when the node is not an object or has no such key.
    pub fn entry(&self, region: usize, node: u32, name: &str) -> u32 {
        if node == NONE {
            return NONE;
        }
        let region = &self.regions[region];
        let bytes = self.bytes_of(region.section);
        if region.field(bytes, node, 0) != tag::OBJECT {
            return NONE;
        }
        let a = region.field(bytes, node, 1) as usize;
        let b = region.field(bytes, node, 2) as usize;
        let index = region.field(bytes, node, 3) as usize;
        let query = name.as_bytes();
        if index != 0 {
            return self.find_entry(region, bytes, index - 1, query);
        }
        for j in 0..b {
            let key = word(bytes, region.lists_at + self.entry_key_at(a, j));
            if self.string_bytes(key) == query {
                // A position is below the number of entries
                return j as u32;
            }
        }
        NONE
    }

    /// The value of a key of an object, or [`NONE`].
    pub fn get(&self, region: usize, node: u32, name: &str) -> u32 {
        let position = self.entry(region, node, name);
        if position == NONE {
            NONE
        } else {
            self.value_at(region, node, position)
        }
    }

    /// An item of an array, or [`NONE`].
    pub fn at(&self, region: usize, node: u32, position: u32) -> u32 {
        if node == NONE {
            return NONE;
        }
        let region = &self.regions[region];
        let bytes = self.bytes_of(region.section);
        if region.field(bytes, node, 0) != tag::ARRAY || position >= region.field(bytes, node, 2) {
            return NONE;
        }
        word(
            bytes,
            region.lists_at + region.field(bytes, node, 1) as usize + position as usize,
        )
    }

    /// The position of the object of an array that has this name, which is the position of an element in `specs`.
    pub fn position(&self, region_id: usize, node: u32, name: &str) -> u32 {
        if node == NONE {
            return NONE;
        }
        let region = &self.regions[region_id];
        let bytes = self.bytes_of(region.section);
        if region.field(bytes, node, 0) != tag::ARRAY {
            return NONE;
        }
        let a = region.field(bytes, node, 1) as usize;
        let count = region.field(bytes, node, 2) as usize;
        let index = region.field(bytes, node, 3) as usize;
        let query = name.as_bytes();
        if index != 0 {
            return self.find_entry(region, bytes, index - 1, query);
        }
        for j in 0..count {
            let item = word(bytes, region.lists_at + a + j);
            let value = self.get(region_id, item, "name");
            if value != NONE
                && region.field(bytes, value, 0) == tag::STRING
                && self.string_bytes(region.field(bytes, value, 1)) == query
            {
                // A position is below the number of items
                return j as u32;
            }
        }
        NONE
    }

    /// The object of an array that has this name: `find(item => item.name === name)`.
    pub fn find(&self, region: usize, node: u32, name: &str) -> u32 {
        let position = self.position(region, node, name);
        if position == NONE {
            NONE
        } else {
            self.at(region, node, position)
        }
    }

    /// How many items or entries a node has.
    pub fn count(&self, region: usize, node: u32) -> u32 {
        let region = &self.regions[region];
        region.field(self.bytes_of(region.section), node, 2)
    }

    /// The key of the `j`th entry of an object (the number of its string).
    pub fn key_at(&self, region: usize, node: u32, j: u32) -> u32 {
        let region = &self.regions[region];
        let bytes = self.bytes_of(region.section);
        let a = region.field(bytes, node, 1) as usize;
        word(bytes, region.lists_at + self.entry_key_at(a, j as usize))
    }

    /// The value of the `j`th entry of an object.
    pub fn value_at(&self, region: usize, node: u32, j: u32) -> u32 {
        let region = &self.regions[region];
        let bytes = self.bytes_of(region.section);
        let a = region.field(bytes, node, 1) as usize;
        let b = region.field(bytes, node, 2) as usize;
        word(bytes, region.lists_at + self.entry_value_at(a, b, j as usize))
    }

    /// The number of the string that a string node holds.
    pub fn string_of(&self, region: usize, node: u32) -> u32 {
        let region = &self.regions[region];
        region.field(self.bytes_of(region.section), node, 1)
    }

    /// The digest of a node (see [`digest_of`]), 0 for [`NONE`].
    pub fn digest(&self, region: usize, node: u32) -> u32 {
        if node == NONE {
            return 0;
        }
        let region = &self.regions[region];
        let bytes = self.bytes_of(region.section);
        let tag = region.field(bytes, node, 0);
        match tag {
            tag::UINT => digest_of(tag, region.field(bytes, node, 1)),
            tag::STRING => digest_of(tag, fnv1a32(self.string_bytes(region.field(bytes, node, 1)))),
            tag::ARRAY | tag::OBJECT => digest_of(tag, region.field(bytes, node, 2)),
            _ => digest_of(tag, 0),
        }
    }

    /// The number of elements of `specs`.
    pub fn element_count(&self) -> u32 {
        word(self.bytes_of(section::BITS), 0)
    }

    /// Whether an element has a flag, from the bits (1 or 0).
    pub fn flag(&self, element: u32, flag: u32) -> u32 {
        (word(self.bytes_of(section::BITS), 3 + element as usize) >> flag) & 1
    }

    /// Whether an element is a member of a category by its name, from the bits (1 or 0).
    pub fn member(&self, element: u32, category: u32) -> u32 {
        let bits = self.bytes_of(section::BITS);
        let elements = word(bits, 0) as usize;
        let per_row = word(bits, 2) as usize;
        (word(
            bits,
            3 + elements + category as usize * per_row + (element >> 5) as usize,
        ) >> (element & 31))
            & 1
    }

    /// Computes the bits from the regions: the flags of each element of `specs`, and, for each category of
    /// `#contentModels`, the elements that are its members by name.
    pub fn compute_bits(&self) -> Vec<u32> {
        let (specs, content) = (0, 3);
        let specs_root = self.root(specs);
        let content_root = self.root(content);
        let elements = if self.tag(specs, specs_root) == tag::ARRAY {
            self.count(specs, specs_root) as usize
        } else {
            0
        };
        let categories = if self.tag(content, content_root) == tag::OBJECT {
            self.count(content, content_root) as usize
        } else {
            0
        };
        let per_row = elements.div_ceil(32);
        let mut words = vec![0_u32; 3 + elements + categories * per_row];
        // The counts are far below 2^32
        words[0] = elements as u32;
        words[1] = categories as u32;
        words[2] = per_row as u32;
        let mut positions: HashMap<Vec<u8>, usize> = HashMap::new();
        for element in 0..elements {
            // A position is below 2^32
            let node = self.at(specs, specs_root, element as u32);
            let name = self.get(specs, node, "name");
            if name != NONE && self.tag(specs, name) == tag::STRING {
                positions
                    .entry(self.string_bytes(self.string_of(specs, name)).to_vec())
                    .or_insert(element);
            }
            let mut flags = 0_u32;
            for (bit, flag) in FLAGS.iter().enumerate() {
                let value = self.get(specs, node, flag);
                if value != NONE && self.tag(specs, value) == tag::TRUE {
                    flags |= 1 << bit;
                }
            }
            words[3 + element] = flags;
        }
        for category in 0..categories {
            // A position is below 2^32
            let list = self.value_at(content, content_root, category as u32);
            let members = if self.tag(content, list) == tag::ARRAY {
                self.count(content, list)
            } else {
                0
            };
            for member in 0..members {
                let item = self.at(content, list, member);
                if self.tag(content, item) != tag::STRING {
                    continue;
                }
                if let Some(element) = positions.get(self.string_bytes(self.string_of(content, item))) {
                    let at = 3 + elements + category * per_row + (element >> 5);
                    words[at] |= 1 << (element & 31);
                }
            }
        }
        words
    }

    /// The value of a node as JSON.
    pub fn to_value(&self, region: usize, node: u32) -> Value {
        match self.tag(region, node) {
            tag::NULL => Value::Null,
            tag::FALSE => Value::Bool(false),
            tag::TRUE => Value::Bool(true),
            tag::UINT => {
                let regions = &self.regions[region];
                Value::from(u64::from(regions.field(self.bytes_of(regions.section), node, 1)))
            }
            tag::STRING => Value::String(self.string_at(self.string_of(region, node))),
            tag::ARRAY => Value::Array(
                (0..self.count(region, node))
                    .map(|position| self.to_value(region, self.at(region, node, position)))
                    .collect(),
            ),
            tag::OBJECT => {
                let mut object = Map::new();
                for j in 0..self.count(region, node) {
                    object.insert(
                        self.string_at(self.key_at(region, node, j)),
                        self.to_value(region, self.value_at(region, node, j)),
                    );
                }
                Value::Object(object)
            }
            other => panic!("There is no tag {other}"),
        }
    }

    /// The value of a region as JSON, by its position in `REGIONS`.
    pub fn region_value(&self, region: usize) -> Value {
        self.to_value(region, self.root(region))
    }

    /// The whole spec as JSON, in the shape of `index.json`: `def`, `specs`, and the keys of the rest.
    pub fn to_json(&self) -> Value {
        let mut def = Map::new();
        def.insert("#globalAttrs".to_string(), self.region_value(1));
        def.insert("#aria".to_string(), self.region_value(2));
        def.insert("#contentModels".to_string(), self.region_value(3));
        let mut object = Map::new();
        object.insert("def".to_string(), Value::Object(def));
        object.insert("specs".to_string(), self.region_value(0));
        if let Value::Object(rest) = self.region_value(4) {
            for (key, value) in rest {
                object.insert(key, value);
            }
        }
        Value::Object(object)
    }
}
