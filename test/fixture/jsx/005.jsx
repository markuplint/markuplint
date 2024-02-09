// #1443
export const Component = ({ list, id }) => {
	return (
		<>
			<p id={id}></p>
			<ul
				// Comment in start tag
				id="hard-coded" /* Block Comment
				in start tag */
			>
				{list.map(item => (
					<li key={item.key}>{item.text}</li>
				))}
			</ul>
		</>
	);
};
