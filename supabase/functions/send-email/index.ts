// Supabase Edge Function — send-email
// Envoi d'emails HACCP via Resend (gratuit jusqu'à 100/jour)
// 
// SETUP:
// 1. Créer un compte sur resend.com (gratuit)
// 2. Obtenir une API key
// 3. Ajouter le secret dans Supabase:
//    supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
// 4. Déployer la fonction:
//    supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "HACCP Pro <haccp@resend.dev>";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Envoyer via Resend API
    const recipients = to.split(",").map((e) => e.trim()).filter(Boolean);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients,
        subject: subject,
        text: body,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e1e2e;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;font-size:16px">HACCP Pro</h2>
          </div>
          <div style="padding:24px;background:#fff;border:1px solid #eceef1;border-top:none;border-radius:0 0 8px 8px">
            <h3 style="margin:0 0 12px;color:#1e1e2e">${subject}</h3>
            <pre style="white-space:pre-wrap;font-family:sans-serif;color:#3a3a4a;line-height:1.6;margin:0">${body}</pre>
            <hr style="border:none;border-top:1px solid #eceef1;margin:20px 0">
            <p style="font-size:11px;color:#9ca3af;margin:0">Email automatique envoyé par HACCP Pro. Ne pas répondre.</p>
          </div>
        </div>`,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
