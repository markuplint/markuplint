// Default
const Button = styled.button`
	margin: ${margin};
	padding: ${padding};
`;

const MyComponent = ORIGINAL_IDENTIFIER.div`
	margin: ${margin};
	padding: ${padding};
`;

const MyComponent2 = styled(Button)`
	display: none;
`;
