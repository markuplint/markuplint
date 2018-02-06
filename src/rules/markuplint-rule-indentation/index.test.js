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
				indentation: ['error', 2],
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
				indentation: 3,
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

test('noop', (t) => t.pass());
