export function getWindow(): Window {
  if (typeof window !== "undefined") return window;
  // eslint-disable-next-line no-restricted-globals
  if (typeof self !== "undefined") return self;
  throw new Error("Unable to locate window object.");
}
