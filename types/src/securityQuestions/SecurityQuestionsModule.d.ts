import { GenerateNewShareResult, IModule, IThresholdBak } from "../base/aggregateTypes";
import { ShareStoreMap } from "../base/ShareStore";
declare class SecurityQuestionsModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBak;
    constructor();
    initialize(tbSDK: IThresholdBak): void;
    generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult>;
    getSecurityQuestions(): string;
    inputShareFromSecurityQuestions(answerString: string): Promise<void>;
    refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown;
}
export default SecurityQuestionsModule;
