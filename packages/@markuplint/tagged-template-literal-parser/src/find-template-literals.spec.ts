import { describe, test, expect } from 'vitest';

import { findTemplateLiterals } from './find-template-literals.js';

describe('findTemplateLiterals', () => {
	test('finds a simple html tagged template', () => {
		const results = findTemplateLiterals('const t = html`<div></div>`;');
		expect(results).toHaveLength(1);
		expect(results[0].tagName).toBe('html');
		expect(results[0].htmlContent).toBe('<div></div>');
		expect(results[0].contentStart).toBe(15);
		expect(results[0].contentEnd).toBe(26);
		expect(results[0].expressions).toHaveLength(0);
	});

	test('extracts expression positions', () => {
		const code = 'const t = html`<div>${name}</div>`;';
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(1);
		expect(results[0].expressions).toHaveLength(1);
		expect(results[0].expressions[0].raw).toBe('${name}');
	});

	test('extracts multiple expressions', () => {
		const code = 'const t = html`${a} ${b} ${c}`;';
		const results = findTemplateLiterals(code);
		expect(results[0].expressions).toHaveLength(3);
		expect(results[0].expressions[0].raw).toBe('${a}');
		expect(results[0].expressions[1].raw).toBe('${b}');
		expect(results[0].expressions[2].raw).toBe('${c}');
	});

	test('ignores untagged template literals', () => {
		const results = findTemplateLiterals('const t = `<div></div>`;');
		expect(results).toHaveLength(0);
	});

	test('ignores non-matching tag names', () => {
		const results = findTemplateLiterals('const t = css`div {}`;');
		expect(results).toHaveLength(0);
	});

	test('supports custom tag names', () => {
		const results = findTemplateLiterals('const t = svg`<circle />`;', ['svg']);
		expect(results).toHaveLength(1);
		expect(results[0].tagName).toBe('svg');
	});

	test('supports multiple custom tag names simultaneously', () => {
		const code = 'const a = html`<div></div>`; const b = svg`<circle />`;';
		const results = findTemplateLiterals(code, ['html', 'svg']);
		expect(results).toHaveLength(2);
		expect(results[0].tagName).toBe('html');
		expect(results[1].tagName).toBe('svg');
	});

	test('supports member expression tags', () => {
		const results = findTemplateLiterals('const t = LitElement.html`<div></div>`;');
		expect(results).toHaveLength(1);
		expect(results[0].tagName).toBe('html');
	});

	test('computed member expression tag resolves property name', () => {
		// obj[html] is a MemberExpression with computed=true, but the property
		// is an Identifier with name 'html', so it resolves to 'html'
		const results = findTemplateLiterals('const t = obj[html]`<div></div>`;');
		expect(results).toHaveLength(1);
		expect(results[0].tagName).toBe('html');
	});

	test('call expression tag is ignored', () => {
		const results = findTemplateLiterals('const t = getTag()`<div></div>`;');
		expect(results).toHaveLength(0);
	});

	test('finds multiple template literals', () => {
		const code = `const a = html\`<div></div>\`;
const b = html\`<span></span>\`;`;
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(2);
		expect(results[0].htmlContent).toBe('<div></div>');
		expect(results[1].htmlContent).toBe('<span></span>');
	});

	test('handles multiline template literal', () => {
		const code = `const t = html\`
<div>
  <span>text</span>
</div>
\`;`;
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(1);
		expect(results[0].htmlContent).toContain('<div>');
		expect(results[0].htmlContent).toContain('</div>');
	});

	test('returns empty for non-JS content', () => {
		expect(() => findTemplateLiterals('not valid js @#$')).toThrow();
	});

	test('handles no template literals', () => {
		const results = findTemplateLiterals('const x = 42;');
		expect(results).toHaveLength(0);
	});

	test('handles empty string input', () => {
		const results = findTemplateLiterals('');
		expect(results).toHaveLength(0);
	});

	test('expression start/end include ${ and }', () => {
		const code = 'const t = html`${name}`;';
		const results = findTemplateLiterals(code);
		const expr = results[0].expressions[0];
		expect(code.slice(expr.start, expr.end)).toBe('${name}');
	});

	test('complex expression', () => {
		const code = 'const t = html`${items.map(i => i.name)}`;';
		const results = findTemplateLiterals(code);
		expect(results[0].expressions[0].raw).toBe('${items.map(i => i.name)}');
	});

	test('template literal in function body', () => {
		const code = `function render() {
  return html\`<div></div>\`;
}`;
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(1);
	});

	test('template literal in arrow function', () => {
		const code = 'const render = () => html`<div></div>`;';
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(1);
	});

	test('template literal in class method', () => {
		const code = `class MyElement {
  render() {
    return html\`<div></div>\`;
  }
}`;
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(1);
	});

	test('nested tagged template literal', () => {
		const code = 'const t = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`;';
		const results = findTemplateLiterals(code);
		// Both outer and inner html`` should be found
		expect(results.length).toBeGreaterThanOrEqual(2);
	});

	test('TypeScript source with generics', () => {
		const code = 'const t: TemplateResult<1> = html`<div></div>`;';
		const results = findTemplateLiterals(code);
		expect(results).toHaveLength(1);
		expect(results[0].htmlContent).toBe('<div></div>');
	});
});
