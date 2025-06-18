import { getToken } from "next-auth/jwt";

export async function getGraphAccessToken(req: any) {
    const token = await getToken({ req });
    return token?.accessToken;
}
