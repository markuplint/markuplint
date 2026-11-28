export const AnnotationHtmlSlot = ({ children }) => (
	<math>
		<annotation-xml encoding="text/html">
			<div>{children}</div>
		</annotation-xml>
	</math>
);

export const AnnotationExpressionSlot = ({ children }) => (
	<math>
		<annotation-xml encoding={'text/html'}>
			<div>{children}</div>
		</annotation-xml>
	</math>
);

export const AnnotationTexSlot = ({ children }) => (
	<math>
		<annotation-xml encoding="application/x-tex">
			<mrow>{children}</mrow>
		</annotation-xml>
	</math>
);

export const TextIntegrationSlot = ({ children }) => (
	<math>
		<mi>
			<span>{children}</span>
		</mi>
	</math>
);

export const DescSlot = ({ children }) => (
	<svg>
		<desc>
			<span>{children}</span>
		</desc>
	</svg>
);
