import { ShareStoreMap } from "../base";
import { GenerateNewShareResult, IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
declare class SecurityQuestionsModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult>;
    getSecurityQuestions(): string;
    inputShareFromSecurityQuestions(answerString: string): Promise<void>;
    changeSecurityQuestionAndAnswer(newAnswerString: string, newQuestions: string): Promise<void>;
    static refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown;
}
export default SecurityQuestionsModule;
