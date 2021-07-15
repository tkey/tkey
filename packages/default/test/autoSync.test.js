import { sharedTestCases } from "./shared";

const MANUAL_SYNC = false;

describe(`Manual sync: ${MANUAL_SYNC}`, function () {
  sharedTestCases(MANUAL_SYNC);
});
