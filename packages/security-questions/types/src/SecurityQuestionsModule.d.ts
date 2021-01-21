import { GenerateNewShareResult, IModule, ITKeyApi, ShareStoreMap } from "@tkey/common-types";
export declare const SECURITY_QUESTIONS_MODULE_NAME = "securityQuestions";
declare class SecurityQuestionsModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    saveAnswers: boolean;
    constructor(saveAnswers?: boolean);
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult>;
    getSecurityQuestions(): string;
    inputShareFromSecurityQuestions(answerString: string): Promise<void>;
    changeSecurityQuestionAndAnswer(newAnswerString: string, newQuestions: string): Promise<void>;
    static refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown;
    saveAnswerOnTkeyStore(answerString: string): Promise<void>;
    getAnswer(): Promise<string>;
}
export default SecurityQuestionsModule;
