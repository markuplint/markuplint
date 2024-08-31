/* global Record */

import ImgixClient from '@imgix/js-core';

const client = new ImgixClient({ domain: 'markuplint.imgix.net' });

const fonts: Record<string, [label: string, title: string]> = {
  en: ['DIN Alternate,Bold', 'PT Sans,Bold'],
  ja: ['Hiragino Sans W5', 'Hiragino Sans W5'],
};

const getTextWidth = (text: string): number => {
  let count = 0;
  for (const element of text) {
    if (/[\u0020-\u007E]/.test(element)) {
      count += 1;
    } else {
      count += 2;
    }
  }
  return count;
};

/**
 * Figma data
 *
 * @see https://www.figma.com/file/Axc75XyLyzG4F36aBdDb88/Image-Resources
 */

const PAD_LEFT = 240;
const PAD_TOP = 412;
const IMAGE_WIDTH = 2400;
const IMAGE_HEIGHT = 1260;
const TEXTBOX_WIDTH = 1600;
const TEXTBOX_HEIGHT = 560;

/**
 * Base image demention: 2400 x 1260
 *
 * @param labelText English text
 * @param title
 * @param lang
 * @returns
 */
export function getOgImgUrl(labelText: string | undefined, title: string, lang = 'en') {
  const text = client.buildURL('~text', {
    txt: title,
    'txt-align': 'left,middle',
    'txt-color': '333333',
    'txt-font': fonts[lang]?.[1] ?? fonts.en[1],
    'txt-size': 150,
    'txt-clip': 'ellipsis',
    w: TEXTBOX_WIDTH,
    h: TEXTBOX_HEIGHT,
    // bg: 'FF0000',
  });
  const label = labelText
    ? client.buildURL('~text', {
        txt: labelText,
        'txt-align': 'center,middle',
        'txt-color': '000000',
        'txt-font': fonts[lang]?.[0] ?? fonts.en[0],
        'txt-size': 80,
        'txt-fit': 'max',
        w: getTextWidth(labelText) * 40 + 50,
        bg: 'F4F4F4',
        mask: 'corner',
        'corner-radius': '20,20,20,20',
      })
    : undefined;
  const url = client.buildURL('og-img-base.png', {
    mark: text,
    'mark-x': PAD_LEFT,
    'mark-y': PAD_TOP + 40,
    ...(label
      ? {
          blend: label,
          'blend-mode': 'normal',
          'blend-x': PAD_LEFT,
          'blend-y': PAD_TOP - 20,
        }
      : {}),
    w: IMAGE_WIDTH,
    h: IMAGE_HEIGHT,
  });
  return url;
}
