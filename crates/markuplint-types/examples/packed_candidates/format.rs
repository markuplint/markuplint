//! The layout of a packed spec: the constants and the variant of a candidate. `scripts/spec-baseline/packed/format.ts`
//! describes the layout word by word and is the one description of it; what is here is that file in Rust.

/// The first word of a file, the bytes "MLSP".
pub const MAGIC: u32 = 0x5053_4c4d;

/// The version of the format.
pub const VERSION: u32 = 1;

/// How many sections a file has.
pub const SECTION_COUNT: usize = 8;

/// Where the sections are in the table.
pub mod section {
    pub const STRING_OFFSETS: usize = 0;
    pub const STRING_BYTES: usize = 1;
    pub const BITS: usize = 2;
    pub const SPECS: usize = 3;
    pub const GLOBAL_ATTRS: usize = 4;
    pub const ARIA: usize = 5;
    pub const CONTENT_MODELS: usize = 6;
    pub const REST: usize = 7;
}

/// The sections that are regions, in the order of the sections.
pub const REGIONS: [usize; 5] = [
    section::SPECS,
    section::GLOBAL_ATTRS,
    section::ARIA,
    section::CONTENT_MODELS,
    section::REST,
];

/// The words before the first section: the magic, the version, the variant, the count, and the table.
pub const HEADER_WORDS: usize = 4 + 2 * SECTION_COUNT;

/// The tag of a node.
pub mod tag {
    pub const NULL: u32 = 0;
    pub const FALSE: u32 = 1;
    pub const TRUE: u32 = 2;
    pub const UINT: u32 = 3;
    pub const STRING: u32 = 4;
    pub const ARRAY: u32 = 5;
    pub const OBJECT: u32 = 6;
}

/// The marker of a slot that holds no key, and of a position that is not found.
pub const NONE: u32 = u32::MAX;

/// An array of objects with a `name`, and an object, have an index from this many items or keys.
pub const INDEX_MINIMUM: usize = 8;

/// The flags of an element, in the order of the bits of a flag word.
pub const FLAGS: [&str; 4] = ["obsolete", "deprecated", "nonStandard", "experimental"];

/// How an index finds a position.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum IndexKind {
    Sorted,
    Minimal,
    Pow2,
}

/// Which hash function a perfect hash uses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HashKind {
    Murmur3,
    Xxhash32,
}

/// What differs between the candidates.
// Each flag is a bit of the variant word of the header, which is how a file says what it is
#[allow(clippy::struct_excessive_bools)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Variant {
    /// Arrays of a region in columns (`true`) or in rows.
    pub columns: bool,
    pub index: IndexKind,
    pub hash: HashKind,
    /// The nodes of a region that the encoder makes from a spec are numbered by their tag, then by how many items or entries
    /// they have (`group.rs`). Only an encoder is told by this: the bit of the header says how a file was made, and a reader
    /// does not use it.
    pub grouped: bool,
    /// A slot of a perfect hash that no key has is 0 and the others are the position of their key plus one, in place of
    /// [`NONE`] and the position.
    pub zero: bool,
    /// The table of the offsets of the strings holds them in 16 bits, two to a word, after the count of the strings (the
    /// strings are 65,535 bytes or fewer: a spec that has more is written with 32 bits, and a variant that comes back from a
    /// file says which).
    pub narrow: bool,
    /// The index of an object has no key of each entry (the index of an array has them): a lookup compares the name with
    /// the key that the list of the object holds at the position that the slot gave. Only a perfect hash has it.
    pub bare: bool,
}

/// The bit of the variant word that says the nodes are grouped (bit 4 is not used).
const GROUPED_BIT: u32 = 5;

/// The bit of the variant word that says a slot of a perfect hash is 0 for none.
const ZERO_BIT: u32 = 6;

/// The bit of the variant word that says the offsets of the strings are 16 bits.
const NARROW_BIT: u32 = 7;

/// The bit of the variant word that says the indexes of objects have no keys.
const BARE_BIT: u32 = 8;

/// The strings of a table of 16-bit offsets are this many bytes or fewer.
pub const NARROW_LIMIT: usize = 0xffff;

/// The bit of the second word of an index that says it has no keys (the rest of the word is how many different keys it has).
pub const BARE_FLAG: u32 = 0x8000_0000;

impl Variant {
    /// A candidate that makes none of the choices of the size of the file.
    pub const fn plain(columns: bool, index: IndexKind, hash: HashKind) -> Self {
        Self {
            columns,
            index,
            hash,
            grouped: false,
            zero: false,
            narrow: false,
            bare: false,
        }
    }

    /// Stops for a candidate that no file can have: a sorted index has no slot to write as 0 and keeps the keys that a lookup
    /// compares in its own record. The reader refuses a header that asks for either ([`Variant::from_word`]), so the encoder
    /// does not write one.
    ///
    /// # Errors
    ///
    /// A sorted index with `zero` or `bare`.
    pub fn check(self) -> Result<(), String> {
        if self.index == IndexKind::Sorted && self.bare {
            return Err(
                "An index without keys needs a perfect hash, which gives the position that the key is then read at"
                    .to_string(),
            );
        }
        if self.index == IndexKind::Sorted && self.zero {
            return Err("An empty slot is a slot of a perfect hash, and a sorted index has none".to_string());
        }
        Ok(())
    }

    /// The word of the header that holds the variant.
    pub fn word(self) -> u32 {
        let index = match self.index {
            IndexKind::Sorted => 0,
            IndexKind::Minimal => 1,
            IndexKind::Pow2 => 2,
        };
        u32::from(self.columns)
            | (index << 1)
            | (u32::from(self.hash == HashKind::Xxhash32) << 3)
            | (u32::from(self.grouped) << GROUPED_BIT)
            | (u32::from(self.zero) << ZERO_BIT)
            | (u32::from(self.narrow) << NARROW_BIT)
            | (u32::from(self.bare) << BARE_BIT)
    }

    /// The variant that a word of the header holds.
    ///
    /// # Errors
    ///
    /// A word that is not a variant.
    pub fn from_word(word: u32) -> Result<Self, String> {
        let index = match (word >> 1) & 3 {
            0 => IndexKind::Sorted,
            1 => IndexKind::Minimal,
            2 => IndexKind::Pow2,
            _ => return Err(format!("The variant 0x{word:x} is not one of the candidates")),
        };
        // A sorted index has no slot (zero) and has keys that a lookup compares in the record (bare), as the encoder knows
        let asks_of_perfect_hash = (word >> ZERO_BIT) & 1 == 1 || (word >> BARE_BIT) & 1 == 1;
        if (word >> 4) & 1 != 0 || word >> (BARE_BIT + 1) != 0 || (index == IndexKind::Sorted && asks_of_perfect_hash) {
            return Err(format!("The variant 0x{word:x} is not one of the candidates"));
        }
        Ok(Self {
            columns: word & 1 == 1,
            index,
            hash: if (word >> 3) & 1 == 1 {
                HashKind::Xxhash32
            } else {
                HashKind::Murmur3
            },
            grouped: (word >> GROUPED_BIT) & 1 == 1,
            zero: (word >> ZERO_BIT) & 1 == 1,
            narrow: (word >> NARROW_BIT) & 1 == 1,
            bare: (word >> BARE_BIT) & 1 == 1,
        })
    }

    /// The name of a candidate with `-` for `/` and `+`: the stem of the files of `prepare.ts`.
    pub fn stem(self) -> String {
        format!(
            "{}-{}-{}{}{}{}{}",
            if self.columns { "columns" } else { "rows" },
            match self.index {
                IndexKind::Sorted => "sorted",
                IndexKind::Minimal => "minimal",
                IndexKind::Pow2 => "pow2",
            },
            match self.hash {
                HashKind::Murmur3 => "murmur3",
                HashKind::Xxhash32 => "xxhash32",
            },
            if self.grouped { "-grouped" } else { "" },
            if self.zero { "-zero" } else { "" },
            if self.narrow { "-narrow" } else { "" },
            if self.bare { "-bare" } else { "" },
        )
    }

    /// The variant that a stem names.
    ///
    /// # Errors
    ///
    /// A stem that is not the name of a candidate.
    pub fn from_stem(stem: &str) -> Result<Self, String> {
        variants()
            .into_iter()
            .find(|variant| variant.stem() == stem)
            .ok_or_else(|| {
                format!(
                    "\"{stem}\" is not a candidate. It is one of: {}",
                    variants()
                        .iter()
                        .map(|variant| variant.stem())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            })
    }
}

/// The candidates that are measured, in three groups: the two arrangements and the three indexes with Murmur3, and the
/// perfect hashes with xxHash32 (ten); the two arrangements of a perfect hash of a power of two with Murmur3, with the
/// order of the nodes and the empty slot chosen in each way (six); and, with the nodes grouped and the empty slot 0, the
/// offsets of the strings in 16 bits and the indexes of objects without keys, each and both in columns, and the indexes
/// without keys in rows (four). The order is that of `VARIANTS` of `format.ts`.
pub fn variants() -> Vec<Variant> {
    let first = [false, true].into_iter().flat_map(|columns| {
        [
            (IndexKind::Sorted, HashKind::Murmur3),
            (IndexKind::Minimal, HashKind::Murmur3),
            (IndexKind::Pow2, HashKind::Murmur3),
            (IndexKind::Minimal, HashKind::Xxhash32),
            (IndexKind::Pow2, HashKind::Xxhash32),
        ]
        .into_iter()
        .map(move |(index, hash)| Variant::plain(columns, index, hash))
    });
    let choices = [(true, false), (false, true), (true, true)]
        .into_iter()
        .flat_map(|(grouped, zero)| {
            [false, true].into_iter().map(move |columns| Variant {
                grouped,
                zero,
                ..Variant::plain(columns, IndexKind::Pow2, HashKind::Murmur3)
            })
        });
    // The third group, with the nodes grouped and the empty slot 0. The first three are in columns, which was the smallest of the
    // second group by Brotli; the last is the same as the second of them in rows, and it is the form that is adopted (see
    // `format.ts`).
    let smaller = [
        (true, true, false),
        (true, false, true),
        (true, true, true),
        (false, false, true),
    ]
    .into_iter()
    .map(|(columns, narrow, bare)| Variant {
        grouped: true,
        zero: true,
        narrow,
        bare,
        ..Variant::plain(columns, IndexKind::Pow2, HashKind::Murmur3)
    });
    first.chain(choices).chain(smaller).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_variant_is_its_word_and_its_stem() {
        let all = variants();
        assert_eq!(all.len(), 20);
        for variant in &all {
            assert_eq!(Variant::from_word(variant.word()).unwrap(), *variant);
            assert_eq!(Variant::from_stem(&variant.stem()).unwrap(), *variant);
        }
        assert_eq!(all[0].stem(), "rows-sorted-murmur3");
        assert_eq!(all[9].stem(), "columns-pow2-xxhash32");
    }

    #[test]
    fn a_word_that_is_no_candidate_is_refused() {
        assert!(Variant::from_word(0b0110).is_err());
        assert!(Variant::from_word(0x10).is_err());
        assert!(Variant::from_stem("rows-sorted").is_err());
    }
}
