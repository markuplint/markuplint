import { describe, test, expect } from 'vitest';

import { componentScanner } from './component-scanner.js';

describe('componentScanner (Astro)', () => {
	describe('scanComponent', () => {
		test('extracts root element and attrs from a simple component', () => {
			const source = `---
---
<button type="button" class="btn">Click me</button>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('button');
			expect(result!.attrs).toStrictEqual([
				{ name: 'type', value: 'button' },
				{ name: 'class', value: 'btn' },
			]);
			expect(result!.hasSlots).toBe(false);
		});

		test('detects <slot /> usage', () => {
			const source = `---
---
<div class="wrapper">
	<slot />
</div>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('div');
			expect(result!.hasSlots).toBe(true);
		});

		test('handles boolean attributes', () => {
			const source = `---
---
<button disabled>Submit</button>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.attrs).toStrictEqual([{ name: 'disabled' }]);
		});

		test('detects SVG namespace', () => {
			const source = `---
---
<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('svg');
			expect(result!.namespace).toBe('svg');
		});

		test('includes line and col of root element', () => {
			const source = `---
---
<div>content</div>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.line).toBeGreaterThan(0);
			expect(result!.col).toBeGreaterThan(0);
		});

		test('handles component without frontmatter', () => {
			const source = '<div class="simple">content</div>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.rootElement).toBe('div');
		});

		test('returns null for empty string input', () => {
			const result = componentScanner.scanComponent('');
			expect(result).toBeNull();
		});

		test('includes scriptSource when frontmatter is present', () => {
			const source = `---
import Button from './Button.astro';
---
<div>content</div>`;
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.scriptSource).toBeDefined();
			expect(result!.scriptSource!.content).toContain("import Button from './Button.astro'");
			expect(result!.scriptSource!.offset).toBeGreaterThan(0);
		});

		test('omits scriptSource when no frontmatter exists', () => {
			const source = '<div>content</div>';
			const result = componentScanner.scanComponent(source);
			expect(result).not.toBeNull();
			expect(result!.scriptSource).toBeUndefined();
		});
	});

	describe('extractScriptSource', () => {
		test('extracts frontmatter content', () => {
			const source = `---
import Button from './Button.astro';
const title = 'Hello';
---
<div />`;
			const result = componentScanner.extractScriptSource(source);
			expect(result).not.toBeNull();
			expect(result!.content).toContain("import Button from './Button.astro'");
			expect(result!.offset).toBeGreaterThan(0);
		});

		test('returns null for empty frontmatter', () => {
			const source = `---
---
<div />`;
			const result = componentScanner.extractScriptSource(source);
			// The regex requires \n---\n pattern, empty frontmatter has no content between delimiters
			expect(result).toBeNull();
		});

		test('returns null when no frontmatter exists', () => {
			const source = '<div>no frontmatter</div>';
			const result = componentScanner.extractScriptSource(source);
			expect(result).toBeNull();
		});
	});
});
