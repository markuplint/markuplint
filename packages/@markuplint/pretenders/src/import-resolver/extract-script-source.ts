/**
 * @module extract-script-source
 *
 * Framework-specific extractors that pull ESM source text from component files.
 * Each framework stores imports in different locations:
 *
 * | Framework | Source Block               | Extraction Method          |
 * |-----------|---------------------------|----------------------------|
 * | Vue       | `<script setup>` tag      | Regex on raw source        |
 * | Svelte    | `<script>` tag            | Regex on raw source        |
 * | Astro     | Frontmatter (`---...---`) | Regex on raw source        |
 */

/**
 * The result of extracting a script source block from a component file.
 */
export interface ScriptSourceBlock {
	/** The raw script/ESM content without delimiters */
	readonly content: string;
	/** The offset (in characters) of the content start within the original source */
	readonly offset: number;
}

/**
 * Extracts the content of the `<script setup>` block from a Vue SFC source.
 * Handles optional `lang` attribute (e.g., `<script setup lang="ts">`).
 * Only matches `<script setup>` — regular `<script>` blocks are ignored.
 *
 * @param source - The full Vue SFC source text
 * @returns The extracted script block, or `null` if no `<script setup>` is found
 */
export function extractVueScriptSetup(source: string): ScriptSourceBlock | null {
	// Match <script setup> with optional attributes like lang="ts"
	const re = /<script\s[^>]*?\bsetup\b[^>]*>/i;
	const match = re.exec(source);
	if (!match) {
		return null;
	}

	const startTag = match[0];
	const contentStart = match.index + startTag.length;

	const endTagRe = /<\/script\s*>/i;
	const remaining = source.slice(contentStart);
	const endMatch = endTagRe.exec(remaining);
	if (!endMatch) {
		return null;
	}

	return {
		content: remaining.slice(0, endMatch.index),
		offset: contentStart,
	};
}

/**
 * Extracts the content of the `<script>` block from a Svelte component source.
 * Only matches the first non-context `<script>` tag (ignores `<script context="module">`
 * unless it's the only one).
 *
 * @param source - The full Svelte component source text
 * @returns The extracted script block, or `null` if no `<script>` is found
 */
export function extractSvelteScript(source: string): ScriptSourceBlock | null {
	// Match <script> with optional attributes, but prefer the instance script
	const re = /<script(?:\s[^>]*)?>/gi;
	let match: RegExpExecArray | null;

	while ((match = re.exec(source)) !== null) {
		const startTag = match[0];
		const contentStart = match.index + startTag.length;

		const endTagRe = /<\/script\s*>/i;
		const remaining = source.slice(contentStart);
		const endMatch = endTagRe.exec(remaining);
		if (!endMatch) {
			continue;
		}

		return {
			content: remaining.slice(0, endMatch.index),
			offset: contentStart,
		};
	}

	return null;
}

/**
 * Extracts the content of the frontmatter block (`---...---`) from an Astro component source.
 *
 * @param source - The full Astro component source text
 * @returns The extracted frontmatter block, or `null` if no frontmatter is found
 */
export function extractAstroFrontmatter(source: string): ScriptSourceBlock | null {
	const re = /^(?:\s*\n)?---\r?\n/;
	const startMatch = re.exec(source);
	if (!startMatch) {
		return null;
	}

	const contentStart = startMatch[0].length;
	const afterStart = source.slice(contentStart);
	const endRe = /\r?\n---\r?\n/;
	const endMatch = endRe.exec(afterStart);
	if (!endMatch) {
		return null;
	}

	return {
		content: afterStart.slice(0, endMatch.index),
		offset: contentStart,
	};
}
