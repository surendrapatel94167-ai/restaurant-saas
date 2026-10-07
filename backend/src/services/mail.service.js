import nodemailer from 'nodemailer';

// Sends email through SMTP when SMTP_HOST/SMTP_USER/SMTP_PASS are configured.
// Without SMTP the message is printed to the server log instead (dev mode /
// Render logs), so flows like the super-admin OTP still work — nothing is
// ever returned to the browser.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function isMailConfigured() {
  return !!getTransporter();
}

export async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[mail:not-configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false };
  }
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
  return { delivered: true };
}
