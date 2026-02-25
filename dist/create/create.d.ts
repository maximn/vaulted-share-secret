interface CreateOptions {
    secret: string;
    views: number;
    expires: string;
    passphrase?: string;
}
export declare function createSecret(opts: CreateOptions): Promise<void>;
export {};
