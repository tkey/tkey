import { FunctionComponent, useEffect, useState, useContext } from "react";
import ThresholdKey from "@oraichain/default";
import { Typography } from "@mui/material";
import styles from "./index.module.scss";
import SpeechBubbleImage from "../../assets/images/speech-bubble.png";
import GoogleSignInImage from "../../assets/images/google.png";
import { Mode } from "../AuthFactors";
import { KeyGenContext } from "../../screens/KeyGen";
import { KeyReconstructContext } from "../../screens/KeyReconstruct";
import { getSecurityQuestionShare } from "../PasswordRecovery";

const SocialLogin: FunctionComponent<{ tKey: ThresholdKey; mode: Mode }> = ({ tKey, mode }) => {
  const {
    shares: { serviceProviderShare },
  } = useContext(KeyGenContext);
  const {
    state: { numberShares, securityQuestionAnswer },
    setState,
  } = useContext(KeyReconstructContext);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await (tKey.serviceProvider as any).init();
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  const triggerLoginKeyGen = async () => {
    if (!tKey || loading) return;
    setLoading(true);
    try {
      const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
        typeOfLogin: "google",
        verifier: "tkey-google",
        clientId: "349137538811-8t7s7584app6am5j09a2kglo8dg39eqn.apps.googleusercontent.com",
      });
      console.log("🚀 ~ file: index.tsx:22 ~ triggerLogin ~ loginResponse:", loginResponse);
      await tKey.storageLayer.setMetadata({ input: serviceProviderShare, serviceProvider: tKey.serviceProvider });
      await tKey.getKeyDetails();
      await tKey.addShareDescription("1", JSON.stringify({ module: "serviceProvider", id: loginResponse.userInfo.email }), true);
    } catch (error) {
      console.log("🚀 ~ file: index.tsx:23 ~ triggerLogin ~ error:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerLoginKeyReconstruct = async () => {
    if (!tKey || loading) return;
    setLoading(true);
    try {
      const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
        typeOfLogin: "google",
        verifier: "tkey-google",
        clientId: "349137538811-8t7s7584app6am5j09a2kglo8dg39eqn.apps.googleusercontent.com",
      });
      console.log("🚀 ~ file: index.tsx:22 ~ triggerLogin ~ loginResponse:", loginResponse);
      const metadata: any = await tKey.storageLayer.getMetadata({ serviceProvider: tKey.serviceProvider });
      if (metadata.message === "KEY_NOT_FOUND") throw new Error("key has not yet been generated");
      const latestShareDetails = await tKey.catchupToLatestShare({ shareStore: metadata });
      let keyDetails;
      if (numberShares === 0) {
        keyDetails = await tKey.initialize({ withShare: metadata, neverInitializeNewKey: true });
      } else {
        if (latestShareDetails.shareMetadata.pubKey.x.toString("hex") !== tKey.metadata.pubKey.x.toString("hex")) {
          throw new Error("Different google login account was used to generate tkey. Please use the same account.");
        }
        await tKey.inputShareStoreSafe(latestShareDetails.latestShare);
        keyDetails = tKey.getKeyDetails();
      }
      setState({ numberShares: numberShares + 1, keyDetails });
      if (numberShares + 1 >= 2 && keyDetails.requiredShares <= 0) {
        try {
          const { privKey } = await tKey.reconstructKey();
          setState({ privKey: privKey.toString("hex") });
          return;
        } catch (error: any) {
          console.log(error);
          throw new Error(error);
        }
      }
      if (securityQuestionAnswer) {
        getSecurityQuestionShare({ numberShares: numberShares + 1, setState, password: securityQuestionAnswer, tKey });
      }
    } catch (error) {
      console.log("🚀 ~ file: index.tsx:23 ~ triggerLogin ~ error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.block}>
      <div className={styles.left}>
        <img src={SpeechBubbleImage} alt="" />
      </div>
      <div className={styles.right}>
        <Typography variant="h5">Pair with your social login</Typography>
        <img src={GoogleSignInImage} alt="" onClick={mode === Mode.Generate ? triggerLoginKeyGen : triggerLoginKeyReconstruct} />
      </div>
    </div>
  );
};

export default SocialLogin;
