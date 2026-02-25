interface GetOptions {
    url: string;
    passphrase?: string;
}
export declare function getSecret(opts: GetOptions): Promise<void>;
export {};
