import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-indentation';

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				indentation: ['error', 'tab'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
		{
			rules: {
				indentation: ['error', 'tab'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 2,
			col: 1,
			raw: '    ',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 3,
			col: 1,
			raw: '        ',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 4,
			col: 1,
			raw: '        ',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 5,
			col: 1,
			raw: '    ',
			ruleId: 'indentation',
		},
	]);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
    <div>

        lorem

    </div>
		`,
		{
			rules: {
				indentation: ['error', 'tab'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 2,
			col: 1,
			raw: '    ',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 4,
			col: 1,
			raw: '        ',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be tab',
			line: 6,
			col: 1,
			raw: '    ',
			ruleId: 'indentation',
		},
	]);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
		{
			rules: {
				indentation: 4,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
    <div>
      lorem
      <p>ipsam</p>
    </div>
		`,
		{
			rules: {
				indentation: ['error', 2],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`,
		{
			rules: {
				indentation: ['error', 4],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be space',
			line: 2,
			col: 1,
			raw: '	',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be space',
			line: 3,
			col: 1,
			raw: '		',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be space',
			line: 4,
			col: 1,
			raw: '		',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be space',
			line: 5,
			col: 1,
			raw: '	',
			ruleId: 'indentation',
		},
	]);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
		{
			rules: {
				indentation: ['error', 2, { 'indent-nested-nodes': false }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be 2 width spaces',
			line: 2,
			col: 1,
			raw: '   ',
			ruleId: 'indentation',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Indentation must be 2 width spaces',
			line: 5,
			col: 1,
			raw: '   ',
			ruleId: 'indentation',
		},
	]);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
		{
			rules: {
				indentation: ['error', 3],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('tab', async (t) => {
	const r = await markuplint.verify(
		`
   <div>
      lorem
          <p>ipsam</p>
   </div>
		`,
		{
			rules: {
				indentation: ['warning', 3, { 'indent-nested-nodes': false }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 4,
			col: 1,
			message: 'Indentation should be 3 width spaces',
			raw: '          ',
			ruleId: 'indentation',
		},
	]);
});

test('rawText', async (t) => {
	const r = await markuplint.verify(
		`
	<script>
    var text = 'lorem';
	</script>
		`,
		{
			rules: {
				indentation: 'tab',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - align: false', async (t) => {
	const r = await markuplint.verify(
		`
	<div>
		</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { alignment: false }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - align: true', async (t) => {
	const r = await markuplint.verify(
		`
	<div>
		</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { alignment: true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 3,
			col: 1,
			message: '終了タグと開始タグのインデント位置が揃っていません。',
			raw: '\t\t',
			ruleId: 'indentation',
		},
	]);
});

test('options - align: true', async (t) => {
	const r = await markuplint.verify(
		`
	<div>
</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { alignment: true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 3,
			col: 1,
			message: '終了タグと開始タグのインデント位置が揃っていません。',
			raw: '',
			ruleId: 'indentation',
		},
	]);
});

test('options - align: true', async (t) => {
	const r = await markuplint.verify(
		`
	<div>	</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { alignment: true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - align: true', async (t) => {
	const r = await markuplint.verify(
		`
	<div> </div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { alignment: true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - align: true', async (t) => {
	const r = await markuplint.verify(
		`
		<div> text </div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { alignment: true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`
		<div>
		<img>
			</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { 'indent-nested-nodes': true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 3,
			col: 1,
			message: 'インデントを下げてください',
			raw: '\t\t',
			ruleId: 'indentation',
		},
		{
			level: 'warning',
			severity: 'warning',
			line: 4,
			col: 1,
			message: '終了タグと開始タグのインデント位置が揃っていません。',
			raw: '\t\t\t',
			ruleId: 'indentation',
		},
	]);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`
		<div>
	<img>
		</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { 'indent-nested-nodes': true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 3,
			col: 1,
			message: 'インデントを下げてください',
			raw: '\t',
			ruleId: 'indentation',
		},
	]);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`
		<div>
					<!-- comment -->
		</div>
		`,
		{
			rules: {
				indentation: ['warning', 'tab', { 'indent-nested-nodes': true }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 3,
			col: 1,
			message: 'インデントを上げてください',
			raw: '\t\t\t\t\t',
			ruleId: 'indentation',
		},
	]);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`<html>
<body></body>
</html>`,
		{
			rules: {
				indentation: true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 2,
			col: 1,
			message: 'インデントを下げてください',
			raw: '',
			ruleId: 'indentation',
		},
	]);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`<html>
<body>
	<div>text
	</div>
</body>
</html>`,
		{
			rules: {
				indentation: 'tab',
			},
			nodeRules: [
				{
					tagName: 'body',
					rules: {
						indentation: ['warning', 'tab', { 'indent-nested-nodes': false }],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`<html>
	<body>
		<div>text
		</div>
	</body>
</html>`,
		{
			rules: {
				indentation: 'tab',
			},
			nodeRules: [
				{
					tagName: 'body',
					rules: {
						indentation: ['warning', 'tab', { 'indent-nested-nodes': false }],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`<html>
	<body>
		<div>text
		</div>
	</body>
</html>`,
		{
			rules: {
				indentation: 'tab',
			},
			nodeRules: [
				{
					tagName: 'body',
					rules: {
						indentation: ['warning', 'tab', { 'indent-nested-nodes': 'never' }],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 2,
			col: 1,
			message: 'インデントを上げてください',
			raw: '\t',
			ruleId: 'indentation',
		},
		{
			level: 'warning',
			severity: 'warning',
			line: 5,
			col: 1,
			message: 'インデントを上げてください',
			raw: '\t',
			ruleId: 'indentation',
		},
	]);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`\t<html>
<body>
	<div>text
	</div>
</body>
	</html>`,
		{
			rules: {
				indentation: 'tab',
			},
			nodeRules: [
				{
					tagName: 'body',
					rules: {
						indentation: ['warning', 'tab', { 'indent-nested-nodes': 'never' }],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			line: 2,
			col: 1,
			message: 'インデントを下げてください',
			raw: '',
			ruleId: 'indentation',
		},
		{
			level: 'warning',
			severity: 'warning',
			line: 5,
			col: 1,
			message: 'インデントを下げてください',
			raw: '',
			ruleId: 'indentation',
		},
	]);
});

test('options - indent-nested-nodes: true', async (t) => {
	const r = await markuplint.verify(
		`\t<html>
	<body>
		<div>text
		</div>
	</body>
	</html>`,
		{
			rules: {
				indentation: 'tab',
			},
			nodeRules: [
				{
					tagName: 'body',
					rules: {
						indentation: ['warning', 'tab', { 'indent-nested-nodes': 'never' }],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('tab', async (t) => {
	const fixture = `
	<div>
		lorem
		<p>ipsam</p>
	</div>
	`;
	const fixed = await markuplint.fix(
		fixture,
		{
			rules: {
				indentation: ['error', 'tab'],
			},
		},
		[rule],
		'en',
	);
	t.is(fixed, fixture);
});

test('tab', async (t) => {
	const fixture = `
    <div>
    lorem
        <p>ipsam</p>
    </div>
	`;
	const fixed = await markuplint.fix(
		fixture,
		{
			rules: {
				indentation: ['error', 'tab'],
			},
		},
		[rule],
		'en',
	);
	t.is(fixed, `
	<div>
		lorem
		<p>ipsam</p>
	</div>
	`);
});

test('tab', async (t) => {
	const fixed = await markuplint.fix(
		`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				indentation: ['error', 4],
			},
		},
		[rule],
		'en',
	);
	t.is(fixed, `
        <div>
            lorem
            <p>ipsam</p>
        </div>
		`);
});

test('tab', async (t) => {
	const fixed = await markuplint.fix(
		`
  <div>
    lorem
    <p>ipsam</p>
  </div>
		`,
		{
			rules: {
				indentation: ['error', 'tab'],
			},
		},
		[rule],
		'en',
	);
	t.is(fixed, `
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`);
});

test('tab', async (t) => {
	const fixed = await markuplint.fix(
		`
  <div>
    lorem
<p>ipsam</p>
</div>
		`,
		{
			rules: {
				indentation: ['error', 3],
			},
		},
		[rule],
		'en',
	);
	t.is(fixed, `
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`);
});

test('tab', async (t) => {
	const fixed = await markuplint.fix(
		`
  <div>
    lorem
			<p>ipsam</p>
</div>
		`,
		{
			rules: {
				indentation: ['error', 'tab', { 'indent-nested-nodes': 'never' }],
			},
		},
		[rule],
		'en',
	);
	t.is(fixed, `
	<div>
	lorem
	<p>ipsam</p>
	</div>
		`);
});

test('noop', (t) => t.pass());
