import { FunctionComponent, useRef, useState, createContext, useEffect } from "react";
import { generatePrivate } from "@toruslabs/eccrypto";
import { BN } from "bn.js";
import { ShareStore } from "@oraichain/common-types";
import AuthFactors, { Mode } from "../../components/AuthFactors";
import Finish from "../../components/FinishGenKey";
import KeyGen from "../../components/KeyGen";
import KeySplit from "../../components/KeySplit";
import Stepper from "../../components/Stepper";
import { tKey } from "../../tkey";

export const KeyGenContext = createContext<{
  shares: {
    serviceProviderShare?: ShareStore;
    deviceShare?: ShareStore;
    securityQuestionShare?: ShareStore;
  };
}>({
  shares: {},
});

const KeyGenScreen: FunctionComponent<{ onFinish: () => void }> = ({ onFinish }) => {
  const keyGenRef = useRef<HTMLDivElement | null>(null);
  const keySplitRef = useRef<HTMLDivElement | null>(null);
  const authFactorsRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [privKey, setPrivKey] = useState("");
  const [shares, setShares] = useState({});

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const genPrivKey = () => {
    const privKey = generatePrivate();
    console.log("🚀 ~ file: index.tsx:26 ~ genPrivKey ~ privKey", privKey.toString("hex"));
    setPrivKey(privKey.toString("hex"));
  };

  const splitPrivKey = async () => {
    await (tKey.serviceProvider as any).init({ skipSw: false, skipPrefetch: false });
    await tKey.initialize({
      importKey: new BN(privKey, "hex"),
    });
    const serviceProviderShare = tKey.outputShareStore("1");
    const { privKey: reconstructedKey } = await tKey.reconstructKey(false);
    const deviceShare = await (tKey.modules.webStorage as any).getDeviceShare();
    console.log(new BN(privKey, "hex").cmp(reconstructedKey));
    setShares({
      serviceProviderShare,
      deviceShare,
    });
  };

  const onKeyGenNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
    keySplitRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const onKeySplitNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
    authFactorsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <KeyGenContext.Provider value={{ shares }}>
      <Stepper activeStep={activeStep} />
      <KeyGen activeStep={activeStep} privKey={privKey} genPrivKey={genPrivKey} onNext={onKeyGenNext} ref={keyGenRef} />
      <KeySplit activeStep={activeStep} splitPrivKey={splitPrivKey} onNext={onKeySplitNext} ref={keySplitRef} />
      <AuthFactors activeStep={activeStep} setActiveStep={setActiveStep} mode={Mode.Generate} tKey={tKey} ref={authFactorsRef} />
      <Finish activeStep={activeStep} onFinish={onFinish} ref={finishRef} />
    </KeyGenContext.Provider>
  );
};

export default KeyGenScreen;
