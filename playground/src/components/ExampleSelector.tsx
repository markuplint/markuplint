import type { ExampleData } from '../modules/examples';
import type { FC } from 'react';

import { examples } from '../modules/examples';

type Props = { onSelect?: (files: ExampleData) => void; disabled?: boolean };

export const ExampleSelector: FC<Props> = ({ onSelect, disabled = false }) => {
	return (
		<ul className="grid gap-8 px-8 py-4">
			{Object.keys(examples)
				.sort()
				.map(categoryKey => {
					const category = examples[categoryKey];
					return (
						<li key={categoryKey}>
							<h3 className="text-lg font-bold mb-2">{category.metadata.title}</h3>
							<ul className="grid gap-2">
								{Object.keys(category.examples)
									.sort()
									.map(exampleKey => {
										const example = category.examples[exampleKey];
										return (
											<li key={exampleKey}>
												<button
													className="px-4 py-2 shadow rounded border border-gray-300 hover:shadow-md focus:shadow-md"
													disabled={disabled}
													onClick={() => {
														onSelect?.(example);
													}}
												>
													{example.metadata.title}
												</button>
											</li>
										);
									})}
							</ul>
						</li>
					);
				})}
		</ul>
	);
};
