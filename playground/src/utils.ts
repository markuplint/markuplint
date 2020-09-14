export const encode = (text: string) => btoa(encodeURIComponent(text));
export const decode = (text: string) => decodeURIComponent(atob(text));
