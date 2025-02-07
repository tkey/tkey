import { KeyType } from "@tkey/common-types";
import { deepEqual, equal, fail } from "assert";
import stringify from "json-stable-stringify";

import { LegacyMetadata, Metadata } from "../src";
import { LEGACY_METADATA_VERSION, METADATA_VERSION } from "../src/metadata";

const legacyJSONSecp256k1 =
  '{"pubKey":"03eac52f1c8c0c14664aa18eb51e74e3075010774dfbd5609912ccb00d80f887c9","polyIDList":["03eac52f1c8c0c14664aa18eb51e74e3075010774dfbd5609912ccb00d80f887c9|029be6a4725c1015f26ad3c9e2d99a85d22ab7ccd9ad475bcb2bb8d2d3d780f12e|0x0|1|dced44048f8eb1ce6b9c33ded4ccc755f1324db1e038f1f6062ad19cd05ea92f"],"scopedStore":{},"generalStore":{"ed25519Seed":{"message":{"ciphertext":"1ee343ad59a4640906a9ed1e8d6685c58cdc23fcc61d067ab0d19b6bdef87608a06e6926de3ee68cd57e8bdba3985f76","ephemPublicKey":"04693440ffeddc206f4533aae9b1a383ff6d157c3607dae31aeb7a1d882f3f09c0777107a5d9522f056b0512b72d38bca1d993ca48552c360b2e0f6bb103999d97","iv":"abefdacaaad4fb0c6ff097ef244d21a2","mac":"d35e93fc593c5fa87b57a1da4217fdd2ff798551196c34ab86c2eaf7c63e78c2"},"publicKey":"04527505afd3992141247eb4443d0db646e1b1fe675d8047183510681e3e62d75e220cc092558775b41b8a6fb1218e11c892a0b5db9c39c6c46c3e4489cfe348c8"}},"tkeyStore":{"tssModule":[{"ciphertext":"8d1fa8ee530ac2f6648cf0876c024f03838463fcf695a60191cf24e637cb0f086e0ed3fdf85b0715d4bde6cca8982ebd53bd098e37c8b290dde0a4cc2bc216bd6b4563a35ead70728faa75dad8cba08c8858340e1f130ed1e53b3dc36e896675","ephemPublicKey":"04e7fbbff48c90dfb7b889825197a0caf1f0b16f1e60904da43ed8fdd88be6e67216b032cafb5209dab3099eb6ae9c020aa2687b54940d0f287d566e4774ffab1f","iv":"63bfe91464311dce7a31ea2e9125517b","mac":"4106dc6e65eb194d51ab3e7f384f651cf1045b8beeb59110e9bbf10ecace214c"}]},"nonce":1,"tssKeyTypes":{"default":"secp256k1"},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"246a392cfd37aaa4fefe1a67094d3a47421ab44b2826261cec0b2b276ebba0aa","y":"983dc77eca2cd1d24b3af2b7d5b012dd39fc72f309e9c8a0959f1e59c0c78fe2"},{"x":"6c48e72b3216356cf2323d39715438cecf3ead5029b50d8f17e0a1e4dd529d07","y":"eb503a9a5cdab363b555b58ea15bf4ce6b529f91d29e88b0c576afd2b9595b84"}]},"factorPubs":{"default":[{"x":"a3f5b8bfab2139a8d3f26779a6e506d1f189c49cad0f3706cfbd226e8625edf9","y":"97d94f2efe23ce915d8a642708347160b931fcc328dd195244e3cb1ffefbe0f2"}]},"factorEncs":{"default":{"a3f5b8bfab2139a8d3f26779a6e506d1f189c49cad0f3706cfbd226e8625edf9":{"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"a9f5c5884e124766c1a7822455d609068efb39406deabb6f04066b31f6f6f8327d8ddd6d9e22ac5790e389b961b8fc0f","ephemPublicKey":"041252d978c5f6802b1f4c4e839b3aaae85ddb4c69b901b301add422006a8a25b3187f3a087e34f5645ee92d1743320f98a8251e0d0178df90ae1736812c7dcaa5","iv":"b6565049616254a9f804b7a8feab4a5b","mac":"4f47a3d935cc5b12c817f146f86f5f1a9bae3dca2e73ca1e0de98aec2fd4891e"},"serverEncs":[]}}}}';

const legacyJSONEd25519 =
  '{"pubKey":"029e5d3a06bbe4659c7433403be59da2c51c99ed330e8f3e6225414769f865dcf3","polyIDList":["029e5d3a06bbe4659c7433403be59da2c51c99ed330e8f3e6225414769f865dcf3|03105e9ec1becf75eaa9e5a9888e3c0ab604982ffe1b1dea006bc6ed9ab43d079b|0x0|1|2d705790acf48c9801de266e335c2739ce0586c173d1f7d831d25b8219f64ca0"],"scopedStore":{},"generalStore":{"ed25519Seed":{"message":{"ciphertext":"166c8f4956886f32a097d864936e7abd01a286dd37f963566a7fb59b0333a244045aa3416c8e90e955d064a0504dcdb1","ephemPublicKey":"0430fe9ccd25f8a7c8f8cca21088ba26f64f33b318b0fcd8b9700a11a437bb615b7bbf319ac26db17e7a0a081f5b62538aea0b0ffe6b0d1601a80b6a097ee5b741","iv":"76cfbb21ef3d5bcf4501c7b6d041a4c5","mac":"00aaf75774260066c06ee7a06405865b3b899bfb5b7fb7f7ff3f52b219c8d4e7"},"publicKey":"044f4dcadc2941fcc76f6746993f900b8b737e3c6b56c14e0e39f4bec43cc555af6ebe794f7dc54ab326b3cf22400115d89b5d2d5ed220f79d876170981963c09c"}},"tkeyStore":{"tssModule":[{"ciphertext":"a8c50c080af2e182b67fbcc7f910332727cde888d929eb9a365e2e6937c68bb395b857ce3b535bd2805c899a8d1976e08578b2946409d124863238ea39cc67b82a4c29a7af9aa6ada36017f8e89cb46df6633b57401d66eb362f5c2a251aa296","ephemPublicKey":"0406f773c20a70b50cbd8a3f3b3b668819a5eb6fb047c6d732adcbac3940c6f216423e342147567a8b4c9eb8709745200974aa5ce9eb3c0b715cae81699b3bb788","iv":"28f4806fec2cbcc1ca831a49dbaf05f2","mac":"d3601afad4f69578e9647b8d93792abb498ae954cd5ce44e8bd156d4efbbb4b0"}]},"nonce":1,"tssKeyTypes":{"default":"ed25519"},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"2f963f06cb9d1e03b3f1654a4bed5b0674a31e64b3b488a63647fc380444b974","y":"703cd9ad9cf68ce8f50b1211a7e47ea1713077727ced731a2d833ae97f75f55c"},{"x":"25b411f18db3111060c9d4c26d1af7a0457812b597f855878ccbf4f3e3f65b79","y":"4448c04126cfee3feb6960781382d2896f9909bb3fac7aac6d9a7c6104059467"}]},"factorPubs":{"default":[{"x":"a24ec82353cff644b308c76f60703683d3a63fe845ba44e98b674aa865304fa","y":"dee6d45e36a85535a1e59c7c4820127f7dbd30900ca8b4052157e309ff72ab1e"}]},"factorEncs":{"default":{"0a24ec82353cff644b308c76f60703683d3a63fe845ba44e98b674aa865304fa":{"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"ec6234ec911339b26c68bb20ee5fb092fe834340472aa37746bc5c3884267188d2cfdddca886a88b52624ba03c43578d","ephemPublicKey":"04f3bc24184daf6ffb0a399952d547af94d51ef3748cae212e1d6d7dbd4c7191fc7e234cbf78bfef90fbf8944e921967916cd936359802369ea4243bfeefdfbcc3","iv":"5c48e8efb94490970619c3497f41282e","mac":"472df1907d85a0493bd74a84fab33de4c9a3383318098638fd0a0f334527eed5"},"serverEncs":[]}}}}';

const multiCurveJson =
  '{"pubKey":"022dd7f0a0b54953304e94e861373ab9fe9c36930f9bc4804efa06b1d472f62ade","polyIDList":["022dd7f0a0b54953304e94e861373ab9fe9c36930f9bc4804efa06b1d472f62ade|0341267f01008fc085e2c2bb3f508422e1410e641a5f297fa14bd57d32d7e97a87|0x0|1|731d22b16ae27306e045e6121dc9c43754dfbdb6e28a59879e054bb0772673d","022dd7f0a0b54953304e94e861373ab9fe9c36930f9bc4804efa06b1d472f62ade|034f25e3aeea954b8ddf033d00a8657c227c3e243177795c303476ffa2fd104c9b|0x0|1|731d22b16ae27306e045e6121dc9c43754dfbdb6e28a59879e054bb0772673d|969cf4076b10ba9276e44964915cc97c2984ff29cb1d2de8f2c10fb9dfa35279"],"scopedStore":{},"generalStore":{"ed25519Seed":{"message":{"ciphertext":"afde6d2044edce2f9e106bfe7b03bc716b1f4f9d765c70aa04d10089b07141e5ab2eff80a2c74798e6e44129403f4fc4","ephemPublicKey":"041a719598c138c0b5d2f1cc12b4348bed2c5c253360bb1f855f1eb7df53746047892f69655727f672f3a81bcdcc8e5816cc1f2b2b822e4e79a88cac83c3a30dfc","iv":"c846c938f752825764f0bd0fbbceaf50","mac":"013adaa31e31ab19300e1a5979a2728a53e324689b92677cbd55f0cb938ac138"},"publicKey":"047ecfc14f54a87dc25a4c839d71d9e80046f71141e42b339faa60c2f28601fa1870f68c19c5004f52ddf2f3d17f779ad1ece0d13d981afd294645d4f29a2d20c5"},"ed25519Seed/default":{"message":{"ciphertext":"9a2667945f75aa35c25358439d8f8f578fac22e99d31342d11eef32879a66c286cfae76218d16bdd3b881260f40353ff","ephemPublicKey":"046a6fccfabb06d73580143981d61e2a8d9fc4a02da99421dddef57248cd64976606a79d19cdafc42129ab39b3c80a64ccde7bd805a36cea519b57da43c6d0f195","iv":"179e3c25c68cbd5d4be06c32b7d12a6a","mac":"f4e6e500fd60c275544857ed4750487267394bf7002eed13aa4816ebbcd457b2"}}},"tkeyStore":{"tssModule":[{"ciphertext":"57ed48f042da6bac2774b48a6815476f75d09d16043bb800c92b3b04ca6ccc28fd79adfcfa11f96a7a27e28645376428f9b02c8bc0e454d190ec3880e9a9387d7dcc7300d4adef4080a847e648170b551473297b200c6781a2ea265b8db75ca3","ephemPublicKey":"04e440f6d8990c148c750bb21dbdec7dabf4f6ffe1c5c30b5640e42b2b81b02ce40073dd0ca43cee74a95fb90a25588ba05ca65da83e9377829c563b10fa000e5e","iv":"701b9f3f8f790588e47af25eff5db67e","mac":"453977ff17be129f2f17bee349e7b1bf74ae8da436b79e70f236ba470e4d5d40"}]},"nonce":5,"version":"1.0.0","tss":{"default":{"secp256k1":{"tssTag":"default","tssKeyType":"secp256k1","tssNonce":0,"tssPolyCommits":[{"x":"75e2914f29baefcadb5aea5ada6aa8ca0f2edef47f090bd55ec87fd1c68ef6a","y":"3be3fd7188f951bab6af03445c16642e70bfe720995f8d7d406f198ea451339a"},{"x":"860dcf8b742ebd9c35a43adc0a54ad5ca122f1df20f0c8cf65ae01637d988f9c","y":"96b5669497209e94b3f75d658a17a19bba66a6ea5337b77dec0920c9279999f0"}],"factorPubs":[{"x":"62bdf332bd2c64e38ea6085ddb16133a293f59d0f2efc7e89388e250b232da74","y":"ea06f717886022b9592b5504c0fbd1272080a39d57ca869bac34b05abeba9090"}],"factorEncs":{"62bdf332bd2c64e38ea6085ddb16133a293f59d0f2efc7e89388e250b232da74":{"serverEncs":[],"tssIndex":3,"type":"direct","userEnc":{"ciphertext":"60f413ae1985ff6abd10995bc9d75707d76f1bcde659b60f9f78f37549d346156209d74ec672403d01911b246db05769","ephemPublicKey":"04c7ee61df6af27917edacd194be2429575a173eb77fdde5e351a3a7ad30cacdfbb889242e689f5eb6bdd11deacadbc3c592c9881eac8551b7c792bb993a1b0321","iv":"305724b2455de8e516cd90a01c5e7adb","mac":"719ac67e41fa159e9736e3d1cb4b858e9c38c7faff3b9c2fe63ca99d82ac2452"}}}},"ed25519":{"tssTag":"default","tssKeyType":"ed25519","tssNonce":0,"tssPolyCommits":[{"x":"202c3557a7cad9102c0cfbcaab765277018f3e680c9c3eb35c0cb69fa07788b8","y":"45f1cb0bffba15dd562811694864a228ea1908eb1c3ca9cd90899c1a92ca85e3"},{"x":"7e271298f3c9c9386dc611e9c57a0031fdd17aeea17423073961f815b95fa833","y":"dbe5d48e51e01df6b236315568b60dc3e513b72cb07b9613f7aaed2c1bff5fb"}],"factorPubs":[{"x":"62bdf332bd2c64e38ea6085ddb16133a293f59d0f2efc7e89388e250b232da74","y":"ea06f717886022b9592b5504c0fbd1272080a39d57ca869bac34b05abeba9090"}],"factorEncs":{"62bdf332bd2c64e38ea6085ddb16133a293f59d0f2efc7e89388e250b232da74":{"type":"hierarchical","tssIndex":3,"userEnc":{"ciphertext":"d57f7f23f71348ea8a7479e10e085d074119c12bab5df45283e69ba3ef2a7e3dd9ecb7c962eceea265b302509ed67bad","ephemPublicKey":"048627e20c599e4fe3c5dd4fc3af7b45111f4a991f8e6ffb5c92da33f4b2fbfbacfc064b7abf27fb602b4fff8af0e01ed1ac1beaaaed373f954dde914237a27cca","iv":"6f0c006ea1ceea25167304a4d2a9c80e","mac":"31932b2647b821fc833ae625b54c8085dab9791d534457c92e220e1e00fbb73c"},"serverEncs":[{"ciphertext":"ebc855e5c04ca52f3a03a704f66fdaa6aa503760a267a8c0311554f89954096ea5bb16016037bcc9f86157ef8fd115f4","ephemPublicKey":"045fc8623ed91c3b11013d2a43da4ea1c82a46ad25158941c711397d2bfac8224a37287a93c882e55cab5ab14f45dcd82d0ee8f20ee41ffed11120820fabbd4863","iv":"30bc8a9549fdb55682e2a8dec4411884","mac":"f375aff236cb31763fb61e8bd242069a6e193b1e036b811daf2d4a354c021df7"},{"ciphertext":"eae57b0956202e6ccbd53bd5c6df568fc8b6b33242fad894333f27461e28021ba01599757109a9879526ff15a465e7d2","ephemPublicKey":"049f78eb19d31f29905596a2371ebdcc98b1beee9ab15f700974e994e254884b5df30c6bd14b3cba9f8fdcd5e36846b7fc52cf89012ebb8c9fbdee2cdd164db7c8","iv":"4d1372010b4fd0312b0bb1c089d5e2b4","mac":"70f1f77be28f2be39191e0f3af5be330776563428c469a8072af2704173d42df"},{"ciphertext":"bba1839361e43a86545d37bfcb76290b20981822cc83e6701468b89fa5c4a4dae3fb2f9130972749aaf0f1c378800347","ephemPublicKey":"04256e36cd09417399f2cff9ea02769bb102710ad7ac8704aa30b18c062256eab7f6337eb2269525fd3e96cc606e1288fe02d3b0e2ae99d4c1f556b93d6f9bfc83","iv":"2491273bae809df6df55df024726ebfd","mac":"571d7ff4e44433c67b9aff92457e241cdad281034075dfffcd48250fb4a78d78"},{"ciphertext":"e3dad5f1b33dc9ddadb2255e2864ad07573d2e0f38e2d2462380329e04cdf7cfeca1059754493be96b2c51a3464210dd","ephemPublicKey":"040ce0a9bf20b79ebca6f1de32021d575d86a4526e1df1ab67e7552e37969bceefba9983cc3c29cb4e41916359e7416ec4c0ebd385203a2f6ae77ae6aa5405ba73","iv":"8d1f802b158a8cdebc8c4157b099a0d3","mac":"a00163b3e7ccd900dd12b7c28e3e999ae018324155dac298eb3038e656982876"},{"ciphertext":"3945f770ce1057e31e64951815922be8577cbc3135b3b9f2488090b86898a579a466a2f792680f0329e9f75ef252cb41","ephemPublicKey":"041f4517c1c8932d13d564f04d0ab735a57f79ca415aeac4b7c1d6c08e4d9cac7111df7dc39df122d80b6e5be9b734bc2c89a3598a8b7138368300ebc4604c29a2","iv":"42ee1817d55cd8e3c8c76b1d82df5d81","mac":"3ad2fe6595bbf40235ae62d53debee60428bf25da6b3e8fabd14238bcb5bfebb"}]}}}},"imported":{"secp256k1":{"tssTag":"imported","tssKeyType":"secp256k1","tssNonce":0,"tssPolyCommits":[{"x":"8a41efc52c76684c21f7898a9035a5f64d14e184a70d55bf28adfefc8fc75b3","y":"8422d404ebe92f25ac0725a32e39c1c6e4a2108e535f3615a7d7348e9e843e8e"},{"x":"14c77d1851981790e379c5545c7712b5f9fc9d566e1d9cdb20bc2a0ebe5910b6","y":"b08f3294a70f3e966c3ab194314c31dcbe9a5ea02e0bb24ab4b47487f8b085db"}],"factorPubs":[{"x":"62bdf332bd2c64e38ea6085ddb16133a293f59d0f2efc7e89388e250b232da74","y":"ea06f717886022b9592b5504c0fbd1272080a39d57ca869bac34b05abeba9090"}],"factorEncs":{"62bdf332bd2c64e38ea6085ddb16133a293f59d0f2efc7e89388e250b232da74":{"type":"hierarchical","tssIndex":2,"userEnc":{"ciphertext":"9eb4d12aa6f30aa297ffcf17826826251238458e1712b75af80db4265e5a7fe4b9f5bc4e79f73255ba92bab108a98a4d","ephemPublicKey":"043408f0f43963c2fb5c6da759113a9f12616eb435cb181e565a9a66cf898589b3fec9b597abe0fffd4d8f9b10def94795dc40b43e9ef3dfa7c3761be63326a3fc","iv":"359b79f10ca00470d13756f96463eeb8","mac":"1fc2f9842b9e86117b2d53f95f8d69433308589620628aa66c50d210181ee950"},"serverEncs":[{"ciphertext":"80dc41ca3cb42187ace1fa2553daf456ea80c845158af21dce9c2722ad781f942551b8854eb0cdb686980f0cfe6ccd64","ephemPublicKey":"042179cb3af6d8b625cf410026f8c9b74c3dd1d6e2c25db7060507e58ae46a30c8f8adb3d4f7c47bcc3d031ed795c76736eb8879f02b5f9862b06de2c0c83ad74f","iv":"4ee3ba08a424a212a53faff89f40a35e","mac":"02cfff72863b1ef3b217a7d868ed812ac2fc948abdaec7f8c77a7383afcef413"},{"ciphertext":"cb51445f28f518c371637d182954dfb2dfffd1e3a58b9c5089557db269cea8983359f8b4012c9965d2c6368598044256","ephemPublicKey":"04abec93a4d9405512d6b0fe3c9f6283744a9175c2b5e82a90bba0fedecbb22583dd526cf1858b07690f53ca7e621a81a3217635a9739e79aba0fba6e332eeec4f","iv":"e89e8bb153becbc3f2c304be0d8b02f8","mac":"770c3274a8d968897f518f8a9a019e47500e91c35461ab44735de72adef3494f"},{"ciphertext":"3b98c46a54419fa2a6419cef43f505c9fccdb928fcb2f70179d751c3e155124dcf8ee4ad6b536367bc635856c52e8f66","ephemPublicKey":"048c05e675a6465044b9c5b8acb32226707af9e04f972703a18ec75920960bdca813dc0a1a4632afd74ccdebcdd9a1d8ea6f1b3b599d8f2a841301fd19c4ee0ffe","iv":"b0cfb6ec0ac4f150590b02ec2442e19d","mac":"adc65ed18f982ce229ed3ba404a357c9f4e6fb89d40b926e6b791cbcd205304d"},{"ciphertext":"1050f582da2d571016552385cbd8d5db9b7b2b024dfd406ebcf8b422b5c9b32ab5b4af3c921e8ed0bb6244f56a39de9b","ephemPublicKey":"046a44e351f2b9fb45b114457d7afd505837065d0c3d76d6af0cc831e7ee46c93bac9849ad56f8f131ec1f934836dfba23367f590e1aa2bf312195f4d1aed1ba4a","iv":"149473b0ca24ede8663e5e0a404a8832","mac":"9859c6e77a1cb2951b955449448a81f3c7f8b14b03b981b461fdf2c2857b1527"},{"ciphertext":"4a26f1e6dafeaa2a03189f0f0dbae8aa3cf3bfc6b5da88ad145ca4b3a2d7284d0ed086d1e2910b3f6cdd23dd64987e46","ephemPublicKey":"04694c715117852d1dc1d90504b1ca1b920cbb9c107ef9ee9929440e2e21b4d4fba14bac27524a43bc33cfb9b3d2f3c93973ccb20c322fa933e9e9631c3c904122","iv":"ed8adfd3806b4e57e9e384a4a308dbca","mac":"d053605e9c44083a128897d5deb600764f8ca104c57a4597bd1c143ccdbb963b"}]}}}}}}';

const mpcBackwardCompebilityTestJson =
  '{"factorEncs":{"default":{"16e9809395ce9078a8a510ddf613cea148a3a23049fd3948587b4fec28d68f92":{"serverEncs":[],"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"ee307c87b733170222ef93048201c7c995544ac51eb648fbdea992a77d71f46e8a62c617caf20f3208d59ebc7f0a9e91","ephemPublicKey":"041c158020f3341b911d5b3a9cb70b29b7a7d327ab6b92134634bb0ed8e0461b4dfa7e0eeb8185365faefbbd37fea5e72540ed9a0bea65b3a4e6008f89c8bf796e","iv":"5a8ddd80c74dac65d1a8bd8aee110d4c","mac":"bf25a4d8411a2d3b432bd8806e699ac144fccf7f52f937b5657365a06d9d97ec"}}}},"factorPubs":{"default":[{"x":"16e9809395ce9078a8a510ddf613cea148a3a23049fd3948587b4fec28d68f92","y":"212e94e3b9e811802f1a47212a3cbc7ada4a7f993fc07e6be5340af40dd0d852"}]},"generalStore":{"shareDescriptions":{"0216e9809395ce9078a8a510ddf613cea148a3a23049fd3948587b4fec28d68f92":["{\\"module\\":\\"hashedShare\\",\\"dateAdded\\":1709020898217,\\"tssShareIndex\\":2}"]}},"nonce":172,"polyIDList":["03b3951a441f87ecea4672edc82894ac023316723cf164a93adec72b58a27a1f06|022909d9743f792d6adc3e16ce53d825230ad9b0b35574a34965a2e73a0f53b608|0x0|1|51b0891f3fed9f9f4ce7dde0710770a3d5b597d4c575460df431f907c9ee4e0a"],"pubKey":"03b3951a441f87ecea4672edc82894ac023316723cf164a93adec72b58a27a1f06","scopedStore":{},"tkeyStore":{"tssModule":[{"ciphertext":"04463425d186330813e4abefcdbcb786a0d22bd0067c4b81a584aec3989412ac3cb9a928c8be454245f60f08de08f7277a96c8d9ca292bdef4c4d26f0c6142d6618d8d1b0049812f8a95c372bc9e0eb87cf348152cf56239a289721c2c2ae2a3","ephemPublicKey":"0479cb39633e70992c3748447cd532982618ee89f451f4d2d123dd86871b62101bdf9ab98370f4ab46fde938777ae81bf05efe425e52a6ee375df825016720af76","iv":"211b9ecef309e477566a629b4c5e6e04","mac":"8277407d112e9e369408d1bc2b5086553d5d5a141373381aea06e1b0e5809676"}]},"tssKeyTypes":{},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"d2869f27c3e226d90b275b008f7dc67b8f4b208900a7b98ecc4e5266807d382c","y":"15860fd569413eb7f177e655c4bf855f37920b800235de344fdd518196becfe0"},{"x":"15901123759ec65786e6a4059c6763c1da26c64f4d89b733e9d4676f29168697","y":"18d33eb0bc491ad401352b1980fba1fa864850dd895ae470b69577a6a0451719"}]}}';

const mpcBackwardCompebilityTestJson1 =
  '{"factorEncs":{"default":{"e8e9f13e3552e7c8e4241f4c6f30f6461ce1ad5913a0d506a662abf8611d5398":{"serverEncs":[],"tssIndex":2,"type":"direct","userEnc":{"ciphertext":"a112e64ecb7396593486b0c4e4ca89ffec92ca01c59bbb89d4ca171519e36c4ccd3837096c2160482a0f455241ea71cf","ephemPublicKey":"049abfb15a3d8d8de9ce3d16afdb2dccf1c5002b8a794ec001852c33d8b58a02ff73657862225adde1c691d3e453f41eee83190804dc3004d8d6eb38c994c1e84f","iv":"6a1a9f32e748e6b35a6e4e6ad16eba17","mac":"ff11055118d8cb7feedabab07dd56d132a7d81461eacbe097a0378bf1302f39e"}}}},"factorPubs":{"default":[{"x":"e8e9f13e3552e7c8e4241f4c6f30f6461ce1ad5913a0d506a662abf8611d5398","y":"5ebe4e2c5b7b63161e1720c74391a7371a272b97b59ad2090f086fac74fd9a1a"}]},"generalStore":{"shareDescriptions":{"02e8e9f13e3552e7c8e4241f4c6f30f6461ce1ad5913a0d506a662abf8611d5398":["{\\"module\\":\\"hashedShare\\",\\"dateAdded\\":1720420195095,\\"tssShareIndex\\":2}"]}},"nonce":3,"polyIDList":["03bb90f3505fc1b059a941b60d94ba6c3eefba9e425aa4056729e7b3ab6a545735|025d18273218bf7b1a418f6d10f9dc2ba09303f10c39597684d261068b1063c867|0x0|1|8bb341daba92bfbf500578c1bbd2a05178513470c3dc6e9704996636b33fdf4"],"pubKey":"03bb90f3505fc1b059a941b60d94ba6c3eefba9e425aa4056729e7b3ab6a545735","scopedStore":{},"tkeyStore":{"tssModule":[{"ciphertext":"b1f975cc8ad6b8a3c6d47bf5a9699ae610c6130a903d6d652635d6592c2b80ab971f15d7b443320926fbac51dd33b160c0ccc5e91d4acff6d2645e2b25be8b7c4c9e989bd777893f6e251cf5b5251f9909ffb2b91b644a576ba02aede66bd2f1","ephemPublicKey":"04591474bd11b87545942e6bd0453464f39435c4c2733926b6d5e34c74c0a8e9cb56f27abaa3703e9488e34c915a523709dc7894866a1dce6e212ea4438452db4b","iv":"b2621fa8ba8212ebcc6e245440c251d6","mac":"446a459f68aa47fb3531f1c45cea98f6eceafab69d6a4f6e39d973ad38650a3e"}]},"tssNonces":{"default":0},"tssPolyCommits":{"default":[{"x":"37d65458d3161aeaa6fa76452384b87d34cf1de6bc2d42503e5f9060ce7c7818","y":"f8b4d3fe1c4bd727f0ce6195c3487251f9f37885fddc2636a6fdc2c2fa605bda"},{"x":"c9cbede6afbbf78844dbad83746ad02cee0ada30d784017053ffdd3f88259219","y":"c4650c915d10010ba079b80c2f5594eb4607c17802e07b5c13b32e7fab29ed9d"}]}}';

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
  it("#should able to deserialize new JSON format with multicurve", async function () {
    const instance = Metadata.fromJSON(JSON.parse(multiCurveJson));
    const instanceSerialized = instance.toJSON();
    equal(JSON.stringify(instanceSerialized), multiCurveJson);
  });
  // to add: add tests for different and multple tags and keytypes\
  it("#should able to deserialize new JSON format with backwardcompability test", async function () {
    const instance = LegacyMetadata.fromJSON(JSON.parse(mpcBackwardCompebilityTestJson));
    const instanceSerialized = instance.toJSON();

    // delete for matching purpose ( jsonstring provide do no have tssKeyTypes.default keytype)
    delete instanceSerialized.tssKeyTypes.default;
    equal(stringify(instanceSerialized), mpcBackwardCompebilityTestJson);

    // try to deserialize using new metadata format
    const instance1 = Metadata.fromJSON(JSON.parse(mpcBackwardCompebilityTestJson));
    const instance1Serialized = instance1.toJSON();

    const instance2 = Metadata.fromJSON(instance1Serialized);
    // check deserialized new format is deep equal
    deepEqual(instance1, instance2);

    // check legacy and new format is deep equal
    deepEqual(instance1.getTssData(KeyType.secp256k1, "default"), instance.getTssData(KeyType.secp256k1, "default"));

    delete instance1.version;
    delete instance.version;

    deepEqual(instance1, instance);
  });

  it("#should able to deserialize new JSON format with backwardcompability1 test", async function () {
    const instance = LegacyMetadata.fromJSON(JSON.parse(mpcBackwardCompebilityTestJson1));
    const instanceSerialized = instance.toJSON();

    // delete for matching purpose ( jsonstring provide do no have tssKeyTypes.default keytype)
    delete instanceSerialized.tssKeyTypes;
    equal(stringify(instanceSerialized), mpcBackwardCompebilityTestJson1);

    // try to deserialize using new metadata format
    const instance1 = Metadata.fromJSON(JSON.parse(mpcBackwardCompebilityTestJson1));
    const instance1Serialized = instance1.toJSON();

    const instance2 = Metadata.fromJSON(instance1Serialized);
    // check deserialized new format is deep equal
    deepEqual(instance1, instance2);

    // check legacy and new format is deep equal
    deepEqual(instance1.getTssData(KeyType.secp256k1, "default"), instance.getTssData(KeyType.secp256k1, "default"));

    delete instance1.version;
    delete instance.version;

    deepEqual(instance1, instance);
  });
});
