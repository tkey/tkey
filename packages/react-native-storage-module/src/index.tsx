import { NativeModules, Platform } from 'react-native';
export {
  REACT_NATIVE_STORAGE_MODULE_NAME,
  default as ReactNativeStorageModule,
  default,
} from './ReactNativeStorageModule';

const LINKING_ERROR =
  `The package '@thresholdkey/react-native-storage' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const ReactNativeStorage = NativeModules.ReactNativeStorage
  ? NativeModules.ReactNativeStorage
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function multiply(a: number, b: number): Promise<number> {
  return ReactNativeStorage.multiply(a, b);
}
