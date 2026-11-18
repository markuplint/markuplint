//! The hash functions and the checksum of the packed candidates, the same as `scripts/spec-baseline/packed/hash.ts`:
//! the TypeScript side builds a candidate with them and this side reads it, so they have to give the same 32-bit
//! numbers for the same bytes. The vectors of the tests are those of `hash.spec.ts`.

/// The finalizer of `MurmurHash3`.
pub const fn fmix32(mut h: u32) -> u32 {
    h ^= h >> 16;
    h = h.wrapping_mul(0x85eb_ca6b);
    h ^= h >> 13;
    h = h.wrapping_mul(0xc2b2_ae35);
    h ^= h >> 16;
    h
}

/// `MurmurHash3`, x86, 32 bits.
pub fn murmur3(bytes: &[u8], seed: u32) -> u32 {
    const C1: u32 = 0xcc9e_2d51;
    const C2: u32 = 0x1b87_3593;
    let mut h = seed;
    let (blocks, tail) = bytes.as_chunks::<4>();
    for block in blocks {
        let mut k = u32::from_le_bytes(*block);
        k = k.wrapping_mul(C1).rotate_left(15).wrapping_mul(C2);
        h ^= k;
        h = h.rotate_left(13).wrapping_mul(5).wrapping_add(0xe654_6b64);
    }
    if !tail.is_empty() {
        let mut k = 0_u32;
        for (index, byte) in tail.iter().enumerate() {
            k ^= u32::from(*byte) << (8 * index);
        }
        k = k.wrapping_mul(C1).rotate_left(15).wrapping_mul(C2);
        h ^= k;
    }
    // The length of a key is below 2^32 (a name is a few bytes)
    #[allow(clippy::cast_possible_truncation)]
    {
        h ^= bytes.len() as u32;
    }
    fmix32(h)
}

const P1: u32 = 0x9e37_79b1;
const P2: u32 = 0x85eb_ca77;
const P3: u32 = 0xc2b2_ae3d;
const P4: u32 = 0x27d4_eb2f;
const P5: u32 = 0x1656_67b1;

fn read32(bytes: &[u8], at: usize) -> u32 {
    u32::from_le_bytes([bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]])
}

/// xxHash, 32 bits (XXH32).
pub fn xxhash32(bytes: &[u8], seed: u32) -> u32 {
    let length = bytes.len();
    let mut at = 0;
    let mut h;
    if length >= 16 {
        let mut v1 = seed.wrapping_add(P1).wrapping_add(P2);
        let mut v2 = seed.wrapping_add(P2);
        let mut v3 = seed;
        let mut v4 = seed.wrapping_sub(P1);
        let limit = length - 16;
        while at <= limit {
            v1 = v1
                .wrapping_add(read32(bytes, at).wrapping_mul(P2))
                .rotate_left(13)
                .wrapping_mul(P1);
            v2 = v2
                .wrapping_add(read32(bytes, at + 4).wrapping_mul(P2))
                .rotate_left(13)
                .wrapping_mul(P1);
            v3 = v3
                .wrapping_add(read32(bytes, at + 8).wrapping_mul(P2))
                .rotate_left(13)
                .wrapping_mul(P1);
            v4 = v4
                .wrapping_add(read32(bytes, at + 12).wrapping_mul(P2))
                .rotate_left(13)
                .wrapping_mul(P1);
            at += 16;
        }
        h = v1
            .rotate_left(1)
            .wrapping_add(v2.rotate_left(7))
            .wrapping_add(v3.rotate_left(12))
            .wrapping_add(v4.rotate_left(18));
    } else {
        h = seed.wrapping_add(P5);
    }
    // The length of a key is below 2^32 (a name is a few bytes)
    #[allow(clippy::cast_possible_truncation)]
    {
        h = h.wrapping_add(length as u32);
    }
    while at + 4 <= length {
        h = h
            .wrapping_add(read32(bytes, at).wrapping_mul(P3))
            .rotate_left(17)
            .wrapping_mul(P4);
        at += 4;
    }
    while at < length {
        h = h
            .wrapping_add(u32::from(bytes[at]).wrapping_mul(P5))
            .rotate_left(11)
            .wrapping_mul(P1);
        at += 1;
    }
    h ^= h >> 15;
    h = h.wrapping_mul(P2);
    h ^= h >> 13;
    h = h.wrapping_mul(P3);
    h ^= h >> 16;
    h
}

/// FNV-1a, 32 bits: the digest of a string that the answer of a question is made of.
pub fn fnv1a32(bytes: &[u8]) -> u32 {
    let mut h = 0x811c_9dc5_u32;
    for byte in bytes {
        h ^= u32::from(*byte);
        h = h.wrapping_mul(0x0100_0193);
    }
    h
}

/// The tables of CRC-32C: `TABLES[0]` is the table of a byte, and the others are the same byte followed by 1 to 3 zero
/// bytes.
const TABLES: [[u32; 256]; 4] = make_tables();

const fn make_tables() -> [[u32; 256]; 4] {
    let mut tables = [[0_u32; 256]; 4];
    let mut i = 0;
    while i < 256 {
        let mut crc = i as u32;
        let mut bit = 0;
        while bit < 8 {
            crc = if crc & 1 == 1 {
                (crc >> 1) ^ 0x82f6_3b78
            } else {
                crc >> 1
            };
            bit += 1;
        }
        tables[0][i] = crc;
        i += 1;
    }
    let mut table = 1;
    while table < 4 {
        let mut i = 0;
        while i < 256 {
            let previous = tables[table - 1][i];
            tables[table][i] = (previous >> 8) ^ tables[0][(previous & 0xff) as usize];
            i += 1;
        }
        table += 1;
    }
    tables
}

/// CRC-32C of bytes, one byte at a time: the reference that [`crc32c_words`] has to equal.
#[cfg(test)]
pub fn crc32c(bytes: &[u8]) -> u32 {
    let mut crc = 0xffff_ffff_u32;
    for byte in bytes {
        crc = (crc >> 8) ^ TABLES[0][((crc ^ u32::from(*byte)) & 0xff) as usize];
    }
    !crc
}

/// CRC-32C of the first `count` 32-bit little-endian words of `bytes`, four bytes at a time (the same value as
/// [`crc32c`] of their bytes).
pub fn crc32c_words(bytes: &[u8], count: usize) -> u32 {
    let mut crc = 0xffff_ffff_u32;
    for chunk in bytes[..4 * count].as_chunks::<4>().0 {
        crc ^= u32::from_le_bytes(*chunk);
        crc = TABLES[3][(crc & 0xff) as usize]
            ^ TABLES[2][((crc >> 8) & 0xff) as usize]
            ^ TABLES[1][((crc >> 16) & 0xff) as usize]
            ^ TABLES[0][(crc >> 24) as usize];
    }
    !crc
}

/// A hash function of a perfect hash.
pub type HashFn = fn(&[u8], u32) -> u32;

#[cfg(test)]
mod tests {
    use super::*;

    const FOX: &[u8] = b"The quick brown fox jumps over the lazy dog";

    #[test]
    fn murmur3_gives_the_published_values() {
        assert_eq!(murmur3(b"", 0), 0);
        assert_eq!(murmur3(b"", 1), 0x514e_28b7);
        assert_eq!(murmur3(b"", 0xffff_ffff), 0x81f1_6f39);
        assert_eq!(murmur3(b"test", 0), 0xba6b_d213);
        assert_eq!(murmur3(b"Hello, world!", 0), 0xc036_3e43);
        assert_eq!(murmur3(b"Hello, world!", 0x9747_b28c), 0x2488_4cba);
        assert_eq!(murmur3(FOX, 0), 0x2e4f_f723);
        assert_eq!(murmur3(FOX, 0x9747_b28c), 0x2fa8_26cd);
        // the tail of 1, 2 and 3 bytes
        assert_eq!(murmur3(b"a", 0), 0x3c25_69b2);
        assert_eq!(murmur3(b"ab", 0), 0x9bbf_d75f);
        assert_eq!(murmur3(b"abc", 0), 0xb3dd_93fa);
    }

    #[test]
    fn xxhash32_gives_the_published_values() {
        assert_eq!(xxhash32(b"", 0), 0x02cc_5d05);
        assert_eq!(xxhash32(b"a", 0), 0x550d_7456);
        assert_eq!(xxhash32(b"abc", 0), 0x32d1_53ff);
        assert_eq!(xxhash32(FOX, 0), 0xe85e_a4de);
        // blocks of 16 bytes and the rest of them
        let long = b"0123456789abcdef0123456789abcdef0123";
        assert_ne!(xxhash32(long, 1), xxhash32(long, 0));
    }

    #[test]
    fn fmix32_is_the_finalizer_of_murmur3() {
        assert_eq!(fmix32(0), 0);
        assert_eq!(fmix32(1), 0x514e_28b7);
    }

    #[test]
    fn fnv1a32_gives_the_published_values() {
        assert_eq!(fnv1a32(b""), 0x811c_9dc5);
        assert_eq!(fnv1a32(b"a"), 0xe40c_292c);
        assert_eq!(fnv1a32(b"foobar"), 0xbf9c_f968);
    }

    #[test]
    fn crc32c_gives_the_check_values() {
        assert_eq!(crc32c(b"123456789"), 0xe306_9283);
        assert_eq!(crc32c(&[0; 32]), 0x8a91_36aa);
        assert_eq!(crc32c(&[0xff; 32]), 0x62a8_ab43);
    }

    #[test]
    fn crc32c_is_the_same_for_a_byte_at_a_time_and_for_a_word_at_a_time() {
        let words: Vec<u32> = (1..=1000_u32).map(|i| i.wrapping_mul(0x9e37_79b1)).collect();
        let bytes: Vec<u8> = words.iter().flat_map(|word| word.to_le_bytes()).collect();
        assert_eq!(crc32c_words(&bytes, words.len()), crc32c(&bytes));
        assert_eq!(crc32c_words(&bytes, 10), crc32c(&bytes[..40]));
    }

    #[test]
    fn crc32c_finds_a_change_of_one_bit() {
        let mut bytes: Vec<u8> = (0..64_u32).flat_map(u32::to_le_bytes).collect();
        let before = crc32c_words(&bytes, 64);
        bytes[17 * 4 + 3] ^= 1;
        assert_ne!(crc32c_words(&bytes, 64), before);
    }
}
