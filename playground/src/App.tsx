import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { Violations } from './modules/violations';
import type { Rules } from '@markuplint/ml-config';

import { Tab } from '@headlessui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';

import logo from './assets/images/logo-horizontal.svg';
import { CodeEditor } from './components/CodeEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { DepsEditor } from './components/DepsEditor';
import { ExampleSelector } from './components/ExampleSelector';
import { FilenameEditor } from './components/FilenameEditor';
import { ProblemsOutput } from './components/ProblemsOutput';
import { SchemaEditor } from './components/SchemaEditor';
import { examples } from './examples';
import { configFormats } from './modules/config-formats';
import { debounce } from './modules/debounce';
import { loadValues, saveValues } from './modules/save-values';
import { setupContainerServer } from './server';

const defaultCategory = examples[Object.keys(examples).sort()[0]].examples;
const defaultExample = defaultCategory[Object.keys(defaultCategory).sort()[0]];

const isValidJson = (maybeJson: string) => {
	try {
		JSON.parse(maybeJson);
		return true;
	} catch {
		return false;
	}
};

let boot = false;
let containerServer: Awaited<ReturnType<typeof setupContainerServer>> | undefined;

function classNames(...classes: readonly string[]) {
	return classes.filter(Boolean).join(' ');
}

const OUTPUT_TAB_INDICES = {
	PROBLEMS: 0,
	CONSOLE: 1,
} as const;

type StringSet = Readonly<ReadonlySet<string>>;
const areSetsEqual = (set1: StringSet, set2: StringSet) => {
	if (set1.size !== set2.size) return false;
	return [...set1].every(item => set2.has(item));
};

export function App() {
	const consoleRef = useRef<ConsoleOutputRef>(null);
	const [code, setCode] = useState('');
	const [fileType, setFileType] = useState<string>('.html');
	const filename = `index${fileType}`;
	const [configFilename, setConfigFilename] = useState<string>(configFormats[0]);
	const [configString, setConfigString] = useState('');
	const [depsPackages, setDepsPackages] = useState<StringSet>(new Set(['markuplint']));
	const [enableNextVersion, setEnableNextVersion] = useState(false);
	const [violations, setViolations] = useState<Violations>([]);
	const [lintTrigger, setLintTrigger] = useState(0);
	const [installedPackages, setInstalledPackages] = useState<Readonly<Record<string, string>>>({});
	const [depsStatus, setDepsStatus] = useState<'success' | 'error' | 'loading'>('success');
	const [selectedOutputTab, setSelectedOutputTab] = useState<number>(OUTPUT_TAB_INDICES.CONSOLE);
	const markuplintVersion = installedPackages['markuplint'] ? (`v${installedPackages['markuplint']}` as const) : null;
	const [initialized, setInitialized] = useState(false);

	// boot container server
	useEffect(() => {
		if (!boot) {
			boot = true;
			void (async () => {
				containerServer = await setupContainerServer(consoleRef.current!);

				const initialValues = loadValues() ?? defaultExample;
				const { configFilename, config, codeFileType, code } = initialValues;
				configFilename && setConfigFilename(configFilename);
				config && setConfigString(config);
				codeFileType && setFileType(codeFileType);
				code && setCode(code);
				setInitialized(true);
			})();
		}
	}, []);

	// update dependencies when config changed
	useEffect(() => {
		// find @markuplint/* packages from config
		const additionalPackages = configString.match(/@markuplint\/[^"]+/g) ?? [];
		const candidate = new Set(['markuplint', ...additionalPackages]);
		if (!areSetsEqual(depsPackages, candidate)) {
			setDepsPackages(candidate);
		}
	}, [configString, depsPackages]);

	// update config when config changed
	useEffect(() => {
		if (!containerServer) {
			return;
		}

		if (isValidJson(configString)) {
			void (async () => {
				setSelectedOutputTab(OUTPUT_TAB_INDICES.CONSOLE);
				setViolations([]);
				try {
					await containerServer.updateConfig(configFilename, configString);
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error(error);
				}
				setLintTrigger(prev => prev + 1);
			})();
		}
	}, [configString, configFilename]);

	// npm install when dependencies changed
	useEffect(() => {
		if (!containerServer || !initialized) {
			return;
		}
		const dependencies = Object.fromEntries(
			[...depsPackages].sort().map(name => {
				return [name, enableNextVersion ? 'next' : 'latest'];
			}),
		);
		const depsString = JSON.stringify(dependencies, null, 2);

		setSelectedOutputTab(OUTPUT_TAB_INDICES.CONSOLE);
		setDepsStatus('loading');
		setViolations([]);

		void (async () => {
			const installed = await containerServer.updateDeps(depsString);
			setInstalledPackages(installed);
			if (Object.keys(installed).length > 0) {
				setDepsStatus('success');
				setLintTrigger(prev => prev + 1);
			} else {
				setDepsStatus('error');
			}
		})();
	}, [depsPackages, enableNextVersion, initialized]);

	// lint
	useEffect(() => {
		if (!containerServer) {
			return;
		}
		void (async () => {
			const result = await containerServer.lint(filename, code);
			setViolations(result);
			setSelectedOutputTab(OUTPUT_TAB_INDICES.PROBLEMS);
		})();
	}, [code, filename, lintTrigger]);

	// save values
	const debouncedSaveValues = useMemo(() => debounce(saveValues, 200), []);
	useEffect(() => {
		if (!initialized) {
			return;
		}
		debouncedSaveValues({
			configFilename: configFilename,
			config: configString,
			codeFileType: fileType,
			code: code,
		});
	}, [configFilename, configString, code, debouncedSaveValues, initialized, fileType]);

	// update config when rules changed
	const handleChangeRules = useCallback(
		(rules: Rules) => {
			if (isValidJson(configString)) {
				const parsedConfig = JSON.parse(configString);
				if (Object.keys(rules).length === 0) {
					delete parsedConfig.rules;
				} else {
					parsedConfig.rules = rules;
				}
				setConfigString(JSON.stringify(parsedConfig, null, 2));
			}
		},
		[configString],
	);

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
							disabled={!initialized}
							onSelect={example => {
								setConfigFilename(example.configFilename);
								setConfigString(example.config);
								setFileType(example.codeFileType);
								setCode(example.code);
							}}
						/>
					</details>
					<details open>
						<summary className="bg-slate-100 text-xl font-bold px-8 py-3">Settings</summary>
						<details>
							<summary>Rules</summary>
							<SchemaEditor markuplintVersion={markuplintVersion} onChange={handleChangeRules} />
						</details>
						<FilenameEditor value={fileType} onChange={setFileType} />
						<ConfigEditor
							filename={configFilename}
							value={configString}
							onChangeValue={setConfigString}
							onChangeFilename={setConfigFilename}
						/>
						<DepsEditor
							status={depsStatus}
							installedPackages={installedPackages}
							enableNextVersion={enableNextVersion}
							onChange={setEnableNextVersion}
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
						<CodeEditor value={code} filename={filename} violations={violations} onChange={setCode} />
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
