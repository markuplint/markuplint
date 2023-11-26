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
				className="rounded-md px-4 py-2 font-medium bg-slate-100 shadow hover:shadow-md transition-shadow"
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
				className="relative w-[calc(100%-4%*2)] max-w-md rounded-2xl bg-white p-6 text-left align-middle shadow-xl backdrop:bg-opacity-50 backdrop:bg-black"
			>
				{/* `div` is needed for light dismiss */}
				<div>
					<button
						type="button"
						onClick={handleClose}
						className="absolute top-3 right-3 leading-none text-gray-500 rounded p-3 hover:bg-gray-100 before:absolute before:-inset-2"
					>
						<span className="icon-heroicons-solid-x-mark text-xl overflow-hidden">Close</span>
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
										<h3 className="font-medium mb-2 flex items-center gap-2">
											{category.metadata.title}
											<span className="h-px grow bg-current opacity-20 block"></span>
										</h3>
										<ul className="grid">
											{Object.keys(category.examples)
												.sort()
												.map(exampleKey => {
													const example = category.examples[exampleKey];
													return (
														<li key={exampleKey}>
															<button
																className="w-full flex justify-between items-center px-2 py-2 rounded text-start hover:bg-slate-100 focus-visible:bg-slate-100 group"
																disabled={disabled}
																onClick={() => {
																	onSelect?.(example);
																	handleClose();
																}}
															>
																<span className="font-medium flex items-center gap-2">
																	<span className=" icon-heroicons-solid-code text-slate-500" />
																	{example.metadata.title}
																</span>
																<span className="flex items-center text-xs opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 text-gray-500 transition-opacity">
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
