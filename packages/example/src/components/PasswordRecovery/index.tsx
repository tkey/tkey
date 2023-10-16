import { Dispatch, FunctionComponent, SetStateAction, useContext, useState } from "react";
import { VisibilityOutlined, VisibilityOffOutlined } from "@mui/icons-material";
import { toast } from "react-toastify";
import ThresholdKey from "@oraichain/default";
import styles from "./index.module.scss";
import LockImage from "../../assets/images/lock.png";
import { Box, OutlinedInput, Typography, Button, InputAdornment, IconButton } from "@mui/material";
import { Mode } from "../AuthFactors";
import { IState, KeyReconstructContext } from "../../screens/KeyReconstruct";

export const getSecurityQuestionShare = async ({
  numberShares,
  setState,
  password,
  tKey,
}: {
  numberShares: number;
  setState: Dispatch<Partial<IState>>;
  password: string;
  tKey: ThresholdKey;
}) => {
  try {
    if (numberShares === 0) {
      return setState({
        securityQuestionAnswer: password,
      });
    }
    try {
      (tKey.modules.securityQuestions as any).setModuleReferences(tKey.getApi());
    } catch {}
    await (tKey.modules.securityQuestions as any).inputShareFromSecurityQuestions(password);
    const keyDetails = await tKey.getKeyDetails();
    const publicPolynomial = tKey.metadata.getLatestPublicPolynomial();
    const shares = tKey.shares[publicPolynomial?.polynomialId] || {};
    const securityQuestionsShareIndex = (tKey.metadata.generalStore.securityQuestions as any).shareIndex;
    if (!securityQuestionsShareIndex) throw new Error("Password share doesn't exists");
    const securityQuestionsShare = shares[securityQuestionsShareIndex.toString("hex")].share.share.toString("hex");
    setState({
      keyDetails,
      numberShares: numberShares + 1,
    });
    if (numberShares + 1 >= 2 && keyDetails.requiredShares <= 0) {
      try {
        const { privKey } = await tKey.reconstructKey();
        console.log(privKey.toString("hex"));
        setState({ privKey: privKey.toString("hex") });
      } catch (error: any) {
        console.log(error);
        throw new Error(error);
      }
    }
  } catch (error) {
    console.log("🚀 ~ file: index.tsx:56 ~ getSecurityQuestionShare ~ error:", error);
  }
};

const PasswordRecovery: FunctionComponent<{ setActiveStep?: Dispatch<SetStateAction<number>>; mode: Mode; tKey: ThresholdKey }> = ({
  setActiveStep,
  mode,
  tKey,
}) => {
  const {
    state: { numberShares },
    setState,
  } = useContext(KeyReconstructContext);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const generateNewShareWithPassword = async () => {
    if (!tKey) {
      return;
    }
    if (password.length > 10) {
      try {
        try {
          (tKey.modules.securityQuestions as any).setModuleReferences(tKey.getApi());
        } catch {}
        await (tKey.modules.securityQuestions as any).generateNewShareWithSecurityQuestions(password, "whats your password?");
        toast.success("Successfully generated new share with password.");
        setActiveStep!((step) => step + 1);
      } catch (error) {
        console.log(error);
        toast.error((error as any)?.message.toString());
      }
    } else {
      toast.error("Invalid password");
    }
  };

  return (
    <div className={styles.block}>
      <div className={styles.left}>
        <img src={LockImage} />
      </div>
      <div className={styles.right}>
        <Box component={Typography} variant="h5" textAlign="left">
          Enter recovery password
        </Box>
        <OutlinedInput
          classes={{
            root: styles.root,
            input: styles.input,
            notchedOutline: styles.notchedOutline,
            focused: styles.focused,
          }}
          placeholder="Min 10 alphanumeric characters"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword((state) => !state)} edge="end">
                {showPassword ? <VisibilityOffOutlined htmlColor="white" /> : <VisibilityOutlined htmlColor="white" />}
              </IconButton>
            </InputAdornment>
          }
        />
        <OutlinedInput
          classes={{
            root: styles.root,
            input: styles.input,
            notchedOutline: styles.notchedOutline,
            focused: styles.focused,
          }}
          placeholder="Confirm your password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton onClick={() => setShowConfirmPassword((state) => !state)} edge="end">
                {showConfirmPassword ? <VisibilityOffOutlined htmlColor="white" /> : <VisibilityOutlined htmlColor="white" />}
              </IconButton>
            </InputAdornment>
          }
        />
        <Box
          component={Button}
          variant="contained"
          display="block"
          marginTop={3}
          onClick={
            mode === Mode.Generate
              ? generateNewShareWithPassword
              : () =>
                  getSecurityQuestionShare({
                    numberShares,
                    setState,
                    password,
                    tKey,
                  })
          }
        >
          enter
        </Box>
      </div>
    </div>
  );
};

export default PasswordRecovery;
