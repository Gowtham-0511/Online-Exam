import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.AZURE_AD_CLIENT_ID || "e9e6c4c2-564d-44f6-9f41-08f34c3a022a",
        authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || "17dcec91-66ec-4c4b-a988-473694df546c"}`,
        redirectUri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
        postLogoutRedirectUri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

export const loginRequest: PopupRequest = {
    scopes: ["User.Read"],
};