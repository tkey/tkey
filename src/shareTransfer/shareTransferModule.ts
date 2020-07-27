import { IModule, IThresholdBak } from "../base/aggregateTypes";

class ShareTransferModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  constructor() {
    this.moduleName = "securityQuestions";
  }

  initialize(tbSDK: IThresholdBak): void {
    this.tbSDK = tbSDK;
    //   this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
  }
}

export default ShareTransferModule;
