import { diagnose, init } from './diagnose';
// @ts-ignore
import monacoEditor from './monaco-editor';

const el = document.getElementById('playground');
monacoEditor(el, init, diagnose);
