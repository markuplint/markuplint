export const reStartTag = /<([^>]+)>/;

export const reTagName = /^(?:[a-z0-9]+:)?[a-z0-9]+(?:-[a-z0-9]+)*/i;

export const reAttrsInStartTag = /([^\x00-\x1f\x7f-\x9f "'>\/=]+)(?:(\s*=\s*)(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s]*)))?/;

export const reSplitterTag = /<[^>]+>/g;
