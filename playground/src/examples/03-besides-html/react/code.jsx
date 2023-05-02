export const Component = ({ list }) => {
	return (
		<ul>
			{list.map(item => (
				<li key={item.key}>{item.text}</li>
			))}
		</ul>
	);
};
