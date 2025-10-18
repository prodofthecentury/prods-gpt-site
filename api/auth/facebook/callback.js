export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookie = (req.headers.cookie || "").split("; ").find(c => c.startsWith("fb_oauth_state="));
  const savedState = cookie ? cookie.split("=")[1] : null;
  if (!state || state !== savedState) return res.status(400).send("Invalid state");

  const p = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET,
    redirect_uri: `${process.env.BASE_URL}/api/auth/facebook/callback`,
    code
  });
  const r = await fetch(`https://graph.facebook.com/v24.0/oauth/access_token?${p.toString()}`);
  const token = await r.json(); // { access_token, token_type, expires_in }
  return res.status(200).send(`Facebook user token received. Raw: ${JSON.stringify(token)}`);
}
