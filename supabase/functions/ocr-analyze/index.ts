import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPTS: Record<string, string> = {
  dlc: `Analyse cette photo d'étiquette alimentaire. Extrais UNIQUEMENT en JSON:
{"product_name": "...", "dlc_date": "YYYY-MM-DD", "lot_number": "...", "supplier": "...", "confidence": "high/medium/low"}
Si un champ n'est pas visible, mets null. dlc_date = date limite de consommation (DLC) ou DDM.
Cherche les formats: JJ/MM/AAAA, DD.MM.YYYY, DDMMYY, etc. Convertis toujours en YYYY-MM-DD.`,

  lot: `Analyse cette photo d'étiquette alimentaire. Extrais UNIQUEMENT en JSON:
{"product_name": "...", "lot_number": "...", "origin": "...", "supplier": "...", "dlc_date": "YYYY-MM-DD", "confidence": "high/medium/low"}
Si un champ n'est pas visible, mets null. Le numéro de lot peut être précédé de "L", "LOT", "Lot:" etc.`,

  bl: `Analyse ce bon de livraison ou facture. Extrais UNIQUEMENT en JSON:
{"supplier": "...", "delivery_date": "YYYY-MM-DD", "bl_number": "...", "total_amount": "...", "products": [{"name": "...", "qty": "..."}], "confidence": "high/medium/low"}
Si un champ n'est pas visible, mets null. Extrais les produits principaux visibles (max 10).
delivery_date = date de livraison ou date de facture. Convertis en YYYY-MM-DD.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT with Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { image_base64, context } = await req.json();
    if (!image_base64 || !context) {
      return new Response(JSON.stringify({ error: "image_base64 et context requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = PROMPTS[context];
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Context invalide: " + context }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Claude API
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée sur le serveur" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image_base64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!claudeResp.ok) {
      const errData = await claudeResp.json().catch(() => ({}));
      const errMsg = errData.error?.message || "Erreur API Claude " + claudeResp.status;
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResp.json();
    const text = claudeData.content?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Aucune donnée détectée dans l'image" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;
    try { result = JSON.parse(jsonMatch[0]); }
    catch (_) {
      return new Response(JSON.stringify({ error: "Format de réponse OCR invalide" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
