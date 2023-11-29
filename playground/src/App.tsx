import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { DistTag } from './modules/dist-tag';
import type { Violations } from './modules/violations';
import type { Rules } from '@markuplint/ml-config';

import { Popover, Tab } from '@headlessui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';

import logo from './assets/images/logo-horizontal.svg';
import { CodeEditor } from './components/CodeEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { DepsEditor } from './components/DepsEditor';
import { ExampleSelector } from './components/ExampleSelector';
import { FilenameEditor } from './components/FilenameEditor';
import { PresetsEditor } from './components/PresetsEditor';
import { ProblemsOutput } from './components/ProblemsOutput';
import { SchemaEditor } from './components/SchemaEditor';
import { examples } from './examples';
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
	const [configString, setConfigString] = useState('');
	const [depsPackages, setDepsPackages] = useState<StringSet>(new Set(['markuplint']));
	const [distTag, setDistTag] = useState<DistTag>('latest');
	const [violations, setViolations] = useState<Violations | null>(null);
	const [lintTrigger, setLintTrigger] = useState(0);
	const [installedPackages, setInstalledPackages] = useState<Readonly<Record<string, string>>>({});
	const [depsStatus, setDepsStatus] = useState<'success' | 'error' | 'loading' | null>(null);
	const [status, setStatus] = useState<
		'not-started' | 'installing-deps' | 'install-error' | 'lint-server-preparing' | 'linting' | 'checked' | 'error'
	>('not-started');
	const [initialized, setInitialized] = useState(false);
	const [selectedTab, setSelectedTab] = useState<'code' | 'config' | null>(null);
	const [version, setVersion] = useState<string>();
	const tabsRef = useRef<HTMLElement>(null);

	useEffect(() => {
		// get version
		void (async () => {
			const response = await fetch('https://registry.npmjs.org/markuplint');
			const json = await response.json();
			const version = json['dist-tags'][distTag];
			if (typeof version !== 'string') {
				throw new TypeError('Invalid version');
			}
			setVersion(version);
		})();
	}, [distTag]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				const entry = entries[0];
				if (entry.isIntersecting) {
					// mobile
					setSelectedTab('code');
				} else {
					// desktop
					setSelectedTab(null);
				}
			},
			{ root: document.body },
		);
		if (tabsRef.current) {
			observer.observe(tabsRef.current);
		}
		return () => {
			observer.disconnect();
		};
	}, []);

	// boot container server
	useEffect(() => {
		if (!boot) {
			boot = true;
			void (async () => {
				containerServer = await setupContainerServer(consoleRef.current!);

				const initialValues = loadValues() ?? defaultExample;
				const { config, codeFileType, code } = initialValues;
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
				setViolations(null);
				try {
					await containerServer.updateConfig('.markuplintrc', configString);
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error(error);
				}
				setLintTrigger(prev => prev + 1);
			})();
		}
	}, [configString]);

	// npm install when dependencies changed
	useEffect(() => {
		if (!containerServer || !initialized) {
			return;
		}
		const dependencies = [...depsPackages].map(name => `${name}@${distTag}`);

		setDepsStatus('loading');
		setViolations(null);
		setStatus('installing-deps');

		void (async () => {
			const installed = await containerServer.updateDeps(dependencies);
			setInstalledPackages(installed);
			if (Object.keys(installed).length > 0) {
				setDepsStatus('success');
				setLintTrigger(prev => prev + 1);
			} else {
				setDepsStatus('error');
			}
		})();
	}, [depsPackages, distTag, initialized]);

	// lint
	useEffect(() => {
		if (!containerServer) {
			return;
		}
		if (depsStatus !== 'success') {
			return;
		}
		void (async () => {
			const result = await containerServer.lint(filename, code);
			setStatus('checked');
			setViolations(result);
		})();
	}, [code, depsStatus, filename, lintTrigger]);

	// save values
	const debouncedSaveValues = useMemo(() => debounce(saveValues, 200), []);
	useEffect(() => {
		if (!initialized) {
			return;
		}
		debouncedSaveValues({
			config: configString,
			codeFileType: fileType,
			code: code,
		});
	}, [configString, code, debouncedSaveValues, initialized, fileType]);

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

	const handleChangeFileType = useCallback(
		(newFileType: string) => {
			setFileType(newFileType);
			if (isValidJson(configString)) {
				const parsedConfig = JSON.parse(configString);
				const parserAndSpecs =
					{
						'.jsx': {
							parser: {
								'\\.jsx$': '@markuplint/jsx-parser',
							},
							specs: {
								'\\.jsx$': '@markuplint/react-spec',
							},
						},
						'.vue': {
							parser: {
								'\\.vue$': '@markuplint/vue-parser',
							},
							specs: {
								'\\.vue$': '@markuplint/vue-spec',
							},
						},
						'.svelte': {
							parser: {
								'\\.svelte$': '@markuplint/svelte-parser',
							},
						},
					}[newFileType] ?? {};
				if ('parser' in parserAndSpecs) {
					parsedConfig.parser = parserAndSpecs.parser;
				} else {
					delete parsedConfig.parser;
				}
				if ('specs' in parserAndSpecs) {
					parsedConfig.specs = parserAndSpecs.specs;
				} else {
					delete parsedConfig.specs;
				}
				setConfigString(JSON.stringify(parsedConfig, null, 2));
			}
		},
		[configString],
	);
	const presets = useMemo((): readonly string[] => {
		if (isValidJson(configString)) {
			const parsedConfig = JSON.parse(configString);
			const presets = parsedConfig.extends ?? [];
			return presets;
		} else {
			return [];
		}
	}, [configString]);
	const handleChangePresets = useCallback(
		(newPresets: readonly string[]) => {
			if (isValidJson(configString)) {
				const parsedConfig = JSON.parse(configString);
				if (newPresets.length === 0) {
					delete parsedConfig.extends;
				} else {
					parsedConfig.extends = newPresets;
				}
				setConfigString(JSON.stringify(parsedConfig, null, 2));
			}
		},
		[configString],
	);
	return (
		<>
			<header className="sticky top-0 z-10 flex justify-between items-center bg-white border-b border-b-slate-300 px-4 py-2">
				<h1 className="text-lg md:text-xl leading-normal font-bold">
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
				<ExampleSelector
					disabled={!initialized}
					onSelect={example => {
						setConfigString(example.config);
						setFileType(example.codeFileType);
						setCode(example.code);
					}}
				/>
			</header>
			<main className="grid md:block grid-rows-[auto_minmax(0,1fr)] grid-cols-1">
				<nav ref={tabsRef} className="md:hidden border-b bg-slate-100">
					<ul className="flex flex-wrap gap-1 pt-1 px-4">
						<li>
							<button
								type="button"
								onClick={() => {
									setSelectedTab('code');
								}}
								className="flex items-center gap-2 py-1 px-3 border-b-2 font-bold border-transparent aria-selected:border-ml-blue"
							>
								<span className=" icon-heroicons-solid-code text-xl text-slate-500"></span>
								Code
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									setSelectedTab('config');
								}}
								className="flex items-center gap-2 py-1 px-3 border-b-2 font-bold border-transparent aria-selected:border-ml-blue"
							>
								<span className=" icon-heroicons-solid-cog-6-tooth text-xl text-slate-500"></span>
								Config
							</button>
						</li>
					</ul>
				</nav>
				<Split
					direction="horizontal"
					sizes={[60, 40]}
					gutter={() => {
						const gutterElement = document.createElement('div');
						gutterElement.className =
							'w-[2px] box-content border-x-4 border-transparent bg-slate-300 cursor-col-resize hover:bg-ml-blue hidden md:block';
						return gutterElement;
					}}
					gutterStyle={() => ({})}
					className="h-full flex"
					minSize={0}
				>
					<Split
						direction="vertical"
						sizes={[60, 40]}
						gutter={() => {
							const gutterElement = document.createElement('div');
							gutterElement.className =
								'w-full h-[2px] box-content border-y-4 border-transparent bg-slate-300 cursor-row-resize hover:bg-ml-blue';
							return gutterElement;
						}}
						gutterStyle={() => ({})}
						className={
							selectedTab === null ? 'overflow-x-hidden' : selectedTab === 'code' ? '!w-full' : 'hidden'
						}
					>
						<section>
							<CodeEditor
								value={code}
								filename={filename}
								violations={violations ?? []}
								onChange={setCode}
							/>
						</section>
						<div className="grid grid-rows-1">
							<ProblemsOutput violations={violations} />
						</div>
					</Split>
					<section
						className={`grid grid-rows-[auto_minmax(0,1fr)] ${
							selectedTab === null ? '' : selectedTab === 'config' ? '!w-full' : 'hidden'
						}`}
					>
						<Tab.Group>
							<div className="flex justify-between items-center gap-2 py-1 px-4 bg-slate-100">
								<hgroup className="flex items-baseline flex-wrap">
									<h2 className="flex items-baseline gap-2 border-b-2 font-bold border-transparent aria-selected:border-ml-blue">
										<span className=" icon-heroicons-solid-cog-6-tooth text-xl text-slate-500 translate-y-[0.15em]"></span>
										Config
									</h2>
									<p className="text-xs tracking-tight">
										<code>.markuplintrc</code>
									</p>
								</hgroup>
								<Tab.List className="flex border rounded-lg">
									<Tab className="flex gap-1 overflow-hidden justify-center items-center py-1 px-2 text-sm first:rounded-s-lg last:rounded-e-lg text-black text-opacity-60 aria-selected:bg-white  aria-selected:text-opacity-100">
										<span className=" icon-majesticons-curly-braces shrink-0"></span>
										JSON
									</Tab>
									<Tab className="flex gap-1 overflow-hidden justify-center items-center py-1 px-2 text-sm first:rounded-s-lg last:rounded-e-lg text-black text-opacity-60 aria-selected:bg-white aria-selected:text-opacity-100">
										<span className=" icon-heroicons-solid-adjustments-horizontal shrink-0"></span>
										Visual
									</Tab>
								</Tab.List>
							</div>

							<Tab.Panels className="overflow-x-hidden">
								<Tab.Panel unmount={false} className="h-full grid">
									<ConfigEditor value={configString} onChange={setConfigString} />
								</Tab.Panel>
								<Tab.Panel unmount={false} className="px-4 py-4 ">
									<div className="grid gap-2">
										<details open className="border rounded-lg overflow-hidden group">
											<summary
												className="
													flex justify-between items-center gap-2 font-medium -outline-offset-2 
													py-2 px-4 border-slate-300 bg-slate-100
												"
											>
												Parser &amp; Specs
												<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
											</summary>
											<FilenameEditor value={fileType} onChange={handleChangeFileType} />
										</details>
										<details open className="border rounded-lg overflow-hidden group">
											<summary
												className="
												flex justify-between items-center gap-2 font-medium -outline-offset-2 
												py-2 px-4 border-slate-300 bg-slate-100
											"
											>
												Presets
												<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
											</summary>
											<PresetsEditor
												fileType={fileType}
												value={presets}
												onChange={handleChangePresets}
											/>
										</details>
										<details open className="border rounded-lg overflow-hidden group">
											<summary
												className="
													flex justify-between items-center gap-2 font-medium -outline-offset-2 
													py-2 px-4 border-slate-300 bg-slate-100
												"
											>
												Rules
												<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
											</summary>
											{version && <SchemaEditor version={version} onChange={handleChangeRules} />}
										</details>
									</div>
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</section>
				</Split>
			</main>
			<footer className="sticky bottom-0 px-4 py-1 flex justify-end items-center text-sm bg-white border-t">
				<output className="flex justify-end items-center gap-1">
					{
						{
							'not-started': 'Not started',
							'installing-deps': (
								<>
									<span className="icon-custom-loading-wrapper relative text-slate-200 text-lg">
										<span className="animate-spin absolute inset-0 icon-custom-loading text-slate-500"></span>
									</span>
									Installing dependencies...
								</>
							),
							'install-error': 'Install error',
							'lint-server-preparing': 'Preparing lint server',
							linting: 'Linting',
							checked: (
								<>
									<span className=" icon-heroicons-solid-check"></span>
									Checked!
								</>
							),
							error: 'Error',
						}[status]
					}
				</output>
				<Popover>
					<Popover.Button
						className="
						flex items-center gap-1 shadow-sm
						px-2 py-1 ml-2 rounded-md bg-slate-100 text-slate-900
						hover:bg-slate-200 hover:text-slate-800
					"
					>
						<span className="icon-heroicons-solid-command-line"></span>
						Console
					</Popover.Button>
					<Popover.Panel
						unmount={false}
						className="absolute right-4 w-[calc(100%-3rem)] max-w-4xl bottom-[calc(100%+1rem)] z-10 border bg-white overflow-hidden rounded-lg shadow-lg"
					>
						<ConsoleOutput ref={consoleRef} />
					</Popover.Panel>
				</Popover>
				<Popover>
					<Popover.Button
						className="
						flex items-center gap-1 shadow-sm
						px-2 py-1 ml-2 rounded-md bg-slate-100 text-slate-900
						hover:bg-slate-200 hover:text-slate-800
					"
					>
						<span className=" icon-heroicons-solid-tag"></span>
						{`v${version}`}
					</Popover.Button>
					<Popover.Panel
						unmount={false}
						className="absolute left-4 right-4 ml-auto w-fit bottom-[calc(100%+1rem)] z-10 border bg-white overflow-hidden rounded-lg shadow-lg"
					>
						<DepsEditor
							status={depsStatus}
							installedPackages={installedPackages}
							distTag={distTag}
							depsPackages={depsPackages}
							onChange={setDistTag}
						/>
					</Popover.Panel>
				</Popover>
			</footer>
		</>
	);
}
