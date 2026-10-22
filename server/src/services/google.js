const env = require("../config/env");
const HttpError = require("../utils/httpError");

/**
 * Checks a Google sign-in credential (an ID token from Google Identity Services) with Google
 * and returns the verified email and name. The old version trusted whatever email the browser sent.
 */
async function verifyCredential(credential) {
  if (!env.googleClientId) throw new HttpError(404, "Google sign-in isn't set up on this server.");
  if (!credential) throw new HttpError(400, "Missing Google credential.");

  let info;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(6000),
    });
    info = await res.json();
    if (!res.ok) throw new Error(info?.error_description || "invalid token");
  } catch {
    throw new HttpError(401, "Google sign-in failed. Please try again.");
  }

  if (info.aud !== env.googleClientId) throw new HttpError(401, "This Google sign-in wasn't meant for this app.");
  if (info.email_verified !== "true" && info.email_verified !== true) {
    throw new HttpError(401, "Your Google email isn't verified yet.");
  }

  return {
    email: String(info.email).toLowerCase(),
    firstName: info.given_name || String(info.name || info.email).split(" ")[0],
    lastName: info.family_name || "",
    picture: info.picture || null,
  };
}

module.exports = { verifyCredential };
