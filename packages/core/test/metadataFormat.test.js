import { deepEqual, equal, fail } from "assert";

import { LegacyMetadata, Metadata } from "../src";
import { LEGACY_METADATA_VERSION, METADATA_VERSION } from "../src/metadata";

const legacyJSONSecp256k1 =
  '{"pubKey":"03eac52f1c8c0c14664aa18eb51e74e3075010774dfbd5609912ccb00d80f887c9","polyIDList":["03eac52f1c8c0c14664aa18eb51e74e3075010774dfbd5609912ccb00d80f887c9|029be6a4725c1015f26ad3c9e2d99a85d22ab7ccd9ad475bcb2bb8d2d3d780f12e|0x0|1|dced44048f8eb1ce6b9c33ded4ccc755f1324db1e038f1f6062ad19cd05ea92f"],"scopedStore":{},"generalStore":{"ed25519Seed":{"message":{"ciphertext":"1ee343ad59a4640906a9ed1e8d6685c58cdc23fcc61d067ab0d19b6bdef87608a06e6926de3ee68cd57e8bdba3985f76","ephemPublicKey":"04693440ffeddc206f4533aae9b1a383ff6d157c3607dae31aeb7a1d882f3f09c0777107a5d9522f056b0512b72d38bca1d993ca48552c360b2e0f6bb103999d97","iv":"abefdacaaad4fb0c6ff097ef244d21a2","mac":"d35e93fc593c5fa87b57a1da4217fdd2ff798551196c34ab86c2eaf7c63e78c2"},"publicKey":"04527505afd3992141247eb4443d0db646e1b1fe675d8047183510681e3e62d75e220cc092558775b41b8a6fb1218e11c892a0b5db9c39c6c46c3e4489cfe348c8"}},"tkeyStore":{"tssModule":[{"ciphertext":"8d1fa8ee530ac2f6648cf0876c024f03838463fcf695a60191cf24e637cb0f086e0ed3fdf85b0715d4bde6cca8982ebd53bd098e37c8b290dde0a4cc2bc216bd6b4563a35ead70728faa75dad8cba08c8858340e1f130ed1e53b3dc36e896675","ephemPublicKey":"04e7fbbff48c90dfb7b889825197a0caf1f0b16f1e60904da43ed8fdd88be6e67216b032cafb5209dab3099eb6ae9c020aa2687b54940d0f287d566e4774ffab1f","iv":"63bfe91464311dce7a31ea2e9125517b","mac":"4106dc6e65eb194d51ab3e7f384f651cf1045b8beeb59110e9bbf10ecace214c"}]},"nonce":1,"tssKeyTypes":{"default":"secp256k1"},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"246a392cfd37aaa4fefe1a67094d3a47421ab44b2826261cec0b2b276ebba0aa","y":"983dc77eca2cd1d24b3af2b7d5b012dd39fc72f309e9c8a0959f1e59c0c78fe2"},{"x":"6c48e72b3216356cf2323d39715438cecf3ead5029b50d8f17e0a1e4dd529d07","y":"eb503a9a5cdab363b555b58ea15bf4ce6b529f91d29e88b0c576afd2b9595b84"}]},"factorPubs":{"default":[{"x":"a3f5b8bfab2139a8d3f26779a6e506d1f189c49cad0f3706cfbd226e8625edf9","y":"97d94f2efe23ce915d8a642708347160b931fcc328dd195244e3cb1ffefbe0f2"}]},"factorEncs":{"default":{"a3f5b8bfab2139a8d3f26779a6e506d1f189c49cad0f3706cfbd226e8625edf9":{"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"a9f5c5884e124766c1a7822455d609068efb39406deabb6f04066b31f6f6f8327d8ddd6d9e22ac5790e389b961b8fc0f","ephemPublicKey":"041252d978c5f6802b1f4c4e839b3aaae85ddb4c69b901b301add422006a8a25b3187f3a087e34f5645ee92d1743320f98a8251e0d0178df90ae1736812c7dcaa5","iv":"b6565049616254a9f804b7a8feab4a5b","mac":"4f47a3d935cc5b12c817f146f86f5f1a9bae3dca2e73ca1e0de98aec2fd4891e"},"serverEncs":[]}}}}';

const legacyJSONEd25519 =
  '{"pubKey":"029e5d3a06bbe4659c7433403be59da2c51c99ed330e8f3e6225414769f865dcf3","polyIDList":["029e5d3a06bbe4659c7433403be59da2c51c99ed330e8f3e6225414769f865dcf3|03105e9ec1becf75eaa9e5a9888e3c0ab604982ffe1b1dea006bc6ed9ab43d079b|0x0|1|2d705790acf48c9801de266e335c2739ce0586c173d1f7d831d25b8219f64ca0"],"scopedStore":{},"generalStore":{"ed25519Seed":{"message":{"ciphertext":"166c8f4956886f32a097d864936e7abd01a286dd37f963566a7fb59b0333a244045aa3416c8e90e955d064a0504dcdb1","ephemPublicKey":"0430fe9ccd25f8a7c8f8cca21088ba26f64f33b318b0fcd8b9700a11a437bb615b7bbf319ac26db17e7a0a081f5b62538aea0b0ffe6b0d1601a80b6a097ee5b741","iv":"76cfbb21ef3d5bcf4501c7b6d041a4c5","mac":"00aaf75774260066c06ee7a06405865b3b899bfb5b7fb7f7ff3f52b219c8d4e7"},"publicKey":"044f4dcadc2941fcc76f6746993f900b8b737e3c6b56c14e0e39f4bec43cc555af6ebe794f7dc54ab326b3cf22400115d89b5d2d5ed220f79d876170981963c09c"}},"tkeyStore":{"tssModule":[{"ciphertext":"a8c50c080af2e182b67fbcc7f910332727cde888d929eb9a365e2e6937c68bb395b857ce3b535bd2805c899a8d1976e08578b2946409d124863238ea39cc67b82a4c29a7af9aa6ada36017f8e89cb46df6633b57401d66eb362f5c2a251aa296","ephemPublicKey":"0406f773c20a70b50cbd8a3f3b3b668819a5eb6fb047c6d732adcbac3940c6f216423e342147567a8b4c9eb8709745200974aa5ce9eb3c0b715cae81699b3bb788","iv":"28f4806fec2cbcc1ca831a49dbaf05f2","mac":"d3601afad4f69578e9647b8d93792abb498ae954cd5ce44e8bd156d4efbbb4b0"}]},"nonce":1,"tssKeyTypes":{"default":"ed25519"},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"2f963f06cb9d1e03b3f1654a4bed5b0674a31e64b3b488a63647fc380444b974","y":"703cd9ad9cf68ce8f50b1211a7e47ea1713077727ced731a2d833ae97f75f55c"},{"x":"25b411f18db3111060c9d4c26d1af7a0457812b597f855878ccbf4f3e3f65b79","y":"4448c04126cfee3feb6960781382d2896f9909bb3fac7aac6d9a7c6104059467"}]},"factorPubs":{"default":[{"x":"a24ec82353cff644b308c76f60703683d3a63fe845ba44e98b674aa865304fa","y":"dee6d45e36a85535a1e59c7c4820127f7dbd30900ca8b4052157e309ff72ab1e"}]},"factorEncs":{"default":{"0a24ec82353cff644b308c76f60703683d3a63fe845ba44e98b674aa865304fa":{"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"ec6234ec911339b26c68bb20ee5fb092fe834340472aa37746bc5c3884267188d2cfdddca886a88b52624ba03c43578d","ephemPublicKey":"04f3bc24184daf6ffb0a399952d547af94d51ef3748cae212e1d6d7dbd4c7191fc7e234cbf78bfef90fbf8944e921967916cd936359802369ea4243bfeefdfbcc3","iv":"5c48e8efb94490970619c3497f41282e","mac":"472df1907d85a0493bd74a84fab33de4c9a3383318098638fd0a0f334527eed5"},"serverEncs":[]}}}}';

describe("Metadata new Formatting tests", function () {
  it("#should serialize and deserialize into JSON seamlessly", async function () {
    const instance1 = Metadata.fromJSON(JSON.parse(legacyJSONSecp256k1));
    const instance1Serialized = instance1.toJSON();
    const instance2 = Metadata.fromJSON(instance1Serialized);
    deepEqual(instance1, instance2);

    try {
      LegacyMetadata.fromJSON(instance1Serialized);
      fail("LegacyMetadata should not able to deserialize latest format");
    } catch (e) {}
  });

  it("#should not able to serialize for legacy ed25510 metadata format", async function () {
    try {
      Metadata.fromJSON(JSON.parse(legacyJSONEd25519));
      // should not able to serialize ed25519 keyType as the postboxkey is from ed25519 network
      // multicurve only support postboxkey from secp258k1
      fail("should not reach here, new Metadata should not able to serialize legacy ed25519 metadata format ");
    } catch (e) {}
  });

  it("#should able to deserialize legacy JSON", async function () {
    const legacyInstance = LegacyMetadata.fromJSON(JSON.parse(legacyJSONEd25519));
    const legacyInstanceSerialized = legacyInstance.toJSON();
    equal(JSON.stringify(legacyInstanceSerialized), legacyJSONEd25519);

    const legacyInstance1 = LegacyMetadata.fromJSON(JSON.parse(legacyJSONSecp256k1));
    const legacyInstanceSerialized1 = legacyInstance1.toJSON();

    equal(JSON.stringify(legacyInstanceSerialized1), legacyJSONSecp256k1);

    const instance1 = Metadata.fromJSON(JSON.parse(legacyJSONSecp256k1));

    equal(instance1.version, METADATA_VERSION);
    equal(legacyInstance1.version, LEGACY_METADATA_VERSION);

    delete instance1.version;
    delete legacyInstance1.version;

    deepEqual(instance1, legacyInstance1);
  });

  // to add: add tests for different and multple tags and keytypes\
});
