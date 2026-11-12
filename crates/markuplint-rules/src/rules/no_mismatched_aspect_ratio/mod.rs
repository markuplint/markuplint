//! `no-mismatched-aspect-ratio` rule: the `width` / `height` attributes of an `<img>` (or of a
//! `<source>` in a `<picture>`) must match the aspect ratio of the image file they describe.
//!
//! Ports `packages/@markuplint/rules/src/no-mismatched-aspect-ratio/`. HTML LS § Dimension
//! attributes: "the specified height and width must match the dimensions of the intrinsic aspect
//! ratio". The attributes are integers, so an image whose ratio does not divide evenly can never
//! match exactly; a half-pixel tolerance ([`TOLERANCE_PX`]) absorbs that rounding.
//!
//! The image is read from disk, not fetched: `http(s):` and `data:` URLs, and any file that does
//! not exist or cannot be read, are not checked (a filesystem problem is not a markup error).
//!
//! Known limitation against v5: the dimensions come from
//! [`markuplint_core::image_dimensions`], a header-only reader of PNG, GIF, BMP, WebP, JPEG, AVIF
//! (and the rest of HEIF) and SVG that was written in place of an image dependency, so an image of
//! any other format (TIFF, ICO, ...) is silently not checked, where v5's `image-size` read it.
//!
//! The dimensions are cached in memory for the life of the process, keyed by the resolved path and
//! the size and modification time of the file; nothing is written to disk (v5 kept a JSON file in
//! the temporary directory).

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};
use std::time::SystemTime;

use markuplint_core::image_dimensions::{Dimensions, read_file_dimensions};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::attr_value;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{CandidateGate, attr_node, is_dynamic, walk_image_candidates};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// Pixels of mismatch (in height-equivalent units) that are still accepted.
const TOLERANCE_PX: f64 = 0.5;

/// Entries the dimension cache holds before it is emptied, so a long-lived process that lints a
/// huge tree cannot grow it without bound.
const CACHE_LIMIT: usize = 4096;

type CacheKey = (PathBuf, u64, Option<SystemTime>);

static CACHE: LazyLock<Mutex<HashMap<CacheKey, Dimensions>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

pub struct NoMismatchedAspectRatio;

impl Rule for NoMismatchedAspectRatio {
    fn id(&self) -> &'static str {
        "no-mismatched-aspect-ratio"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let filename = config.common_settings().filename.as_deref();
        walk_image_candidates(
            self.id(),
            arena,
            config,
            CandidateGate::ImgOrPictureSource,
            |ctx, violations| {
                let (Some(width_attr), Some(height_attr)) = (attr_node(ctx.el, "width"), attr_node(ctx.el, "height"))
                else {
                    return;
                };
                if is_dynamic(width_attr) || is_dynamic(height_attr) {
                    return;
                }

                // `src` of an `<img>`, the first candidate of the `srcset` of a `<source>`.
                let src = if ctx.local_name == "img" {
                    let Some(src_attr) = attr_node(ctx.el, "src").filter(|attr| !is_dynamic(attr)) else {
                        return;
                    };
                    attr_value(src_attr)
                } else {
                    let Some(srcset_attr) = attr_node(ctx.el, "srcset").filter(|attr| !is_dynamic(attr)) else {
                        return;
                    };
                    let Some(first) = first_srcset_url(attr_value(srcset_attr)) else {
                        return;
                    };
                    first
                };

                let width_str = attr_value(width_attr);
                let height_str = attr_value(height_attr);
                let (Some(attr_width), Some(attr_height)) = (parse_int(width_str), parse_int(height_str)) else {
                    return;
                };
                if attr_width <= 0.0 || attr_height <= 0.0 {
                    return;
                }

                let document_root = ctx.rule_config.options.get("documentRoot").and_then(|v| v.as_str());
                let Some(path) = resolve_image_path(src, document_root, filename) else {
                    return;
                };
                let Some(Dimensions {
                    width: actual_width,
                    height: actual_height,
                }) = cached_dimensions(&path)
                else {
                    return;
                };

                // Cross-multiplication keeps the comparison free of a division of the pixel
                // counts; dividing by the actual width expresses the mismatch in height pixels.
                let mismatch_px = (attr_width * f64::from(actual_height) - attr_height * f64::from(actual_width)).abs()
                    / f64::from(actual_width);
                if mismatch_px > TOLERANCE_PX {
                    violations.push(ctx.element_violation(&format!(
                        "The aspect ratio of the image ({actual_width}:{actual_height}) does not match the width/height attributes ({width_str}:{height_str})"
                    )));
                }
            },
        )
    }
}

/// TS `extractFirstSrcsetUrl`: the URL of the first candidate.
fn first_srcset_url(srcset: &str) -> Option<&str> {
    let first = srcset.trim().split(',').next()?.trim();
    first.split_whitespace().next()
}

/// JS `Number.parseInt(value, 10)`: leading whitespace, an optional sign, then digits; `None` where
/// JS gives `NaN`.
fn parse_int(value: &str) -> Option<f64> {
    let value = value.trim_start();
    let (negative, digits) = match value.as_bytes().first()? {
        b'-' => (true, value.get(1..)?),
        b'+' => (false, value.get(1..)?),
        _ => (false, value),
    };
    let end = digits.bytes().take_while(u8::is_ascii_digit).count();
    let number: f64 = digits.get(..end).filter(|d| !d.is_empty())?.parse().ok()?;
    Some(if negative { -number } else { number })
}

/// TS `resolveImagePath`: the file `src` names, or `None` for a remote URL or a data URI.
///
/// A query string and a fragment are dropped; a path starting with `/` is under `document_root`
/// (the current directory when there is none); any other is relative to the directory of the
/// document, or to `document_root` / the current directory when the document has no file name.
fn resolve_image_path(src: &str, document_root: Option<&str>, filename: Option<&str>) -> Option<PathBuf> {
    let lower = src.get(..8).unwrap_or(src).to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") || lower.starts_with("data:") {
        return None;
    }

    let end = src.find(['?', '#']).unwrap_or(src.len());
    let clean = src.get(..end)?;

    let root = || -> Option<PathBuf> {
        match document_root {
            Some(root) => Some(PathBuf::from(root)),
            None => std::env::current_dir().ok(),
        }
    };

    if clean.starts_with('/') {
        return Some(root()?.join(clean.trim_start_matches('/')));
    }
    match filename.filter(|name| !name.is_empty()) {
        Some(filename) => Some(Path::new(filename).parent().unwrap_or(Path::new("")).join(clean)),
        None => Some(root()?.join(clean)),
    }
}

/// The dimensions of the image at `path`, from the cache when the file is unchanged.
fn cached_dimensions(path: &Path) -> Option<Dimensions> {
    let metadata = fs::metadata(path).ok()?;
    if !metadata.is_file() {
        return None;
    }
    let key = (path.to_path_buf(), metadata.len(), metadata.modified().ok());
    if let Some(found) = CACHE.lock().ok().and_then(|cache| cache.get(&key).copied()) {
        return Some(found);
    }
    let dimensions = read_file_dimensions(path)?;
    if let Ok(mut cache) = CACHE.lock() {
        if cache.len() >= CACHE_LIMIT {
            cache.clear();
        }
        cache.insert(key, dimensions);
    }
    Some(dimensions)
}
