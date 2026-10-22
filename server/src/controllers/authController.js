const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const db = require("../models");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const { ROLE } = require("../utils/constants");
const { userToken, randomToken } = require("../utils/tokens");
const { sendMail } = require("../utils/mailer");
const { verifyCredential } = require("../services/google");

const VERIFY_HOURS = 24;
const RESET_MINUTES = 30;

/** The user object the client keeps after logging in. */
async function sessionUser(userId) {
  const user = await db.User.findByPk(userId, {
    include: [{ model: db.User_detail, attributes: ["first_name", "last_name", "phone", "img_profile", "address_user_id"] }],
  });
  if (!user) return null;
  const d = user.User_detail;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_verified: !!user.is_verify,
    signed_up_with: user.by_form ? "email" : "google",
    first_name: d?.first_name || "",
    last_name: d?.last_name || "",
    phone: d?.phone || null,
    avatar: d?.img_profile && !d.img_profile.includes("default") ? d.img_profile : null,
    primary_address_id: d?.address_user_id || null,
  };
}

async function sendVerification(user, name) {
  const token = randomToken();
  await user.update({ verify_token: token, verify_token_expires_at: dayjs().add(VERIFY_HOURS, "hour").toDate() });
  return sendMail({
    to: user.email,
    subject: "Confirm your email for Furnifor",
    name,
    paragraphs: [
      "Thanks for signing up. Please confirm your email so you can place orders.",
      `This link works for ${VERIFY_HOURS} hours.`,
    ],
    button: { label: "Confirm my email", url: `${env.appUrl}/verify/${token}` },
  });
}

/** A username that isn't taken yet, based on an email or a name. */
async function freeUsername(seed) {
  const base = String(seed).toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20) || "furnifor";
  let candidate = base.length >= 3 ? base : `${base}user`;
  for (let i = 0; await db.User.findOne({ where: { username: candidate } }); i++) {
    candidate = `${base}${Math.floor(Math.random() * 9000) + 1000}`;
    if (i > 10) candidate = `user${Date.now()}`;
  }
  return candidate;
}

module.exports = {
  sessionUser,

  // POST /api/auth/register
  async register(req, res) {
    const { username, email, password, first_name, last_name = "", phone } = req.body;

    if (await db.User.findOne({ where: { email } })) throw new HttpError(409, "That email is already registered. Try logging in instead.");
    if (await db.User.findOne({ where: { username } })) throw new HttpError(409, "That username is taken. Try another one.");
    if (await db.User_detail.findOne({ where: { phone } })) throw new HttpError(409, "That phone number is already used by another account.");

    const user = await db.sequelize.transaction(async (transaction) => {
      const created = await db.User.create(
        { role_id: ROLE.USER, username, email, password: await bcrypt.hash(password, 10), is_verify: false, by_form: true },
        { transaction }
      );
      await db.User_detail.create({ user_id: created.id, first_name, last_name, phone, img_profile: null }, { transaction });
      return created;
    });

    const emailSent = await sendVerification(user, first_name);
    res.status(201).json({
      message: emailSent
        ? `Welcome, ${first_name}! We sent a confirmation link to ${email}.`
        : `Welcome, ${first_name}! Your account is ready, but the confirmation email couldn't be sent. You can resend it from your account page.`,
      token: userToken(user),
      user: await sessionUser(user.id),
    });
  },

  // POST /api/auth/login  { identifier: email or username, password }
  async login(req, res) {
    const { identifier, password } = req.body;
    const user = await db.User.findOne({ where: { [Op.or]: [{ email: identifier.toLowerCase() }, { username: identifier }] } });

    if (user && !user.by_form) {
      throw new HttpError(401, "This account uses Google sign-in. Use the Google button instead.");
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, "Wrong email, username or password.");
    }
    res.json({ message: "Logged in", token: userToken(user), user: await sessionUser(user.id) });
  },

  // POST /api/auth/google  { credential }  -> logs in, creating the account the first time
  async google(req, res) {
    const profile = await verifyCredential(req.body.credential);
    let user = await db.User.findOne({ where: { email: profile.email } });
    let created = false;

    if (!user) {
      created = true;
      user = await db.sequelize.transaction(async (transaction) => {
        const newUser = await db.User.create(
          {
            role_id: ROLE.USER,
            username: await freeUsername(profile.email.split("@")[0]),
            email: profile.email,
            // Nobody knows this password. Google accounts log in with Google only.
            password: await bcrypt.hash(randomToken(), 10),
            is_verify: true,
            by_form: false,
          },
          { transaction }
        );
        await db.User_detail.create(
          { user_id: newUser.id, first_name: profile.firstName, last_name: profile.lastName, phone: null, img_profile: null },
          { transaction }
        );
        return newUser;
      });
    } else if (!user.is_verify) {
      // Google has confirmed the email, so we can trust it too.
      await user.update({ is_verify: true, verify_token: null });
    }

    res.status(created ? 201 : 200).json({
      message: created ? `Welcome to Furnifor, ${profile.firstName}!` : "Logged in",
      token: userToken(user),
      user: await sessionUser(user.id),
    });
  },

  // POST /api/auth/verify  { token }
  async verify(req, res) {
    const token = String(req.body.token || "");
    const user = token && (await db.User.findOne({ where: { verify_token: token } }));
    if (!user) throw new HttpError(400, "This link is invalid or was already used.");
    if (user.verify_token_expires_at && dayjs().isAfter(user.verify_token_expires_at)) {
      throw new HttpError(400, "This link has expired. Log in and ask for a new one from your account page.");
    }
    await user.update({ is_verify: true, verify_token: null, verify_token_expires_at: null });
    res.json({ message: "Your email is confirmed. Happy shopping!" });
  },

  // POST /api/auth/resend-verification  (logged in)
  async resendVerification(req, res) {
    const user = await db.User.findByPk(req.user.id, { include: [db.User_detail] });
    if (!user) throw new HttpError(404, "Account not found.");
    if (user.is_verify) throw new HttpError(400, "Your email is already confirmed.");
    const sent = await sendVerification(user, user.User_detail?.first_name || user.username);
    if (!sent) throw new HttpError(502, "We couldn't send the email right now. Please try again later.");
    res.json({ message: `We sent a new link to ${user.email}.` });
  },

  // POST /api/auth/forgot-password  { email }
  async forgotPassword(req, res) {
    const user = await db.User.findOne({ where: { email: req.body.email }, include: [db.User_detail] });
    // Same answer whether or not the account exists, so this can't be used to find out who's registered.
    const message = "If that email has an account, we've sent a link to reset the password.";
    if (!user || !user.by_form) return res.json({ message });

    const token = randomToken();
    await user.update({ reset_password_token: token, reset_password_expires_at: dayjs().add(RESET_MINUTES, "minute").toDate() });
    await sendMail({
      to: user.email,
      subject: "Reset your Furnifor password",
      name: user.User_detail?.first_name || user.username,
      paragraphs: [
        "Someone asked to reset the password for your account. If that was you, use the button below.",
        `The link works for ${RESET_MINUTES} minutes. If you didn't ask for this, you can ignore this email.`,
      ],
      button: { label: "Choose a new password", url: `${env.appUrl}/reset-password/${token}` },
    });
    res.json({ message });
  },

  // POST /api/auth/reset-password  { token, password }
  async resetPassword(req, res) {
    const user = await db.User.findOne({ where: { reset_password_token: req.body.token } });
    if (!user || (user.reset_password_expires_at && dayjs().isAfter(user.reset_password_expires_at))) {
      throw new HttpError(400, "This link is invalid or has expired. Ask for a new one.");
    }
    await user.update({
      password: await bcrypt.hash(req.body.password, 10),
      reset_password_token: null,
      reset_password_expires_at: null,
    });
    res.json({ message: "Your password is changed. You can log in now." });
  },

  // GET /api/auth/me
  async me(req, res) {
    const user = await sessionUser(req.user.id);
    if (!user) throw new HttpError(401, "Please log in again.");
    res.json({ data: user });
  },
};
