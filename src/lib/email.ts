import nodemailer from 'nodemailer';
import logger from './logger';

const isOAuth2 =
    process.env.SMTP_CLIENT_ID &&
    process.env.SMTP_CLIENT_SECRET &&
    process.env.SMTP_REFRESH_TOKEN;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: isOAuth2
        ? {
            type: "OAuth2",
            user: process.env.SMTP_USER,
            clientId: process.env.SMTP_CLIENT_ID,
            clientSecret: process.env.SMTP_CLIENT_SECRET,
            refreshToken: process.env.SMTP_REFRESH_TOKEN,
            accessUrl: `https://login.microsoftonline.com/${process.env.SMTP_TENANT_ID || "common"
                }/oauth2/v2.0/token`,
        }
        : {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
});

export async function sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: any[]
) {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"SysRank" <no-reply@sysrank.com>',
            to,
            subject,
            html,
            attachments,
        });
        logger.info('Email sent to %s: %s', to, info.messageId);
        return info;
    } catch (error) {
        logger.error('Error sending email to %s:', to, error);
        // We don't throw here to avoid failing the entire batch process if one email fails
        // But we might want to return success status
        return null;
    }
}
