const nodemailer = require("nodemailer");
const { mail, appUrl } = require("../config/env");

let transporter = null;
if (mail.host) {
  transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: mail.user ? { user: mail.user, pass: mail.pass } : undefined,
  });
}

const escapeHtml = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function layout({ name, paragraphs, button }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p)}</p>`).join("");
  const action = button
    ? `<a href="${escapeHtml(button.url)}" style="display:inline-block;margin:8px 0 18px;background:#3d5a40;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${escapeHtml(button.label)}</a>
       <p style="margin:0;font-size:12px;color:#6b726c;word-break:break-all">Or open this link: ${escapeHtml(button.url)}</p>`
    : "";
  return `<!DOCTYPE html><html lang="en"><body style="margin:0;background:#f2f3ef;font-family:Helvetica,Arial,sans-serif;color:#1f2620">
  <div style="max-width:540px;margin:32px auto;background:#fff;border:1px solid #dfe2db;border-radius:12px;padding:28px">
    <p style="margin:0 0 22px;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#3d5a40">furnifor</p>
    <p style="margin:0 0 14px">Hi ${escapeHtml(name)},</p>
    ${body}${action}
    <p style="margin:24px 0 0;font-size:12px;color:#6b726c">Furnifor &middot; <a href="${escapeHtml(appUrl)}" style="color:#6b726c">${escapeHtml(appUrl)}</a></p>
  </div></body></html>`;
}

/**
 * Sends an email. Never throws: if SMTP isn't set up or sending fails, it logs and returns false,
 * so a mail problem can't break sign up or an order.
 */
async function sendMail({ to, subject, name, paragraphs, button }) {
  if (!transporter) {
    console.log(`[mail] SMTP not configured, skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: mail.from, to, subject, html: layout({ name, paragraphs, button }) });
    return true;
  } catch (error) {
    console.error(`[mail] Could not send "${subject}" to ${to}:`, error.message);
    return false;
  }
}

module.exports = { sendMail };
