import type { ConsoleOutputRef } from './components/ConsoleOutput';
import type { ExampleData } from './examples';
import type { DistTag } from './modules/dist-tag';
import type { PlaygroundValues } from './modules/save-values';
import type { Violations } from './modules/violations';
import type { Config } from '@markuplint/ml-config';

import { Popover, PopoverButton, PopoverPanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Split from 'react-split';

import logo from './assets/images/logo-horizontal.svg';
import { CodeEditor } from './components/CodeEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { ConfigForm } from './components/ConfigForm';
import { ConsoleOutput } from './components/ConsoleOutput';
import { DependencyPanel } from './components/DependencyPanel';
import { ExampleSelector } from './components/ExampleSelector';
import { ProblemsOutput } from './components/ProblemsOutput';
import { examples } from './examples';
import { debounce } from './modules/debounce';
import { parseJsonc } from './modules/json';
import { loadValues, saveValues } from './modules/save-values';
import { setupContainerServer } from './server';

const defaultCategory = examples[Object.keys(examples).sort()[0]].examples;
const defaultExample = defaultCategory[Object.keys(defaultCategory).sort()[0]];

let boot = false;

const fallbackValues = {
	code: '',
	codeFileType: '.html',
	config: '',
} as const satisfies PlaygroundValues;
const initialValues = {
	...fallbackValues,
	...(loadValues() ?? defaultExample),
} as const;
const { config: initialConfig, codeFileType: initialCodeFileType, code: initialCode } = initialValues;

type StringSet = Readonly<ReadonlySet<string>>;
const areSetsEqual = (set1: StringSet, set2: StringSet) => {
	if (set1.size !== set2.size) return false;
	return [...set1].every(item => set2.has(item));
};

export function App() {
	const consoleRef = useRef<ConsoleOutputRef>(null);
	const [code, setCode] = useState(initialCode);
	const [fileType, setFileType] = useState<string>(initialCodeFileType);
	const filename = `index${fileType}`;
	const [configString, setConfigString] = useState(initialConfig);
	const parsedConfig: Config = useMemo(() => parseJsonc(configString) ?? {}, [configString]);
	const handleChangeConfig = useCallback((config: Config) => {
		setConfigString(JSON.stringify(config, null, 2));
	}, []);
	const [depsPackages, setDepsPackages] = useState<StringSet>(new Set(['markuplint']));
	const [distTag, setDistTag] = useState<DistTag>('latest');
	const [violations, setViolations] = useState<Violations | null>(null);
	const [lintTrigger, setLintTrigger] = useState(0);
	const [installedPackages, setInstalledPackages] = useState<Readonly<Record<string, string>>>({});
	const [depsStatus, setDepsStatus] = useState<'success' | 'error' | 'loading' | null>(null);
	const [status, setStatus] = useState<
		| 'not-started'
		| 'deps-installing'
		| 'deps-error'
		| 'config-updating'
		| 'config-error'
		| 'lint-skipped'
		| 'lint-checked'
		| 'lint-error'
	>('not-started');
	const [containerServer, setContainerServer] = useState<Awaited<ReturnType<typeof setupContainerServer>>>();
	const [selectedTab, setSelectedTab] = useState<'code' | 'config' | null>(null);
	const [version, setVersion] = useState<string>();
	const tabsRef = useRef<HTMLElement>(null);
	const configHeadingId = useId();
	const handleSelectExample = useCallback((example: ExampleData) => {
		setConfigString(example.config);
		setFileType(example.codeFileType);
		setCode(example.code);
	}, []);
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
				setContainerServer(await setupContainerServer(consoleRef.current!));
			})();
		}
	}, []);

	// update dependencies when config changed
	useEffect(() => {
		// find @markuplint/* packages from config
		const additionalPackages = configString.match(/@markuplint\/[^"]+/g) ?? [];
		const candidate = new Set(['markuplint', ...additionalPackages]);
		setDepsPackages(prev => {
			if (areSetsEqual(prev, candidate)) {
				return prev;
			} else {
				return candidate;
			}
		});
	}, [configString]);

	// update config when config changed
	useEffect(() => {
		if (!containerServer) {
			return;
		}

		if (parseJsonc(configString) === null) {
			setStatus('config-error');
		} else {
			void (async () => {
				setViolations(null);
				setStatus('config-updating');
				try {
					await containerServer.updateConfig('.markuplintrc', configString);
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error(error);
				}
				setLintTrigger(prev => prev + 1);
			})();
		}
	}, [configString, containerServer]);

	// npm install when dependencies changed
	useEffect(() => {
		if (!containerServer) {
			return;
		}

		setViolations(null);
		setDepsStatus('loading');
		setStatus('deps-installing');

		void (async () => {
			try {
				const dependencies = [...depsPackages].map(name => `${name}@${distTag}`);
				const installed = await containerServer.updateDeps(dependencies);
				setInstalledPackages(installed);
				setDepsStatus('success');
				setLintTrigger(prev => prev + 1);
			} catch {
				setDepsStatus('error');
				setStatus('deps-error');
			}
		})();
	}, [depsPackages, distTag, containerServer]);

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
			if (result === null) {
				setStatus('lint-skipped');
			} else if (result === 'error') {
				setStatus('lint-error');
			} else {
				setStatus('lint-checked');
				setViolations(result);
			}
		})();
	}, [code, containerServer, depsStatus, filename, lintTrigger]);

	// save values
	const debouncedSaveValues = useMemo(() => debounce(saveValues, 200), []);
	useEffect(() => {
		if (!containerServer) {
			return;
		}
		debouncedSaveValues({
			config: configString,
			codeFileType: fileType,
			code: code,
		});
	}, [configString, code, debouncedSaveValues, containerServer, fileType]);

	return (
		<>
			<header className="sticky top-0 z-10 flex items-center justify-between border-b border-b-slate-300 bg-white px-4 py-2">
				<h1 className="text-lg font-bold leading-normal md:text-xl">
					<img
						src={logo}
						alt="Markuplint"
						width={968}
						height={181}
						decoding="async"
						className="mt-[-0.2em] inline-block h-[1.2em] w-auto"
					/>{' '}
					Playground
				</h1>
				<ExampleSelector disabled={!containerServer} onSelect={handleSelectExample} />
			</header>
			<main className="grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:block">
				<nav ref={tabsRef} className="border-b bg-slate-100 md:hidden">
					<ul className="flex flex-wrap gap-1 px-4 pt-1">
						<li>
							<button
								type="button"
								onClick={() => {
									setSelectedTab('code');
								}}
								className="flex items-center gap-2 border-b-2 border-transparent px-3 py-1 font-bold aria-pressed:border-ml-blue"
								aria-pressed={selectedTab === 'code'}
							>
								<span className="icon-heroicons-solid-code text-xl text-slate-500"></span>
								Code
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									setSelectedTab('config');
								}}
								className="flex items-center gap-2 border-b-2 border-transparent px-3 py-1 font-bold aria-pressed:border-ml-blue"
								aria-pressed={selectedTab === 'config'}
							>
								<span className="icon-heroicons-solid-cog-6-tooth text-xl text-slate-500"></span>
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
					className="flex h-full"
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
						<CodeEditor value={code} filename={filename} violations={violations ?? []} onChange={setCode} />

						<div className="grid grid-rows-1">
							<ProblemsOutput violations={violations} />
						</div>
					</Split>
					<section
						aria-labelledby={configHeadingId}
						className={selectedTab === null ? '' : selectedTab === 'config' ? '!w-full' : 'hidden'}
					>
						<TabGroup className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
							<div className="flex min-h-[2.5rem] items-center justify-between gap-2 bg-slate-100 px-4 py-1">
								<hgroup className="flex flex-wrap items-baseline gap-x-2">
									<h2
										id={configHeadingId}
										className="sr-only flex items-baseline gap-2 text-lg font-bold md:not-sr-only"
									>
										<span className="icon-heroicons-solid-cog-6-tooth translate-y-[0.15em] text-xl text-slate-500"></span>
										Config
									</h2>
									<p className="text-sm tracking-tight">
										<code>.markuplintrc</code>
									</p>
								</hgroup>
								<TabList className="flex rounded-lg border">
									{(['JSON', 'Visual'] as const).map((label, i) => (
										<Tab
											key={i}
											className={
												'flex items-center justify-center gap-1 overflow-hidden px-2 py-1 text-sm font-medium text-black text-opacity-60 first:rounded-s-lg last:rounded-e-lg aria-selected:bg-slate-200 aria-selected:text-opacity-100'
											}
										>
											<span
												className={`${
													label === 'JSON'
														? 'icon-majesticons-curly-braces'
														: label === 'Visual'
															? 'icon-heroicons-solid-adjustments-horizontal'
															: (label satisfies never)
												} shrink-0`}
											></span>
											{label}
										</Tab>
									))}
								</TabList>
							</div>

							<TabPanels>
								<TabPanel unmount={false} className="grid h-full">
									<ConfigEditor value={configString} onChange={setConfigString} />
								</TabPanel>
								<TabPanel unmount={false} className="h-full overflow-y-auto">
									<ConfigForm
										fileType={fileType}
										version={version}
										config={parsedConfig}
										onChangeFileType={setFileType}
										onChangeConfig={handleChangeConfig}
									/>
								</TabPanel>
							</TabPanels>
						</TabGroup>
					</section>
				</Split>
			</main>
			<footer className="sticky bottom-0 flex items-center justify-end border-t bg-white px-4 py-1 text-sm">
				<output className="flex items-center justify-end gap-1">
					{
						{
							'not-started': <></>,
							'deps-installing': (
								<>
									<span className="icon-custom-loading-wrapper relative text-lg text-slate-200">
										<span className="icon-custom-loading absolute inset-0 animate-spin text-ml-blue"></span>
									</span>
									Installing dependencies... (may take 10-30 sec.)
								</>
							),
							'deps-error': (
								<>
									<span className="icon-heroicons-solid-x-circle text-red-500"></span>
									Install error!
								</>
							),
							'config-updating': (
								<>
									<span className="icon-custom-loading-wrapper relative text-lg text-slate-200">
										<span className="icon-custom-loading absolute inset-0 animate-spin text-ml-blue"></span>
									</span>
									Updating config...
								</>
							),
							'config-error': (
								<>
									<span className="icon-heroicons-solid-x-circle text-red-500"></span>
									Config file is invalid!
								</>
							),
							'lint-skipped': (
								<>
									<span className="icon-heroicons-solid-x-circle text-red-500"></span>
									Linting was skipped! Please check your parser settings.
								</>
							),
							'lint-checked': (
								<>
									<span className="icon-heroicons-solid-check text-green-700"></span>
									Checked!
								</>
							),
							'lint-error': (
								<>
									<span className="icon-heroicons-solid-x-circle text-red-500"></span>
									An error occurred while linting!
								</>
							),
						}[status]
					}
				</output>
				<Popover>
					<PopoverButton className="ml-2 flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-900 shadow-sm hover:bg-slate-200 hover:text-slate-800">
						<span className="icon-heroicons-solid-command-line"></span>
						Console
					</PopoverButton>
					<PopoverPanel
						unmount={false}
						className="absolute bottom-[calc(100%+1rem)] right-4 z-10 w-[calc(100%-3rem)] max-w-4xl overflow-hidden rounded-lg border bg-white shadow-lg"
					>
						<ConsoleOutput ref={consoleRef} />
					</PopoverPanel>
				</Popover>
				<Popover>
					<PopoverButton className="ml-2 flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-900 shadow-sm hover:bg-slate-200 hover:text-slate-800">
						<span className="icon-heroicons-solid-tag"></span>
						{`v${version}`}
					</PopoverButton>
					<PopoverPanel
						unmount={false}
						className="absolute bottom-[calc(100%+1rem)] left-4 right-4 z-10 ml-auto w-fit overflow-hidden rounded-lg border bg-white shadow-lg"
					>
						<DependencyPanel
							status={depsStatus}
							installedPackages={installedPackages}
							distTag={distTag}
							depsPackages={depsPackages}
							onChange={setDistTag}
						/>
					</PopoverPanel>
				</Popover>
			</footer>
		</>
	);
}
