// utils/mailer.js
const logger = require('./logger');

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Sends a plain-text email through EmailJS's HTTPS API. Plain HTTPS rather
 * than SMTP because hosts like Render block outbound SMTP ports.
 *
 * The EmailJS template receives `{{email}}` (also `{{to_email}}`, the
 * recipient -- set it as the template's "To Email"), `{{subject}}`,
 * `{{message}}` (the plain-text body), plus any extra `params` such as
 * `{{link}}`. With the EmailJS env
 * vars unset in dev/test, the message is logged instead of sent, so flows
 * like password reset still work end to end; in production it throws
 * instead, since the body may hold a live reset link.
 *
 * @param {{ to: string, subject: string, text: string, params?: Object<string, string> }} message
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, text, params = {} }) {
    const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
        // Never log message bodies in production: they can carry live secrets like reset links.
        if (process.env.NODE_ENV === 'production') {
            throw new Error('EmailJS is not configured; email not sent');
        }
        logger.info(`[mailer] EmailJS not configured; email to ${to} not sent.\nSubject: ${subject}\n${text}`);
        return;
    }

    const res = await fetch(EMAILJS_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            accessToken: EMAILJS_PRIVATE_KEY,
            template_params: { email: to, to_email: to, subject, message: text, ...params },
        }),
    });
    if (!res.ok) {
        throw new Error(`EmailJS send failed (${res.status}): ${await res.text()}`);
    }
}

module.exports = { sendMail };
