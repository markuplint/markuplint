import { describe, test, expect } from 'vitest';

import { PretenderDirector } from './pretender-director.js';

describe('PretenderDirector', () => {
	test('add without importPath uses identifier as key (backward compat)', () => {
		const director = new PretenderDirector();
		director.add('Button', 'button', 'components/Button.tsx', 2, 6);
		director.add('Card', 'div', 'components/Card.tsx', 3, 0);
		const result = director.getPretenders();
		expect(result).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
				filePath: 'components/Button.tsx:2:6',
			},
			{
				selector: 'Card',
				as: 'div',
				filePath: 'components/Card.tsx:3:0',
			},
		]);
	});

	test('duplicate identifier without importPath is ignored (first wins)', () => {
		const director = new PretenderDirector();
		director.add('Button', 'button', 'a.tsx', 1, 0);
		director.add('Button', 'div', 'b.tsx', 2, 0);
		const result = director.getPretenders();
		expect(result).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
				filePath: 'a.tsx:1:0',
			},
		]);
	});

	test('add with importPath allows same-name components from different files', () => {
		const director = new PretenderDirector();
		director.add('Button', 'button', 'A/Button.vue', 1, 0, './A/Button');
		director.add('Button', 'div', 'B/Button.vue', 1, 0, './B/Button');
		const result = director.getPretenders();
		expect(result).toHaveLength(2);
		expect(result).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
				filePath: 'A/Button.vue:1:0',
			},
			{
				selector: 'Button',
				as: 'div',
				filePath: 'B/Button.vue:1:0',
			},
		]);
	});

	test('duplicate importPath is ignored (first wins)', () => {
		const director = new PretenderDirector();
		director.add('Button', 'button', 'a.tsx', 1, 0, './components/Button');
		director.add('Button', 'div', 'b.tsx', 2, 0, './components/Button');
		const result = director.getPretenders();
		expect(result).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
				filePath: 'a.tsx:1:0',
			},
		]);
	});

	test('chain resolution through nameIndex with import paths', () => {
		const director = new PretenderDirector();
		director.add('Button', 'button', 'lib/Button.vue', 1, 0, './lib/Button');
		director.add('MyButton', 'Button', 'app/MyButton.vue', 1, 0, './app/MyButton');
		const result = director.getPretenders();
		expect(result).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
				filePath: 'lib/Button.vue:1:0',
			},
			{
				selector: 'MyButton',
				as: 'button',
				filePath: 'lib/Button.vue:1:0',
				_via: ['Button'],
			},
		]);
	});

	test('nameIndex resolves to first-registered component (first wins)', () => {
		const director = new PretenderDirector();
		// First Button registered → nameIndex maps 'Button' → './A/Button'
		director.add('Button', 'button', 'A/Button.vue', 1, 0, './A/Button');
		// Second Button registered → nameIndex still maps 'Button' → './A/Button'
		director.add('Button', 'div', 'B/Button.vue', 1, 0, './B/Button');
		// MyButton wraps 'Button' → resolves through nameIndex to ./A/Button → 'button'
		director.add('MyButton', 'Button', 'MyButton.vue', 1, 0, './MyButton');
		const result = director.getPretenders();
		const myButton = result.find(p => p.selector === 'MyButton');
		expect(myButton).toStrictEqual({
			selector: 'MyButton',
			as: 'button',
			filePath: 'A/Button.vue:1:0',
			_via: ['Button'],
		});
	});

	test('cycle detection with import paths', () => {
		const director = new PretenderDirector();
		director.add('A', 'B', 'a.vue', 1, 0, './a');
		director.add('B', 'A', 'b.vue', 1, 0, './b');
		const result = director.getPretenders();
		// identity is updated before cycle check, so 'as' reflects the cyclic entry's identity
		expect(result).toStrictEqual([
			{
				selector: 'A',
				as: 'B',
				filePath: 'a.vue:1:0',
				_via: ['B', '...[Recursive]'],
			},
			{
				selector: 'B',
				as: 'A',
				filePath: 'b.vue:1:0',
				_via: ['A', '...[Recursive]'],
			},
		]);
	});

	test('mixed: some components with importPath, some without', () => {
		const director = new PretenderDirector();
		// JSX scanner style (no importPath)
		director.add('Card', 'div', 'Card.tsx', 5, 0);
		// Vue scanner style (with importPath)
		director.add('Button', 'button', 'Button.vue', 1, 0, './Button');
		// Chain from Card to Button (cross-scanner resolution)
		director.add('CardButton', 'Button', 'CardButton.tsx', 1, 0);
		const result = director.getPretenders();
		expect(result).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
				filePath: 'Button.vue:1:0',
			},
			{
				selector: 'Card',
				as: 'div',
				filePath: 'Card.tsx:5:0',
			},
			{
				selector: 'CardButton',
				as: 'button',
				filePath: 'Button.vue:1:0',
				_via: ['Button'],
			},
		]);
	});
});
