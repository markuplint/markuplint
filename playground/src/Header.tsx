import { memo } from 'react';

export const Header = memo(() => {
	return (
		<div className="flex p-5 bg-gray-50 border-b-2">
			<h1>Playground</h1>
			<p>markuplint</p>
		</div>
	);
});
