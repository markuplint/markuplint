//! A deliberately minimal reader for the pixel dimensions of an image file, for
//! `no-mismatched-aspect-ratio`.
//!
//! WHY it exists instead of an image crate: the file is whatever a `src` attribute of the linted
//! document points at, so it is untrusted input, and the owner does not want a new dependency (and
//! its supply chain) on that path. This module extracts **only** width and height from the header,
//! trusts the header, and decodes nothing.
//!
//! # Formats
//!
//! PNG (`IHDR`, including Apple's `CgBI` variant), GIF, BMP, WebP (`VP8` / `VP8L` / `VP8X`), JPEG
//! (segments are walked to a `SOFn`), AVIF and the HEIF family (ISOBMFF boxes are walked to `ispe`),
//! and SVG (the root `<svg>` start tag only). The format is detected by magic bytes, never by the
//! file extension. Any other format (TIFF, ICO, ICNS, PSD, DDS, ...), and any failure whatsoever,
//! is `None`, which the rule reads as "do not check".
//!
//! This is an accepted, deliberate loss of precision against v5, which used the `image-size` npm
//! package (many more formats). The SVG unit and fallback behaviour mirrors `image-size`'s own SVG
//! implementation (v2.0.4) so a checked SVG gets the same answer as before. Two further deliberate
//! differences: the JPEG EXIF orientation is ignored, as `no-mismatched-aspect-ratio` ignored it
//! (`image-size` reports it beside the size), and the AVIF `clap` (clean aperture) box is ignored,
//! because `image-size` subtracts an unrelated field of it from the width.
//!
//! # Safety design
//!
//! - Nothing is read past [`MAX_READ`] bytes of a file, and a file is opened only after it is
//!   known to be a regular file, so a FIFO or a device in `src` cannot block the linter or feed it
//!   forever.
//! - Every loop is bounded by a fixed constant (`MAX_JPEG_STEPS`, `MAX_BOX_STEPS`,
//!   `SVG_WINDOW`), never by a value taken from the header, and no allocation is sized from one.
//! - Reads go through `get()` and arithmetic through `checked_*`; the module denies
//!   `clippy::indexing_slicing` and `clippy::arithmetic_side_effects` and forbids `unsafe`, so a
//!   truncated or hostile header can only produce `None`, not a panic.

#![forbid(unsafe_code)]
#![deny(clippy::indexing_slicing, clippy::arithmetic_side_effects)]

use std::fs::{self, File};
use std::io::Read;
use std::path::Path;

#[cfg(test)]
mod tests;

/// The most bytes of one file that are read: enough for the header of every supported format
/// (a JPEG whose `SOFn` lies behind more than this is not checked).
pub const MAX_READ: u64 = 1_048_576;

/// Segments a JPEG walk visits before it gives up.
const MAX_JPEG_STEPS: usize = 4096;

/// Boxes one level of an ISOBMFF walk visits before it gives up.
const MAX_BOX_STEPS: usize = 256;

/// How far into the data the SVG root start tag has to lie, and end: the same 1000 bytes
/// `image-size` tests to recognise an SVG.
const SVG_WINDOW: usize = 1000;

/// The width and height of an image in pixels; both are non-zero.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Dimensions {
    pub width: u32,
    pub height: u32,
}

/// Reads the dimensions of the image file at `path`.
///
/// `None` when the path is not a regular file (a directory, a FIFO, a device), when it cannot be
/// read, or when [`read_dimensions`] cannot tell. At most [`MAX_READ`] bytes are read.
#[must_use]
pub fn read_file_dimensions(path: &Path) -> Option<Dimensions> {
    // Checked before the open: opening a FIFO for reading blocks until a writer appears.
    if !fs::metadata(path).ok()?.is_file() {
        return None;
    }
    let file = File::open(path).ok()?;
    // The path may have been swapped between the check and the open.
    if !file.metadata().ok()?.is_file() {
        return None;
    }
    let mut data = Vec::new();
    file.take(MAX_READ).read_to_end(&mut data).ok()?;
    read_dimensions(&data)
}

/// Reads the dimensions from the leading bytes of an image, detecting the format by magic bytes.
///
/// `None` for an unsupported or malformed image, and when either dimension is zero.
#[must_use]
pub fn read_dimensions(data: &[u8]) -> Option<Dimensions> {
    let (width, height) = if data.starts_with(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]) {
        png(data)
    } else if data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a") {
        gif(data)
    } else if data.starts_with(&[0xff, 0xd8, 0xff]) {
        jpeg(data)
    } else if data.starts_with(b"RIFF") && data.get(8..12) == Some(b"WEBP".as_slice()) {
        webp(data)
    } else if data.starts_with(b"BM") {
        bmp(data)
    } else if data.get(4..8) == Some(b"ftyp".as_slice()) {
        isobmff(data)
    } else {
        svg(data)
    }?;
    (width > 0 && height > 0).then_some(Dimensions { width, height })
}

fn byte(data: &[u8], at: usize) -> Option<u8> {
    data.get(at).copied()
}

fn slice(data: &[u8], start: usize, len: usize) -> Option<&[u8]> {
    data.get(start..start.checked_add(len)?)
}

fn le16(data: &[u8], at: usize) -> Option<u32> {
    let b = slice(data, at, 2)?;
    Some(u32::from(u16::from_le_bytes([*b.first()?, *b.get(1)?])))
}

fn be16(data: &[u8], at: usize) -> Option<u32> {
    let b = slice(data, at, 2)?;
    Some(u32::from(u16::from_be_bytes([*b.first()?, *b.get(1)?])))
}

fn array4(data: &[u8], at: usize) -> Option<[u8; 4]> {
    slice(data, at, 4)?.try_into().ok()
}

fn be32(data: &[u8], at: usize) -> Option<u32> {
    array4(data, at).map(u32::from_be_bytes)
}

fn le32(data: &[u8], at: usize) -> Option<u32> {
    array4(data, at).map(u32::from_le_bytes)
}

fn le24(data: &[u8], at: usize) -> Option<u32> {
    let b = slice(data, at, 3)?;
    Some(u32::from_le_bytes([*b.first()?, *b.get(1)?, *b.get(2)?, 0]))
}

/// PNG: the `IHDR` chunk directly after the signature; Apple's `CgBI` chunk comes first in an
/// iPhone-optimised file and pushes it back by 16 bytes.
fn png(data: &[u8]) -> Option<(u32, u32)> {
    let shift: usize = match slice(data, 12, 4)? {
        b"IHDR" => 0,
        b"CgBI" if slice(data, 28, 4)? == b"IHDR" => 16,
        _ => return None,
    };
    Some((
        be32(data, 16_usize.checked_add(shift)?)?,
        be32(data, 20_usize.checked_add(shift)?)?,
    ))
}

fn gif(data: &[u8]) -> Option<(u32, u32)> {
    Some((le16(data, 6)?, le16(data, 8)?))
}

/// BMP: the OS/2 core header (12 bytes) has 16-bit dimensions, every other one 32-bit, with a
/// negative height for a top-down bitmap.
fn bmp(data: &[u8]) -> Option<(u32, u32)> {
    match le32(data, 14)? {
        12 => Some((le16(data, 18)?, le16(data, 20)?)),
        40..=124 => {
            let height = i32::from_le_bytes(array4(data, 22)?);
            Some((le32(data, 18)?, height.unsigned_abs()))
        }
        _ => None,
    }
}

/// WebP: the first chunk after the `RIFF` header says which of the three encodings it is.
fn webp(data: &[u8]) -> Option<(u32, u32)> {
    match slice(data, 12, 4)? {
        b"VP8X" => {
            let flags = byte(data, 20)?;
            if flags & 0xc1 != 0 {
                return None;
            }
            Some((le24(data, 24)?.checked_add(1)?, le24(data, 27)?.checked_add(1)?))
        }
        b"VP8 " => {
            // Frame tag (3 bytes), start code, then 14-bit dimensions.
            if slice(data, 23, 3)? != [0x9d, 0x01, 0x2a] {
                return None;
            }
            Some((le16(data, 26)? & 0x3fff, le16(data, 28)? & 0x3fff))
        }
        b"VP8L" => {
            if byte(data, 20)? != 0x2f {
                return None;
            }
            let bits = le32(data, 21)?;
            Some(((bits & 0x3fff).checked_add(1)?, ((bits >> 14) & 0x3fff).checked_add(1)?))
        }
        _ => None,
    }
}

/// JPEG: walks the segments, skipping each by its declared length, to the first start-of-frame.
/// The walk stops at the start of the entropy-coded data (`SOS`) or the end of the image (`EOI`),
/// and after [`MAX_JPEG_STEPS`] segments, so a chain that never ends costs a bounded amount.
fn jpeg(data: &[u8]) -> Option<(u32, u32)> {
    let mut pos: usize = 2;
    for _ in 0..MAX_JPEG_STEPS {
        if byte(data, pos)? != 0xff {
            return None;
        }
        let marker = byte(data, pos.checked_add(1)?)?;
        match marker {
            // A fill byte before the real marker.
            0xff => pos = pos.checked_add(1)?,
            // Markers that carry no length: stuffed zero, TEM, RSTn, SOI.
            0x00 | 0x01 | 0xd0..=0xd8 => pos = pos.checked_add(2)?,
            // EOI, SOS: no frame header can follow.
            0xd9 | 0xda => return None,
            _ => {
                let length = usize::try_from(be16(data, pos.checked_add(2)?)?).ok()?;
                if length < 2 {
                    return None;
                }
                // SOF0..SOF15 except DHT (c4), JPG (c8) and DAC (cc).
                if matches!(marker, 0xc0..=0xcf) && !matches!(marker, 0xc4 | 0xc8 | 0xcc) {
                    return Some((be16(data, pos.checked_add(7)?)?, be16(data, pos.checked_add(5)?)?));
                }
                pos = pos.checked_add(2)?.checked_add(length)?;
            }
        }
    }
    None
}

/// An ISOBMFF box found by [`find_box`].
struct IsoBox {
    /// Where the payload starts (after the size, type and an optional 64-bit size).
    body: usize,
    end: usize,
}

/// Finds the first box called `name` among the boxes that lie between `start` and `end`.
///
/// A box that claims to reach beyond `end`, or to be smaller than its own header, stops the walk;
/// so does a [`MAX_BOX_STEPS`]th box.
fn find_box(data: &[u8], start: usize, end: usize, name: [u8; 4]) -> Option<IsoBox> {
    let mut pos = start;
    for _ in 0..MAX_BOX_STEPS {
        if pos >= end {
            return None;
        }
        let size = u64::from(be32(data, pos)?);
        let kind = slice(data, pos.checked_add(4)?, 4)?;
        let (header, size) = match size {
            // Extends to the end of the enclosing box.
            0 => (8_usize, u64::try_from(end.checked_sub(pos)?).ok()?),
            1 => {
                let high = u64::from(be32(data, pos.checked_add(8)?)?);
                let low = u64::from(be32(data, pos.checked_add(12)?)?);
                (16, high.checked_mul(1 << 32)?.checked_add(low)?)
            }
            n => (8, n),
        };
        if size < u64::try_from(header).ok()? {
            return None;
        }
        let box_end = pos.checked_add(usize::try_from(size).ok()?)?;
        if box_end > end {
            return None;
        }
        if kind == name.as_slice() {
            return Some(IsoBox {
                body: pos.checked_add(header)?,
                end: box_end,
            });
        }
        pos = box_end;
    }
    None
}

/// AVIF and the rest of the HEIF family: `ftyp`, then `meta` > `iprp` > `ipco` > `ispe`, which holds
/// the width and height of the first image property.
fn isobmff(data: &[u8]) -> Option<(u32, u32)> {
    let brand = slice(data, 8, 4)?;
    if !matches!(
        brand,
        b"avif" | b"avis" | b"mif1" | b"msf1" | b"heic" | b"heix" | b"hevc" | b"hevx"
    ) {
        return None;
    }
    let meta = find_box(data, 0, data.len(), *b"meta")?;
    // `meta` is a full box: four bytes of version and flags precede its children.
    let iprp = find_box(data, meta.body.checked_add(4)?, meta.end, *b"iprp")?;
    let ipco = find_box(data, iprp.body, iprp.end, *b"ipco")?;
    let ispe = find_box(data, ipco.body, ipco.end, *b"ispe")?;
    // A full box again: version and flags, then width and height.
    let width = be32(data, ispe.body.checked_add(4)?)?;
    let height = be32(data, ispe.body.checked_add(8)?)?;
    (ispe.end >= ispe.body.checked_add(12)?).then_some((width, height))
}

fn is_svg_space(b: u8) -> bool {
    matches!(b, b' ' | b'\t' | b'\n' | b'\r' | 0x0b | 0x0c)
}

/// The root start tag, as `image-size` finds it: `<svg`, a space, then anything up to a `>` that is
/// not inside a quoted string, all within the first [`SVG_WINDOW`] bytes.
fn svg_root_tag(data: &[u8]) -> Option<&[u8]> {
    let window = data.get(..SVG_WINDOW).unwrap_or(data);
    for start in 0..window.len() {
        let after = start.checked_add(4)?;
        if window.get(start..after) != Some(b"<svg".as_slice()) || !is_svg_space(byte(window, after).unwrap_or(0)) {
            continue;
        }
        let mut i = after.checked_add(1)?;
        while let Some(&c) = window.get(i) {
            match c {
                b'>' => return window.get(start..=i),
                b'"' | b'\'' => {
                    let rest = window.get(i.checked_add(1)?..)?;
                    match rest.iter().position(|&b| b == c) {
                        Some(offset) => i = i.checked_add(offset)?.checked_add(2)?,
                        None => break,
                    }
                }
                _ => i = i.checked_add(1)?,
            }
        }
    }
    None
}

/// The value of the attribute `name` in a start tag, found the way `image-size` does with its
/// regular expressions: preceded by whitespace, quoted, non-empty, and for a `width` / `height`
/// free of `%` (a percentage has no pixel size). `viewBox` matches case-insensitively and may
/// contain `%` but not a line break.
fn svg_attribute<'a>(tag: &'a [u8], name: &str, is_viewbox: bool) -> Option<&'a str> {
    let name = name.as_bytes();
    for start in 0..tag.len() {
        if !is_svg_space(byte(tag, start)?) {
            continue;
        }
        let name_start = start.checked_add(1)?;
        let name_end = name_start.checked_add(name.len())?;
        let Some(candidate) = tag.get(name_start..name_end) else {
            continue;
        };
        let name_matches = if is_viewbox {
            candidate.eq_ignore_ascii_case(name)
        } else {
            candidate == name
        };
        if !name_matches || byte(tag, name_end) != Some(b'=') {
            continue;
        }
        let Some(quote) = byte(tag, name_end.checked_add(1)?).filter(|q| *q == b'"' || *q == b'\'') else {
            continue;
        };
        let value_start = name_end.checked_add(2)?;
        // The value is non-empty, so the closing quote is searched from its second byte.
        let search_from = value_start.checked_add(1)?;
        let Some(offset) = tag.get(search_from..).and_then(|t| t.iter().position(|&b| b == quote)) else {
            continue;
        };
        let Some(value) = tag.get(value_start..search_from.checked_add(offset)?) else {
            continue;
        };
        let forbidden = if is_viewbox {
            value.iter().any(|&b| b == b'\n' || b == b'\r')
        } else {
            value.contains(&b'%')
        };
        if !forbidden {
            return std::str::from_utf8(value).ok();
        }
    }
    None
}

/// `image-size`'s `parseLength`: a number with an optional unit, converted to pixels at 96 dpi and
/// rounded. Its `pc` factor is `96 / 72 / 12`, mirrored as it is.
fn svg_length(text: &str) -> Option<f64> {
    let bytes = text.as_bytes();
    let mantissa_len = bytes.iter().take_while(|b| b.is_ascii_digit() || **b == b'.').count();
    if mantissa_len == 0 {
        return None;
    }
    let mut number_len = mantissa_len;
    if bytes.get(mantissa_len) == Some(&b'e') {
        let digits = bytes
            .get(mantissa_len.checked_add(1)?..)?
            .iter()
            .take_while(|b| b.is_ascii_digit())
            .count();
        if digits > 0 {
            number_len = mantissa_len.checked_add(1)?.checked_add(digits)?;
        }
    }
    let number: f64 = text.get(..number_len)?.parse().ok()?;
    let factor = match text.get(number_len..)? {
        "" | "px" => 1.0,
        "in" => 96.0,
        "cm" => 96.0 / 2.54,
        "em" => 16.0,
        "ex" => 8.0,
        "m" => (96.0 / 2.54) * 100.0,
        "mm" => 96.0 / 2.54 / 10.0,
        "pc" => 96.0 / 72.0 / 12.0,
        "pt" => 96.0 / 72.0,
        _ => return None,
    };
    let length = (number * factor).round();
    length.is_finite().then_some(length)
}

#[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
fn to_pixels(value: f64) -> Option<u32> {
    (value.is_finite() && (0.0..=f64::from(u32::MAX)).contains(&value)).then_some(value as u32)
}

/// SVG: the `width` and `height` of the root element when both are given, else its `viewBox`
/// scaled to whichever of them is. Mirrors `image-size`'s SVG handling, including that a length in
/// a percentage, or one that does not parse, counts as missing.
fn svg(data: &[u8]) -> Option<(u32, u32)> {
    let tag = svg_root_tag(data)?;
    let attr = |name: &str| svg_attribute(tag, name, false).and_then(svg_length);
    // A zero length is as good as no length (JS falsiness).
    let width = attr("width").filter(|v| *v != 0.0);
    let height = attr("height").filter(|v| *v != 0.0);
    if let (Some(width), Some(height)) = (width, height) {
        return Some((to_pixels(width)?, to_pixels(height)?));
    }
    let viewbox = svg_attribute(tag, "viewBox", true)?;
    let mut bounds = viewbox.split(' ').skip(2);
    let view_width = bounds.next().and_then(svg_length)?;
    let view_height = bounds.next().and_then(svg_length)?;
    let ratio = view_width / view_height;
    let (width, height) = if let Some(width) = width {
        (width, (width / ratio).floor())
    } else if let Some(height) = height {
        ((height * ratio).floor(), height)
    } else {
        (view_width, view_height)
    };
    Some((to_pixels(width)?, to_pixels(height)?))
}
