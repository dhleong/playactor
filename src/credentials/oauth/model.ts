export interface OauthStrategy {
    /**
     * Presents the [url] to the user and resolves to the URI
     * they were redirected to
     */
    performLogin(url: string): Promise<string>;
}
