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
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Variant {
    /// Arrays of a region in columns (`true`) or in rows.
    pub columns: bool,
    pub index: IndexKind,
    pub hash: HashKind,
}

impl Variant {
    /// The word of the header that holds the variant.
    pub fn word(self) -> u32 {
        let index = match self.index {
            IndexKind::Sorted => 0,
            IndexKind::Minimal => 1,
            IndexKind::Pow2 => 2,
        };
        u32::from(self.columns) | (index << 1) | (u32::from(self.hash == HashKind::Xxhash32) << 3)
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
        if word >> 4 != 0 {
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
        })
    }

    /// The name of a candidate with `-` for `/`: the stem of the files of `prepare.ts`.
    pub fn stem(self) -> String {
        format!(
            "{}-{}-{}",
            if self.columns { "columns" } else { "rows" },
            match self.index {
                IndexKind::Sorted => "sorted",
                IndexKind::Minimal => "minimal",
                IndexKind::Pow2 => "pow2",
            },
            match self.hash {
                HashKind::Murmur3 => "murmur3",
                HashKind::Xxhash32 => "xxhash32",
            }
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

/// The candidates that are measured: the two arrangements and the three indexes with Murmur3, and the perfect hashes
/// with xxHash32, in the order of `VARIANTS` of `format.ts`.
pub fn variants() -> Vec<Variant> {
    [false, true]
        .into_iter()
        .flat_map(|columns| {
            [
                (IndexKind::Sorted, HashKind::Murmur3),
                (IndexKind::Minimal, HashKind::Murmur3),
                (IndexKind::Pow2, HashKind::Murmur3),
                (IndexKind::Minimal, HashKind::Xxhash32),
                (IndexKind::Pow2, HashKind::Xxhash32),
            ]
            .into_iter()
            .map(move |(index, hash)| Variant { columns, index, hash })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_variant_is_its_word_and_its_stem() {
        let all = variants();
        assert_eq!(all.len(), 10);
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
