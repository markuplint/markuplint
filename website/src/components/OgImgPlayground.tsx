import React, { useCallback, useState } from 'react';

import { getOgImgUrl } from '../utils/getOgImgUrl';

const DEFAULT_TEXT = 'The "id" attribute value duplication';
const DEFAULT_LABEL = 'Rule';

export default function OgImgPlayground() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [lang, setLang] = useState('default');
  const [src, setSrc] = useState(getOgImgUrl(DEFAULT_LABEL, DEFAULT_TEXT, lang));

  const onSubmit = useCallback(() => {
    const newSrc = getOgImgUrl(label, text, lang);
    setSrc(newSrc);
  }, [text, label, lang]);

  const onChangeText = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);
  const onChangeLabel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  }, []);
  const onChangelang = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLang(e.target.value);
  }, []);

  return (
    <div>
      <div role="status" aria-live="polite">
        <img src={src} alt={text} />
      </div>
      <input type="text" style={{ fontSize: '2em' }} onChange={onChangeLabel} value={label} />
      <textarea
        style={{ width: '100%', height: '6em', fontSize: '2em' }}
        onChange={onChangeText}
        value={text}
      ></textarea>
      <label>
        Language
        <select onChange={onChangelang}>
          <option value="default">Default (en)</option>
          <option value="ja">ja</option>
        </select>
      </label>
      <button type="button" onClick={onSubmit}>
        Change
      </button>
    </div>
  );
}
