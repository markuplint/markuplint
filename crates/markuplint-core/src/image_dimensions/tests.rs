//! Tests for the image dimension reader. Real files (`tests/fixtures/image_dimensions/`, all 100x50)
//! cover PNG, GIF, BMP, JPEG and HEIC; WebP, AVIF and SVG have no encoder at hand, so their
//! headers are built here byte by byte.

#![allow(clippy::indexing_slicing, clippy::arithmetic_side_effects)]

use super::{Dimensions, MAX_BOX_STEPS, MAX_JPEG_STEPS, read_dimensions, read_file_dimensions};
use std::path::PathBuf;

const PNG: &[u8] = include_bytes!("../../tests/fixtures/image_dimensions/100x50.png");
const GIF: &[u8] = include_bytes!("../../tests/fixtures/image_dimensions/100x50.gif");
const BMP: &[u8] = include_bytes!("../../tests/fixtures/image_dimensions/100x50.bmp");
const JPEG: &[u8] = include_bytes!("../../tests/fixtures/image_dimensions/100x50.jpg");
const HEIC: &[u8] = include_bytes!("../../tests/fixtures/image_dimensions/100x50.heic");

fn dims(width: u32, height: u32) -> Option<Dimensions> {
    Some(Dimensions { width, height })
}

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/image_dimensions")
        .join(name)
}

fn webp(chunk: &[u8; 4], payload: &[u8]) -> Vec<u8> {
    let mut out = b"RIFF".to_vec();
    out.extend_from_slice(&u32::try_from(payload.len() + 12).unwrap().to_le_bytes());
    out.extend_from_slice(b"WEBP");
    out.extend_from_slice(chunk);
    out.extend_from_slice(&u32::try_from(payload.len()).unwrap().to_le_bytes());
    out.extend_from_slice(payload);
    out
}

fn iso_box(kind: &[u8; 4], payload: &[u8]) -> Vec<u8> {
    let mut out = u32::try_from(payload.len() + 8).unwrap().to_be_bytes().to_vec();
    out.extend_from_slice(kind);
    out.extend_from_slice(payload);
    out
}

fn avif(width: u32, height: u32) -> Vec<u8> {
    let mut ispe = vec![0, 0, 0, 0];
    ispe.extend_from_slice(&width.to_be_bytes());
    ispe.extend_from_slice(&height.to_be_bytes());
    let ipco = iso_box(b"ipco", &iso_box(b"ispe", &ispe));
    let iprp = iso_box(b"iprp", &ipco);
    let mut meta_payload = vec![0, 0, 0, 0];
    meta_payload.extend_from_slice(&iso_box(b"hdlr", &[0; 8]));
    meta_payload.extend_from_slice(&iprp);
    let mut out = iso_box(b"ftyp", b"avif\0\0\0\0avifmif1");
    out.extend_from_slice(&iso_box(b"meta", &meta_payload));
    out
}

// ---- real files ----

#[test]
fn png_file() {
    assert_eq!(read_dimensions(PNG), dims(100, 50));
}

#[test]
fn gif_file() {
    assert_eq!(read_dimensions(GIF), dims(100, 50));
}

#[test]
fn bmp_file() {
    assert_eq!(read_dimensions(BMP), dims(100, 50));
}

#[test]
fn jpeg_file() {
    assert_eq!(read_dimensions(JPEG), dims(100, 50));
}

#[test]
fn heic_file() {
    assert_eq!(read_dimensions(HEIC), dims(100, 50));
}

#[test]
fn reads_a_regular_file_whatever_its_extension() {
    assert_eq!(read_file_dimensions(&fixture("100x50.png")), dims(100, 50));
    assert_eq!(read_file_dimensions(&fixture("100x50.jpg")), dims(100, 50));
}

#[test]
fn a_directory_and_a_missing_file_are_not_checked() {
    assert_eq!(read_file_dimensions(&fixture("")), None);
    assert_eq!(read_file_dimensions(&fixture("missing.png")), None);
}

#[cfg(unix)]
#[test]
fn a_device_is_not_opened() {
    // /dev/zero would feed the reader forever, and a FIFO would block it: neither is a regular file.
    assert_eq!(read_file_dimensions(std::path::Path::new("/dev/zero")), None);
    assert_eq!(read_file_dimensions(std::path::Path::new("/dev/null")), None);
}

// ---- built headers ----

#[test]
fn png_cgbi_variant() {
    let mut data = PNG.get(..12).unwrap().to_vec();
    data.extend_from_slice(b"CgBI\0\0\0\0\0\0\0\0\0\0\0\0IHDR");
    data.extend_from_slice(&7_u32.to_be_bytes());
    data.extend_from_slice(&9_u32.to_be_bytes());
    assert_eq!(read_dimensions(&data), dims(7, 9));
}

#[test]
fn bmp_os2_core_header_and_top_down_bitmap() {
    let mut os2 = b"BM".to_vec();
    os2.resize(14, 0);
    os2.extend_from_slice(&12_u32.to_le_bytes());
    os2.extend_from_slice(&30_u16.to_le_bytes());
    os2.extend_from_slice(&20_u16.to_le_bytes());
    assert_eq!(read_dimensions(&os2), dims(30, 20));

    let mut top_down = BMP.get(..26).unwrap().to_vec();
    top_down.splice(22..26, (-50_i32).to_le_bytes());
    assert_eq!(read_dimensions(&top_down), dims(100, 50));
}

#[test]
fn webp_lossy() {
    let mut payload = vec![0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a];
    payload.extend_from_slice(&100_u16.to_le_bytes());
    payload.extend_from_slice(&50_u16.to_le_bytes());
    assert_eq!(read_dimensions(&webp(b"VP8 ", &payload)), dims(100, 50));
}

#[test]
fn webp_lossless() {
    // 14-bit width - 1 then 14-bit height - 1.
    let bits: u32 = 99 | (49 << 14);
    let mut payload = vec![0x2f];
    payload.extend_from_slice(&bits.to_le_bytes());
    assert_eq!(read_dimensions(&webp(b"VP8L", &payload)), dims(100, 50));
}

#[test]
fn webp_extended() {
    let mut payload = vec![0; 10];
    payload[4..7].copy_from_slice(&99_u32.to_le_bytes()[..3]);
    payload[7..10].copy_from_slice(&49_u32.to_le_bytes()[..3]);
    assert_eq!(read_dimensions(&webp(b"VP8X", &payload)), dims(100, 50));
    // Reserved flag bits set.
    payload[0] = 0x80;
    assert_eq!(read_dimensions(&webp(b"VP8X", &payload)), None);
}

#[test]
fn avif_by_walking_the_boxes() {
    assert_eq!(read_dimensions(&avif(100, 50)), dims(100, 50));
}

#[test]
fn avif_huge_declared_size_is_just_a_number() {
    assert_eq!(read_dimensions(&avif(u32::MAX, u32::MAX)), dims(u32::MAX, u32::MAX));
}

#[test]
fn svg_width_and_height() {
    assert_eq!(
        read_dimensions(br#"<svg width="100" height="50"></svg>"#),
        dims(100, 50)
    );
    assert_eq!(
        read_dimensions(
            br#"<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width='100px' height='50.4px'>"#
        ),
        dims(100, 50)
    );
}

#[test]
fn svg_units() {
    assert_eq!(read_dimensions(br#"<svg width="1in" height="2pt">"#), dims(96, 3));
    assert_eq!(read_dimensions(br#"<svg width="10mm" height="1e1">"#), dims(38, 10));
    assert_eq!(read_dimensions(br#"<svg width="2em" height="1ex">"#), dims(32, 8));
}

#[test]
fn svg_falls_back_to_the_viewbox() {
    assert_eq!(read_dimensions(br#"<svg viewBox="0 0 100 50">"#), dims(100, 50));
    assert_eq!(
        read_dimensions(br#"<svg VIEWBOX="0 0 100 50" width="200">"#),
        dims(200, 100)
    );
    assert_eq!(
        read_dimensions(br#"<svg viewBox="0 0 100 50" height="25">"#),
        dims(50, 25)
    );
    // A percentage is no pixel size.
    assert_eq!(
        read_dimensions(br#"<svg width="100%" height="100%" viewBox="0 0 8 4">"#),
        dims(8, 4)
    );
}

#[test]
fn svg_that_cannot_be_sized() {
    assert_eq!(read_dimensions(br#"<svg width="100%" height="100%">"#), None);
    assert_eq!(read_dimensions(br#"<svg width="abc" height="5">"#), None);
    assert_eq!(read_dimensions(br#"<svg viewBox="0 0 x y">"#), None);
    assert_eq!(read_dimensions(br#"<svg viewBox="0 0 0 0">"#), None);
    assert_eq!(read_dimensions(b"<svg"), None);
    assert_eq!(read_dimensions(br#"<svg width="5 height="5">"#), None);
}

#[test]
fn svg_root_tag_must_lie_within_the_first_1000_bytes() {
    let mut data = vec![b' '; 1000];
    data.extend_from_slice(br#"<svg width="1" height="1">"#);
    assert_eq!(read_dimensions(&data), None);
}

#[test]
fn unsupported_formats_are_not_checked() {
    assert_eq!(read_dimensions(b"II*\0\x08\0\0\0"), None, "TIFF");
    assert_eq!(read_dimensions(b"\0\0\x01\0\x01\0\x10\x10"), None, "ICO");
    assert_eq!(read_dimensions(b"plain text"), None);
    assert_eq!(read_dimensions(b""), None);
}

// ---- hostile input ----

#[test]
fn truncated_real_files_are_not_checked() {
    for file in [PNG, GIF, BMP, JPEG, HEIC] {
        for len in 0..file.len().min(64) {
            // Whatever the cut, no panic; a cut before the dimensions yields nothing.
            let _ = read_dimensions(&file[..len]);
        }
    }
    assert_eq!(read_dimensions(&PNG[..20]), None);
    assert_eq!(read_dimensions(&GIF[..9]), None);
    assert_eq!(read_dimensions(&BMP[..25]), None);
    assert_eq!(read_dimensions(&JPEG[..10]), None);
    assert_eq!(read_dimensions(&HEIC[..40]), None);
}

#[test]
fn zero_dimensions_are_not_checked() {
    assert_eq!(read_dimensions(&[b"GIF89a".as_slice(), &[0; 4]].concat()), None);
    assert_eq!(read_dimensions(br#"<svg width="0" height="5">"#), None);
}

#[test]
fn corrupt_headers() {
    let mut png = PNG.to_vec();
    png[12..16].copy_from_slice(b"XXXX");
    assert_eq!(read_dimensions(&png), None);

    let mut bmp = BMP.to_vec();
    bmp[14..18].copy_from_slice(&u32::MAX.to_le_bytes());
    assert_eq!(read_dimensions(&bmp), None);

    let mut webp_bad = webp(b"VP8 ", &[0; 10]);
    assert_eq!(read_dimensions(&webp_bad), None, "no start code");
    webp_bad[12..16].copy_from_slice(b"JUNK");
    assert_eq!(read_dimensions(&webp_bad), None);
}

#[test]
fn jpeg_segment_length_beyond_the_data() {
    let data = [0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff, 0, 0, 0, 0];
    assert_eq!(read_dimensions(&data), None);
    // A length smaller than its own two bytes would never advance.
    let data = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0, 0, 0, 0];
    assert_eq!(read_dimensions(&data), None);
}

#[test]
fn jpeg_never_ending_segment_chain_stops_at_the_bound() {
    // Far more APPn segments (4 bytes each) than the walk may visit, then a frame header: the
    // walk gives up before reaching it instead of running to the end.
    let mut data = vec![0xff, 0xd8];
    for _ in 0..(MAX_JPEG_STEPS + 10) {
        data.extend_from_slice(&[0xff, 0xe1, 0x00, 0x02]);
    }
    data.extend_from_slice(&[0xff, 0xc0, 0x00, 0x0b, 8, 0, 50, 0, 100, 1, 1, 0x11, 0]);
    assert_eq!(read_dimensions(&data), None);

    // The same chain within the bound reaches it.
    let mut data = vec![0xff, 0xd8];
    for _ in 0..10 {
        data.extend_from_slice(&[0xff, 0xe1, 0x00, 0x02]);
    }
    data.extend_from_slice(&[0xff, 0xc0, 0x00, 0x0b, 8, 0, 50, 0, 100, 1, 1, 0x11, 0]);
    assert_eq!(read_dimensions(&data), dims(100, 50));
}

#[test]
fn jpeg_fill_bytes_are_bounded_too() {
    let mut data = vec![0xff, 0xd8];
    data.extend(std::iter::repeat_n(0xff, MAX_JPEG_STEPS * 4));
    assert_eq!(read_dimensions(&data), None);
}

#[test]
fn isobmff_box_chain_stops_at_the_bound() {
    let mut data = iso_box(b"ftyp", b"avif\0\0\0\0avif");
    for _ in 0..(MAX_BOX_STEPS + 10) {
        data.extend_from_slice(&iso_box(b"free", &[]));
    }
    data.extend_from_slice(&avif(100, 50)[data.len().min(24)..]);
    assert_eq!(read_dimensions(&data), None);
}

#[test]
fn isobmff_boxes_that_lie_about_their_size() {
    let mut data = avif(100, 50);
    // `meta` claims to extend far past the file.
    data[24..28].copy_from_slice(&u32::MAX.to_be_bytes());
    assert_eq!(read_dimensions(&data), None);
    // A box smaller than its header never advances.
    let mut data = avif(100, 50);
    data[24..28].copy_from_slice(&3_u32.to_be_bytes());
    assert_eq!(read_dimensions(&data), None);
    // A 64-bit size that overflows.
    let mut data = iso_box(b"ftyp", b"avif\0\0\0\0avif");
    data.extend_from_slice(&1_u32.to_be_bytes());
    data.extend_from_slice(b"meta");
    data.extend_from_slice(&u64::MAX.to_be_bytes());
    assert_eq!(read_dimensions(&data), None);
}

#[test]
fn huge_declared_sizes_do_not_size_anything() {
    // PNG / GIF / WebP carry the numbers straight through; nothing is allocated from them.
    let mut png = PNG.to_vec();
    png[16..24].copy_from_slice(&[0xff; 8]);
    assert_eq!(read_dimensions(&png), dims(u32::MAX, u32::MAX));
    let mut payload = vec![0; 10];
    payload[4..10].copy_from_slice(&[0xff; 6]);
    assert_eq!(
        read_dimensions(&webp(b"VP8X", &payload)),
        dims(0x0100_0000, 0x0100_0000)
    );
}

#[test]
fn svg_with_absurd_lengths() {
    assert_eq!(read_dimensions(br#"<svg width="1e999999" height="5">"#), None);
    assert_eq!(
        read_dimensions(br#"<svg width="99999999999999999999" height="5">"#),
        None
    );
}

/// Deterministic xorshift, so the test never depends on a random source.
struct XorShift(u64);

impl XorShift {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }

    fn byte(&mut self) -> u8 {
        self.next().to_le_bytes()[0]
    }
}

#[test]
fn pseudo_random_bytes_never_panic() {
    let mut rng = XorShift(0x9e37_79b9_7f4a_7c15);
    let seeds: [&[u8]; 8] = [
        PNG,
        GIF,
        BMP,
        JPEG,
        HEIC,
        b"<svg width=\"1\" height=\"2\" viewBox=\"0 0 3 4\">",
        &avif(10, 10),
        &webp(b"VP8L", &[0x2f, 1, 2, 3, 4]),
    ];
    for round in 0..4000_usize {
        // Pure noise.
        let len = (rng.next() % 300) as usize;
        let noise: Vec<u8> = (0..len).map(|_| rng.byte()).collect();
        let _ = read_dimensions(&noise);

        // A real header with a few bytes flipped, then cut.
        let mut data = seeds[round % seeds.len()].to_vec();
        for _ in 0..(1 + rng.next() % 4) {
            let at = (rng.next() as usize) % data.len();
            data[at] = rng.byte();
        }
        let cut = (rng.next() as usize) % (data.len() + 1);
        let _ = read_dimensions(&data[..cut]);
    }
}
