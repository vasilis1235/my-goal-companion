// Food search aggregator: Open Food Facts (no key) + USDA FoodData Central (free key)
// Returns full nutrition: macros + micros (per 100g)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FoodResult {
  source: "off" | "usda";
  id: string;
  external_id: string;
  name: string;
  brand?: string;
  serving_size_g?: number | null;
  // per 100g
  kcal_per_100g: number | null;
  protein_g_100g?: number | null;
  carbs_g_100g?: number | null;
  fat_g_100g?: number | null;
  saturated_fat_g_100g?: number | null;
  sugars_g_100g?: number | null;
  fiber_g_100g?: number | null;
  sodium_mg_100g?: number | null;
  potassium_mg_100g?: number | null;
  calcium_mg_100g?: number | null;
  iron_mg_100g?: number | null;
  vitamin_c_mg_100g?: number | null;
  vitamin_a_iu_100g?: number | null;
  cholesterol_mg_100g?: number | null;
}

const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

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
        const sodium100 =
          numOrNull(n["sodium_100g"]) != null
            ? (numOrNull(n["sodium_100g"]) as number) * 1000
            : numOrNull(n["salt_100g"]) != null
              ? (numOrNull(n["salt_100g"]) as number) * 400 // salt g -> sodium mg (≈ /2.5 *1000)
              : null;
        return {
          source: "off" as const,
          id: `off_${p.code}`,
          external_id: String(p.code),
          name: p.product_name,
          brand: p.brands || undefined,
          serving_size_g: numOrNull(p.serving_quantity),
          kcal_per_100g: numOrNull(n["energy-kcal_100g"]),
          protein_g_100g: numOrNull(n["proteins_100g"]),
          carbs_g_100g: numOrNull(n["carbohydrates_100g"]),
          fat_g_100g: numOrNull(n["fat_100g"]),
          saturated_fat_g_100g: numOrNull(n["saturated-fat_100g"]),
          sugars_g_100g: numOrNull(n["sugars_100g"]),
          fiber_g_100g: numOrNull(n["fiber_100g"]),
          sodium_mg_100g: sodium100,
          potassium_mg_100g: numOrNull(n["potassium_100g"]) != null ? (numOrNull(n["potassium_100g"]) as number) * 1000 : null,
          calcium_mg_100g: numOrNull(n["calcium_100g"]) != null ? (numOrNull(n["calcium_100g"]) as number) * 1000 : null,
          iron_mg_100g: numOrNull(n["iron_100g"]) != null ? (numOrNull(n["iron_100g"]) as number) * 1000 : null,
          vitamin_c_mg_100g: numOrNull(n["vitamin-c_100g"]) != null ? (numOrNull(n["vitamin-c_100g"]) as number) * 1000 : null,
          vitamin_a_iu_100g: null,
          cholesterol_mg_100g: numOrNull(n["cholesterol_100g"]) != null ? (numOrNull(n["cholesterol_100g"]) as number) * 1000 : null,
        };
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}

// USDA nutrient IDs
const N = {
  kcal: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugars: 2000,
  saturated: 1258,
  sodium: 1093,
  potassium: 1092,
  calcium: 1087,
  iron: 1089,
  vitC: 1162,
  vitA_IU: 1104,
  cholesterol: 1253,
};

async function searchUSDA(query: string, key: string, signal: AbortSignal): Promise<FoodResult[]> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR%20Legacy,Branded`;
    const r = await fetch(url, { signal });
    if (!r.ok) return [];
    const data = await r.json();
    const foods: any[] = data.foods ?? [];
    return foods
      .map((f) => {
        const nutrients: any[] = f.foodNutrients ?? [];
        const findN = (id: number) =>
          numOrNull(nutrients.find((n) => n.nutrientId === id)?.value);
        const kcal100 = findN(N.kcal);
        const servingG =
          f.servingSize && f.servingSizeUnit?.toLowerCase() === "g" ? f.servingSize : null;
        return {
          source: "usda" as const,
          id: `usda_${f.fdcId}`,
          external_id: String(f.fdcId),
          name: f.description,
          brand: f.brandOwner || f.brandName || undefined,
          serving_size_g: servingG,
          kcal_per_100g: kcal100 != null ? Math.round(kcal100) : null,
          protein_g_100g: findN(N.protein),
          carbs_g_100g: findN(N.carbs),
          fat_g_100g: findN(N.fat),
          saturated_fat_g_100g: findN(N.saturated),
          sugars_g_100g: findN(N.sugars),
          fiber_g_100g: findN(N.fiber),
          sodium_mg_100g: findN(N.sodium),
          potassium_mg_100g: findN(N.potassium),
          calcium_mg_100g: findN(N.calcium),
          iron_mg_100g: findN(N.iron),
          vitamin_c_mg_100g: findN(N.vitC),
          vitamin_a_iu_100g: findN(N.vitA_IU),
          cholesterol_mg_100g: findN(N.cholesterol),
        };
      })
      .filter((x) => x.kcal_per_100g != null);
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
