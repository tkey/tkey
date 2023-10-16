import { useState } from "react";
import { Container } from "@mui/material";
import Header from "./components/Header";
import styles from "./App.module.scss";
import KeyGenScreen from "./screens/KeyGen";
import KeyReconstructScreen from "./screens/KeyReconstruct";

export enum Tab {
  Generate,
  Reconstruct,
}

function App() {
  const [tab, setTab] = useState(Tab.Generate);

  const onKeyGenFinish = () => {
    setTab(Tab.Reconstruct);
  };

  return (
    <div className={styles.app}>
      <Header tab={tab} setTab={setTab} />
      <Container className={styles.content}>
        <>
          {tab === Tab.Generate && <KeyGenScreen onFinish={onKeyGenFinish} />}
          {tab === Tab.Reconstruct && <KeyReconstructScreen />}
        </>
      </Container>
    </div>
  );
}

export default App;
