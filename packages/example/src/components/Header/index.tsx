import { Dispatch, SetStateAction, FunctionComponent } from "react";
import { Container } from "@mui/material";
import styles from "./index.module.scss";
import cn from "classnames/bind";
import { Tab } from "../../App";

const cx = cn.bind(styles);

const Header: FunctionComponent<{ tab: Tab; setTab: Dispatch<SetStateAction<Tab>> }> = ({ tab, setTab }) => {
  return (
    <div className={styles.header}>
      <Container>
        <div className={styles.toolbar}>
          <div className={cx("button", { active: tab === Tab.Generate })} onClick={() => tab !== Tab.Generate && setTab(Tab.Generate)}>
            Generate Private key
          </div>
          <div className={cx("button", { active: tab === Tab.Reconstruct })} onClick={() => tab !== Tab.Reconstruct && setTab(Tab.Reconstruct)}>
            Reconstruct Private key
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Header;
