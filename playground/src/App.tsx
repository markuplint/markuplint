import type { CodeEditorRef } from './components/CodeEditor';
import type { ConfigEditorRef } from './components/ConfigEditor';
import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { DepsEditorRef } from './components/DepsEditor';
import type { FilenameEditorRef } from './components/FilenameEditor';
import type { Violations } from './modules/violations';

import { Tab } from '@headlessui/react';
import ansiRegex from 'ansi-regex';
import { useEffect, useRef, useState } from 'react';
import Split from 'react-split';

import logo from './assets/images/logo-horizontal.svg';
import { CodeEditor } from './components/CodeEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { DepsEditor } from './components/DepsEditor';
import { ExampleSelector } from './components/ExampleSelector';
import { FilenameEditor } from './components/FilenameEditor';
import { ProblemsOutput } from './components/ProblemsOutput';
import { examples } from './examples';
import { loadValues, saveValues } from './modules/save-values';
import { setupContainerServer } from './server';
// FIXME:
// @ts-ignore
import { extractJson } from './server/linter/extract-json.mjs';

let boot = false;
let containerServer: Awaited<ReturnType<typeof setupContainerServer>>;

function classNames(...classes: readonly string[]) {
	return classes.filter(Boolean).join(' ');
}

function App() {
	const configEditorRef = useRef<ConfigEditorRef>(null);
	const consoleRef = useRef<ConsoleOutputRef>(null);
	const codeEditorRef = useRef<CodeEditorRef>(null);
	const depsEditorRef = useRef<DepsEditorRef>(null);
	const filenameEditorRef = useRef<FilenameEditorRef>(null);
	const [violations, setViolations] = useState<Violations>([]);
	const [serverReady, setServerReady] = useState(false);
	const [installedPackages, setInstalledPackages] = useState<Record<string, string>>({});
	const [depsStatus, setDepsStatus] = useState<'success' | 'error' | 'loading'>('success');
	const OUTPUT_TAB_INDEX_PROBLEMS = 0;
	const OUTPUT_TAB_INDEX_CONSOLE = 1;
	const [selectedOutputTab, setSelectedOutputTab] = useState(OUTPUT_TAB_INDEX_CONSOLE);

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
				codeFilename && filenameEditorRef.current?.setFilename(codeFilename);
				code && codeEditorRef.current?.setValue(code);
			})();
		}
	}, []);

	const lintCode = async () => {
		const data = await containerServer.lint(
			filenameEditorRef.current?.getFilename() ?? 'code.html',
			codeEditorRef.current?.getValue() ?? '',
		);
		const maybeViolations = extractJson(data.replaceAll(ansiRegex(), ''));
		if (Array.isArray(maybeViolations)) {
			setViolations(maybeViolations);
		}
		setSelectedOutputTab(OUTPUT_TAB_INDEX_PROBLEMS);
	};

	const saveCurrentValues = () => {
		saveValues({
			deps: depsEditorRef.current?.getValue() ?? '',
			configFilename: configEditorRef.current?.getFilename() ?? '',
			config: configEditorRef.current?.getValue() ?? '',
			codeFilename: filenameEditorRef.current?.getFilename() ?? '',
			code: codeEditorRef.current?.getValue() ?? '',
		});
	};

	return (
		<>
			<header className="border-b border-b-slate-300 px-4 py-2">
				<h1 className="text-2xl leading-normal font-bold">
					<img
						src={logo}
						alt="Markuplint"
						width={968}
						height={181}
						decoding="async"
						className="w-auto h-[1.2em] mt-[-0.2em] inline-block"
					/>{' '}
					Playground
				</h1>
			</header>
			<main className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:grid-rows-[minmax(0,auto)]">
				<section className="overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
					<details>
						<summary className="bg-slate-100 text-xl font-bold px-8 py-3">Examples</summary>
						<ExampleSelector
							disabled={!serverReady}
							onSelect={example => {
								depsEditorRef.current?.setValue(example.deps);
								configEditorRef.current?.setFilename(example.configFilename);
								configEditorRef.current?.setValue(example.config);
								filenameEditorRef.current?.setFilename(example.codeFilename);
								codeEditorRef.current?.setValue(example.code);
							}}
						/>
					</details>
					<details open>
						<summary className="bg-slate-100 text-xl font-bold px-8 py-3">Settings</summary>
						<FilenameEditor
							ref={filenameEditorRef}
							onChangeFilename={() => {
								void lintCode();
								saveCurrentValues();
							}}
						/>
						<ConfigEditor
							ref={configEditorRef}
							onChangeValue={code => {
								void (async () => {
									if (configEditorRef.current) {
										setSelectedOutputTab(OUTPUT_TAB_INDEX_CONSOLE);
										await containerServer.updateConfig(configEditorRef.current.getFilename(), code);
									}
									void lintCode();
									saveCurrentValues();
								})();
							}}
							onChangeFilename={filename => {
								void (async () => {
									if (configEditorRef.current) {
										setSelectedOutputTab(OUTPUT_TAB_INDEX_CONSOLE);
										await containerServer.updateConfig(
											filename,
											configEditorRef.current.getValue(),
										);
									}
									void lintCode();
									saveCurrentValues();
								})();
							}}
						/>
						<DepsEditor
							ref={depsEditorRef}
							status={depsStatus}
							installedPackages={installedPackages}
							onChangeValue={value => {
								if (value) {
									void (async () => {
										setSelectedOutputTab(OUTPUT_TAB_INDEX_CONSOLE);
										setDepsStatus('loading');
										const installed = await containerServer.updateDeps(value);
										setInstalledPackages(installed);
										if ((await containerServer.installationExit) === 0) {
											setDepsStatus('success');
											void lintCode();
										} else {
											setDepsStatus('error');
										}
									})();
								} else {
									setInstalledPackages({});
									setDepsStatus('error');
								}
							}}
						/>
					</details>
				</section>
				<Split
					direction="vertical"
					gutter={() => {
						const gutterElement = document.createElement('div');
						gutterElement.className =
							'w-full h-[2px] box-content border-y-4 border-transparent bg-slate-300 cursor-row-resize hover:bg-ml-blue';
						return gutterElement;
					}}
					gutterStyle={() => ({})}
				>
					<section>
						<CodeEditor
							filename={filenameEditorRef.current?.getFilename() ?? 'code.html'}
							ref={codeEditorRef}
							violations={violations}
							onChangeValue={() => {
								void lintCode();
								saveCurrentValues();
							}}
						/>
					</section>
					<section className="grid grid-rows-[auto_minmax(0,1fr)]">
						<Tab.Group selectedIndex={selectedOutputTab} onChange={setSelectedOutputTab}>
							<Tab.List className="bg-slate-100 overflow-x-auto overflow-y-hidden flex gap-2 px-2">
								{['Problems', 'Console'].map(label => (
									<Tab
										key={label}
										className={({ selected }) =>
											classNames(
												'h-full px-[min(3%,1.5rem)] py-2 leading-tight border-b-2',
												selected ? 'border-blue-500' : 'hover:bg-white',
											)
										}
									>
										{label}
									</Tab>
								))}
							</Tab.List>
							<Tab.Panels className="grid grid-rows-[minmax(0,1fr)]">
								<Tab.Panel unmount={false}>
									<ProblemsOutput violations={violations} />
								</Tab.Panel>
								<Tab.Panel unmount={false}>
									<ConsoleOutput ref={consoleRef} />
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</section>
				</Split>
			</main>
		</>
	);
}

export default App;
