export function getWindow(): Window {
  if (typeof window !== "undefined") return window;

  if (typeof self !== "undefined") return self;
  throw new Error("Unable to locate window object.");
}
