export type TokenValueScalar = string | Readonly<RegExp> | number;
export type TokenValueArray = readonly TokenValue[];
export type TokenValue = TokenValueScalar | TokenValueArray;
