const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log("\n--- Microsoft OAuth2 Refresh Token Generator ---\n");

    const tenantId = await ask("Enter your Tenant ID: ");
    const clientId = await ask("Enter your Client ID: ");
    const clientSecret = await ask("Enter your Client Secret: ");
    const code = await ask("Enter the Authorization Code (from the Google Playground box): ");

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://outlook.office.com/SMTP.Send offline_access');
    params.append('code', code);
    params.append('redirect_uri', 'https://developers.google.com/oauthplayground');
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', clientSecret);

    console.log("\nRequesting token...");

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await response.json();

        if (data.error) {
            console.error("\nError:", data.error);
            console.error("Error Description:", data.error_description);
        } else {
            console.log("\nSUCCESS! Here is your Refresh Token:\n");
            console.log(data.refresh_token);
            console.log("\n===========================================");
            console.log("Copy the token above and paste it into your .env file as SMTP_REFRESH_TOKEN");
        }
    } catch (error) {
        console.error("Network or script error:", error);
    } finally {
        rl.close();
    }
}

main();
