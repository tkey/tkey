export function derivePubKeyXFromPolyID(polyID: string): string {
  return polyID.split("|")[0];
}
