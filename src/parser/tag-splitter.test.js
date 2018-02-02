import test from 'ava';
import tagSplitter from '../../lib/parser/tag-splitter';

test((t) => {
	const s = tagSplitter('<a>b</c> d<e>  f   \n\ng<?h       \n>i\nj', 1, 1);
	t.deepEqual(
		s.map((s) => `${s.type}(${s.line}:${s.col}) => "${s.raw}"`),
		[
			'starttag(1:1) => "<a>"',
			'text(1:4) => "b"',
			'endtag(1:5) => "</c>"',
			'text(1:9) => " d"',
			'starttag(1:11) => "<e>"',
			'text(1:14) => "  f   \n\ng"',
			'boguscomment(3:2) => "<?h       \n>"',
			'text(4:2) => "i\nj"',
		]
	);
});

test((t) => {
	const s = tagSplitter('<div id="a"> > < & " \' &amp;</div>', 1, 1);
	t.deepEqual(
		s.map((s) => `${s.type}(${s.line}:${s.col}) => "${s.raw}"`),
		[
			'starttag(1:1) => "<div id="a">"',
			'text(1:13) => " > "',
			'text(1:16) => "< & " \' &amp;</div>"',
		]
	);
});

test((t) => {
	// const s =
	tagSplitter(`
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="ie=edge">
		<title>Document</title>
	</head>
	<body>
		<script>
			const i = 0;
		</script>
		<!comment-node>
		<!-- html-comment -->
		<div>
			text&amp;div
		</div>
	text-node
	</body>
	</html>
	`, 1, 1);
	// console.log(s.map((s) => `${s.type}(${s.line}:${s.col}) => ${s.raw}`));
	t.pass();
});
