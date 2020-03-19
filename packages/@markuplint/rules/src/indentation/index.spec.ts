import * as markuplint from 'markuplint';
import rule from './';

describe('verify', () => {
	test('tab', async () => {
		const r = await markuplint.verify(
			`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 2,
				col: 1,
				raw: '    ',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 3,
				col: 1,
				raw: '        ',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 4,
				col: 1,
				raw: '        ',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 5,
				col: 1,
				raw: '    ',
				ruleId: 'indentation',
			},
		]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
    <div>

        lorem

    </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 2,
				col: 1,
				raw: '    ',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 4,
				col: 1,
				raw: '        ',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 6,
				col: 1,
				raw: '    ',
				ruleId: 'indentation',
			},
		]);
	});

	test('tab', async () => {
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
		expect(r).toStrictEqual([]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
    <div>
      lorem
      <p>ipsam</p>
    </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 2,
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 4,
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 2,
				col: 1,
				raw: '	',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 3,
				col: 1,
				raw: '		',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 4,
				col: 1,
				raw: '		',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 5,
				col: 1,
				raw: '	',
				ruleId: 'indentation',
			},
		]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 2,
						option: {
							'indent-nested-nodes': false,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be 2 width spaces',
				line: 2,
				col: 1,
				raw: '   ',
				ruleId: 'indentation',
			},
			{
				severity: 'error',
				message: 'Indentation must be 2 width spaces',
				line: 5,
				col: 1,
				raw: '   ',
				ruleId: 'indentation',
			},
		]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 3,
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('tab', async () => {
		const r = await markuplint.verify(
			`
   <div>
      lorem
          <p>ipsam</p>
   </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 3,
						option: {
							'indent-nested-nodes': false,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 4,
				col: 1,
				message: 'Indentation should be 3 width spaces',
				raw: '          ',
				ruleId: 'indentation',
			},
		]);
	});

	test('rawText', async () => {
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
		expect(r).toStrictEqual([]);
	});

	test('options - align: false', async () => {
		const r = await markuplint.verify(
			`
	<div>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							alignment: false,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('options - align: true', async () => {
		const r = await markuplint.verify(
			`
	<div>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							alignment: true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Start tag and end tag indentation should align',
				raw: '\t\t',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - align: true', async () => {
		const r = await markuplint.verify(
			`
	<div>
</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							alignment: true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Start tag and end tag indentation should align',
				raw: '',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - align: true', async () => {
		const r = await markuplint.verify(
			`
	<div>	</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							alignment: true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('options - align: true', async () => {
		const r = await markuplint.verify(
			`
	<div> </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							alignment: true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('options - align: true', async () => {
		const r = await markuplint.verify(
			`
		<div> text </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							alignment: true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const r = await markuplint.verify(
			`
		<div>
		<img>
			</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							'indent-nested-nodes': true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Should increase indentation',
				raw: '\t\t',
				ruleId: 'indentation',
			},
			{
				severity: 'warning',
				line: 4,
				col: 1,
				message: 'Start tag and end tag indentation should align',
				raw: '\t\t\t',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const r = await markuplint.verify(
			`
		<div>
	<img>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							'indent-nested-nodes': true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Should increase indentation',
				raw: '\t',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const r = await markuplint.verify(
			`
		<div>
					<!-- comment -->
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'warning',
						value: 'tab',
						option: {
							'indent-nested-nodes': true,
						},
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Should decrease indentation',
				raw: '\t\t\t\t\t',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
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
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: 'Should increase indentation',
				raw: '',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
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
							indentation: {
								severity: 'warning',
								value: 'tab',
								option: {
									'indent-nested-nodes': false,
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('options - indent-nested-nodes: true', async () => {
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
							indentation: {
								severity: 'warning',
								value: 'tab',
								option: {
									'indent-nested-nodes': false,
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('options - indent-nested-nodes: true', async () => {
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
							indentation: {
								severity: 'warning',
								value: 'tab',
								option: {
									'indent-nested-nodes': 'never',
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: 'Should decrease indentation',
				raw: '\t',
				ruleId: 'indentation',
			},
			{
				severity: 'warning',
				line: 5,
				col: 1,
				message: 'Should decrease indentation',
				raw: '\t',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
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
							indentation: {
								severity: 'warning',
								value: 'tab',
								option: {
									'indent-nested-nodes': 'never',
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: 'Should increase indentation',
				raw: '',
				ruleId: 'indentation',
			},
			{
				severity: 'warning',
				line: 5,
				col: 1,
				message: 'Should increase indentation',
				raw: '',
				ruleId: 'indentation',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
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
							indentation: {
								severity: 'warning',
								value: 'tab',
								option: {
									'indent-nested-nodes': 'never',
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('no indent', async () => {
		const r = await markuplint.verify(
			`
		<div>
			<p> ipsam </p>
			<p> ipsam
			lorem </p>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('end tag', async () => {
		const r = await markuplint.verify(
			`
		<div>
		<div no-rule>
			<span></span>
</div>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
				nodeRules: [
					{
						selector: '[no-rule]',
						rules: {
							indentation: false,
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('childNodeRules', async () => {
		const r = await markuplint.verify(
			`
		<div>
			<div no-rule>
			<span>
			<span>
					  </span>
	</span>
			</div>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
				childNodeRules: [
					{
						selector: '[no-rule]',
						inheritance: true,
						rules: {
							indentation: false,
						},
					},
				],
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});
});

describe('fix', () => {
	test('tab', async () => {
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
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(fixed).toBe(fixture);
	});

	test('tab', async () => {
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
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(fixed).toBe(
			`
	<div>
		lorem
		<p>ipsam</p>
	</div>
	`,
		);
	});

	test('tab', async () => {
		const fixed = await markuplint.fix(
			`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 4,
					},
				},
			},
			[rule],
			'en',
		);
		expect(fixed).toBe(
			`
        <div>
            lorem
            <p>ipsam</p>
        </div>
		`,
		);
	});

	test('tab', async () => {
		const fixed = await markuplint.fix(
			`
  <div>
    lorem
    <p>ipsam</p>
  </div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
					},
				},
			},
			[rule],
			'en',
		);
		expect(fixed).toBe(
			`
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`,
		);
	});

	test('tab', async () => {
		const fixed = await markuplint.fix(
			`
  <div>
    lorem
<p>ipsam</p>
</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 3,
					},
				},
			},
			[rule],
			'en',
		);
		expect(fixed).toBe(
			`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
		);
	});

	test('tab', async () => {
		const fixed = await markuplint.fix(
			`
  <div>
    lorem
			<p>ipsam</p>
</div>
		`,
			{
				rules: {
					indentation: {
						severity: 'error',
						value: 'tab',
						option: { 'indent-nested-nodes': 'never' },
					},
				},
			},
			[rule],
			'en',
		);
		expect(fixed).toBe(
			`
	<div>
	lorem
	<p>ipsam</p>
	</div>
		`,
		);
	});
});
