"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reStartTag = /<([^>]+)>/;
exports.reTagName = /^(?:[a-z0-9]+:)?[a-z0-9]+(?:-[a-z0-9]+)*/i;
exports.reAttrsInStartTag = /([^\x00-\x1f\x7f-\x9f "'>\/=]+)(?:(\s*=\s*)(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s]*)))?/;
exports.reSplitterTag = /<[^>]+>/g;
