import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { imageSize } from 'image-size';

interface ImageDimensions {
	readonly width: number;
	readonly height: number;
}

interface CacheEntry {
	readonly width: number;
	readonly height: number;
}

// In-memory cache: key = "absolutePath:fileSize:src"
const memoryCache = new Map<string, CacheEntry>();

let cacheLoaded = false;

let _cacheDir: string | undefined;
function getCacheDir(): string {
	if (_cacheDir != null) {
		return _cacheDir;
	}
	const req = createRequire(import.meta.url);
	const { version } = req('../../package.json') as { version: string };
	_cacheDir = path.join(tmpdir(), `markuplint-v${version}`);
	return _cacheDir;
}

/**
 * Reset module-level caches. **Only for testing.**
 */
export function _resetCacheForTesting(): void {
	memoryCache.clear();
	cacheLoaded = false;
	_cacheDir = undefined;
}

function getCacheFilePath(): string {
	return path.join(getCacheDir(), 'image-size-cache.json');
}

async function loadCacheFromDisk(): Promise<void> {
	if (cacheLoaded) {
		return;
	}
	cacheLoaded = true;

	let raw: string;
	try {
		raw = await readFile(getCacheFilePath(), 'utf8');
	} catch {
		return;
	}

	let data: Record<string, CacheEntry>;
	try {
		data = JSON.parse(raw) as Record<string, CacheEntry>;
	} catch {
		return;
	}

	for (const [key, value] of Object.entries(data)) {
		memoryCache.set(key, value);
	}
}

async function saveCacheToDisk(): Promise<void> {
	const dir = getCacheDir();
	try {
		await mkdir(dir, { recursive: true });
	} catch {
		return;
	}

	const obj: Record<string, CacheEntry> = {};
	for (const [key, value] of memoryCache) {
		obj[key] = value;
	}

	try {
		await writeFile(getCacheFilePath(), JSON.stringify(obj));
	} catch {
		// Ignore write failures
	}
}

function stripQueryAndFragment(src: string): string {
	const qIndex = src.indexOf('?');
	const hIndex = src.indexOf('#');
	let end = src.length;
	if (qIndex !== -1) end = Math.min(end, qIndex);
	if (hIndex !== -1) end = Math.min(end, hIndex);
	return src.slice(0, end);
}

/**
 * Resolve the absolute path of an image from its `src` attribute value.
 *
 * Query strings (`?...`) and fragments (`#...`) are stripped before resolving
 * the file path so that cache-busting suffixes do not prevent file lookup.
 *
 * @param src - The `src` attribute value
 * @param documentRoot - Root directory for absolute paths (defaults to cwd)
 * @param documentFilename - The filename of the document being linted
 * @returns The absolute path, or `null` if the path cannot be resolved (remote URLs, data URIs)
 */
function resolveImagePath(
	src: string,
	documentRoot: string | undefined,
	documentFilename: string | undefined,
): string | null {
	// Skip remote URLs and data URIs
	if (/^https?:\/\//i.test(src) || /^data:/i.test(src)) {
		return null;
	}

	const cleanSrc = stripQueryAndFragment(src);

	// Absolute path (starts with /)
	if (cleanSrc.startsWith('/')) {
		return path.join(documentRoot ?? process.cwd(), cleanSrc);
	}

	// Relative path
	if (documentFilename) {
		return path.resolve(path.dirname(documentFilename), cleanSrc);
	}

	return path.join(documentRoot ?? process.cwd(), cleanSrc);
}

/**
 * Get the dimensions of an image file, using a cache keyed by absolute path,
 * file size, and the original `src` value.
 *
 * Query strings and fragments in `src` are stripped when resolving the file
 * path, but the original `src` is kept in the cache key so that different
 * cache-busting suffixes produce separate cache entries (mirroring browser
 * cache-busting semantics).
 *
 * @param src - The `src` attribute value
 * @param documentRoot - Root directory for absolute paths
 * @param documentFilename - The filename of the document being linted
 * @returns The image dimensions, or `null` if the image cannot be resolved or read
 */
export async function getImageDimensions(
	src: string,
	documentRoot: string | undefined,
	documentFilename: string | undefined,
): Promise<ImageDimensions | null> {
	const absolutePath = resolveImagePath(src, documentRoot, documentFilename);
	if (absolutePath == null) {
		return null;
	}

	await loadCacheFromDisk();

	// Get file size for cache key. Deliberately treats every failure class the
	// same (missing file, permission denied, I/O error, etc.) as "can't check
	// this image" rather than a lint-worthy violation — a filesystem problem
	// unrelated to markup correctness shouldn't fail the lint run, and this
	// rule has no way to distinguish "the author has a typo in src" (already
	// the common, expected case) from a transient/environmental read failure.
	let fileSize: number;
	try {
		const fileStat = await stat(absolutePath);
		fileSize = fileStat.size;
	} catch {
		return null;
	}

	const cacheKey = `${absolutePath}:${fileSize}:${src}`;
	const cached = memoryCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Read and measure the image. Same rationale as the `stat` catch above:
	// any read failure means this rule can't check the image, not a violation.
	let buffer: Buffer;
	try {
		buffer = await readFile(absolutePath);
	} catch {
		return null;
	}

	let result: { width?: number; height?: number };
	try {
		result = imageSize(buffer);
	} catch {
		return null;
	}

	if (result.width == null || result.height == null) {
		return null;
	}

	const dimensions: ImageDimensions = { width: result.width, height: result.height };
	memoryCache.set(cacheKey, dimensions);
	await saveCacheToDisk();
	return dimensions;
}
