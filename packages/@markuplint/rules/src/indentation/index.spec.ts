import { mlRuleTest } from 'markuplint';

import rule from './';

describe('verify', () => {
	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 2,
				col: 1,
				raw: '    ',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 3,
				col: 1,
				raw: '        ',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 4,
				col: 1,
				raw: '        ',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 5,
				col: 1,
				raw: '    ',
			},
		]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
    <div>

        lorem

    </div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 2,
				col: 1,
				raw: '    ',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 4,
				col: 1,
				raw: '        ',
			},
			{
				severity: 'error',
				message: 'Indentation must be tab',
				line: 6,
				col: 1,
				raw: '    ',
			},
		]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
			{ rule: 4 },
		);
		expect(violations).toStrictEqual([]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
    <div>
      lorem
      <p>ipsam</p>
    </div>
		`,
			{
				rule: {
					severity: 'error',
					value: 2,
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 4,
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 2,
				col: 1,
				raw: '	',
			},
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 3,
				col: 1,
				raw: '		',
			},
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 4,
				col: 1,
				raw: '		',
			},
			{
				severity: 'error',
				message: 'Indentation must be space',
				line: 5,
				col: 1,
				raw: '	',
			},
		]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
			{
				rule: {
					severity: 'error',
					value: 2,
					option: {
						'indent-nested-nodes': false,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Indentation must be 2 width spaces',
				line: 2,
				col: 1,
				raw: '   ',
			},
			{
				severity: 'error',
				message: 'Indentation must be 2 width spaces',
				line: 5,
				col: 1,
				raw: '   ',
			},
		]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
			{
				rule: {
					severity: 'error',
					value: 3,
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('tab', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
   <div>
      lorem
          <p>ipsam</p>
   </div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 3,
					option: {
						'indent-nested-nodes': false,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 4,
				col: 1,
				message: 'Indentation should be 3 width spaces',
				raw: '          ',
			},
		]);
	});

	test('rawText', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<script>
    var text = 'lorem';
	</script>
		`,
			{ rule: 'tab' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - align: false', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<div>
		</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						alignment: false,
					},
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - align: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<div>
		</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						alignment: true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Start tag and end tag indentation should align',
				raw: '\t\t',
			},
		]);
	});

	test('options - align: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<div>
</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						alignment: true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Start tag and end tag indentation should align',
				raw: '',
			},
		]);
	});

	test('options - align: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<div>	</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						alignment: true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - align: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
	<div> </div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						alignment: true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - align: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div> text </div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						alignment: true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div>
		<img>
			</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						'indent-nested-nodes': true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Should increase indentation',
				raw: '\t\t',
			},
			{
				severity: 'warning',
				line: 4,
				col: 1,
				message: 'Start tag and end tag indentation should align',
				raw: '\t\t\t',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div>
	<img>
		</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						'indent-nested-nodes': true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Should increase indentation',
				raw: '\t',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div>
					<!-- comment -->
		</div>
		`,
			{
				rule: {
					severity: 'warning',
					value: 'tab',
					option: {
						'indent-nested-nodes': true,
					},
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 1,
				message: 'Should decrease indentation',
				raw: '\t\t\t\t\t',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<html>
<body></body>
</html>`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: 'Should increase indentation',
				raw: '',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<html>
<body>
	<div>text
	</div>
</body>
</html>`,
			{
				rule: 'tab',
				nodeRule: [
					{
						tagName: 'body',
						rule: {
							severity: 'warning',
							value: 'tab',
							option: {
								'indent-nested-nodes': false,
							},
						},
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<html>
	<body>
		<div>text
		</div>
	</body>
</html>`,
			{
				rule: 'tab',
				nodeRule: [
					{
						tagName: 'body',
						rule: {
							severity: 'warning',
							value: 'tab',
							option: {
								'indent-nested-nodes': false,
							},
						},
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<html>
	<body>
		<div>text
		</div>
	</body>
</html>`,
			{
				rule: 'tab',
				nodeRule: [
					{
						tagName: 'body',
						rule: {
							severity: 'warning',
							value: 'tab',
							option: {
								'indent-nested-nodes': 'never',
							},
						},
					},
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: 'Should decrease indentation',
				raw: '\t',
			},
			{
				severity: 'warning',
				line: 5,
				col: 1,
				message: 'Should decrease indentation',
				raw: '\t',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`\t<html>
<body>
	<div>text
	</div>
</body>
	</html>`,
			{
				rule: 'tab',
				nodeRule: [
					{
						tagName: 'body',
						rule: {
							severity: 'warning',
							value: 'tab',
							option: {
								'indent-nested-nodes': 'never',
							},
						},
					},
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: 'Should increase indentation',
				raw: '',
			},
			{
				severity: 'warning',
				line: 5,
				col: 1,
				message: 'Should increase indentation',
				raw: '',
			},
		]);
	});

	test('options - indent-nested-nodes: true', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`\t<html>
	<body>
		<div>text
		</div>
	</body>
	</html>`,
			{
				rule: 'tab',
				nodeRule: [
					{
						tagName: 'body',
						rule: {
							severity: 'warning',
							value: 'tab',
							option: {
								'indent-nested-nodes': 'never',
							},
						},
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('no indent', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div>
			<p> ipsam </p>
			<p> ipsam
			lorem </p>
		</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('end tag', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div>
		<div no-rule>
			<span></span>
</div>
		</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
				nodeRule: [
					{
						selector: '[no-rule]',
						rule: false,
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('childNodeRules', async () => {
		const { violations } = await mlRuleTest(
			rule,
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
				rule: {
					severity: 'error',
					value: 'tab',
				},
				childNodeRule: [
					{
						selector: '[no-rule]',
						inheritance: true,
						rule: false,
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
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
		const { fixedCode } = await mlRuleTest(
			rule,
			fixture,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
			true,
		);
		expect(fixedCode).toBe(fixture);
	});

	test('tab', async () => {
		const fixture = `
    <div>
    lorem
        <p>ipsam</p>
    </div>
	`;
		const { fixedCode } = await mlRuleTest(
			rule,
			fixture,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			`
	<div>
		lorem
		<p>ipsam</p>
	</div>
	`,
		);
	});

	test('tab', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 4,
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			`
        <div>
            lorem
            <p>ipsam</p>
        </div>
		`,
		);
	});

	test('tab', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
  <div>
    lorem
    <p>ipsam</p>
  </div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			`
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`,
		);
	});

	test('tab', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
  <div>
    lorem
<p>ipsam</p>
</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 3,
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
		);
	});

	test('tab', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
  <div>
    lorem
			<p>ipsam</p>
</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'tab',
					option: { 'indent-nested-nodes': 'never' },
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			`
	<div>
	lorem
	<p>ipsam</p>
	</div>
		`,
		);
	});
});
