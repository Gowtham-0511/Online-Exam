import { NextRequest } from "next/server";

export async function getUserFromRequest(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split(" ")[1];

    try {
        const response = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        // Default to userPrincipalName if mail is null (common in some AAD setups)
        const email = data.mail || data.userPrincipalName;

        return {
            user: {
                email: email,
                name: data.displayName,
                id: data.id
            }
        };
    } catch (error) {
        console.error("Token verification failed", error);
        return null;
    }
}
