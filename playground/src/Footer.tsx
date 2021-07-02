import { memo } from 'react';

export const Footer = memo(() => {
	return (
		<div className="flex justify-end p-5 bg-gray-50 border-t-2">
			<p>markuplint</p>
		</div>
	);
});
