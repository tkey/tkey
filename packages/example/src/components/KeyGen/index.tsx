import { useEffect, useState, forwardRef, ForwardedRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ContentCopyRounded, Visibility } from "@mui/icons-material";
import { toast } from "react-toastify";
import cn from "classnames/bind";
import styles from "./index.module.scss";
import KeyGenImage from "../../assets/images/key-gen.png";

const cx = cn.bind(styles);

type ChildProps = { activeStep: number; privKey: string; genPrivKey: () => void; onNext: () => void };

const KeyGen = forwardRef<HTMLDivElement, ChildProps>(
  ({ activeStep, privKey, genPrivKey, onNext }: ChildProps, ref: ForwardedRef<HTMLDivElement>) => {
    const [title, setTitle] = useState("Create a private key");
    const [visibility, setVisibility] = useState(false);

    useEffect(() => {
      if (privKey) setTitle("Private key generated!");
    }, [privKey]);

    const onCopy = () => {
      navigator.clipboard.writeText(privKey);
      toast.success("Copied!");
    };

    const onShow = () => setVisibility(true);

    return (
      <div ref={ref} className={cx({ blur: activeStep !== 0 })}>
        <img src={KeyGenImage} className={styles.bigImg} />
        <Typography variant="h3" className={styles.title}>
          {title}
        </Typography>
        {privKey ? (
          <>
            <div className={styles.privkey}>
              <input defaultValue={privKey} className={cx({ blur: !visibility })} />
              {visibility ? (
                <div className={styles.copy} onClick={onCopy}>
                  <ContentCopyRounded fontSize="small" />
                  <Typography style={{ fontSize: 12, fontWeight: 500 }}>COPY</Typography>
                </div>
              ) : (
                <div className={styles.copy} onClick={onShow}>
                  <Visibility fontSize="small" />
                  <Typography style={{ fontSize: 12, fontWeight: 500 }}>SHOW</Typography>
                </div>
              )}
            </div>
            <Box component={Button} marginTop={1} variant="contained" onClick={onNext}>
              next
            </Box>
          </>
        ) : (
          <Button variant="contained" onClick={genPrivKey}>
            generate private key
          </Button>
        )}
      </div>
    );
  }
);

export default KeyGen;
