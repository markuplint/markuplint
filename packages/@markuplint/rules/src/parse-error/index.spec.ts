import * as markuplint from 'markuplint';
import rule from './';

test('test', async () => {
	const r = await markuplint.verify(
		`
		<!doctype html>
		<html
		  LANG="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="X-UA-Compatible" content="ie=edge">
			<title>Document</title>
		</head>
		<body>
			<DIV class="a-b-c">
				<p>lorem</p>
			</DIV>

			<p id="dupl">
				<span id="dupl">duplicated</span>
			</p>

			<p>
				Illegal &("> <'')&
				<br />
				characters &amp;(&quot;&gt; &lt;'')&amp;
				<img src="path/to" alt='&("<")& &amp;(&quot;&gt; &lt;&quot;)&amp;'>
			</p>

			<p>ホ゜ケットモンスター</p>
			<font color="red">非推奨要素</font>

			<a href="path/to" role="button">link1</a>
			<a href="path/to" role="document">link2</a>
			<label role="button"><input type="text" ></label>
			<img src="path/to">
			<img src="path/to" />
					   invalid-indent

			<?template engine;
				$var = '<html attr="value">text</html>'
			?>

			<%template engine;
				$var = '<html attr="value">text</html>'
			%>

			</expected>
			<div>

			EOD
			</body>
		</html>
		`,
		{
			rules: {
				'parse-error': true,
			},
		},
		[rule],
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'パースできない不正なノードです。',
			line: 38,
			col: 36,
			raw: '</html>',
			ruleId: 'parse-error',
		},
		{
			severity: 'error',
			message: 'パースできない不正なノードです。',
			line: 42,
			col: 36,
			raw: '</html>',
			ruleId: 'parse-error',
		},
		{
			severity: 'error',
			message: 'パースできない不正なノードです。',
			line: 45,
			col: 4,
			raw: '</expected>',
			ruleId: 'parse-error',
		},
	]);
});

test('test', async () => {
	const r = await markuplint.verify(
		'<html>invalid-before-text<body>text</body>invalid-after-text</html>',
		{
			rules: {
				'parse-error': true,
			},
		},
		[rule],
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
			line: 1,
			col: 26,
			raw: '<body>',
			ruleId: 'parse-error',
		},
		{
			severity: 'error',
			message: 'パースできない不正なノードです。',
			line: 1,
			col: 36,
			raw: '</body>',
			ruleId: 'parse-error',
		},
	]);
});

test('test', async () => {
	const r = await markuplint.verify(
		'<noscript><hoge></noscript>',
		{
			rules: {
				'parse-error': true,
			},
		},
		[rule],
	);
	expect(r).toStrictEqual([]);
});
