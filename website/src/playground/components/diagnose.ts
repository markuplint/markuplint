import * as HTMLParser from '@markuplint/html-parser';
import rules from '@markuplint/rules';
import spec from '@markuplint/html-spec';
import type { LocaleSet } from '@markuplint/i18n';

import { MLCore, Ruleset, MLRule } from '@markuplint/ml-core';
import { getEndCol, getEndLine } from '@markuplint/parser-utils';
import { Diagnostic } from '../types';

export const createLinter = async (ruleset: Ruleset): Promise<MLCore> => {
  const language = navigator.language || '';
  const langCode = language.split(/_|-/)[0];
  // @ts-ignore TODO: Solve types
  const localSet: LocaleSet =
    langCode === 'ja'
      ? await import('@markuplint/i18n/locales/ja.json')
      : await import('@markuplint/i18n/locales/en.json');

  const linter = new MLCore({
    parser: HTMLParser,
    sourceCode: '',
    ruleset,
    rules: Object.entries(rules).map(([name, seed]) => new MLRule({ name, ...seed })),
    locale: localSet,
    schemas: [spec],
    parserOptions: {},
    pretenders: [],
    filename: 'playground.html',
  });
  return linter;
};

export const diagnose = async (linter: MLCore, code: string) => {
  const SEVERITY_MAP = {
    info: 2,
    warning: 4,
    error: 8,
  };

  linter.setCode(code);
  const reports = await linter.verify();
  const diagnostics: Diagnostic[] = [];
  for (const report of reports) {
    diagnostics.push({
      severity: SEVERITY_MAP[report.severity],
      startLineNumber: report.line,
      startColumn: report.col,
      endLineNumber: getEndLine(report.raw, report.line),
      endColumn: getEndCol(report.raw, report.col),
      message: `${report.message} (${report.ruleId})`,
    });
  }
  return diagnostics;
};

export function convertRuleset(ruleset?: string) {
  return ruleset
    ? JSON.parse(ruleset)
    : {
        rules: {},
        nodeRules: [],
        childNodeRules: [],
      };
}
