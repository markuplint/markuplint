export const ForeignObjectSlot = ({ children }) => (
	<svg>
		<foreignObject>
			<div>{children}</div>
		</foreignObject>
	</svg>
);

export const GroupForeignObjectSlot = ({ children }) => (
	<g>
		<foreignObject>
			<div>{children}</div>
		</foreignObject>
	</g>
);

export const GroupSlot = ({ children }) => (
	<svg>
		<g>{children}</g>
	</svg>
);

export const ParagraphSlot = ({ children }) => (
	<div>
		<p>{children}</p>
	</div>
);

export const InnerSvgSlot = ({ children }) => (
	<div>
		<svg>{children}</svg>
	</div>
);

export const ComponentNamedSvgSlot = ({ children }) => (
	<div>
		<Svg>
			<g>{children}</g>
		</Svg>
	</div>
);
