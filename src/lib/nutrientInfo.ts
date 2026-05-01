// Nutrient info: DRI targets (US FDA Daily Values, adults) + Cronometer-style descriptions
// Sources: USDA / FDA Daily Values (DV) reference, used by Cronometer for default targets.

export type NutrientKey =
  | "kcal"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
  | "saturated_fat_g"
  | "sugars_g"
  | "fiber_g"
  | "cholesterol_mg"
  | "sodium_mg"
  | "potassium_mg"
  | "calcium_mg"
  | "iron_mg"
  | "vitamin_c_mg"
  | "vitamin_a_iu";

export interface NutrientMeta {
  key: NutrientKey;
  unit: string;
  // FDA Daily Value (adults). For macros computed from kcal we keep the constant fallback.
  defaultTarget: number;
  // "limit" = should stay UNDER the target (saturated fat, sugars, sodium, cholesterol)
  // "goal"  = should reach AT LEAST the target
  kind: "goal" | "limit";
  // Map to LogItem field name in food_log_items
  field: string;
}

export const NUTRIENT_META: Record<NutrientKey, NutrientMeta> = {
  kcal:             { key: "kcal",             unit: "kcal", defaultTarget: 2000, kind: "goal",  field: "kcal" },
  protein_g:        { key: "protein_g",        unit: "g",    defaultTarget: 50,   kind: "goal",  field: "protein_g" },
  carbs_g:          { key: "carbs_g",          unit: "g",    defaultTarget: 275,  kind: "goal",  field: "carbs_g" },
  fat_g:            { key: "fat_g",            unit: "g",    defaultTarget: 78,   kind: "goal",  field: "fat_g" },
  saturated_fat_g:  { key: "saturated_fat_g",  unit: "g",    defaultTarget: 20,   kind: "limit", field: "saturated_fat_g" },
  sugars_g:         { key: "sugars_g",         unit: "g",    defaultTarget: 50,   kind: "limit", field: "sugars_g" },
  fiber_g:          { key: "fiber_g",          unit: "g",    defaultTarget: 28,   kind: "goal",  field: "fiber_g" },
  cholesterol_mg:   { key: "cholesterol_mg",   unit: "mg",   defaultTarget: 300,  kind: "limit", field: "cholesterol_mg" },
  sodium_mg:        { key: "sodium_mg",        unit: "mg",   defaultTarget: 2300, kind: "limit", field: "sodium_mg" },
  potassium_mg:     { key: "potassium_mg",     unit: "mg",   defaultTarget: 4700, kind: "goal",  field: "potassium_mg" },
  calcium_mg:       { key: "calcium_mg",       unit: "mg",   defaultTarget: 1300, kind: "goal",  field: "calcium_mg" },
  iron_mg:          { key: "iron_mg",          unit: "mg",   defaultTarget: 18,   kind: "goal",  field: "iron_mg" },
  vitamin_c_mg:     { key: "vitamin_c_mg",     unit: "mg",   defaultTarget: 90,   kind: "goal",  field: "vitamin_c_mg" },
  vitamin_a_iu:     { key: "vitamin_a_iu",     unit: "IU",   defaultTarget: 3000, kind: "goal",  field: "vitamin_a_iu" },
};

// Cronometer-style short explanations (EL / EN)
export const NUTRIENT_INFO: Record<NutrientKey, { el: { name: string; desc: string }; en: { name: string; desc: string } }> = {
  kcal: {
    el: { name: "Θερμίδες", desc: "Η ενέργεια που παίρνεις από τα τρόφιμα. Ισοζύγιο πρόσληψης/δαπάνης καθορίζει αύξηση ή απώλεια βάρους." },
    en: { name: "Calories", desc: "Energy from food. The balance between intake and expenditure drives weight gain or loss." },
  },
  protein_g: {
    el: { name: "Πρωτεΐνη", desc: "Δομικό υλικό για μύες, ένζυμα, ορμόνες. Σημαντική για ανάκαμψη και κορεσμό. 4 kcal/g." },
    en: { name: "Protein", desc: "Building block for muscle, enzymes and hormones. Supports recovery and satiety. 4 kcal/g." },
  },
  carbs_g: {
    el: { name: "Υδατάνθρακες", desc: "Η κύρια πηγή ενέργειας για εγκέφαλο και μύες. Προτίμησε σύνθετους (δημητριακά ολικής, λαχανικά). 4 kcal/g." },
    en: { name: "Carbohydrates", desc: "Primary fuel for brain and muscles. Prefer complex carbs (whole grains, vegetables). 4 kcal/g." },
  },
  fat_g: {
    el: { name: "Λιπαρά", desc: "Παρέχουν ενέργεια, υποστηρίζουν ορμόνες και απορρόφηση λιποδιαλυτών βιταμινών (A, D, E, K). 9 kcal/g." },
    en: { name: "Fat", desc: "Provides energy, supports hormones and absorption of fat-soluble vitamins (A, D, E, K). 9 kcal/g." },
  },
  saturated_fat_g: {
    el: { name: "Κορεσμένα Λιπαρά", desc: "Συνήθως από ζωικά προϊόντα και επεξεργασμένες τροφές. Η αυξημένη πρόσληψη συνδέεται με LDL χοληστερόλη. Στόχος: όριο." },
    en: { name: "Saturated Fat", desc: "Mostly from animal and processed foods. Higher intake links to elevated LDL cholesterol. Target: stay under limit." },
  },
  sugars_g: {
    el: { name: "Ζάχαρα", desc: "Απλά σάκχαρα (φυσικά + προστιθέμενα). Πολλά προστιθέμενα ζάχαρα συνδέονται με αύξηση βάρους και μεταβολικά προβλήματα." },
    en: { name: "Sugars", desc: "Simple sugars (natural + added). Excess added sugar is linked to weight gain and metabolic issues." },
  },
  fiber_g: {
    el: { name: "Φυτικές Ίνες", desc: "Βελτιώνουν την πέψη, σταθεροποιούν το σάκχαρο και αυξάνουν τον κορεσμό. Πηγές: λαχανικά, φρούτα, όσπρια, δημητριακά ολικής." },
    en: { name: "Fiber", desc: "Improves digestion, stabilizes blood sugar and increases satiety. Sources: vegetables, fruits, legumes, whole grains." },
  },
  cholesterol_mg: {
    el: { name: "Χοληστερόλη", desc: "Βρίσκεται μόνο σε ζωικά τρόφιμα. Η διαιτητική επίδραση ποικίλλει ανά άτομο. Στόχος: όριο." },
    en: { name: "Cholesterol", desc: "Found only in animal foods. Dietary impact varies by individual. Target: stay under limit." },
  },
  sodium_mg: {
    el: { name: "Νάτριο", desc: "Ηλεκτρολύτης απαραίτητος αλλά συχνά υπερβολικός. Υψηλό νάτριο συνδέεται με αυξημένη πίεση. Στόχος: όριο." },
    en: { name: "Sodium", desc: "Essential electrolyte, often overconsumed. High intake links to elevated blood pressure. Target: stay under limit." },
  },
  potassium_mg: {
    el: { name: "Κάλιο", desc: "Βοηθά στη ρύθμιση της πίεσης, μυϊκές συσπάσεις και ισορροπία υγρών. Πηγές: μπανάνες, πατάτες, φασόλια, σπανάκι." },
    en: { name: "Potassium", desc: "Helps regulate blood pressure, muscle contractions, and fluid balance. Sources: bananas, potatoes, beans, spinach." },
  },
  calcium_mg: {
    el: { name: "Ασβέστιο", desc: "Βασικό για οστά, δόντια, μυϊκή λειτουργία και νεύρα. Πηγές: γαλακτοκομικά, πράσινα φυλλώδη, εμπλουτισμένα ροφήματα." },
    en: { name: "Calcium", desc: "Essential for bones, teeth, muscle and nerve function. Sources: dairy, leafy greens, fortified drinks." },
  },
  iron_mg: {
    el: { name: "Σίδηρος", desc: "Μεταφέρει οξυγόνο μέσω της αιμοσφαιρίνης. Έλλειψη → αναιμία/κούραση. Πηγές: κόκκινο κρέας, όσπρια, σπανάκι." },
    en: { name: "Iron", desc: "Carries oxygen via hemoglobin. Deficiency causes anemia/fatigue. Sources: red meat, legumes, spinach." },
  },
  vitamin_c_mg: {
    el: { name: "Βιταμίνη C", desc: "Αντιοξειδωτικό, υποστηρίζει ανοσοποιητικό και απορρόφηση σιδήρου. Πηγές: εσπεριδοειδή, πιπεριές, μπρόκολο." },
    en: { name: "Vitamin C", desc: "Antioxidant, supports immunity and iron absorption. Sources: citrus, peppers, broccoli." },
  },
  vitamin_a_iu: {
    el: { name: "Βιταμίνη A", desc: "Σημαντική για όραση, δέρμα και ανοσοποιητικό. Πηγές: καρότα, γλυκοπατάτα, συκώτι, αυγά." },
    en: { name: "Vitamin A", desc: "Important for vision, skin and immune function. Sources: carrots, sweet potato, liver, eggs." },
  },
};

export const MACRO_KEYS: NutrientKey[] = ["protein_g", "carbs_g", "fat_g", "saturated_fat_g", "sugars_g", "fiber_g", "cholesterol_mg"];
export const MICRO_KEYS: NutrientKey[] = ["sodium_mg", "potassium_mg", "calcium_mg", "iron_mg", "vitamin_c_mg", "vitamin_a_iu"];
