//! The perfect hash of an index, the same as `scripts/spec-baseline/packed/mphf.ts`: the bucket placement of `PTHash`,
//! `PtrHash` and `PHast` with 16-bit pilots and buckets of 4 keys on average. A build has to give the same table as the
//! TypeScript one for the same keys: the buckets are placed in the order of their size, the largest first and, among
//! those of one size, the lowest first, and the smallest pilot that fits is taken.

use crate::format::NONE;
use crate::hash::{HashFn, fmix32};

/// The pilots of a bucket: any of these is tried.
const PILOT_COUNT: u32 = 65_536;

/// How many keys a bucket has on average.
const BUCKET_SIZE: usize = 4;

/// How the slots are counted.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Minimal,
    Pow2,
}

/// What a lookup needs of a built perfect hash.
#[derive(Debug)]
pub struct Mphf {
    pub seed: u32,
    pub buckets: u32,
    pub slots: u32,
    /// One pilot for each bucket.
    pub pilots: Vec<u16>,
    /// For each slot, the position of the key that has it, or [`NONE`].
    pub slot_entry: Vec<u32>,
}

/// Reduces a 32-bit number to `[0, range)` by the multiplication of Lemire.
pub fn reduce(value: u32, range: u32) -> u32 {
    // The product of two 32-bit numbers shifted by 32 bits is below 2^32
    ((u64::from(value) * u64::from(range)) >> 32) as u32
}

/// The mix that a pilot brings to the hash of a key.
pub fn pilot_mix(pilot: u32) -> u32 {
    fmix32((pilot + 1).wrapping_mul(0x9e37_79b1))
}

/// The number of slots of a perfect hash.
pub fn slot_count(keys: u32, mode: Mode) -> u32 {
    if mode == Mode::Minimal {
        return keys;
    }
    let mut slots = 2_u32;
    while slots < keys + (keys >> 1) {
        slots *= 2;
    }
    slots
}

/// The slot of a key.
pub fn slot_of(hash: u32, pilot: u32, slots: u32, mode: Mode) -> u32 {
    let mixed = fmix32(hash ^ pilot_mix(pilot));
    match mode {
        Mode::Minimal => reduce(mixed, slots),
        Mode::Pow2 => mixed >> (32 - slots.trailing_zeros()),
    }
}

/// Builds the perfect hash of keys.
///
/// # Errors
///
/// No seed up to 1,000 gives a placement.
pub fn build_mphf(keys: &[&[u8]], hash: HashFn, mode: Mode) -> Result<Mphf, String> {
    let n = keys.len();
    // A table is a few hundred keys: these counts are far below 2^32
    let (buckets, slots) = ((n.div_ceil(BUCKET_SIZE)).max(1) as u32, slot_count(n as u32, mode));
    'seed: for seed in 0..1000_u32 {
        let hashes: Vec<u32> = keys.iter().map(|key| hash(key, seed)).collect();
        let mut sorted = hashes.clone();
        sorted.sort_unstable();
        sorted.dedup();
        if sorted.len() != n {
            continue;
        }
        let mut members: Vec<Vec<usize>> = vec![Vec::new(); buckets as usize];
        for (position, value) in hashes.iter().enumerate() {
            members[reduce(*value, buckets) as usize].push(position);
        }
        let mut order: Vec<(usize, usize)> = members
            .iter()
            .enumerate()
            .filter(|(_, bucket)| !bucket.is_empty())
            .map(|(id, bucket)| (id, bucket.len()))
            .collect();
        order.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));

        let mut used = vec![false; slots as usize];
        let mut pilots = vec![0_u16; buckets as usize];
        let mut slot_entry = vec![NONE; slots as usize];
        for (id, _) in order {
            let bucket = &members[id];
            let mut found = false;
            for pilot in 0..PILOT_COUNT {
                let mut taken: Vec<u32> = Vec::with_capacity(bucket.len());
                let mut fits = true;
                for position in bucket {
                    let slot = slot_of(hashes[*position], pilot, slots, mode);
                    if used[slot as usize] {
                        fits = false;
                        break;
                    }
                    used[slot as usize] = true;
                    taken.push(slot);
                }
                if fits {
                    found = true;
                    // A pilot is below 65,536
                    pilots[id] = pilot as u16;
                    for (index, slot) in taken.iter().enumerate() {
                        // A position is below the number of keys
                        slot_entry[*slot as usize] = bucket[index] as u32;
                    }
                    break;
                }
                for slot in taken {
                    used[slot as usize] = false;
                }
            }
            if !found {
                continue 'seed;
            }
        }
        return Ok(Mphf {
            seed,
            buckets,
            slots,
            pilots,
            slot_entry,
        });
    }
    Err(format!("No perfect hash of {n} keys was found"))
}

/// Finds the position that the slot of a name holds, which is the position of the name only if the key there is
/// compared (the reader does it with the words of the file; this is the same on the table that a build gives).
#[cfg(test)]
pub fn lookup_mphf(mphf: &Mphf, hash: HashFn, bytes: &[u8], mode: Mode) -> u32 {
    let value = hash(bytes, mphf.seed);
    let pilot = u32::from(mphf.pilots[reduce(value, mphf.buckets) as usize]);
    mphf.slot_entry[slot_of(value, pilot, mphf.slots, mode) as usize]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hash::{murmur3, xxhash32};

    /// Names that look like the names of the spec.
    fn names(count: usize) -> Vec<Vec<u8>> {
        (0..count)
            .map(|index| {
                let prefix = ["", "svg:", "mml:", "aria-", "data-"][index % 5];
                format!("{prefix}name{index:x}{}", "x".repeat(index % 7)).into_bytes()
            })
            .collect()
    }

    #[test]
    fn reduce_keeps_a_number_in_the_range() {
        assert_eq!(reduce(0, 237), 0);
        assert_eq!(reduce(0xffff_ffff, 237), 236);
        assert_eq!(reduce(0x8000_0000, 100), 50);
    }

    #[test]
    fn slot_count_is_the_keys_or_a_power_of_two_of_one_and_a_half_times() {
        assert_eq!(slot_count(237, Mode::Minimal), 237);
        assert_eq!(slot_count(237, Mode::Pow2), 512);
        assert_eq!(slot_count(8, Mode::Pow2), 16);
        assert_eq!(slot_count(11, Mode::Pow2), 16);
        assert_eq!(slot_count(12, Mode::Pow2), 32);
    }

    #[test]
    fn every_key_has_a_slot_of_its_own_that_holds_its_position() {
        for mode in [Mode::Minimal, Mode::Pow2] {
            for hash in [murmur3 as HashFn, xxhash32 as HashFn] {
                for count in [8_usize, 9, 16, 100, 237, 500] {
                    let owned = names(count);
                    let keys: Vec<&[u8]> = owned.iter().map(Vec::as_slice).collect();
                    let mphf = build_mphf(&keys, hash, mode).unwrap();
                    assert_eq!(mphf.slots, slot_count(u32::try_from(count).unwrap(), mode));
                    let positions: Vec<u32> = keys.iter().map(|key| lookup_mphf(&mphf, hash, key, mode)).collect();
                    let expected: Vec<u32> = (0..u32::try_from(count).unwrap()).collect();
                    assert_eq!(positions, expected);
                }
            }
        }
    }

    #[test]
    fn a_minimal_table_has_no_empty_slot_and_a_name_that_is_no_key_lands_on_a_key() {
        let owned = names(237);
        let keys: Vec<&[u8]> = owned.iter().map(Vec::as_slice).collect();
        let minimal = build_mphf(&keys, murmur3, Mode::Minimal).unwrap();
        assert!(minimal.slot_entry.iter().all(|entry| *entry != NONE));
        let landed = (0..100)
            .filter(|index| lookup_mphf(&minimal, murmur3, format!("absent-{index}").as_bytes(), Mode::Minimal) != NONE)
            .count();
        assert_eq!(landed, 100);

        let pow2 = build_mphf(&keys, murmur3, Mode::Pow2).unwrap();
        assert_eq!(
            pow2.slot_entry.iter().filter(|entry| **entry == NONE).count(),
            512 - 237
        );
    }

    #[test]
    fn a_build_is_the_same_when_it_is_made_again() {
        let owned = names(237);
        let keys: Vec<&[u8]> = owned.iter().map(Vec::as_slice).collect();
        let a = build_mphf(&keys, murmur3, Mode::Minimal).unwrap();
        let b = build_mphf(&keys, murmur3, Mode::Minimal).unwrap();
        assert_eq!((a.seed, &a.pilots, &a.slot_entry), (b.seed, &b.pilots, &b.slot_entry));
    }

    #[test]
    fn a_hash_that_cannot_tell_two_keys_apart_is_refused() {
        let owned = names(10);
        let keys: Vec<&[u8]> = owned.iter().map(Vec::as_slice).collect();
        assert_eq!(
            build_mphf(&keys, |_, _| 7, Mode::Minimal).unwrap_err(),
            "No perfect hash of 10 keys was found"
        );
    }
}
