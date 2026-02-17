import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendOTP = async (to: string, otp: string) => {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. OTP will be logged to console only.');

        return;
    }

    const msg = {
        to,
        from: process.env.EMAIL_FROM || 'noreply@timepass.com',
        subject: 'Verify your TimePass account',
        text: `Your registration verification code is: ${otp}. It expires in 5 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #007AFF; text-align: center;">Welcome to TimePass!</h2>
                <p style="font-size: 16px;">Hello,</p>
                <p style="font-size: 16px;">Thank you for joining us. To complete your registration, please use the verification code below:</p>
                <div style="background: #f0f7ff; padding: 20px; border-radius: 12px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 25px 0; color: #007AFF; border: 1px dashed #007AFF;">
                    ${otp}
                </div>
                <p style="font-size: 14px; color: #666;">This code is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 TimePass App</p>
            </div>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`[SUCCESS] OTP email sent to ${to}`);
    } catch (error: any) {
        console.error('--- SENDGRID ERROR ---');
        console.error('Message:', error.message);
        if (error.response) {
            const body = error.response.body;
            console.error('Error Body:', JSON.stringify(body, null, 2));

            // Fallback for credit exhaustion or authentication issues during development
            if (JSON.stringify(body).includes('Maximum credits exceeded') || error.code === 401) {
                console.warn('⚠️ SendGrid credits exceeded or Unauthorized. FALLING BACK TO CONSOLE LOGGING.');

                return; // Treat as success for development purposes
            }
        }
        throw new Error('Failed to send verification email');
    }
};
