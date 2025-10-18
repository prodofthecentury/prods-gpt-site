export default async function handler(req, res) {
  const state = Math.random().toString(36).slice(2);
  res.setHeader("Set-Cookie", `fb_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    redirect_uri: `${process.env.BASE_URL}/api/auth/facebook/callback`,
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata",
    state
  });
  res.redirect(`https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`);
}
