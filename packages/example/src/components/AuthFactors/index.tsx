import { forwardRef, ForwardedRef, Dispatch, SetStateAction } from "react";
import { Typography } from "@mui/material";
import ThresholdKey from "@oraichain/default";
import cn from "classnames/bind";
import SocialLogin from "../SocialLogin";
import DeviceStorage from "../DeviceStorage";
import PasswordRecovery from "../PasswordRecovery";
import styles from "./index.module.scss";
import KeyImage from "../../assets/images/key.png";

const cx = cn.bind(styles);

export enum Mode {
  Generate,
  Reconstruct,
}

type ChildProps = { activeStep?: number; setActiveStep?: Dispatch<SetStateAction<number>>; mode: Mode; tKey: ThresholdKey };

const AuthFactors = forwardRef<HTMLDivElement, ChildProps>(
  ({ activeStep, setActiveStep, mode, tKey }: ChildProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div ref={ref} className={cx({ blur: activeStep !== 2 && activeStep !== 3 && mode === Mode.Generate })}>
        <img src={KeyImage} alt="" className={styles.bigImg} />
        <Typography variant="h3">{mode === Mode.Generate ? "Set up authentication factors" : "Reconstruct your key"}</Typography>
        <Typography className={styles.description}>
          {mode === Mode.Generate
            ? "Pair each key share with an authentication factor"
            : "Reconstruct your full key by using 2 of the following authentication factors:"}
        </Typography>
        <SocialLogin tKey={tKey} mode={mode} />
        <DeviceStorage mode={mode} tKey={tKey} />
        <PasswordRecovery setActiveStep={setActiveStep} mode={mode} tKey={tKey} />
      </div>
    );
  }
);

export default AuthFactors;
