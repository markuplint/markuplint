import './App.css';
import type { CodeEditorRef } from './components/CodeEditor';
import type { ConfigEditorRef } from './components/ConfigEditor';
import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { DepsEditorRef } from './components/DepsEditor';
import type { Violations } from './modules/violations';

import ansiRegex from 'ansi-regex';
import { useEffect, useRef, useState } from 'react';

import { CodeEditor } from './components/CodeEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { DepsEditor } from './components/DepsEditor';
import { ExampleSelector } from './components/ExampleSelector';
import { ProblemsOutput } from './components/ProblemsOutput';
import { examples } from './modules/examples';
import { loadValues, saveValues } from './modules/save-values';
import { setupContainerServer } from './server';

let boot = false;
let containerServer: Awaited<ReturnType<typeof setupContainerServer>>;

function App() {
	const configEditorRef = useRef<ConfigEditorRef>(null);
	const consoleRef = useRef<ConsoleOutputRef>(null);
	const codeEditorRef = useRef<CodeEditorRef>(null);
	const depsEditorRef = useRef<DepsEditorRef>(null);
	const [violations, setViolations] = useState<Violations>([]);
	const [serverReady, setServerReady] = useState(false);
	const [installedPackages, setInstalledPackages] = useState<Record<string, string>>({});
	const [depsStatus, setDepsStatus] = useState<'success' | 'error' | 'loading'>('success');

	useEffect(() => {
		if (!boot) {
			boot = true;
			void (async () => {
				containerServer = await setupContainerServer(consoleRef.current!);
				setServerReady(true);

				const defaultCategory = examples[Object.keys(examples).sort()[0]].examples;
				const defaultExample = defaultCategory[Object.keys(defaultCategory).sort()[0]];
				const initialValues = loadValues() ?? defaultExample;
				const { deps, configFilename, config, codeFilename, code } = initialValues;
				deps && depsEditorRef.current?.setValue(deps);
				configFilename && configEditorRef.current?.setFilename(configFilename);
				config && configEditorRef.current?.setValue(config);
				codeFilename && codeEditorRef.current?.setFilename(codeFilename);
				code && codeEditorRef.current?.setValue(code);
			})();
		}
	}, []);

	const lintCode = async () => {
		const data = await containerServer.lint(
			codeEditorRef.current?.getFilename() ?? 'code.html',
			codeEditorRef.current?.getValue() ?? '',
		);
		const newViolations: Violations = JSON.parse(data.replaceAll(ansiRegex(), ''));
		setViolations(newViolations);
	};

	const saveCurrentValues = () => {
		saveValues({
			deps: depsEditorRef.current?.getValue() ?? '',
			configFilename: configEditorRef.current?.getFilename() ?? '',
			config: configEditorRef.current?.getValue() ?? '',
			codeFilename: codeEditorRef.current?.getFilename() ?? '',
			code: codeEditorRef.current?.getValue() ?? '',
		});
	};

	return (
		<>
			<div className="container">
				<h2>Console</h2>
				<ConsoleOutput ref={consoleRef} />
				<h2>Problems</h2>
				<ProblemsOutput violations={violations} />
				<ExampleSelector
					disabled={!serverReady}
					onSelect={example => {
						depsEditorRef.current?.setValue(example.deps);
						configEditorRef.current?.setFilename(example.configFilename);
						configEditorRef.current?.setValue(example.config);
						codeEditorRef.current?.setFilename(example.codeFilename);
						codeEditorRef.current?.setValue(example.code);
					}}
				/>
				<h2>Code</h2>
				<CodeEditor
					ref={codeEditorRef}
					violations={violations}
					onChangeValue={() => {
						void lintCode();
						saveCurrentValues();
					}}
				/>
				<h2>Dependencies</h2>
				<DepsEditor
					ref={depsEditorRef}
					status={depsStatus}
					installedPackages={installedPackages}
					onChangeValue={value => {
						if (value) {
							void (async () => {
								setDepsStatus('loading');
								const installed = await containerServer.updateDeps(value);
								setInstalledPackages(installed);
								if ((await containerServer.installationExit) !== 0) {
									setDepsStatus('error');
								} else {
									setDepsStatus('success');
									void lintCode();
								}
							})();
						} else {
							setInstalledPackages({});
							setDepsStatus('error');
						}
					}}
				/>
				<h2>Config</h2>
				<ConfigEditor
					ref={configEditorRef}
					onChangeValue={code => {
						void (async () => {
							if (configEditorRef.current) {
								await containerServer.updateConfig(configEditorRef.current.getFilename(), code);
							}
							void lintCode();
						})();
					}}
				/>
			</div>
		</>
	);
}

export default App;
