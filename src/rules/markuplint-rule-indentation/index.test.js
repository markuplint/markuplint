import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-indentation';

// const rule = new CustomRule();

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 		<div>
// 			lorem
// 			<p>ipsam</p>
// 		</div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 'tab'],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, []);
// });

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
//     <div>
//         lorem
//         <p>ipsam</p>
//     </div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 'tab'],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required tabs.',
// 			line: 2,
// 			col: 1,
// 			raw: `
//     <div>`,
// 			ruleId: 'indentation',
// 		},
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required tabs.',
// 			line: 4,
// 			col: 1,
// 			raw: `
//         lorem
//         <p>`,
// 			ruleId: 'indentation',
// 		},
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required tabs.',
// 			line: 5,
// 			col: 1,
// 			raw: `
//     </div>`,
// 			ruleId: 'indentation',
// 		},
// 	]);
// });

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
//     <div>
//         lorem
//         <p>ipsam</p>
//     </div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 4],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, []);
// });

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
//     <div>
//         lorem
//         <p>ipsam</p>
//     </div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 2],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, []);
// });

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 	<div>
// 		lorem
// 		<p>ipsam</p>
// 	</div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 4],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required spaces.',
// 			line: 2,
// 			col: 1,
// 			raw: `
// 	<div>`,
// 			ruleId: 'indentation',
// 		},
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required spaces.',
// 			line: 4,
// 			col: 1,
// 			raw: `
// 		lorem
// 		<p>`,
// 			ruleId: 'indentation',
// 		},
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required spaces.',
// 			line: 5,
// 			col: 1,
// 			raw: `
// 	</div>`,
// 			ruleId: 'indentation',
// 		},
// 	]);
// });

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
//    <div>
//       lorem
//       <p>ipsam</p>
//    </div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 2],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required 2 width spaces.',
// 			line: 2,
// 			col: 1,
// 			raw: `
//    <div>`,
// 			ruleId: 'indentation',
// 		},
// 		{
// 			level: 'error',
// 			message: 'Expected spaces. Indentaion is required 2 width spaces.',
// 			line: 5,
// 			col: 1,
// 			raw: `
//    </div>`,
// 			ruleId: 'indentation',
// 		},
// 	]);
// });

// test('tab', async (t) => {
// 	const r = await markuplint.verify(
// 		`
//    <div>
//       lorem
//       <p>ipsam</p>
//    </div>
// 		`,
// 		{
// 			rules: {
// 				indentation: ['error', 3],
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, []);
// });

test('noop', (t) => t.pass());
