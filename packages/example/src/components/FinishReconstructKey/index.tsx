import { FunctionComponent, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { ContentCopyRounded } from "@mui/icons-material";
import cn from "classnames/bind";
import styles from "./index.module.scss";
import CheckIcon from "../../assets/icons/check.svg";

const cx = cn.bind(styles);

const Finish: FunctionComponent<{ privKey: string }> = ({ privKey }) => {
  const [visibility, setVisibility] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(privKey);
    toast.success("Copied!");
  };

  return (
    <div className={cx("block")}>
      <img src={CheckIcon} />
      <Box width="100%">
        <Box component={Typography} variant="h5" textAlign="left">
          You are logged in!
        </Box>
        <Typography className={styles.description}>Congrats! You’ve successfully retrieved your tKey.</Typography>
        <div className={styles.result}>
          <input defaultValue={privKey} className={cx({ blur: !visibility })} />
          <div className={styles.copy} onClick={onCopy}>
            <ContentCopyRounded fontSize="small" />
            <Typography style={{ fontSize: 12, fontWeight: 500 }}>COPY</Typography>
          </div>
        </div>
        <Box component={Button} variant="contained" display="block" onClick={() => setVisibility((visibility) => !visibility)}>
          {visibility ? "Hide my private key" : "See my private key"}
        </Box>
      </Box>
    </div>
  );
};

export default Finish;
