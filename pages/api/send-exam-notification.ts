import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@microsoft/microsoft-graph-client';

// Simple function to get access token
async function getAccessToken(): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('client_id', process.env.AZURE_AD_CLIENT_ID!);
    params.append('client_secret', process.env.AZURE_AD_CLIENT_SECRET!);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Token request failed:', errorData);
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { to, examTitle, createdAt, isProctored } = req.body;

    // Validate required fields
    if (!to || !examTitle) {
        return res.status(400).json({ message: 'Missing required fields: to, examTitle' });
    }

    try {
        console.log('Getting access token...');
        const accessToken = await getAccessToken();

        console.log('Initializing Graph client...');
        const graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });

        const formattedDate = new Date(createdAt).toLocaleString();
        const proctorStatus = isProctored ? 'Proctored' : 'Non-Proctored';

        console.log('Preparing email message...');
        const message = {
            subject: `✅ Exam Created Successfully - ${examTitle}`,
            body: {
                contentType: 'HTML',
                content: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #10b981; margin: 0;">🎉 Exam Created Successfully!</h1>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="color: #334155; margin-top: 0;">${examTitle}</h2>
                            <p style="color: #64748b; margin: 5px 0;"><strong>Created:</strong> ${formattedDate}</p>
                            <p style="color: #64748b; margin: 5px 0;"><strong>Type:</strong> ${proctorStatus} Exam</p>
                            <p style="color: #64748b; margin: 5px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Ready for Students</span></p>
                        </div>
                        
                        <div style="padding: 20px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                            <p style="margin: 0; color: #065f46;">
                                <strong>What's Next?</strong><br>
                                Your exam "${examTitle}" has been successfully created and is now available for students to take. 
                                You can view submissions and manage the exam from your dashboard.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            <p style="color: #64748b; font-size: 14px; margin: 0;">
                                This is an automated notification from ExamCraft
                            </p>
                        </div>
                    </div>
                `,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to,
                    },
                },
            ],
        };

        console.log(`Sending email from ${process.env.BUSINESS_EMAIL} to ${to}...`);

        // Send email using Microsoft Graph
        await graphClient
            .api(`/users/${process.env.BUSINESS_EMAIL}/sendMail`)
            .post({ message });

        console.log('Email sent successfully!');
        res.status(200).json({
            message: 'Email sent successfully via Microsoft Graph',
            details: {
                to,
                subject: message.subject,
                from: process.env.BUSINESS_EMAIL
            }
        });

    } catch (error: any) {
        console.error('Detailed error sending email:', error);

        // Provide more specific error messages
        let errorMessage = 'Error sending email';
        if (error.message?.includes('Insufficient privileges')) {
            errorMessage = 'Insufficient privileges. Please ensure admin consent is granted for Mail.Send permission.';
        } else if (error.message?.includes('Invalid client')) {
            errorMessage = 'Invalid client credentials. Please check your Azure app registration.';
        } else if (error.message?.includes('Tenant')) {
            errorMessage = 'Invalid tenant ID. Please check your Azure tenant configuration.';
        }

        res.status(500).json({
            message: errorMessage,
            error: error.message,
            details: error.response?.data || error.response || 'No additional details available'
        });
    }
}

// Alternative: Test function to verify your setup
// You can create a separate API endpoint for testing: /pages/api/test-graph-auth.ts
/*
export default async function testHandler(req: NextApiRequest, res: NextApiResponse) {
    try {
        console.log('Testing Microsoft Graph authentication...');
        
        // Test 1: Check environment variables
        const requiredEnvVars = ['AZURE_AD_TENANT_ID', 'AZURE_AD_CLIENT_ID', 'AZURE_AD_CLIENT_SECRET', 'BUSINESS_EMAIL'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing environment variables: ${missingVars.join(', ')}`
            });
        }

        // Test 2: Get access token
        const accessToken = await getAccessToken();
        console.log('✅ Access token obtained successfully');

        // Test 3: Initialize Graph client
        const graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });

        // Test 4: Get user info (to verify permissions)
        const userInfo = await graphClient
            .users(process.env.BUSINESS_EMAIL)
            .get();

        console.log('✅ User info retrieved successfully');

        res.status(200).json({
            success: true,
            message: 'Microsoft Graph authentication is working correctly!',
            userInfo: {
                displayName: userInfo.displayName,
                mail: userInfo.mail,
                userPrincipalName: userInfo.userPrincipalName
            }
        });

    } catch (error: any) {
        console.error('❌ Test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || 'No additional details available'
        });
    }
}
*/