import { useEffect, useState } from "react";
import { bech32 } from "bech32";
import elliptic from "elliptic";
// @ts-ignore
import crypto from "crypto-browserify";
import { OnlySocialLoginKey as onlySocialKey } from "./tkey";
import "./App.css";
import { TorusServiceProvider } from "@oraichain/service-provider-torus";
import init, { interpolate, get_pk } from "@oraichain/blsdkg";
import BN from "bn.js";

init();

const ec = new elliptic.ec("secp256k1");

const hash160 = (buffer: Buffer) => {
  const sha256Hash = crypto.createHash("sha256").update(buffer).digest();
  try {
    return crypto.createHash("rmd160").update(sha256Hash).digest();
  } catch (err) {
    return crypto.createHash("ripemd160").update(sha256Hash).digest();
  }
};

const getAddress = (privateKey: string) => {
  const key = ec.keyFromPrivate(privateKey);
  const pubKey = Buffer.from(key.getPublic().encodeCompressed("array"));
  const words = bech32.toWords(hash160(pubKey));
  const address = bech32.encode("orai", words);
  return address;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [privateKey, setPrivateKey] = useState<any>();

  // Init Service Provider inside the useEffect Method
  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        await (onlySocialKey.serviceProvider as TorusServiceProvider).init();
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  const triggerLogin = async () => {
    if (!onlySocialKey) {
      uiConsole("onlySocialKey not initialized yet");
      return;
    }
    try {
      const loginResponse = await (onlySocialKey.serviceProvider as TorusServiceProvider).triggerLogin({
        typeOfLogin: "google",
        verifier: "map-tkey",
        clientId: "88022207528-isvvj6icicp9lkgl6ogcpj5eb729iao8.apps.googleusercontent.com",
      });

      console.log(loginResponse);
    } catch (error) {
      console.log({ error });
      uiConsole(error);
    }
  };

  const initializeNewKey = async () => {
    if (!onlySocialKey) {
      uiConsole("onlySocialKey not initialized yet");
      return;
    }
    try {
      const start = Date.now();
      await triggerLogin(); // Calls the triggerLogin() function above
      await onlySocialKey.initialize(); // 1/2 flow
      const { pubKey } = onlySocialKey.getKeyDetails();
      console.log({ pubKey });
      setPrivateKey(onlySocialKey.privKey.toString(16, 64));
      console.log("Private Key: " + onlySocialKey.privKey.toString(16, 64));
      console.log("Time resolve key:", Date.now() - start);
    } catch (error) {
      console.log(error);
      uiConsole(error, "caught");
    }
  };

  const triggerLoginMobile = async () => {
    if (!onlySocialKey) {
      uiConsole("onlySocialKey not initialized yet");
      return;
    }
    try {
      // Triggering Login using Service Provider ==> opens the popup
      const { shares, sharesIndexes, userInfo, thresholdPublicKey } = await (onlySocialKey.serviceProvider as any).triggerLoginMobile({
        typeOfLogin: "google",
        verifier: "tkey-google",
        clientId: "88022207528-isvvj6icicp9lkgl6ogcpj5eb729iao8.apps.googleusercontent.com",
      });
      const privKey = interpolate(sharesIndexes, shares);
      const pubKey = get_pk(privKey);
      console.log({ shares, sharesIndexes, userInfo, thresholdPublicKey });
      console.log({ privKey, pubKey });

      if (thresholdPublicKey !== Buffer.from(pubKey).toString("hex")) {
        throw new Error("Public key not same");
      }
      const privateKey = await (onlySocialKey.serviceProvider as any).directWeb.torus.getPrivKey(new BN(privKey));
      (onlySocialKey.serviceProvider as any).setPostboxKey(privateKey.privKey);
    } catch (error) {
      uiConsole(error);
    }
  };

  const keyDetails = async () => {
    if (!onlySocialKey) {
      uiConsole("onlySocialKey not initialized yet");
      return;
    }
    const keyDetails = onlySocialKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  const logout = (): void => {
    uiConsole("Log out");
    setUser(null);
  };

  const getUserInfo = (): void => {
    uiConsole(user);
  };

  const getPrivateKey = (): void => {
    uiConsole(privateKey);
  };

  const getAccounts = async () => {
    const address = getAddress(privateKey);
    uiConsole(address);
  };

  const uiConsole = (...args: any[]): void => {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  };

  const mapNewVerifierId = async () => {
    if (!onlySocialKey) {
      uiConsole("onlySocialKey not initialized yet");
      return;
    }
    try {
      const start = Date.now();
      const response = await (onlySocialKey.serviceProvider as TorusServiceProvider).mapNewVerifierId({
        typeOfLogin: "google",
        idToken:
          "eyJhbGciOiJSUzI1NiIsImtpZCI6ImM2MjYzZDA5NzQ1YjUwMzJlNTdmYTZlMWQwNDFiNzdhNTQwNjZkYmQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI4ODAyMjIwNzUyOC1pc3Z2ajZpY2ljcDlsa2dsNm9nY3BqNWViNzI5aWFvOC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6Ijg4MDIyMjA3NTI4LWlzdnZqNmljaWNwOWxrZ2w2b2djcGo1ZWI3MjlpYW84LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTE3NzA1MjUyMDcxMTkwMDI5OTY3IiwiZW1haWwiOiJ0bWluaDAyMDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJTMFAtTjZuajFGdjVYVTJZeU9xYjZBIiwibm9uY2UiOiI5ZzJ6cDVkOWFmayIsIm5iZiI6MTY5NjkyMTcyNiwibmFtZSI6IlNsaSBNZW93eSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJaHpfbFRxX0pJZ2o4VHlKX1hBV3czR09Pd0xJVGRObFFMcWszVldqTENBdz1zOTYtYyIsImdpdmVuX25hbWUiOiJTbGkiLCJmYW1pbHlfbmFtZSI6Ik1lb3d5IiwibG9jYWxlIjoidmkiLCJpYXQiOjE2OTY5MjIwMjYsImV4cCI6MTY5NjkyNTYyNiwianRpIjoiMWEwMThhYjJjZDI2NGY3OTliODQ4ZGU0NDkyYTg3YjllODYyNDJiMCJ9.N-IkeBs2oUJOoeFWaPakGGfQFzoJrnL5RwdN8r6fNufd8FJqbluK6ZDChjEB6TtFp7LR9xp0YYDogdpO1KQ5x1PqnJRrJ3RPVZdBrwEGCwzkMmoNckIqNLBGgHT2fDC7of0giuPmI5FYERXwR9OJjlRKMTz5FLZtBFqSn_UhFP62FimEPMDC-ihUuMuogJ3z2On0TPDpj71sb6zSC2sAlVkNwsp5GZLV-QFo1VnaXcIQO11JwR9T5ZfUjVCPY7RxuzvcrPSs7RZ-1mh7F3Lh5hiNHmdW0RdJMlvtCOOYFMnJXYfk8kxC7rgHwyORHMDH-dQPBOp622xQJojXzNgN_Q",
        newVerifier: "map-tkey",
        newVerifierId: "tminh0204@gmail.com",
      });
      console.log("Time resolve map:", Date.now() - start);
      console.log({ response });
    } catch (error) {
      console.log({ error });
    }
  };

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={keyDetails} className="card">
            Key Details
          </button>
        </div>
        <div>
          <button onClick={getPrivateKey} className="card">
            Private Key
          </button>
        </div>

        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>

        <div>
          <button onClick={mapNewVerifierId} className="card">
            Map New VerifierId
          </button>
        </div>

        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <button onClick={initializeNewKey} className="card">
        Login
      </button>
      <button onClick={triggerLoginMobile} className="card">
        Mobile
      </button>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth (onlySocialKey)
        </a>
        & ReactJS Ethereum Example
      </h1>

      <div className="grid">{privateKey ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a href="https://github.com/Web3Auth/examples/tree/main/self-host/self-host-react-example" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
