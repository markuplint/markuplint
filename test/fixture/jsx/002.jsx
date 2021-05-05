const Component = () => {
	return (
		<ul>
			{[1, 2, 3].map(item => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
};

module.exports = Component;
