import { FunctionComponent, useContext, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import ThresholdKey from "@oraichain/default";
import { KeyDetails, ShareStore } from "@oraichain/common-types";
import { ContentCopyRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import Bowser from "bowser";
import styles from "./index.module.scss";
import StorageImage from "../../assets/images/device-storage.png";
import { Mode } from "../AuthFactors";
import { KeyGenContext } from "../../screens/KeyGen";
import { KeyReconstructContext } from "../../screens/KeyReconstruct";
import { getSecurityQuestionShare } from "../PasswordRecovery";
import CheckIcon from "../../assets/icons/check.svg";

const DeviceStorage: FunctionComponent<{ mode: Mode; tKey: ThresholdKey }> = ({ mode, tKey }) => {
  const {
    shares: { deviceShare },
  } = useContext(KeyGenContext);
  const {
    state: { numberShares, securityQuestionAnswer },
    setState,
  } = useContext(KeyReconstructContext);
  const [detectedDeviceShare, setDetectedDeviceShare] = useState<ShareStore>();

  const allowDevice = async () => {
    localStorage.setItem("device_share", JSON.stringify(deviceShare));
  };

  const detectDevice = async () => {
    try {
      let deviceShare: any = localStorage.getItem("device_share");
      deviceShare = JSON.parse(deviceShare);
      let keyDetails: KeyDetails;
      if (numberShares === 0 && deviceShare) {
        await tKey.initialize({ withShare: deviceShare, neverInitializeNewKey: true });
        keyDetails = tKey.getKeyDetails();
      } else {
        try {
          (tKey.modules.webStorage as any).setModuleReferences(tKey.getApi());
        } catch {}
        try {
          await (tKey.modules.webStorage as any).inputShareFromWebStorage();
        } catch (e) {
          throw new Error("Device share not found");
        }
        keyDetails = tKey.getKeyDetails();
      }
      setDetectedDeviceShare(deviceShare);
      setState({
        keyDetails,
        numberShares: numberShares + 1,
      });
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
        getSecurityQuestionShare({
          numberShares: numberShares + 1,
          setState,
          password: securityQuestionAnswer,
          tKey,
        });
      }
    } catch (error) {
      console.log("🚀 ~ file: index.tsx:23 ~ detectDevice ~ error:", error);
    }
  };

  const onCopy = () => {
    navigator.clipboard.writeText(detectedDeviceShare!.share.share.toString());
    toast.success("Copied!");
  };

  const browserInfo = Bowser.getParser(navigator.userAgent);
  const deviceInfo = `${browserInfo.getBrowser().name} ${browserInfo.getBrowser().version} ${browserInfo.getOS().name}`;

  return (
    <div className={styles.block}>
      <div className={styles.left}>
        <img src={StorageImage} alt="" />
      </div>
      <div className={styles.right}>
        <Box component={Typography} variant="h5" textAlign="left">
          {mode === Mode.Generate ? "Allow device storage" : "Detect device storage"}
        </Box>
        <div className={styles.buttons}>
          {!!detectedDeviceShare || (
            <Button variant="contained" onClick={mode === Mode.Generate ? allowDevice : detectDevice}>
              {mode === Mode.Generate ? "allow device" : "detect device"}
            </Button>
          )}
        </div>
        {mode === Mode.Reconstruct && !!detectedDeviceShare && (
          <>
            <div className={styles.result}>
              <input defaultValue={deviceInfo} />
              <img src={CheckIcon} alt="" />
            </div>
            <div className={styles.result}>
              <input defaultValue={detectedDeviceShare.share.share.toString()} />
              <div className={styles.copy} onClick={onCopy}>
                <ContentCopyRounded fontSize="small" />
                <Typography style={{ fontSize: 12, fontWeight: 500 }}>COPY</Typography>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceStorage;
