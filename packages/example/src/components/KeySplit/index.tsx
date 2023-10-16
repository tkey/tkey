import { useState, forwardRef, ForwardedRef } from "react";
import { Button, Typography } from "@mui/material";
import { toast } from "react-toastify";
import cn from "classnames/bind";
import styles from "./index.module.scss";
import KeySplitImage from "../../assets/images/key-split.png";

const cx = cn.bind(styles);

type ChildProps = { activeStep: number; splitPrivKey: () => Promise<void>; onNext: () => void };

const KeySplit = forwardRef<HTMLDivElement, ChildProps>(({ activeStep, splitPrivKey, onNext }: ChildProps, ref: ForwardedRef<HTMLDivElement>) => {
  const [splitted, setSplitted] = useState(false);

  const split = async () => {
    try {
      await splitPrivKey();
      setSplitted(true);
    } catch (error) {
      console.log("🚀 ~ file: index.tsx:21 ~ split ~ error:", error);
      toast.error("Something went wrong");
    }
  };

  return (
    <div ref={ref} className={cx({ blur: activeStep !== 1 })}>
      <img src={KeySplitImage} className={styles.bigImg} />
      <Typography variant="h3">Split the private key</Typography>
      <Typography className={styles.description}>Gain better security by splitting your key into 3 shares</Typography>
      {splitted ? (
        <Button variant="contained" onClick={onNext}>
          Next
        </Button>
      ) : (
        <Button variant="contained" onClick={split}>
          split the private key
        </Button>
      )}
    </div>
  );
});

export default KeySplit;
