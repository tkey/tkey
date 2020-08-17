import { GenerateNewShareResult, IModule, IThresholdBakApi } from "../base/aggregateTypes";
import { ShareStoreMap } from "../base/ShareStore";
declare class SecurityQuestionsModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBakApi;
    constructor();
    initialize(tbSDK: IThresholdBakApi): Promise<void>;
    generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult>;
    getSecurityQuestions(): string;
    inputShareFromSecurityQuestions(answerString: string): Promise<void>;
    changeSecurityQuestionAndAnswer(newAnswerString: string, newQuestions: string): Promise<void>;
    refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown;
}
export default SecurityQuestionsModule;
