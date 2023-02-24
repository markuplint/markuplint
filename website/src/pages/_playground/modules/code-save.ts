const encode = (text: string) => window.btoa(encodeURIComponent(text));
const decode = (text: string) => decodeURIComponent(window.atob(text));

export const saveCode = (code: string) => {
  location.hash = encode(code);
};

export const loadCode = () => {
  return decode(location.hash.slice(1));
};
