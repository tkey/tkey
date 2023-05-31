// compare two arrays of string without order
export function isSome(array1: string[], array2: string[]) {
  return array1.some(function (element, index) {
    return element === array2[index];
  });
}

export function eqSet(xs: Set<string>, ys: Set<string>) {
  return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}
