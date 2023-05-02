import type { ExampleData } from '../modules/examples';
import type { FC } from 'react';

import { examples } from '../modules/examples';

type Props = { onSelect?: (files: ExampleData) => void; disabled?: boolean };

export const ExampleSelector: FC<Props> = ({ onSelect, disabled = false }) => {
	return (
		<ul>
			{Object.keys(examples)
				.sort()
				.map(categoryKey => {
					const category = examples[categoryKey];
					return (
						<li key={categoryKey}>
							<h2>{category.metadata.title}</h2>
							<ul>
								{Object.keys(category.examples)
									.sort()
									.map(exampleKey => {
										const example = category.examples[exampleKey];
										return (
											<li key={exampleKey}>
												<button
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
