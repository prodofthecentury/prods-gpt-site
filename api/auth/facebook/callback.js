```javascript name=api/auth/facebook/callback.js url=https://github.com/prodofthecentury/prods-gpt-site/blob/e0d872b2967dfe9cb396ccc2e97a2ed36b297e81/api/auth/facebook/callback.js
export default async function handler(req, res) {
  // Only allow GET (Facebook will redirect with code/state in query)
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method not allowed");
  }

  const { code, state } = req.query;
  if (!code) return res.status(400).send("Missing code");

  // Robust cookie parsing
  const parseCookies = (cookieHeader = "") =>
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .reduce((acc, c) => {
        const idx = c.indexOf("=");
        if (idx === -1) return acc;
        const name = decodeURIComponent(c.slice(0, idx).trim());
        const value = decodeURIComponent(c.slice(idx + 1).trim());
        acc[name] = value;
        return acc;
      }, {});

  const cookies = parseCookies(req.headers.cookie || "");
  const savedState = cookies.fb_oauth_state || null;
  if (!state || state !== savedState) return res.status(400).send("Invalid state");

  // Clear the state cookie (best-effort)
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `fb_oauth_state=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${secureFlag}`
  );

  if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET || !process.env.BASE_URL) {
    return res.status(500).send("Server configuration for Facebook OAuth is incomplete");
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      redirect_uri: `${process.env.BASE_URL.replace(/\/$/, "")}/api/auth/facebook/callback`,
      code,
    });

    const tokenResp = await fetch(`https://graph.facebook.com/v24.0/oauth/access_token?${params.toString()}`);
    const tokenBody = await tokenResp.json();

    if (!tokenResp.ok || tokenBody.error) {
      // tokenBody may contain error details
      const errMsg = tokenBody.error
        ? JSON.stringify(tokenBody.error)
        : `Status ${tokenResp.status}`;
      return res.status(502).send(`Failed to exchange code for token: ${errMsg}`);
    }

    // Optionally fetch basic profile info
    let profile = null;
    if (tokenBody.access_token) {
      const profileResp = await fetch(
        `https://graph.facebook.com/me?access_token=${encodeURIComponent(tokenBody.access_token)}&fields=id,name,email,picture`
      );
      profile = await profileResp.json();
      if (!profileResp.ok || profile.error) {
        // don't fail the whole flow on profile fetch failure, but include the error
        profile = { error: profile.error || `Failed to fetch profile (status ${profileResp.status})` };
      }
    }

    return res.status(200).json({ token: tokenBody, profile });
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return res.status(500).send("Internal server error during Facebook OAuth callback");
  }
}
```
