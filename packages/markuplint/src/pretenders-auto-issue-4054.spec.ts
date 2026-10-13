import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest, mlTestFile } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Issue #4054: `pretenders.auto` reported errors for valid TSX components.
 * These are the four reported components, used the way the issue's
 * reproduction uses them.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: {
		'permitted-contents': true,
		'no-invalid-attr-value': true,
		'label-no-multiple-controls': true,
		'no-restricted-attr': {
			options: { restrictedAttrs: [{ name: 'tabindex', value: { not: ['-1', '0'] } }] },
		},
	},
};

const components = {
	'Button.tsx': `
export function Button({ type }) {
	return (
		<button aria-label="Save" type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}>
			Save
		</button>
	);
}`,
	'Tab.tsx': `
export function Tab({ selected }) {
	return (
		<button type="button" role="tab" aria-label="Example" tabIndex={selected ? 0 : -1}>
			Example
		</button>
	);
}`,
	'Chip.tsx': `
export function Chip({ interactive, label }) {
	if (interactive) {
		return <button type="button" aria-label="Notifications">{label}</button>;
	}
	return <span>{label}</span>;
}`,
	'Picture.tsx': `
export function Picture() {
	return (
		<picture>
			<img src="a.gif" alt="Example" />
		</picture>
	);
}`,
	'Details.tsx': `
export function Details({ children }) {
	return <details>{children}</details>;
}`,
	'PictureSlot.tsx': `
export function PictureSlot({ children }) {
	return (
		<picture>
			{children}
			<img src="a.gif" alt="Example" />
		</picture>
	);
}`,
	'Card.tsx': `
export function Card({ children }) {
	return (
		<div>
			<h2>Title</h2>
			<p>{children}</p>
		</div>
	);
}`,
};

describe('pretenders.auto: issue #4054', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4054-'));
		for (const [name, code] of Object.entries(components)) {
			await writeFile(path.join(tmpDir, name), code);
		}
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(body: string) {
		const imports = Object.keys(components)
			.map(name => name.replace('.tsx', ''))
			.map(name => `import { ${name} } from './${name}';`)
			.join('\n');
		const file = path.join(tmpDir, 'usage.tsx');
		await writeFile(file, `${imports}\nexport function Example() {\n\treturn (\n${body}\n\t);\n}\n`);
		const { violations } = await mlTestFile(file, config);
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test('the reported usage has no violation', async () => {
		const violations = await lint(`
<div>
	<Button />
	<label>
		<input type="checkbox" aria-label="Notifications" />
		<Chip interactive={false} label="Notifications" />
	</label>
	<Picture />
	<div role="tablist" aria-label="Examples">
		<Tab selected={true} />
	</div>
</div>`);
		expect(violations).toStrictEqual([]);
	});

	test('a component that renders a required child needs no child at the usage site', async () => {
		expect(await lint('<PictureSlot><source srcSet="a.webp" /></PictureSlot>')).toStrictEqual([]);
	});

	test('a required child that only the usage site can provide is still reported', async () => {
		expect(await lint('<Details></Details>')).toStrictEqual(['permitted-contents: <Details>']);
	});

	test('children are checked against the element that wraps them', async () => {
		expect(await lint('<Card><span>text</span></Card>')).toStrictEqual([]);
		expect(await lint('<Card><div>text</div></Card>')).toStrictEqual(['permitted-contents: <div>']);
	});

	test('the resolved element is still used by the parent', async () => {
		expect(await lint('<ul><Button /></ul>')).toStrictEqual(['permitted-contents: <Button />']);
	});
});

describe('pretenders.scan (template scanner): issue #4054', () => {
	const templateFixtures = path.resolve(
		import.meta.dirname,
		'..',
		'..',
		'@markuplint',
		'pretenders',
		'test',
		'fixtures',
		'template',
	);

	async function lint(source: string, file: string) {
		const { violations } = await mlTest(source, {
			pretenders: { scan: [{ files: path.join(templateFixtures, file) }] },
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test('a Vue component that renders its required child needs none at the usage site', async () => {
		expect(await lint('<StaticPicture></StaticPicture>', 'StaticPicture.vue')).toStrictEqual([]);
	});

	test('children of a Vue component are checked against the element that wraps its slot', async () => {
		expect(await lint('<NestedSlot><span>text</span></NestedSlot>', 'NestedSlot.vue')).toStrictEqual([]);
		expect(await lint('<NestedSlot><div>text</div></NestedSlot>', 'NestedSlot.vue')).toStrictEqual([
			'permitted-contents: <div>',
		]);
	});
});
