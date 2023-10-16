import { createContext, Dispatch, FunctionComponent, useReducer, useEffect } from "react";
import { KeyDetails } from "@oraichain/common-types";
import AuthFactors, { Mode } from "../../components/AuthFactors";
import { tKey } from "../../tkey";
import Finish from "../../components/FinishReconstructKey";

export type IState = {
  numberShares: number;
  keyDetails?: KeyDetails;
  securityQuestionAnswer?: string;
  privKey?: string;
};

export const KeyReconstructContext = createContext<{
  state: IState;
  setState: Dispatch<Partial<IState>>;
}>({
  state: {
    numberShares: 0,
  },
  setState: () => { },
});

const KeyReconstructScreen: FunctionComponent<{}> = ({ }) => {
  const [state, setState] = useReducer((prev: IState, next: Partial<IState>) => ({ ...prev, ...next }), { numberShares: 0 });
  const { privKey } = state;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <KeyReconstructContext.Provider value={{ state, setState }}>
      <AuthFactors mode={Mode.Reconstruct} tKey={tKey} />
      {privKey && <Finish privKey={privKey} />}
    </KeyReconstructContext.Provider>
  );
};

export default KeyReconstructScreen;
