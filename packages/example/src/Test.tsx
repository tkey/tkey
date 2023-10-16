import React, { useEffect, useState } from "react";
import swal from "sweetalert";
import { bech32 } from "bech32";
import elliptic from "elliptic";
import BN from "bn.js";
import TorusServiceProvider from "@oraichain/service-provider-torus";
// @ts-ignore
import crypto from "crypto-browserify";
import { tKey } from "./tkey";
import "./App.css";
import init, { interpolate, get_pk } from "@oraichain/blsdkg";
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
        await (tKey.serviceProvider as any).init();
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  const triggerLogin = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      // Triggering Login using Service Provider ==> opens the popup
      console.log(tKey.serviceProvider);
      const loginResponse = await (tKey.serviceProvider as TorusServiceProvider).triggerLogin({
        typeOfLogin: "google",
        clientId: "88022207528-isvvj6icicp9lkgl6ogcpj5eb729iao8.apps.googleusercontent.com",
        verifier: "tkey-google",
        // idToken:
        //   "eyJhbGciOiJSUzI1NiIsImtpZCI6IjdjOWM3OGUzYjAwZTFiYjA5MmQyNDZjODg3YjExMjIwYzg3YjdkMjAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI4ODAyMjIwNzUyOC1pc3Z2ajZpY2ljcDlsa2dsNm9nY3BqNWViNzI5aWFvOC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6Ijg4MDIyMjA3NTI4LWlzdnZqNmljaWNwOWxrZ2w2b2djcGo1ZWI3MjlpYW84LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTA5OTYyMjE3NTcyNjk4MzMwMTM2IiwiZW1haWwiOiJ0bWluaDExMDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiI1TXJzVUU3cmFpa1dZTXloRGxOYnJRIiwibm9uY2UiOiJpcjA4bXBxNGc0aCIsIm5iZiI6MTY5MjA2OTMyMiwibmFtZSI6IlR14bqlbiBNaW5oIE5ndXnhu4VuIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FBY0hUdGVvZ1R3WGdXUGFTLWk3bUpSSGx3QTVGa1VnQXFaZ2NidWVHbEtYbEIydD1zOTYtYyIsImdpdmVuX25hbWUiOiJUdeG6pW4gTWluaCIsImZhbWlseV9uYW1lIjoiTmd1eeG7hW4iLCJsb2NhbGUiOiJ2aSIsImlhdCI6MTY5MjA2OTYyMiwiZXhwIjoxNjkyMDczMjIyLCJqdGkiOiIwMzlhODBiNjU3NGFhMTgwZGU5YTY3NmZkNWM2ZTBhYjczYWMxMTgwIn0.GAeT7ekCVWo-MURyD_nzYGCrK8d9NHa-9e2ryXqfMmAt_YgkCypdqBBKWLdoLUyueRfp6N0UBD9RyrH-2J3s4p4IsuJqxSaah6faX6OKuXB0DVEkfV673Fq-kLE73yElqZCFVBmkWVnnUHiXTpsGyDEbdDrsSuFj7iflX47jEqEh61-gVZvHgfkrkY_5Qfmolx220UsRyHhof5dEvDAH1o-BDI9z3AUmXYGs5Ou9zvk_lH3t9aaokahwBvuhHabvEr65IQX-Ezg-GMgaEECERVW2-R4X-KGcAh3yQVL1EVZAq313SYDc9sY5iQwSKiCkh6v4fGvPG4h3102TbHoMqA",
      });
      setUser(loginResponse?.userInfo);
    } catch (error) {
      uiConsole(error);
    }
  };

  const triggerLoginMobile = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      // Triggering Login using Service Provider ==> opens the popup
      const { shares, sharesIndexes, userInfo, thresholdPublicKey } = await (tKey.serviceProvider as any).triggerLoginMobile({
        typeOfLogin: "google",
        clientId: "821030499059-g57d7aqlj9o5lo5snuc87884fv6m7qk0.apps.googleusercontent.com",
        verifier: "cupiee-google-dev",
        idToken:
          "eyJhbGciOiJSUzI1NiIsImtpZCI6ImMzYWZlN2E5YmRhNDZiYWU2ZWY5N2U0NmM5NWNkYTQ4OTEyZTU5NzkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI4MjEwMzA0OTkwNTktZzE3MGp1bzRjZGM1ZWlhNzVwYXV2a2czNTNzMDVqOTkuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI4MjEwMzA0OTkwNTktZzU3ZDdhcWxqOW81bG81c251Yzg3ODg0ZnY2bTdxazAuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTM1ODI0OTQxMzcwMjM2NzE5ODAiLCJlbWFpbCI6InhhY3ZhaS4wNEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6Ijg4WVZ5ZC0tQUFiOHJod280eUI3ZUEiLCJub25jZSI6ImM5djdVdUNzWkZfVmZrWjM0WG5NM25uU1ExalhaZmJZRndCVnNVb0FWR0kiLCJuYW1lIjoiQ2hp4bq_biDEkMaw4budbmciLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUFjSFR0Y1ZqTFFCNmZtT0s0cVpTc0FGY2xPcmJYazhNTXNsY3R2RXhGUVo0SHFKPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkNoaeG6v24iLCJmYW1pbHlfbmFtZSI6IsSQxrDhu51uZyIsImxvY2FsZSI6InZpIiwiaWF0IjoxNjkyNzg0NDQ1LCJleHAiOjE2OTI3ODgwNDV9.WWAn6Asu1ADnAymv9CuO0QUazcv_XwfSwpSC0Qv0hVhdiVNa8loMSocV41ECjJoiMIljKVJ_8BlneyKLPrEvyNo6_sFWa4py3_p1PKfDaiMiNZHJ-I1IupOOSnm-n4H6EwUNSoEF367l6IFYwQ-7nz7FoaXmCEUX7emwy3_jRFtevkxZn_O18AKpEuEFdB3NIvCtHfGgVNVlrm4d38cC0WkgIfJvLXJjn-mHVaXQh_Q0i0Zfz3GPAtJ_cU3hF76Og4BcIaBO3jsywoG9gb9bLyjvFu7CnX1zHyPkSJPnFc2CLwj5XNA4vnKMkg7fOXfJuBL4ooe11ENSlykpM_0S6A",
      });
      // setUser(userInfo);
      console.log({ shares, sharesIndexes, userInfo, thresholdPublicKey });
      const privKey = interpolate(sharesIndexes, shares);
      const pubKey = get_pk(privKey);
      console.log({ privKey, pubKey });

      if (thresholdPublicKey !== Buffer.from(pubKey).toString("hex")) {
        throw new Error("Public key not same");
      }
      const privateKey = await (tKey.serviceProvider as any).directWeb.torus.getPrivKey(new BN(privKey));
      (tKey.serviceProvider as any).setPostboxKey(privateKey.privKey);
    } catch (error) {
      uiConsole(error);
    }
  };

  const initializeNewKey = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      await triggerLogin(); // Calls the triggerLogin() function above
      // await triggerLoginMobile();
      // Initialization of tKey
      await tKey.initialize(); // 1/2 flow
      // Gets the deviceShare
      try {
        await (tKey.modules.webStorage as any).inputShareFromWebStorage(); // 2/2 flow
      } catch (e) {
        uiConsole(e);
        await recoverShare();
      }

      // Checks the requiredShares to reconstruct the tKey,
      // starts from 2 by default and each of the above share reduce it by one.
      const { requiredShares } = tKey.getKeyDetails();
      console.log(requiredShares);
      if (requiredShares <= 0) {
        const reconstructedKey = await tKey.reconstructKey();
        setPrivateKey(reconstructedKey?.privKey.toString(16, 64));
        uiConsole("Private Key: " + reconstructedKey.privKey.toString(16, 64));
      }
    } catch (error) {
      console.log(error);
      uiConsole(error, "caught");
    }
  };

  const changeSecurityQuestionAndAnswer = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    // swal is just a pretty dialog box
    swal("Enter password (>10 characters)", {
      content: "input" as any,
    }).then(async (value) => {
      if (value.length > 10) {
        await (tKey.modules.securityQuestions as any).changeSecurityQuestionAndAnswer(value, "whats your password?");
        swal("Success", "Successfully changed new share with password.", "success");
        uiConsole("Successfully changed new share with password.");
      } else {
        swal("Error", "Password must be >= 11 characters", "error");
      }
    });
    const keyDetails = await tKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  const generateNewShareWithPassword = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    // swal is just a pretty dialog box
    swal("Enter password (>10 characters)", {
      content: "input" as any,
    }).then(async (value) => {
      if (value.length > 10) {
        try {
          await (tKey.modules.securityQuestions as any).generateNewShareWithSecurityQuestions(value, "whats your password?");
          swal("Success", "Successfully generated new share with password.", "success");
          uiConsole("Successfully generated new share with password.");
        } catch (error) {
          swal("Error", (error as any)?.message.toString(), "error");
        }
      } else {
        swal("Error", "Password must be >= 11 characters", "error");
      }
    });
  };

  const recoverShare = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    // swal is just a pretty dialog box
    swal("Enter password (>10 characters)", {
      content: "input" as any,
    }).then(async (value) => {
      if (value.length > 10) {
        try {
          await (tKey.modules.securityQuestions as any).inputShareFromSecurityQuestions(value); // 2/2 flow
          const { requiredShares } = tKey.getKeyDetails();
          if (requiredShares <= 0) {
            const reconstructedKey = await tKey.reconstructKey();
            setPrivateKey(reconstructedKey?.privKey.toString(16, 64));
            uiConsole("Private Key: " + reconstructedKey.privKey.toString(16, 64));
          }
          const shareStore = await tKey.generateNewShare();
          await (tKey.modules.webStorage as any).storeDeviceShare(shareStore.newShareStores[shareStore.newShareIndex.toString("hex")]);
          swal("Success", "Successfully logged you in with the recovery password.", "success");
          uiConsole("Successfully logged you in with the recovery password.");
        } catch (error) {
          swal("Error", (error as any)?.message.toString(), "error");
          uiConsole(error);
          logout();
        }
      } else {
        swal("Error", "Password must be >= 11 characters", "error");
        logout();
      }
    });
  };

  const requestNewShare = async () => {
    try {
      await triggerLogin();
      await tKey.initialize();
      const currentEncPubKeyX = await (tKey.modules.shareTransfer as any).requestNewShare(window.navigator.userAgent, tKey.getCurrentShareIndexes());
      console.log("🚀 ~ file: Test.tsx:208 ~ requestNewShare ~ currentEncPubKeyX:", currentEncPubKeyX);
      const shareStore = await (tKey.modules.shareTransfer as any).startRequestStatusCheck(currentEncPubKeyX, true);
      const { privKey } = await tKey.reconstructKey(false);
      console.log("🚀 ~ file: Test.tsx:208 ~ requestNewShare ~ privKey:", privKey);
    } catch (error) {
      console.log("🚀 ~ file: Test.tsx:211 ~ requestNewShare ~ error:", error);
    }
  };

  const keyDetails = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    const keyDetails = await tKey.getKeyDetails();
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

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={generateNewShareWithPassword} className="card">
            Generate Password Share
          </button>
        </div>
        <div>
          <button onClick={changeSecurityQuestionAndAnswer} className="card">
            Change Password Share
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
      <div>
        <button onClick={requestNewShare} className="card">
          Request new share
        </button>
      </div>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth (tKey)
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
