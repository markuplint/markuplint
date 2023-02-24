export const encode = (text: string) => window.btoa(encodeURIComponent(text));
export const decode = (text: string) => decodeURIComponent(window.atob(text));
