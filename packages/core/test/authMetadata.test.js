import { generatePrivateExcludingIndexes, getPubKeyPoint } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { deepEqual, deepStrictEqual } from "assert";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import { AuthMetadata, generateRandomPolynomial, Metadata } from "../src/index";

const PRIVATE_KEY = generatePrivate().toString("hex");

const mpcBackwardCompebilityTestJson =
  ' {"data":{"factorEncs":{"default":{"f6126a36291f7bf6a10d5df11af4ba184adb8a1212e233846f872034a06a7a87":{"serverEncs":[],"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"efa604982f337f7bf5034cb8f3996117b9a13e4e4f4a3cb37f06b55722eb1cf052456c24ff2a2d2ae3ffe01ebc4e63f9","ephemPublicKey":"04a280a81a81f8bddef7d052f740dce5ff1d123ba5c208eb2b4bd8d9d9a94e585d0d1b0b25c1624f38dac7fb196ef85fa2eecd47a363bd2c1b00ce3ccc64e1fdeb","iv":"1121328b857d206af5686021bc2a7baf","mac":"026c5633e36b69d59a11a487045cc99107440bf2da049c339beb0745fcdcaf5a"}}}},"factorPubs":{"default":[{"x":"f6126a36291f7bf6a10d5df11af4ba184adb8a1212e233846f872034a06a7a87","y":"b05c5a1dbb89939335fddac27d90495342987555e75942460d3fca0571829cf"}]},"generalStore":{"shareDescriptions":{"03f6126a36291f7bf6a10d5df11af4ba184adb8a1212e233846f872034a06a7a87":["{\\"module\\":\\"hashedShare\\",\\"dateAdded\\":1705918192036,\\"tssShareIndex\\":2}"]}},"nonce":91,"polyIDList":["03422a3a45805c131e1f046ede6a7292c999993f86dbb6b4d4c3ab21f6e278fc11|02479427749ab0b468e5192d9c41698af3175b3a0588c426e7b72cdca30f4edd84|0x0|1|5c5d460d75a271853d4e00e4738aac6f7cb7e5e13fe85848edf5b3aec92368e5"],"pubKey":"03422a3a45805c131e1f046ede6a7292c999993f86dbb6b4d4c3ab21f6e278fc11","scopedStore":{},"tkeyStore":{"tssModule":[{"ciphertext":"69c19b5c7f531e049f5e35039dfbe2ad42f1a39670790ab918b01bc40e38c4da6b83cbfc0a39eb2cf9b102ce8ae0a46feb5c8719075c27f4e5edb05758eff22ff0b782e88ae1d15394b9dc596f52b4da27ace18b2db060c08dd7ab301d9f1345","ephemPublicKey":"046beade3380418cffa450b7602d21b484999a851b098d6a2c99d7e4a47a5cbcdff9938b81348caa8ba16b0a8d48485679ccbb5e5b010690854ef9ff173dd7709c","iv":"3e07dd44e31f584af30e7fc8dc12c83a","mac":"26f686bf7bae162ee0adb670c9beb8c9729984fbfb16f8bd7c886ccc4837a490"}]},"tssKeyTypes":{},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"23764a46f13a2b40f3a2e9d5ddfaac25690a84cc36c07efec0e61c723b4b5dc2","y":"5d7589199bfefd17bc0594f6e597a82388e68365d72403c3930ea594680e5d79"},{"x":"639929d09bbbe5dcfd684f4c348d8716c4d99347f7759a5b002cd3fdba2f2147","y":"a032c871a6c57a1af43bb043fcdae00dffea682eca6963a67906e892623abce5"}]}},"sig":"304502200701aab1420ba046b72817c69093d2cab43d4bbe7809b40ead658b09f12191f9022100969468307ab7ac29b64f427bd59af58ce39a8d006a22b7e260400acc329b7d90"}';

describe("AuthMetadata", function () {
  it("#should authenticate and  serialize and deserialize into JSON seamlessly", async function () {
    const privKeyBN = new BN(PRIVATE_KEY, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    shareIndexes.push(generatePrivateExcludingIndexes(shareIndexes));
    const poly = generateRandomPolynomial(1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(getPubKeyPoint(privKeyBN));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });
    const a = new AuthMetadata(metadata, privKeyBN);
    const stringified = stringify(a);
    const metadataSerialized = Metadata.fromJSON(JSON.parse(stringify(metadata)));
    const final = AuthMetadata.fromJSON(JSON.parse(stringified));
    deepStrictEqual(final.metadata, metadataSerialized, "Must be equal");
  });

  it("#should authenticate and  serialize and deserialize into JSON seamlessly (backward compatibility)", async function () {
    const instance1 = AuthMetadata.fromJSON({ ...JSON.parse(mpcBackwardCompebilityTestJson), legacyMetadataFlag: false });
    const instance2 = AuthMetadata.fromJSON({ ...JSON.parse(mpcBackwardCompebilityTestJson), legacyMetadataFlag: true });

    delete instance1.metadata.version;
    delete instance2.metadata.version;

    deepEqual(instance1, instance2);
  });
});
