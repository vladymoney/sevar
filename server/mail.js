/* SEVAR — outgoing e-mail through SMTP (nodemailer).
   Messages come from server/emails.js as { subject, html, text, replyTo }; the logo travels inside the e-mail (cid). */
const path = require('path');
const nodemailer = require('nodemailer');
const { company } = require('./catalog');
const { LOGO_CID } = require('./emails');

const LOGO = path.join(__dirname, '..', 'assets', 'img', 'brand', 'sevar-logo-email.png');
const DEFAULT_TO = 'd.alishahov@yahoo.com';
const env = process.env;

const configured = () => !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

/* who gets what: each falls back to the next, so one address is enough */
const recipients = {
  inquiries: () => env.NOTIFY_MAIL_TO || env.ORDERS_MAIL_TO || env.LABELS_MAIL_TO || DEFAULT_TO,
  orders: () => env.ORDERS_MAIL_TO || env.NOTIFY_MAIL_TO || env.LABELS_MAIL_TO || DEFAULT_TO,
  labels: () => env.LABELS_MAIL_TO || DEFAULT_TO
};
const fromAddress = () => env.MAIL_FROM || env.SMTP_USER || '';
const replyAddress = () => env.MAIL_REPLY_TO || company.email;

let transport;
function getTransport() {
  if (!transport) {
    const port = Number(env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST, port, secure: port === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
  }
  return transport;
}

/* msg: { subject, html, text, replyTo } from server/emails.js */
async function send(msg, to, attachments = []) {
  if (!configured()) { const e = new Error('smtp_not_configured'); e.code = 'smtp_not_configured'; throw e; }
  const files = [...attachments];
  if (msg.html && msg.html.includes('cid:' + LOGO_CID)) files.push({ filename: 'sevar-logo.png', path: LOGO, cid: LOGO_CID, contentDisposition: 'inline' });
  return getTransport().sendMail({
    /* short sender name: stays one encoded word in the header, so no mail client can split it */
    from: { name: `${company.brand} · ${company.legal.replace(/\s+(ООД|ЕООД|АД|ЕАД)$/, '')}`, address: fromAddress() },
    to, replyTo: msg.replyTo || replyAddress(),
    subject: msg.subject, html: msg.html, text: msg.text, attachments: files
  });
}

/* best effort: never blocks or fails the visitor's request */
function later(msg, to, attachments) {
  if (!configured() || !to) return;
  send(msg, to, attachments).catch(e => console.error(`mail "${msg.subject}" → ${to}:`, e.message));
}

module.exports = { send, later, configured, recipients, fromAddress, replyAddress };
