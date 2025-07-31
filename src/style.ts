export const createInlineStyles = (styles: Record<string, string>) => {
  return Object.keys(styles)
    .map((key) => `${key}:${styles[key]}`)
    .join(";");
};
