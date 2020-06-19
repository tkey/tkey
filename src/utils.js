export const privKeyBnToEcc = (bnPrivKey) => {
  return bnPrivKey.toBuffer("be", 32);
};
