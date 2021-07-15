import { sharedTestCases } from "./shared";

const MANUAL_SYNC = true;

describe(`Manual sync: ${MANUAL_SYNC}`, function () {
  sharedTestCases(MANUAL_SYNC);
});
