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
 * | MDX       | Top-level ESM             | Whole source (lexer-safe)  |
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
 * Extracts the content of a regular `<script>` block (NOT `<script setup>`) from a Vue SFC source.
 * Only matches `<script>` without the `setup` attribute.
 *
 * @param source - The full Vue SFC source text
 * @returns The extracted script block, or `null` if no regular `<script>` is found
 */
export function extractVueScript(source: string): ScriptSourceBlock | null {
	const re = /<script(?:\s[^>]*)?>/gi;
	let match: RegExpExecArray | null;

	while ((match = re.exec(source)) !== null) {
		const startTag = match[0];

		// Skip <script setup> blocks
		if (/\bsetup\b/i.test(startTag)) {
			continue;
		}

		const contentStart = match.index + startTag.length;
		const remaining = source.slice(contentStart);
		const endMatch = /<\/script\s*>/i.exec(remaining);
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
 * Extracts component names registered in the Vue Options API `components` property.
 * Handles both shorthand (`{ Button }`) and aliased (`{ Btn: MyButton }`) forms.
 * For aliased forms, returns the value (the import name), not the key (the template name).
 *
 * @param scriptContent - The content of the `<script>` block (without tags)
 * @returns An array of component local names referenced in the `components` registration
 */
export function extractVueOptionsApiComponents(scriptContent: string): string[] {
	if (!scriptContent) {
		return [];
	}

	// Match `components: { ... }` allowing for multiline
	const re = /\bcomponents\s*:\s*\{([^}]*)\}/;
	const match = re.exec(scriptContent);
	if (!match?.[1]) {
		return [];
	}

	const names: string[] = [];
	for (const entry of match[1].split(',')) {
		const trimmed = entry.trim();
		if (!trimmed) {
			continue;
		}

		// Split on first colon only to handle values containing colons
		const colonIdx = trimmed.indexOf(':');
		if (colonIdx === -1) {
			// Shorthand: `Button` → use as-is
			names.push(trimmed);
		} else {
			// Aliased form: `Btn: MyButton` → use value `MyButton`
			const value = trimmed.slice(colonIdx + 1).trim();
			if (value) {
				names.push(value);
			}
		}
	}

	return names;
}

/**
 * Extracts the content of the `<script>` block from a Svelte component source.
 * Prefers the instance `<script>` over `<script context="module">`.
 * Falls back to the module script if no instance script is found.
 *
 * @param source - The full Svelte component source text
 * @returns The extracted script block, or `null` if no `<script>` is found
 */
export function extractSvelteScript(source: string): ScriptSourceBlock | null {
	const re = /<script(?:\s[^>]*)?>/gi;
	let match: RegExpExecArray | null;
	let moduleBlock: ScriptSourceBlock | null = null;

	while ((match = re.exec(source)) !== null) {
		const startTag = match[0];
		const isModule = /\bcontext\s*=\s*["']module["']/i.test(startTag);
		const contentStart = match.index + startTag.length;

		const endTagRe = /<\/script\s*>/i;
		const remaining = source.slice(contentStart);
		const endMatch = endTagRe.exec(remaining);
		if (!endMatch) {
			continue;
		}

		const block: ScriptSourceBlock = {
			content: remaining.slice(0, endMatch.index),
			offset: contentStart,
		};

		if (!isModule) {
			return block; // Prefer instance script
		}

		// Remember module script as fallback
		moduleBlock ??= block;
	}

	return moduleBlock;
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

/**
 * Extracts the top-level ESM block from an MDX file.
 * MDX files have standard ESM import/export statements at the top of the file,
 * followed by markdown/JSX content. This function extracts only the contiguous
 * block of import/export lines (including blank lines within the block),
 * stopping at the first line that is clearly non-ESM content.
 *
 * Handles multi-line imports by tracking brace depth.
 *
 * @param source - The full MDX source text
 * @returns The ESM block, or `null` if no import/export statements are found at the top
 */
export function extractMdxEsm(source: string): ScriptSourceBlock | null {
	const lines = source.split('\n');
	let esmEnd = 0;
	let pos = 0;
	let braceDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		// Track brace depth for multi-line imports
		for (const ch of line) {
			if (ch === '{') {
				braceDepth++;
			}
			if (ch === '}') {
				braceDepth--;
			}
		}

		pos += line.length + 1; // +1 for '\n'

		// Inside a multi-line import/export block
		if (braceDepth > 0) {
			continue;
		}

		// ESM-like lines: import, export, empty, single-line comments
		if (trimmed === '' || /^import\s/.test(trimmed) || /^export\s/.test(trimmed) || trimmed.startsWith('//')) {
			esmEnd = pos;
			continue;
		}

		// Non-ESM content (markdown, JSX, etc.) — stop
		break;
	}

	if (esmEnd === 0) {
		return null;
	}

	const content = source.slice(0, esmEnd);

	// Verify the extracted block actually contains import/export statements
	if (!/\b(?:import|export)\s/.test(content)) {
		return null;
	}

	return {
		content,
		offset: 0,
	};
}
