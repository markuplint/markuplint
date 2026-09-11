import { describe, test, expect } from 'vitest';

import { extractVueScript, extractVueOptionsApiComponents, extractMdxEsm } from './extract-script-source.js';

describe('extractVueScript', () => {
	test('extracts regular <script> content', () => {
		const source = `<template><div /></template>

<script>
import Button from './Button.vue'
export default {
  components: { Button }
}
</script>`;
		const result = extractVueScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.vue'");
		expect(result!.content).toContain('components: { Button }');
	});

	test('extracts <script lang="ts"> content', () => {
		const source = `<script lang="ts">
import Button from './Button.vue'
export default { components: { Button } }
</script>

<template><Button /></template>`;
		const result = extractVueScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.vue'");
	});

	test('ignores <script setup> blocks', () => {
		const source = `<script setup>
import { ref } from 'vue'
</script>

<template><div /></template>`;
		const result = extractVueScript(source);
		expect(result).toBeNull();
	});

	test('returns null when no script tag exists', () => {
		const source = '<template><div>hello</div></template>';
		const result = extractVueScript(source);
		expect(result).toBeNull();
	});

	test('offset points to content start (after opening tag)', () => {
		const source = "<script>\nimport X from './X'\n</script>";
		const result = extractVueScript(source);
		expect(result).not.toBeNull();
		// offset is right after '<script>' (8 chars)
		expect(result!.offset).toBe('<script>'.length);
	});

	test('picks regular <script> when both setup and regular exist', () => {
		const source = `<script setup>
import { ref } from 'vue'
</script>

<script>
import Button from './Button.vue'
export default { components: { Button } }
</script>

<template><Button /></template>`;
		const result = extractVueScript(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button.vue'");
		expect(result!.content).not.toContain('ref');
	});
});

describe('extractVueOptionsApiComponents', () => {
	test('extracts shorthand component names', () => {
		const source = `
import Button from './Button.vue'
import Card from './Card.vue'
export default {
  components: { Button, Card }
}`;
		const result = extractVueOptionsApiComponents(source);
		expect(result).toStrictEqual(['Button', 'Card']);
	});

	test('extracts aliased component names (value is the import)', () => {
		const source = `
import MyBtn from './Button.vue'
export default {
  components: { Btn: MyBtn, Card }
}`;
		const result = extractVueOptionsApiComponents(source);
		expect(result).toStrictEqual(['MyBtn', 'Card']);
	});

	test('handles multiline component registration', () => {
		const source = `
import Button from './Button.vue'
import Card from './Card.vue'
import Input from './Input.vue'
export default {
  components: {
    Button,
    Card,
    Input,
  },
  data() { return {} }
}`;
		const result = extractVueOptionsApiComponents(source);
		expect(result).toStrictEqual(['Button', 'Card', 'Input']);
	});

	test('returns empty array when no components property', () => {
		const source = `
export default {
  data() { return {} }
}`;
		const result = extractVueOptionsApiComponents(source);
		expect(result).toStrictEqual([]);
	});

	test('returns empty array for empty source', () => {
		const result = extractVueOptionsApiComponents('');
		expect(result).toStrictEqual([]);
	});

	test('works inside defineComponent wrapper', () => {
		const source = `
import { defineComponent } from 'vue'
import Button from './Button.vue'
export default defineComponent({
  components: { Button }
})`;
		const result = extractVueOptionsApiComponents(source);
		expect(result).toStrictEqual(['Button']);
	});

	test('works with defineComponent and multiple components', () => {
		const source = `
import { defineComponent } from 'vue'
import Button from './Button.vue'
import Card from './Card.vue'
export default defineComponent({
  components: {
    Button,
    MyCard: Card,
  },
  setup() { return {} }
})`;
		const result = extractVueOptionsApiComponents(source);
		expect(result).toStrictEqual(['Button', 'Card']);
	});
});

describe('extractMdxEsm', () => {
	test('extracts source when import statements are present', () => {
		const source = `import Button from './Button'
import { Card } from './ui'

# Hello World

<Button>Click me</Button>`;
		const result = extractMdxEsm(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Button from './Button'");
		expect(result!.content).toContain("import { Card } from './ui'");
		expect(result!.offset).toBe(0);
	});

	test('returns null when no import statements exist', () => {
		const source = '# Hello World\n\nSome markdown content';
		const result = extractMdxEsm(source);
		expect(result).toBeNull();
	});

	test('returns null for empty source', () => {
		const result = extractMdxEsm('');
		expect(result).toBeNull();
	});

	test('brace depth tracking skips intermediate lines in multi-line blocks', () => {
		// BUG: Multi-line imports (e.g. `import {\n  Button,\n} from './ui'`)
		// return null because esmEnd is not advanced while braceDepth > 0,
		// and the closing `} from '...'` line is not recognized as ESM.
		// TODO: Fix extractMdxEsm to handle multi-line imports properly.
		const source = `import {
  Button,
  Card,
} from './ui'

# Hello`;
		const result = extractMdxEsm(source);
		expect(result).toBeNull();
	});

	test('single-line import followed by multi-line import preserves the single-line portion', () => {
		// A single-line import advances esmEnd. A subsequent multi-line
		// import block does not advance esmEnd further, but the
		// single-line import is still captured.
		const source = `import Layout from './Layout'
import {
  Button,
} from './ui'

# Hello`;
		const result = extractMdxEsm(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("import Layout from './Layout'");
		expect(result!.content).not.toContain('Button');
		expect(result!.offset).toBe(0);
	});

	test('handles single-line export with balanced braces', () => {
		// Braces that open and close on the same line keep braceDepth at 0,
		// so the line is evaluated normally as ESM.
		const source = `export { Button } from './ui'
import Card from './Card'

# Hello`;
		const result = extractMdxEsm(source);
		expect(result).not.toBeNull();
		expect(result!.content).toContain("export { Button } from './ui'");
		expect(result!.content).toContain("import Card from './Card'");
		expect(result!.content).not.toContain('# Hello');
	});
});
