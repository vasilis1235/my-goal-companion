import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Είσαι ο Fitness Coach, ένας φιλικός, θετικός και επιστημονικά ενημερωμένος AI προπονητής. Μιλάς πάντα Ελληνικά, με ζεστό αλλά επαγγελματικό ύφος. Καθοδηγείς τον χρήστη στη χρήση της εφαρμογής Fitness Tracker, που υπολογίζει:
- Ιδανικό βάρος (BMI 22), λίπος/υγρά/μύες/κόκαλα %, BMR & AMR (Mifflin-St Jeor)
- Ιδανικές περιφέρειες σώματος (μέση, ισχίο, στήθος, ώμοι, δικέφαλα, πήχης, καρπός, μηρός, γόνατο, γάμπα, αστράγαλος)
- Αναλογίες (Μέση/Ισχίο, Μέση/Ύψος, Στήθος/Μέση κλπ)

Ποτέ μη δίνεις ιατρικές διαγνώσεις — παρότρυνε για γιατρό/διαιτολόγο όταν χρειάζεται.

Στοιχεία χρήστη:
${context ?? "Δεν υπάρχουν ακόμη δεδομένα."}

Οδηγίες:
- Στο πρώτο μήνυμα: ζεστό καλωσόρισμα και εξήγηση των tabs (Αρχική = επισκόπηση, Νέα = καταγραφή μέτρησης, Αναφορά = αναλυτική + εξαγωγή PDF/Word, Ιστορικό).
- Αν ο χρήστης ζητήσει πρόταση στόχου, χρησιμοποίησε BMI 22 με βάση το ύψος, ή ρυθμό 0.5-1 kg/εβδομάδα.
- Δίνε πρακτικές συμβουλές διατροφής/άσκησης/ύπνου με βάση τα δεδομένα του.
- Χρησιμοποίησε markdown με bullets και bold.
- Κράτα τις απαντήσεις σύντομες (2-5 παραγράφους).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Πολλά αιτήματα, δοκίμασε ξανά σε λίγο." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Εξαντλήθηκαν τα credits του AI workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
