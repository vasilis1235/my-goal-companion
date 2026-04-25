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

    const systemPrompt = `Είσαι ο WeightCoach, ένας φιλικός, θετικός και ενημερωμένος AI προπονητής για τη διαχείριση βάρους. Μιλάς πάντα Ελληνικά, με ζεστό αλλά επαγγελματικό ύφος. Δίνεις σύντομες, πρακτικές συμβουλές για διατροφή, άσκηση, ύπνο και mindset. Ποτέ μη δίνεις ιατρικές διαγνώσεις — αν χρειάζεται, παρότρυνε τον χρήστη να δει γιατρό/διαιτολόγο.

Στοιχεία χρήστη:
${context ?? "Δεν υπάρχουν ακόμη δεδομένα."}

Οδηγίες:
- Στο πρώτο μήνυμα κάνε ζεστό καλωσόρισμα και εξήγησε σύντομα τι μπορείς να κάνεις (καταγραφή προόδου, πρόταση στόχου, συμβουλές).
- Αν ο χρήστης ζητήσει πρόταση στόχου, υπολόγισε υγιές βάρος (BMI 22) αν έχεις ύψος, ή πρότεινε ρεαλιστικό ρυθμό 0.5-1 kg/εβδομάδα.
- Χρησιμοποίησε markdown με bullets και bold για σαφήνεια.
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
