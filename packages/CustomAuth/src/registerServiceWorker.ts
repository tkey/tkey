import { register } from "@chaitanyapotti/register-service-worker";

import log from "./utils/loglevel";

export const registerServiceWorker = (baseUrl: string) =>
  new Promise((resolve, reject) => {
    const swUrl = `${baseUrl}sw.js`;

    if ("serviceWorker" in window.navigator) {
      // if swIntegrity is not calculated
      register(swUrl, {
        ready() {
          log.info("App is being served from cache by a service worker.\n For more details, visit https://goo.gl/AFskqB");
          resolve(undefined);
        },
        registered() {
          log.info("Service worker has been registered.");
          resolve(undefined);
        },
        cached() {
          log.info("Content has been cached for offline use.");
          resolve(undefined);
        },
        updatefound() {
          log.info("New content is downloading.");
        },
        updated() {
          log.info("New content is available; please refresh.");
        },
        offline() {
          log.info("No internet connection found. App is running in offline mode.");
          reject(new Error("App is offline"));
        },
        error(error) {
          log.error("Error during service worker registration:", error);
          reject(error);
        },
      });
    } else {
      reject(new Error("Service workers are not supported"));
    }
  });
