"use client";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/lib/auth-config";
import { useEffect, useState } from "react";

export default function MsalProviderWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const [instance, setInstance] = useState<PublicClientApplication | null>(null);

    useEffect(() => {
        const pca = new PublicClientApplication(msalConfig);
        pca.initialize().then(() => {
            setInstance(pca);
        });
    }, []);

    if (!instance) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <MsalProvider instance={instance}>{children}</MsalProvider>;
}
