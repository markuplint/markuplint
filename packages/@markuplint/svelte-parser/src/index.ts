/**
 * @module
 * Svelte component parser for markuplint. Provides a parser that transforms Svelte
 * template syntax into markuplint's AST, supporting Svelte-specific constructs such as
 * `{#if}`, `{#each}`, `{#await}`, `{#key}`, `{#snippet}`, expression tags,
 * and bind/class/event directives.
 */

export { parser } from './parser.js';
