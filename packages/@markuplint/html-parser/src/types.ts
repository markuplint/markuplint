export type { ParserOptions, DefaultTreeAdapterMap } from 'parse5';

import type { DefaultTreeAdapterMap } from 'parse5';

/** A range of the source: the offsets of the first character and of the one after the last. */
export type SourceRange = { readonly startOffset: number; readonly endOffset: number };

export type Node = DefaultTreeAdapterMap['node'];
export type TextNode = DefaultTreeAdapterMap['textNode'];
export type Element = DefaultTreeAdapterMap['element'];
export type CommentNode = DefaultTreeAdapterMap['commentNode'];
export type Document = DefaultTreeAdapterMap['document'];
export type DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
export type ChildNode = DefaultTreeAdapterMap['childNode'];
