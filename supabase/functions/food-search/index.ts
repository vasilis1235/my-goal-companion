// Food search aggregator: Open Food Facts (no key) + USDA FoodData Central (free key)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FoodResult {
  source: "off" | "usda";
  id: string;
  name: string;
  brand?: string;
  kcal_per_100g: number | null;
  serving_size_g?: number | null;
  serving_kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
}

async function searchOFF(query: string, signal: AbortSignal): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`;
    const r = await fetch(url, { signal, headers: { "User-Agent": "LovableFoodTracker/1.0" } });
    if (!r.ok) return [];
    const data = await r.json();
    const products: any[] = data.products ?? [];
    return products
      .filter((p) => p.product_name && p.nutriments?.["energy-kcal_100g"] != null)
      .map((p) => {
        const n = p.nutriments ?? {};
        const servingG = parseFloat(p.serving_quantity) || null;
        const kcal100 = Number(n["energy-kcal_100g"]) || null;
        return {
          source: "off" as const,
          id: `off_${p.code}`,
          name: p.product_name,
          brand: p.brands || undefined,
          kcal_per_100g: kcal100,
          serving_size_g: servingG,
          serving_kcal: servingG && kcal100 ? Math.round((kcal100 * servingG) / 100) : null,
          protein_g: Number(n["proteins_100g"]) || null,
          carbs_g: Number(n["carbohydrates_100g"]) || null,
          fat_g: Number(n["fat_100g"]) || null,
        };
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function searchUSDA(query: string, key: string, signal: AbortSignal): Promise<FoodResult[]> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR%20Legacy,Branded`;
    const r = await fetch(url, { signal });
    if (!r.ok) return [];
    const data = await r.json();
    const foods: any[] = data.foods ?? [];
    return foods.map((f) => {
      const nutrients: any[] = f.foodNutrients ?? [];
      const findN = (id: number) =>
        nutrients.find((n) => n.nutrientId === id)?.value ?? null;
      // Energy (kcal) = 1008, Protein = 1003, Carbs = 1005, Fat = 1004
      const kcal100 = findN(1008);
      return {
        source: "usda" as const,
        id: `usda_${f.fdcId}`,
        name: f.description,
        brand: f.brandOwner || f.brandName || undefined,
        kcal_per_100g: kcal100 != null ? Math.round(kcal100) : null,
        serving_size_g: f.servingSize && f.servingSizeUnit?.toLowerCase() === "g" ? f.servingSize : null,
        serving_kcal:
          f.servingSize && f.servingSizeUnit?.toLowerCase() === "g" && kcal100
            ? Math.round((kcal100 * f.servingSize) / 100)
            : null,
        protein_g: findN(1003),
        carbs_g: findN(1005),
        fat_g: findN(1004),
      };
    }).filter((x) => x.kcal_per_100g != null);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usdaKey = Deno.env.get("USDA_API_KEY");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const [off, usda] = await Promise.all([
      searchOFF(query.trim(), controller.signal),
      usdaKey ? searchUSDA(query.trim(), usdaKey, controller.signal) : Promise.resolve([]),
    ]);
    clearTimeout(timeout);

    // Interleave USDA first (more accurate macros), then OFF (better branded coverage)
    const results: FoodResult[] = [];
    const max = Math.max(usda.length, off.length);
    for (let i = 0; i < max; i++) {
      if (usda[i]) results.push(usda[i]);
      if (off[i]) results.push(off[i]);
    }

    return new Response(JSON.stringify({ results: results.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, results: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
