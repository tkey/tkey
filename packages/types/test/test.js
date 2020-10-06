import {fail} from 'assert'
import BN from 'bn.js'

import {Polynomial } from '..'

describe("polynomial", function () {
    it("#should polyEval indexes correctly", async function () {
      const polyArr = [new BN(5), new BN(2)];
      const poly = new Polynomial(polyArr);
      const result = poly.polyEval(new BN(1));
      if (result.cmp(new BN(7)) !== 0) {
        fail("poly result should equal 7");
      }
    });
  });