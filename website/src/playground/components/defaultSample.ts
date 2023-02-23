export const defaultCode = /* html */ `<!doctype html>
<html
  LANG="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv = "X-UA-Compatible" content="ie=edge">
	<title>Document</title>
	<script src="/path/to/js/lib/jquery.min.js"></script>
	<script src="/path/to/js/main.js" async></script>
</head>
<body>
	<DIV
		class = "a-b-c">
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
`;

export const defaultConfig = '{ "rules": { "wai-aria": true } }';
