import type { CodeEditorRef } from './components/CodeEditor';
import type { ConfigEditorRef } from './components/ConfigEditor';
import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { DepsEditorRef } from './components/DepsEditor';
import type { Violations } from './modules/violations';

import { Tab } from '@headlessui/react';
import ansiRegex from 'ansi-regex';
import { useEffect, useRef, useState } from 'react';

import logo from './assets/images/logo-horizontal.svg';
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

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(' ');
}

function App() {
	const configEditorRef = useRef<ConfigEditorRef>(null);
	const consoleRef = useRef<ConsoleOutputRef>(null);
	const codeEditorRef = useRef<CodeEditorRef>(null);
	const depsEditorRef = useRef<DepsEditorRef>(null);
	const [violations, setViolations] = useState<Violations>([]);
	const [serverReady, setServerReady] = useState(false);
	const [installedPackages, setInstalledPackages] = useState<Record<string, string>>({});
	const [depsStatus, setDepsStatus] = useState<'success' | 'error' | 'loading'>('success');
	const [selectedOutputTab, setSelectedOutputTab] = useState(0);

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
		setSelectedOutputTab(1);
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
			<header className="border-b border-b-slate-300 p-4">
				<h1 className="text-2xl leading-normal font-bold">
					<img src={logo} alt="Markuplint" className="h-[1.2em] mt-[-0.2em] inline-block" /> Playground
				</h1>
			</header>
			<div className="grid grid-cols-[max-content_minmax(0,1fr)] items-stretch">
				<section className="border-r border-r-slate-300 shadow">
					<h2 className="text-xl font-bold px-8 py-3 bg-slate-100">Examples</h2>
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
				</section>
				<div className="grid grid-rows-[1fr_33vb]">
					<section className="grid grid-rows-[auto_minmax(0,1fr)]">
						<Tab.Group>
							<Tab.List className="bg-slate-100 pt-2 overflow-hidden flex gap-2 px-2">
								<Tab
									className={({ selected }) =>
										classNames(
											'h-full px-6 py-2 text-lg leading-tight rounded-t-lg',
											selected ? 'bg-white shadow border-b-2 border-blue-500' : 'hover:bg-white',
										)
									}
								>
									Code
								</Tab>
								<Tab
									className={({ selected }) =>
										classNames(
											'h-full px-6 py-2 text-lg leading-tight rounded-t-lg',
											selected ? 'bg-white shadow border-b-2 border-blue-500' : 'hover:bg-white',
										)
									}
								>
									Config
								</Tab>
								<Tab
									className={({ selected }) =>
										classNames(
											'h-full px-6 py-2 text-lg leading-tight rounded-t-lg',
											selected ? 'bg-white shadow border-b-2 border-blue-500' : 'hover:bg-white',
										)
									}
								>
									Dependencies
								</Tab>
							</Tab.List>
							<Tab.Panels className="grid">
								<Tab.Panel unmount={false}>
									<CodeEditor
										ref={codeEditorRef}
										violations={violations}
										onChangeValue={() => {
											void lintCode();
											saveCurrentValues();
										}}
										onChangeFilename={() => {
											void lintCode();
											saveCurrentValues();
										}}
									/>
								</Tab.Panel>
								<Tab.Panel unmount={false}>
									<ConfigEditor
										ref={configEditorRef}
										onChangeValue={code => {
											void (async () => {
												if (configEditorRef.current) {
													setSelectedOutputTab(0);
													await containerServer.updateConfig(
														configEditorRef.current.getFilename(),
														code,
													);
												}
												void lintCode();
												saveCurrentValues();
											})();
										}}
										onChangeFilename={filename => {
											void (async () => {
												if (configEditorRef.current) {
													setSelectedOutputTab(0);
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
								</Tab.Panel>
								<Tab.Panel unmount={false}>
									<DepsEditor
										ref={depsEditorRef}
										status={depsStatus}
										installedPackages={installedPackages}
										onChangeValue={value => {
											if (value) {
												void (async () => {
													setSelectedOutputTab(0);
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
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</section>
					<section className="grid grid-rows-[auto_minmax(0,1fr)]">
						<Tab.Group selectedIndex={selectedOutputTab} onChange={setSelectedOutputTab}>
							<Tab.List className="bg-slate-100 pt-2 overflow-hidden flex gap-2 px-2">
								<Tab
									className={({ selected }) =>
										classNames(
											'h-full px-6 py-2 text-lg leading-tight rounded-t-lg',
											selected ? 'bg-white shadow border-b-2 border-blue-500' : 'hover:bg-white',
										)
									}
								>
									Console
								</Tab>
								<Tab
									className={({ selected }) =>
										classNames(
											'h-full px-6 py-2 text-lg leading-tight rounded-t-lg',
											selected ? 'bg-white shadow border-b-2 border-blue-500' : 'hover:bg-white',
										)
									}
								>
									Problems
								</Tab>
							</Tab.List>
							<Tab.Panels className="grid grid-rows-[minmax(0,1fr)]">
								<Tab.Panel unmount={false} className="overflow-y-auto">
									<ConsoleOutput ref={consoleRef} />
								</Tab.Panel>
								<Tab.Panel unmount={false} className="overflow-y-auto">
									<ProblemsOutput violations={violations} />
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</section>
				</div>
			</div>
		</>
	);
}

export default App;
