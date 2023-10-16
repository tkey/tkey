import { forwardRef, ForwardedRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import cn from "classnames/bind";
import styles from "./index.module.scss";
import CheckIcon from "../../assets/icons/check.svg";

const cx = cn.bind(styles);

type ChildProps = { activeStep: number; onFinish: () => void };

const Finish = forwardRef<HTMLDivElement, ChildProps>(({ activeStep, onFinish }: ChildProps, ref: ForwardedRef<HTMLDivElement>) => {
  return (
    <div ref={ref} className={cx("block", { blur: activeStep !== 3 })}>
      <img src={CheckIcon} />
      <div>
        <Typography variant="h5">Done! Your key is all set up</Typography>
        <Typography className={styles.description}>You’ve successfully secured your key.</Typography>
        <Box component={Button} variant="contained" display="block" onClick={onFinish}>
          reconstruct my key
        </Box>
      </div>
    </div>
  );
});

export default Finish;
