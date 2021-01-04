import { CustomError } from "ts-custom-error";
export interface ITkeyError {
    name?: string;
    code: number;
    message: string;
    toString(): string;
}
export declare type ErrorCodes = {
    [key: number]: string;
};
export declare abstract class TkeyError extends CustomError {
    code: number;
    message: string;
    constructor(code?: number, message?: string);
    toJSON(): ITkeyError;
    toString(): string;
}
