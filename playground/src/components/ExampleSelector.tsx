import type { ExampleData } from '../examples';

import { memo, type FC, useRef, useId } from 'react';

import { examples } from '../examples';

type Props = { onSelect?: (files: Readonly<ExampleData>) => void; disabled?: boolean };

const ExampleSelectorRaw: FC<Props> = ({ onSelect, disabled = false }) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const dialogId = useId();
	const handleOpen = () => {
		dialogRef.current?.showModal();
	};
	const handleClose = () => {
		dialogRef.current?.close();
	};
	return (
		<>
			<button
				type="button"
				onClick={handleOpen}
				className="rounded-md bg-slate-100 px-4 py-2 font-medium shadow transition-shadow hover:shadow-md"
				disabled={disabled}
			>
				Examples...
			</button>
			<dialog
				ref={dialogRef}
				aria-labelledby={dialogId}
				onClick={event => {
					if (event.target === event.currentTarget) {
						handleClose();
					}
				}}
				className="relative w-[calc(100%-4%*2)] max-w-md rounded-2xl bg-white p-6 text-left align-middle shadow-xl backdrop:bg-black backdrop:bg-opacity-50"
			>
				{/* `div` is needed for light dismiss */}
				<div>
					<button
						type="button"
						onClick={handleClose}
						className="absolute right-3 top-3 rounded p-3 leading-none text-gray-500 before:absolute before:-inset-2 hover:bg-gray-100"
					>
						<span className="icon-heroicons-solid-x-mark overflow-hidden text-xl">Close</span>
					</button>
					<h2 id={dialogId} className="mb-4 text-xl font-medium">
						Choose an example
					</h2>
					<ul className="grid gap-4">
						{Object.keys(examples)
							.sort()
							.map(categoryKey => {
								const category = examples[categoryKey];
								return (
									<li key={categoryKey}>
										<h3 className="mb-2 flex items-center gap-2 font-medium">
											{category.metadata.title}
											<span className="block h-px grow bg-current opacity-20"></span>
										</h3>
										<ul className="grid">
											{Object.keys(category.examples)
												.sort()
												.map(exampleKey => {
													const example = category.examples[exampleKey];
													return (
														<li key={exampleKey}>
															<button
																className="group flex w-full items-center justify-between rounded px-2 py-2 text-start hover:bg-slate-100 focus-visible:bg-slate-100"
																disabled={disabled}
																onClick={() => {
																	onSelect?.(example);
																	handleClose();
																}}
															>
																<span className="flex items-center gap-2 font-medium">
																	<span className="icon-heroicons-solid-code text-slate-500" />
																	{example.metadata.title}
																</span>
																<span className="flex items-center text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
																	Apply
																	<span className="icon-heroicons-solid-chevron-right" />
																</span>
															</button>
														</li>
													);
												})}
										</ul>
									</li>
								);
							})}
					</ul>
				</div>
			</dialog>
		</>
	);
};

export const ExampleSelector = memo(ExampleSelectorRaw);
