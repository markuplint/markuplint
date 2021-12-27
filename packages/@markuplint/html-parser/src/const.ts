export const reTag = /^<((?:.|\s|\n)+)>\s*$/;

// eslint-disable-next-line no-control-regex
export const reTagName = /^(?:[a-z][^\u0000\u0009\u000A\u000C\u0020/>]*)/i;

export const reSplitterTag = /<[^>]+>/g;
