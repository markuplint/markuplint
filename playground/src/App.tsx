import type { CodeEditorRef } from './components/CodeEditor';
import type { ConfigEditorRef } from './components/ConfigEditor';
import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { DepsEditorRef } from './components/DepsEditor';
import type { Violations } from './modules/violations';

import { Tab, Dialog, Transition } from '@headlessui/react';
import ansiRegex from 'ansi-regex';
import { Fragment, useEffect, useRef, useState } from 'react';
import Split from 'react-split';

import logo from './assets/images/logo-horizontal.svg';
import { CodeEditor } from './components/CodeEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { DepsEditor } from './components/DepsEditor';
import { ExampleSelector } from './components/ExampleSelector';
import { ProblemsOutput } from './components/ProblemsOutput';
import { examples } from './examples';
import { loadValues, saveValues } from './modules/save-values';
import { setupContainerServer } from './server';
// FIXME:
// @ts-ignore
import { extractJson } from './server/linter/extract-json.mjs';

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
	const [isExamplesOpen, setIsExamplesOpen] = useState(false);

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
		const maybeViolations = extractJson(data.replaceAll(ansiRegex(), ''));
		if (Array.isArray(maybeViolations)) {
			setViolations(maybeViolations);
		}
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
			<header className="border-b border-b-slate-300 px-4 py-2">
				<h1 className="text-2xl leading-normal font-bold">
					<img src={logo} alt="Markuplint" className="h-[1.2em] mt-[-0.2em] inline-block" /> Playground
				</h1>
			</header>
			<div className="grid grid-cols-[minmax(0,auto)] grid-rows-[auto_minmax(0,1fr)] items-stretch relative">
				<div className="p-1">
					<button
						onClick={() => setIsExamplesOpen(true)}
						className="flex items-center text-lg p-2 leading-none font-bold"
					>
						<span className="icon-menu inline-block mr-2 p-1"></span>Examples
					</button>
					<Transition appear show={isExamplesOpen} as={Fragment}>
						<Dialog onClose={() => setIsExamplesOpen(false)} className="absolute inset-0">
							<Transition.Child
								as={Fragment}
								enter="ease-out duration-200"
								enterFrom="opacity-0"
								enterTo="opacity-100"
								leave="ease-in duration-200"
								leaveFrom="opacity-100"
								leaveTo="opacity-0"
							>
								<div className="absolute inset-0 bg-black bg-opacity-30"></div>
							</Transition.Child>
							<Transition.Child
								as={Fragment}
								enter="ease-out duration-200"
								enterFrom="opacity-0 -translate-x-full"
								enterTo="opacity-100 translate-0"
								leave="ease-in duration-200"
								leaveFrom="opacity-100 translate-0"
								leaveTo="opacity-0 -translate-x-full"
							>
								<Dialog.Panel className="border-r tra border-r-slate-300 overflow-y-auto bg-white absolute top-0 bottom-0 left-0">
									<div className="bg-slate-100 grid grid-cols-[1fr_auto]">
										<Dialog.Title className="text-xl font-bold px-8 py-3">Examples</Dialog.Title>
										<button
											onClick={() => setIsExamplesOpen(false)}
											aria-label="Close"
											className="p-4"
										>
											<span className="icon-close text-lg"></span>
										</button>
									</div>
									<ExampleSelector
										disabled={!serverReady}
										onSelect={example => {
											setIsExamplesOpen(false);
											depsEditorRef.current?.setValue(example.deps);
											configEditorRef.current?.setFilename(example.configFilename);
											configEditorRef.current?.setValue(example.config);
											codeEditorRef.current?.setFilename(example.codeFilename);
											codeEditorRef.current?.setValue(example.code);
										}}
									/>
								</Dialog.Panel>
							</Transition.Child>
						</Dialog>
					</Transition>
				</div>

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
					<section className="grid grid-rows-[auto_minmax(0,1fr)] grid-cols-[minmax(0,auto)]">
						<Tab.Group>
							<Tab.List className="bg-slate-100 pt-[min(1vh,0.5rem)] overflow-x-auto overflow-y-hidden flex gap-2 px-2">
								{['Code', 'Config', 'Dependencies'].map(label => (
									<Tab
										key={label}
										className={({ selected }) =>
											classNames(
												'h-full px-[min(5%,1.5rem)] py-2 leading-tight rounded-t-lg',
												selected
													? 'bg-white shadow border-b-2 border-blue-500'
													: 'hover:bg-white',
											)
										}
									>
										{label}
									</Tab>
								))}
							</Tab.List>
							<Tab.Panels className="grid grid-rows-[minmax(0,auto)] grid-cols-[minmax(0,auto)]">
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
							<Tab.List className="bg-slate-100 pt-[min(1vh,0.5rem)] overflow-x-auto overflow-y-hidden flex gap-2 px-2">
								{['Console', 'Problems'].map(label => (
									<Tab
										key={label}
										className={({ selected }) =>
											classNames(
												'h-full px-[min(5%,1.5rem)] py-2 leading-tight rounded-t-lg',
												selected
													? 'bg-white shadow border-b-2 border-blue-500'
													: 'hover:bg-white',
											)
										}
									>
										{label}
									</Tab>
								))}
							</Tab.List>
							<Tab.Panels className="grid grid-rows-[minmax(0,1fr)]">
								<Tab.Panel unmount={false}>
									<ConsoleOutput ref={consoleRef} />
								</Tab.Panel>
								<Tab.Panel unmount={false}>
									<ProblemsOutput violations={violations} />
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</section>
				</Split>
			</div>
		</>
	);
}

export default App;
