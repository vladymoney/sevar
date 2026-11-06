/* SEVAR — outgoing e-mail through SMTP (nodemailer) */
const nodemailer = require('nodemailer');

const configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transport;
}

async function send({ to, subject, text, attachments }) {
  if (!configured()) { const e = new Error('smtp_not_configured'); e.code = 'smtp_not_configured'; throw e; }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  return getTransport().sendMail({ from: `"SEVAR" <${from}>`, to, subject, text, attachments });
}

/* best-effort notification to the office mailbox; never blocks or fails the visitor's request */
function notify(subject, text, toOverride) {
  if (!configured()) return;
  const to = toOverride || process.env.NOTIFY_MAIL_TO || process.env.ORDERS_MAIL_TO || process.env.LABELS_MAIL_TO || 'd.alishahov@yahoo.com';
  send({ to, subject, text }).catch(e => console.error('notify mail:', e.message));
}

module.exports = { send, configured, notify };
