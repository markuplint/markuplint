import React from 'react';
import styled from 'styled-components';
import MonacoEditor, { EditorDidMount } from 'react-monaco-editor';

const Style = styled.div`
	width: 100%;
	height: 500px;
	margin: 0 0 2em;
`;

async function lint(code: string) {
	console.log('do lint');
	return [];
}

type EditorDidMountParams = Parameters<EditorDidMount>;
type IStandaloneCodeEditor = EditorDidMountParams[0];
type Monaco = EditorDidMountParams[1];

class Editor extends React.Component {
	diagnoseId = 0;
	editor: IStandaloneCodeEditor | null = null;
	monaco: Monaco | null = null;

	onChange = () => {
		cancelAnimationFrame(this.diagnoseId);
		this.diagnoseId = requestAnimationFrame(async () => {
			if (this.editor && this.monaco) {
				const model = this.editor.getModel();
				if (!model) {
					return;
				}

				const code = model.getValue();
				const diagnotics = await lint(code);
				this.monaco.editor.setModelMarkers(model, 'markuplint', diagnotics);
			}
		});
	};

	editorDidMount: EditorDidMount = (editor, monaco) => {
		this.editor = editor;
		this.monaco = monaco;
		editor.focus();

		// editor.onDidBlurEditor(onChange);
		editor.onDidBlurEditorText(this.onChange);
		editor.onKeyUp(this.onChange);
		// editor.onDidPaste(onChange);
	};

	render() {
		return (
			<Style>
				<MonacoEditor
					width="100%"
					height="100%"
					language="html"
					theme="vs-dark"
					value={`<!doctype html>
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
`}
					options={{
						selectOnLineNumbers: true,
					}}
					// onChange={::this.onChange}
					editorDidMount={this.editorDidMount}
				/>
			</Style>
		);
	}
}

export default Editor;
