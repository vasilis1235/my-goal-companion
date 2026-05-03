// Σύστημα χρωματισμού & σχολίων ανά ζώνη απόκλισης
// Πηγές: WHO, NIH, ACSM, ACE, Flegal et al. 2013, Janssen et al. 2000

export type MetricKind =
  | "weight"
  | "body_fat"
  | "muscle"
  | "water"
  | "bone"
  | "trunk_circ"      // Μέση, Ισχίο, Λαιμός
  | "muscle_circ"     // Στήθος, Ώμοι, Δικέφαλος, Πήχης, Μηρός, Γάμπα
  | "whr_whtr"        // WHR, WHtR
  | "ratio";          // CWR, SWR, FBR, TCR, WBR, TKR, ACR

export type ZoneSeverity = "danger-high" | "high" | "warn" | "mild" | "ok" | "mild-low" | "low" | "danger-low" | "critical-low";

export interface Zone {
  /** Inclusive lower bound of deviation % (signed). null = -Infinity */
  min: number | null;
  /** Exclusive upper bound of deviation % (signed). null = +Infinity */
  max: number | null;
  severity: ZoneSeverity;
  label: string;
  emoji: "⚠️" | "✅";
  /** Detailed scientific explanation in Greek */
  description: string;
  /** Clickable source URLs */
  sources: { title: string; url: string }[];
}

// ─── Pickup helper ───
export function getZone(kind: MetricKind, current: number, target: number): Zone | null {
  if (target === 0 || !isFinite(target)) return null;
  const deviation = ((current - target) / target) * 100;
  const zones = ZONES[kind];
  for (const z of zones) {
    const lo = z.min === null ? -Infinity : z.min;
    const hi = z.max === null ? Infinity : z.max;
    if (deviation >= lo && deviation < hi) return z;
  }
  return null;
}

// Tailwind classes for each zone severity (uses semantic tokens + tailwind colors)
export const ZONE_CLASSES: Record<ZoneSeverity, { bg: string; border: string; text: string }> = {
  "danger-high":  { bg: "bg-red-500/20",   border: "border-red-500",       text: "text-red-700 dark:text-red-300" },
  "high":         { bg: "bg-red-500/15",   border: "border-red-500/80",    text: "text-red-700 dark:text-red-300" },
  "warn":         { bg: "bg-red-500/10",   border: "border-red-400/70",    text: "text-red-600 dark:text-red-300" },
  "mild":         { bg: "bg-red-500/5",    border: "border-red-300/50",    text: "text-red-500 dark:text-red-200" },
  "ok":           { bg: "bg-emerald-500/15", border: "border-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  "mild-low":     { bg: "bg-sky-500/5",    border: "border-sky-300/50",    text: "text-sky-500 dark:text-sky-200" },
  "low":          { bg: "bg-sky-500/10",   border: "border-sky-400/70",    text: "text-sky-600 dark:text-sky-300" },
  "danger-low":   { bg: "bg-blue-500/15",  border: "border-blue-500/80",   text: "text-blue-700 dark:text-blue-300" },
  "critical-low": { bg: "bg-blue-500/20",  border: "border-blue-500",      text: "text-blue-800 dark:text-blue-300" },
};

// Helper for "ratio" kinds with ±1% ok
const ratioZones = (highLabels: string[], lowLabels: string[], descs: string[], srcs: { title: string; url: string }[][]): Zone[] => [
  { min: 20, max: null, severity: "danger-high", label: highLabels[0], emoji: "⚠️", description: descs[0], sources: srcs[0] },
  { min: 10, max: 20, severity: "high", label: highLabels[1], emoji: "⚠️", description: descs[1], sources: srcs[1] },
  { min: 5, max: 10, severity: "warn", label: highLabels[2], emoji: "⚠️", description: descs[2], sources: srcs[2] },
  { min: 1, max: 5, severity: "mild", label: highLabels[3], emoji: "⚠️", description: descs[3], sources: srcs[3] },
  { min: -1, max: 1, severity: "ok", label: "Αρμονική συμμετρία", emoji: "✅", description: "Η αναλογία βρίσκεται μέσα στο ιδανικό εύρος (±1%) και υποδεικνύει αρμονική συμμετρία.", sources: [] },
  { min: -5, max: -1, severity: "mild-low", label: lowLabels[0], emoji: "⚠️", description: descs[4], sources: srcs[4] },
  { min: -10, max: -5, severity: "low", label: lowLabels[1], emoji: "⚠️", description: descs[5], sources: srcs[5] },
  { min: -20, max: -10, severity: "danger-low", label: lowLabels[2], emoji: "⚠️", description: descs[6], sources: srcs[6] },
  { min: null, max: -20, severity: "critical-low", label: lowLabels[3], emoji: "⚠️", description: descs[7], sources: srcs[7] },
];

const WHO_OBESITY = { title: "WHO – Obesity and overweight (2024)", url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight" };
const FLEGAL_2013 = { title: "Flegal et al. (2013) – BMI & all-cause mortality, JAMA", url: "https://jamanetwork.com/journals/jama/fullarticle/1555137" };
const BHASKARAN_2014 = { title: "Bhaskaran et al. (2014) – BMI & 22 cancers, Lancet", url: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)60892-8/fulltext" };
const GALLAGHER_2000 = { title: "Gallagher et al. (2000) – Healthy %BF ranges, AJCN", url: "https://academic.oup.com/ajcn/article/72/3/694/4729364" };
const JANSSEN_2000 = { title: "Janssen et al. (2000) – Skeletal muscle mass, J Appl Physiol", url: "https://journals.physiology.org/doi/10.1152/jappl.2000.89.1.81" };
const NIH_HYDRATION = { title: "NIH – Water in health and disease", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2908954/" };
const NIH_OSTEO = { title: "NIH – Bone health & osteoporosis", url: "https://www.bones.nih.gov/health-info/bone/osteoporosis/overview" };
const WHO_WAIST = { title: "WHO – Waist circumference & waist–hip ratio (2008)", url: "https://www.who.int/publications/i/item/9789241501491" };
const ACSM_BC = { title: "ACSM – Body composition guidelines", url: "https://www.acsm.org/" };

// ════════════════════════════════════════════════════════════
// 1. ΒΑΡΟΣ
// ════════════════════════════════════════════════════════════
const WEIGHT_ZONES: Zone[] = [
  {
    min: 100, max: null, severity: "danger-high",
    label: "Νοσογόνος παχυσαρκία", emoji: "⚠️",
    description:
      "Το βάρος σας είναι υπερδιπλάσιο από το ιδανικό σας βάρος (ΔΜΣ > 40 kg/m²). Πρόκειται για τη σοβαρότερη μορφή παχυσαρκίας, αναγνωρισμένη ως χρόνια νόσος από τον ΠΟΥ. Προκαλεί χρόνια συστηματική φλεγμονή, αυξάνει δραματικά τον κίνδυνο για καρδιαγγειακά νοσήματα, διαβήτη τύπου 2, υπνική άπνοια, οστεοαρθρίτιδα και τουλάχιστον 13 τύπους καρκίνου. Το προσδόκιμο ζωής μπορεί να μειωθεί έως και 13 χρόνια.",
    sources: [WHO_OBESITY, FLEGAL_2013, BHASKARAN_2014],
  },
  {
    min: 30, max: 100, severity: "high",
    label: "Σοβαρή παχυσαρκία", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 30%–100% πάνω από το ιδανικό (ΔΜΣ ~35–40 kg/m², Παχυσαρκία Τάξης ΙΙ). Αυξημένος κίνδυνος για διαβήτη, υπέρταση, στεφανιαία νόσο, εγκεφαλικό και καρκίνο. Μελέτες δείχνουν 29% υψηλότερο κίνδυνο θανάτου από κάθε αιτία.",
    sources: [WHO_OBESITY, FLEGAL_2013],
  },
  {
    min: 15, max: 30, severity: "warn",
    label: "Μέτρια παχυσαρκία", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 15%–30% πάνω από το ιδανικό (ΔΜΣ ~30–35 kg/m², Παχυσαρκία Τάξης Ι). Το σπλαχνικό λίπος εκκρίνει φλεγμονώδεις κυτοκίνες προκαλώντας αντίσταση στην ινσουλίνη. Ο κίνδυνος διαβήτη τύπου 2 είναι 2,2× υψηλότερος για άντρες και 6,7× για γυναίκες.",
    sources: [WHO_OBESITY, FLEGAL_2013, BHASKARAN_2014],
  },
  {
    min: 5, max: 15, severity: "mild",
    label: "Υπέρβαρο", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 5%–15% πάνω από το ιδανικό (ΔΜΣ ~25–30 kg/m²). Αυξημένος καρδιαγγειακός κίνδυνος και πιθανότητα εξέλιξης σε παχυσαρκία αν δεν αλλάξει η τάση. Μείωση 5–10% του σωματικού βάρους έχει αποδειχθεί ότι μειώνει την αρτηριακή πίεση και βελτιώνει το λιπιδαιμικό προφίλ.",
    sources: [WHO_OBESITY, FLEGAL_2013],
  },
  {
    min: 1, max: 5, severity: "mild",
    label: "Ελαφρώς υπέρβαρο", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 1%–5% πάνω από το ιδανικό. Δεν αποτελεί ιατρικό κίνδυνο, αλλά είναι σημάδι για παρακολούθηση. Μικρές διατροφικές προσαρμογές και αύξηση φυσικής δραστηριότητας αρκούν για επιστροφή στο ιδανικό εύρος.",
    sources: [WHO_OBESITY],
  },
  {
    min: -1, max: 1, severity: "ok",
    label: "Ιδανικό βάρος", emoji: "✅",
    description: "Το βάρος σας βρίσκεται μέσα στο εξατομικευμένο ιδανικό εύρος (ΔΜΣ ~22 kg/m²). Συσχετίζεται με τη χαμηλότερη θνησιμότητα από κάθε αιτία και μειωμένο κίνδυνο για χρόνιες ασθένειες.",
    sources: [FLEGAL_2013],
  },
  {
    min: -5, max: -1, severity: "mild-low",
    label: "Ελαφρώς ελλιποβαρές", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 1%–5% κάτω από το ιδανικό. Συνήθως δεν αποτελεί κίνδυνο, αλλά αν συνοδεύεται από μειωμένη μυϊκή μάζα ή κόπωση, αξίζει διατροφική αξιολόγηση.",
    sources: [WHO_OBESITY],
  },
  {
    min: -15, max: -5, severity: "low",
    label: "Ελλιποβαρές", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 5%–15% κάτω από το ιδανικό (ΔΜΣ ~17–18,5 kg/m²). Συνδέεται με μειωμένη ανοσία, οστεοπενία, διαταραχές περιόδου και αυξημένο κίνδυνο μόλυνσης.",
    sources: [WHO_OBESITY, NIH_OSTEO],
  },
  {
    min: -30, max: -15, severity: "danger-low",
    label: "Σημαντικά ελλιποβαρές", emoji: "⚠️",
    description:
      "Το βάρος σας είναι 15%–30% κάτω από το ιδανικό (ΔΜΣ < 17 kg/m²). Σοβαρός κίνδυνος υποσιτισμού, σαρκοπενίας, οστεοπόρωσης και καρδιολογικών επιπλοκών. Συνιστάται ιατρική αξιολόγηση.",
    sources: [WHO_OBESITY, JANSSEN_2000],
  },
  {
    min: null, max: -30, severity: "critical-low",
    label: "Σοβαρή λιποβαρία", emoji: "⚠️",
    description:
      "Το βάρος σας είναι περισσότερο από 30% κάτω από το ιδανικό (ΔΜΣ < 16 kg/m²). Κατάσταση κρίσιμη που απαιτεί άμεση ιατρική παρέμβαση. Σχετίζεται με ανεπάρκεια οργάνων, σοβαρή ανοσοκαταστολή και υψηλή θνησιμότητα.",
    sources: [WHO_OBESITY],
  },
];

// ════════════════════════════════════════════════════════════
// 2. ΛΙΠΟΣ
// ════════════════════════════════════════════════════════════
const BODY_FAT_ZONES: Zone[] = [
  { min: 30, max: null, severity: "danger-high", label: "Επικίνδυνα υψηλό λίπος", emoji: "⚠️",
    description: "Το ποσοστό λίπους είναι >30% πάνω από το ιδανικό. Σπλαχνική παχυσαρκία υψηλού κινδύνου: αντίσταση στην ινσουλίνη, διαβήτης τύπου 2, λιπώδες ήπαρ, μεταβολικό σύνδρομο.",
    sources: [GALLAGHER_2000, WHO_OBESITY] },
  { min: 15, max: 30, severity: "high", label: "Παχυσαρκία (λιπώδης)", emoji: "⚠️",
    description: "Το λίπος είναι 15%–30% πάνω από το ιδανικό. Καρδιαγγειακός κίνδυνος και μεταβολικές επιπλοκές. Συνιστάται απώλεια λίπους με συνδυασμό άσκησης και διατροφής.",
    sources: [GALLAGHER_2000, ACSM_BC] },
  { min: 5, max: 15, severity: "warn", label: "Αυξημένο λίπος", emoji: "⚠️",
    description: "Το λίπος είναι 5%–15% πάνω από το ιδανικό. Δεν είναι ιατρικά επικίνδυνο, αλλά συνιστάται μείωση για βελτίωση σύστασης σώματος.",
    sources: [GALLAGHER_2000] },
  { min: 1, max: 5, severity: "mild", label: "Οριακά αυξημένο λίπος", emoji: "⚠️",
    description: "Το λίπος είναι 1%–5% πάνω από το ιδανικό. Ελαφρά απόκλιση που διορθώνεται εύκολα.",
    sources: [GALLAGHER_2000] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανικό λίπος", emoji: "✅",
    description: "Το ποσοστό λίπους βρίσκεται στο ιδανικό εύρος για το φύλο και την ηλικία σας. Συσχετίζεται με βέλτιστη υγεία και αθλητική απόδοση.",
    sources: [GALLAGHER_2000, ACSM_BC] },
  { min: -5, max: -1, severity: "mild-low", label: "Οριακά χαμηλό λίπος", emoji: "⚠️",
    description: "Το λίπος είναι 1%–5% κάτω από το ιδανικό. Συνήθως δεν αποτελεί κίνδυνο, αλλά αξίζει παρακολούθηση.",
    sources: [GALLAGHER_2000] },
  { min: -15, max: -5, severity: "low", label: "Πολύ χαμηλό λίπος", emoji: "⚠️",
    description: "Το λίπος είναι 5%–15% κάτω από το ιδανικό. Σε γυναίκες μπορεί να προκαλέσει αμηνόρροια και ορμονικές διαταραχές. Σε άντρες, μειωμένη τεστοστερόνη.",
    sources: [GALLAGHER_2000] },
  { min: -30, max: -15, severity: "danger-low", label: "Επικίνδυνα χαμηλό λίπος", emoji: "⚠️",
    description: "Το λίπος είναι 15%–30% κάτω από το ιδανικό. Κίνδυνος για ορμονικές διαταραχές, οστεοπόρωση και ανοσοκαταστολή.",
    sources: [GALLAGHER_2000, NIH_OSTEO] },
  { min: null, max: -30, severity: "critical-low", label: "Κρίσιμα χαμηλό λίπος", emoji: "⚠️",
    description: "Το λίπος είναι >30% κάτω από το ιδανικό. Επικίνδυνη κατάσταση για τη ζωή. Απαιτείται άμεση ιατρική αξιολόγηση.",
    sources: [GALLAGHER_2000] },
];

// ════════════════════════════════════════════════════════════
// 3. ΜΥΕΣ
// ════════════════════════════════════════════════════════════
const MUSCLE_ZONES: Zone[] = [
  { min: 30, max: null, severity: "danger-high", label: "Υπερτροφία εκτός ορίων", emoji: "⚠️",
    description: "Η μυϊκή μάζα είναι >30% πάνω από το φυσιολογικό. Σε φυσικούς αθλητές είναι σπάνιο και υποδηλώνει εξαιρετική γενετική ή χρόνια προπόνηση. Σε άλλες περιπτώσεις, αξιολογήστε για χρήση αναβολικών.",
    sources: [JANSSEN_2000] },
  { min: 15, max: 30, severity: "high", label: "Έντονη υπερτροφία", emoji: "⚠️",
    description: "Μυϊκή μάζα 15%–30% πάνω από το ιδανικό. Χαρακτηριστικό προπονημένων αθλητών δύναμης.",
    sources: [JANSSEN_2000] },
  { min: 5, max: 15, severity: "warn", label: "Αυξημένη μυϊκή μάζα", emoji: "⚠️",
    description: "Μυϊκή μάζα 5%–15% πάνω από τον μέσο όρο. Θετικό για μεταβολισμό και υγεία, αλλά παρακολουθήστε ισορροπία με λιπώδη μάζα.",
    sources: [JANSSEN_2000] },
  { min: 1, max: 5, severity: "mild", label: "Οριακά αυξημένη μυϊκή μάζα", emoji: "⚠️",
    description: "Ελαφρώς πάνω από το ιδανικό. Πολύ καλή κατάσταση.",
    sources: [JANSSEN_2000] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανική μυϊκή μάζα", emoji: "✅",
    description: "Η μυϊκή μάζα βρίσκεται στο ιδανικό εύρος για το φύλο και την ηλικία σας. Συσχετίζεται με μεταβολική υγεία και λειτουργική ικανότητα.",
    sources: [JANSSEN_2000, ACSM_BC] },
  { min: -5, max: -1, severity: "mild-low", label: "Οριακά μειωμένη μυϊκή μάζα", emoji: "⚠️",
    description: "Ελαφρά μείωση 1%–5%. Αυξήστε ασκήσεις αντίστασης και πρόσληψη πρωτεΐνης.",
    sources: [JANSSEN_2000] },
  { min: -15, max: -5, severity: "low", label: "Μυϊκή ατροφία", emoji: "⚠️",
    description: "Μείωση 5%–15%. Αυξάνει τον κίνδυνο για μεταβολικά νοσήματα και μειωμένη λειτουργικότητα.",
    sources: [JANSSEN_2000] },
  { min: -30, max: -15, severity: "danger-low", label: "Σημαντική μυϊκή ατροφία", emoji: "⚠️",
    description: "Μείωση 15%–30%. Σοβαρή απώλεια μυϊκής μάζας. Συνιστάται διατροφική και προπονητική παρέμβαση.",
    sources: [JANSSEN_2000] },
  { min: null, max: -30, severity: "critical-low", label: "Σαρκοπενία", emoji: "⚠️",
    description: "Σοβαρή απώλεια μυϊκής μάζας >30%. Κλινικά σημαντική σαρκοπενία με αυξημένο κίνδυνο πτώσεων, αναπηρίας και θνησιμότητας.",
    sources: [JANSSEN_2000] },
];

// ════════════════════════════════════════════════════════════
// 4. ΥΓΡΑ
// ════════════════════════════════════════════════════════════
const WATER_ZONES: Zone[] = [
  { min: 15, max: null, severity: "danger-high", label: "Σοβαρή υπερυδάτωση", emoji: "⚠️",
    description: "Υπερβολική κατακράτηση υγρών (>15%). Μπορεί να σχετίζεται με νεφρική, καρδιακή ή ηπατική δυσλειτουργία. Συνιστάται ιατρική αξιολόγηση.",
    sources: [NIH_HYDRATION] },
  { min: 10, max: 15, severity: "high", label: "Υπερυδάτωση", emoji: "⚠️",
    description: "Αυξημένα υγρά 10%–15% πάνω από το φυσιολογικό. Πιθανή κατακράτηση από αυξημένο νάτριο ή ορμονικές διαταραχές.",
    sources: [NIH_HYDRATION] },
  { min: 3, max: 10, severity: "warn", label: "Κατακράτηση υγρών", emoji: "⚠️",
    description: "Μέτρια κατακράτηση 3%–10%. Συνήθως διατροφικής αιτιολογίας (νάτριο, γρήγορα φαγητά).",
    sources: [NIH_HYDRATION] },
  { min: 1, max: 3, severity: "mild", label: "Ήπια κατακράτηση", emoji: "⚠️",
    description: "Ήπια αύξηση 1%–3%. Χωρίς ιδιαίτερη σημασία.",
    sources: [NIH_HYDRATION] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανική ενυδάτωση", emoji: "✅",
    description: "Επίπεδα υγρών μέσα στο φυσιολογικό εύρος. Καλή ενυδάτωση συμβάλλει σε μεταβολισμό, νεφρική λειτουργία και γνωστική απόδοση.",
    sources: [NIH_HYDRATION] },
  { min: -3, max: -1, severity: "mild-low", label: "Ήπια αφυδάτωση", emoji: "⚠️",
    description: "Ήπια μείωση 1%–3%. Αυξήστε την πρόσληψη νερού.",
    sources: [NIH_HYDRATION] },
  { min: -10, max: -3, severity: "low", label: "Μέτρια αφυδάτωση", emoji: "⚠️",
    description: "Μείωση 3%–10%. Επηρεάζει τη φυσική και γνωστική απόδοση. Επιπτώσεις σε νεφρά και κυκλοφορία.",
    sources: [NIH_HYDRATION] },
  { min: -15, max: -10, severity: "danger-low", label: "Σοβαρή αφυδάτωση", emoji: "⚠️",
    description: "Μείωση 10%–15%. Σοβαρός κίνδυνος. Άμεση πρόσληψη υγρών και ηλεκτρολυτών.",
    sources: [NIH_HYDRATION] },
  { min: null, max: -15, severity: "critical-low", label: "Κρίσιμη αφυδάτωση", emoji: "⚠️",
    description: "Μείωση >15%. Επείγουσα κατάσταση που απαιτεί ιατρική παρέμβαση.",
    sources: [NIH_HYDRATION] },
];

// ════════════════════════════════════════════════════════════
// 5. ΚΟΚΑΛΑ
// ════════════════════════════════════════════════════════════
const BONE_ZONES: Zone[] = [
  { min: 30, max: null, severity: "danger-high", label: "Υπερβολικά υψηλή οστική μάζα", emoji: "⚠️",
    description: "Οστική μάζα >30% πάνω από το φυσιολογικό. Σπάνιο εύρημα — συνήθως σχετίζεται με αυξημένη μυϊκή μάζα ή σπάνιες παθήσεις.",
    sources: [NIH_OSTEO] },
  { min: 15, max: 30, severity: "high", label: "Πολύ υψηλή οστική μάζα", emoji: "⚠️",
    description: "Οστική μάζα 15%–30% πάνω από τον μέσο όρο. Συνήθως θετικό σημάδι σε αθλητές δύναμης.",
    sources: [NIH_OSTEO] },
  { min: 5, max: 15, severity: "warn", label: "Αυξημένη οστική μάζα", emoji: "⚠️",
    description: "Πάνω από τον μέσο όρο. Καλή προστασία από οστεοπόρωση.",
    sources: [NIH_OSTEO] },
  { min: 1, max: 5, severity: "mild", label: "Οριακά αυξημένη οστική μάζα", emoji: "⚠️",
    description: "Ελαφρά πάνω από το φυσιολογικό.",
    sources: [NIH_OSTEO] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανική οστική μάζα", emoji: "✅",
    description: "Οστική μάζα στο ιδανικό εύρος. Συσχετίζεται με μειωμένο κίνδυνο καταγμάτων.",
    sources: [NIH_OSTEO] },
  { min: -5, max: -1, severity: "mild-low", label: "Οριακά μειωμένη οστική μάζα", emoji: "⚠️",
    description: "Ελαφρά μείωση. Διατηρήστε επαρκή πρόσληψη ασβεστίου και βιταμίνης D.",
    sources: [NIH_OSTEO] },
  { min: -10, max: -5, severity: "low", label: "Οστεοπενία", emoji: "⚠️",
    description: "Μείωση 5%–10%. Πρόδρομη κατάσταση οστεοπόρωσης. Συνιστάται DEXA scan και διατροφική παρέμβαση.",
    sources: [NIH_OSTEO] },
  { min: -30, max: -10, severity: "danger-low", label: "Σημαντική οστική απώλεια", emoji: "⚠️",
    description: "Μείωση 10%–30%. Σοβαρός κίνδυνος καταγμάτων. Ιατρική αξιολόγηση απαραίτητη.",
    sources: [NIH_OSTEO] },
  { min: null, max: -30, severity: "critical-low", label: "Οστεοπόρωση", emoji: "⚠️",
    description: "Σοβαρή οστεοπόρωση. Υψηλός κίνδυνος καταγμάτων ισχίου, σπονδύλων και καρπού. Άμεση ιατρική παρέμβαση.",
    sources: [NIH_OSTEO] },
];

// ════════════════════════════════════════════════════════════
// 6. ΜΕΣΗ, ΙΣΧΙΟ, ΛΑΙΜΟΣ (κορμός με κίνδυνο)
// ════════════════════════════════════════════════════════════
const TRUNK_CIRC_ZONES: Zone[] = [
  { min: 30, max: null, severity: "danger-high", label: "Σοβαρή κεντρική παχυσαρκία", emoji: "⚠️",
    description: "Πολύ υψηλή περιφέρεια σε σχέση με το ιδανικό. Σπλαχνικό λίπος υψηλού κινδύνου για καρδιαγγειακά και μεταβολικά νοσήματα.",
    sources: [WHO_WAIST] },
  { min: 15, max: 30, severity: "high", label: "Κεντρική παχυσαρκία", emoji: "⚠️",
    description: "Σαφώς αυξημένη περιφέρεια. Ισχυρός παράγοντας κινδύνου για διαβήτη και καρδιακά νοσήματα.",
    sources: [WHO_WAIST] },
  { min: 5, max: 15, severity: "warn", label: "Αυξημένη περιφέρεια", emoji: "⚠️",
    description: "Μέτρια αύξηση. Συνιστάται προσοχή στη διατροφή και αύξηση δραστηριότητας.",
    sources: [WHO_WAIST] },
  { min: 1, max: 5, severity: "mild", label: "Οριακά αυξημένη περιφέρεια", emoji: "⚠️",
    description: "Ελαφρά πάνω από το ιδανικό.",
    sources: [WHO_WAIST] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανική περιφέρεια", emoji: "✅",
    description: "Ιδανική περιφέρεια. Συσχετίζεται με χαμηλό σπλαχνικό λίπος και καλή μεταβολική υγεία.",
    sources: [WHO_WAIST] },
  { min: -5, max: -1, severity: "mild-low", label: "Οριακά μειωμένη περιφέρεια", emoji: "⚠️",
    description: "Ελαφρά κάτω από το ιδανικό.", sources: [WHO_WAIST] },
  { min: -15, max: -5, severity: "low", label: "Μειωμένη περιφέρεια", emoji: "⚠️",
    description: "Σημαντικά κάτω από το ιδανικό. Παρακολουθήστε για πιθανή απώλεια μυϊκής μάζας.",
    sources: [WHO_WAIST] },
  { min: -30, max: -15, severity: "danger-low", label: "Σημαντικά μειωμένη περιφέρεια", emoji: "⚠️",
    description: "Πολύ μικρή περιφέρεια. Πιθανή ένδειξη υποθρεψίας ή σαρκοπενίας.",
    sources: [WHO_WAIST] },
  { min: null, max: -30, severity: "critical-low", label: "Υπερβολικά μειωμένη περιφέρεια", emoji: "⚠️",
    description: "Κρίσιμα χαμηλή περιφέρεια. Συνιστάται ιατρική αξιολόγηση.",
    sources: [WHO_WAIST] },
];

// ════════════════════════════════════════════════════════════
// 7. ΜΥΪΚΕΣ ΠΕΡΙΦΕΡΕΙΕΣ (Στήθος, Ώμοι, Δικέφαλος, Πήχης, Μηρός, Γάμπα)
// ════════════════════════════════════════════════════════════
const MUSCLE_CIRC_ZONES: Zone[] = [
  { min: 30, max: null, severity: "danger-high", label: "Υπερβολική υπερτροφία", emoji: "⚠️",
    description: "Περιφέρεια >30% πάνω από το ιδανικό. Πολύ προπονημένος μυς ή πιθανή χρήση αναβολικών.",
    sources: [ACSM_BC] },
  { min: 15, max: 30, severity: "high", label: "Έντονη υπερτροφία", emoji: "⚠️",
    description: "Σημαντικά αυξημένη μυϊκή μάζα στην περιοχή. Χαρακτηριστικό προπονημένων αθλητών.",
    sources: [ACSM_BC] },
  { min: 5, max: 15, severity: "warn", label: "Αυξημένη περιφέρεια", emoji: "⚠️",
    description: "Πάνω από το ιδανικό. Καλή ανάπτυξη της μυϊκής ομάδας.",
    sources: [ACSM_BC] },
  { min: 1, max: 5, severity: "mild", label: "Οριακά αυξημένη περιφέρεια", emoji: "⚠️",
    description: "Ελαφρά πάνω από το ιδανικό.", sources: [ACSM_BC] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανική συμμετρία", emoji: "✅",
    description: "Η περιφέρεια είναι σε ιδανική συμμετρία με τις υπόλοιπες μετρήσεις.",
    sources: [ACSM_BC] },
  { min: -5, max: -1, severity: "mild-low", label: "Οριακά ελλειμματική περιφέρεια", emoji: "⚠️",
    description: "Ελαφρά κάτω από το ιδανικό. Αυξήστε εξειδικευμένη προπόνηση δύναμης.",
    sources: [ACSM_BC] },
  { min: -15, max: -5, severity: "low", label: "Υποανάπτυκτη περιοχή", emoji: "⚠️",
    description: "Μυϊκή ασυμμετρία. Συνιστάται στοχευμένη προπόνηση αντίστασης.",
    sources: [ACSM_BC] },
  { min: -30, max: -15, severity: "danger-low", label: "Σημαντικά υποανάπτυκτη", emoji: "⚠️",
    description: "Σαφής υποανάπτυξη της περιοχής. Αξιολογήστε προπόνηση και διατροφή.",
    sources: [ACSM_BC] },
  { min: null, max: -30, severity: "critical-low", label: "Σοβαρή υποανάπτυξη", emoji: "⚠️",
    description: "Πολύ μικρή περιφέρεια σε σχέση με το ιδανικό. Πιθανή υποθρεψία ή σαρκοπενία.",
    sources: [ACSM_BC, JANSSEN_2000] },
];

// ════════════════════════════════════════════════════════════
// 8. WHR, WHtR (αναλογίες κινδύνου)
// ════════════════════════════════════════════════════════════
const WHR_WHTR_ZONES: Zone[] = [
  { min: 30, max: null, severity: "danger-high", label: "Πολύ υψηλός καρδιαγγειακός κίνδυνος", emoji: "⚠️",
    description: "Η αναλογία είναι >30% πάνω από το ιδανικό. Πολύ υψηλός κίνδυνος για στεφανιαία νόσο, διαβήτη και θάνατο από καρδιαγγειακά αίτια.",
    sources: [WHO_WAIST] },
  { min: 15, max: 30, severity: "high", label: "Υψηλός καρδιαγγειακός κίνδυνος", emoji: "⚠️",
    description: "Σημαντικά αυξημένη αναλογία. Αυξημένος κίνδυνος μεταβολικού συνδρόμου.",
    sources: [WHO_WAIST] },
  { min: 5, max: 15, severity: "warn", label: "Αυξημένος κίνδυνος", emoji: "⚠️",
    description: "Μέτρια αυξημένη αναλογία. Παρακολουθήστε στενά.", sources: [WHO_WAIST] },
  { min: 1, max: 5, severity: "mild", label: "Οριακά αυξημένος κίνδυνος", emoji: "⚠️",
    description: "Ελαφρά πάνω από το ιδανικό.", sources: [WHO_WAIST] },
  { min: -1, max: 1, severity: "ok", label: "Ιδανική κατανομή λίπους", emoji: "✅",
    description: "Η αναλογία βρίσκεται στο ιδανικό εύρος. Καλή κατανομή λίπους και χαμηλός καρδιαγγειακός κίνδυνος.",
    sources: [WHO_WAIST] },
  { min: -5, max: -1, severity: "mild-low", label: "Οριακά χαμηλή αναλογία", emoji: "⚠️",
    description: "Ελαφρά κάτω από το ιδανικό.", sources: [WHO_WAIST] },
  { min: -15, max: -5, severity: "low", label: "Χαμηλή αναλογία", emoji: "⚠️",
    description: "Σημαντικά χαμηλή. Παρακολουθήστε για ισορροπία ισχίου-μέσης.",
    sources: [WHO_WAIST] },
  { min: null, max: -15, severity: "critical-low", label: "Ασυνήθιστα χαμηλή αναλογία", emoji: "⚠️",
    description: "Πολύ χαμηλή αναλογία — σπάνιο εύρημα.", sources: [WHO_WAIST] },
];

// ════════════════════════════════════════════════════════════
// 9. CWR, SWR, FBR, TCR, WBR, TKR, ACR (αναλογίες συμμετρίας)
// ════════════════════════════════════════════════════════════
const RATIO_ZONES: Zone[] = ratioZones(
  ["Έντονη δυσαναλογία", "Σημαντική ασυμμετρία", "Αισθητή ασυμμετρία", "Ελαφρά απόκλιση"],
  ["Ελαφρά απόκλιση", "Αισθητή ασυμμετρία", "Σημαντική ασυμμετρία", "Έντονη δυσαναλογία"],
  [
    "Πολύ μεγάλη απόκλιση από την ιδανική αναλογία (>20%). Ισχυρή μυϊκή ή σκελετική ασυμμετρία που μπορεί να προκαλέσει βιομηχανικά προβλήματα.",
    "Σημαντική ασυμμετρία 10%–20%. Συνιστάται στοχευμένη διόρθωση μέσω προπόνησης.",
    "Αισθητή ασυμμετρία 5%–10%. Ορατή απόκλιση από την ιδανική αναλογία.",
    "Ελαφρά απόκλιση 1%–5% — σχεδόν ιδανική κατάσταση.",
    "Ελαφρά απόκλιση 1%–5% προς την αντίθετη κατεύθυνση.",
    "Αισθητή ασυμμετρία 5%–10% προς την αντίθετη κατεύθυνση.",
    "Σημαντική ασυμμετρία 10%–20% προς την αντίθετη κατεύθυνση.",
    "Έντονη δυσαναλογία >20% προς την αντίθετη κατεύθυνση.",
  ],
  Array(8).fill([ACSM_BC]),
);

export const ZONES: Record<MetricKind, Zone[]> = {
  weight: WEIGHT_ZONES,
  body_fat: BODY_FAT_ZONES,
  muscle: MUSCLE_ZONES,
  water: WATER_ZONES,
  bone: BONE_ZONES,
  trunk_circ: TRUNK_CIRC_ZONES,
  muscle_circ: MUSCLE_CIRC_ZONES,
  whr_whtr: WHR_WHTR_ZONES,
  ratio: RATIO_ZONES,
};

// Map για τις υποκατηγορίες και την επεξήγησή τους
export interface SubcategoryInfo {
  key: string;
  title: string;
  description: string;
  formula: string;
  example: string;
}

export const SUBCATEGORY_INFO: SubcategoryInfo[] = [
  {
    key: "current",
    title: "Τρέχον",
    description: "Είναι η πιο πρόσφατη μέτρηση που έχετε καταχωρήσει. Δεν υπολογίζεται — απλά καταγράφεται από εσάς ή από έξυπνη ζυγαριά.",
    formula: "—",
    example: "Π.χ. εάν ζυγιστήκατε σήμερα και η ζυγαριά έδειξε 95.0 kg, το «Τρέχον» είναι 95.0 kg.",
  },
  {
    key: "target",
    title: "Στόχος",
    description: "Είναι η ιδανική τιμή που πρέπει να φτάσετε. Προκύπτει από επιστημονικούς πίνακες αναφοράς (WHO, ACSM, Gallagher et al., Steve Reeves) προσαρμοσμένους στο φύλο, την ηλικία και το ύψος σας.",
    formula: "Από επιστημονικούς πίνακες (π.χ. ΔΜΣ = 22 για βάρος).",
    example: "Π.χ. για ύψος 180 cm, ο στόχος βάρους είναι 22 × (1.80)² = 71.3 kg.",
  },
  {
    key: "abs_diff",
    title: "Απόλυτη διαφορά",
    description: "Δείχνει πόσο μακριά (σε απόλυτο νούμερο) είναι η τρέχουσα μέτρηση από τον στόχο. Πάντα θετικό νούμερο. Το βελάκι (🔻/🔺) δείχνει την κατεύθυνση προς τον στόχο.",
    formula: "|Τρέχον − Στόχος|. Ποσοστό σε παρένθεση: (Απόλυτη διαφορά / Στόχος) × 100.",
    example: "Τρέχον 95.0 kg, Στόχος 72.0 kg → Απόλυτη διαφορά: 🔻 23.0 kg (31.9%).",
  },
  {
    key: "target_diff",
    title: "Διαφορά στόχου",
    description: "Δείχνει τι ποσοστό του τρέχοντος πρέπει να αλλάξει για να φτάσετε τον στόχο. Είναι μόνο ποσοστό.",
    formula: "((Στόχος − Τρέχον) / Τρέχον) × 100.",
    example: "Τρέχον 95.0 kg, Στόχος 72.0 kg → Διαφορά στόχου: 🔻 −24.2%.",
  },
  {
    key: "prev_diff",
    title: "Διαφορά προηγούμενης",
    description: "Δείχνει την αλλαγή από την αμέσως προηγούμενη μέτρηση. Το βελάκι δείχνει αν η αλλαγή είναι προς τη σωστή κατεύθυνση για τον στόχο.",
    formula: "Απόλυτη: Τρέχον − Προηγούμενο. %: ((Τρέχον − Προηγούμενο) / Προηγούμενο) × 100.",
    example: "Προηγούμενο 97.0 kg, Τρέχον 95.0 kg → Διαφορά προηγούμενης: 🔻 −2.0 kg (−2.1%).",
  },
  {
    key: "initial_diff",
    title: "Διαφορά αρχικής τιμής",
    description: "Δείχνει τη συνολική αλλαγή από την πρώτη κιόλας μέτρηση που καταχωρήσατε. Αξιολογεί τη μακροπρόθεσμη πρόοδο.",
    formula: "Απόλυτη: Τρέχον − Αρχικό. %: ((Τρέχον − Αρχικό) / Αρχικό) × 100.",
    example: "Αρχικό 100.0 kg, Τρέχον 95.0 kg → Διαφορά αρχικής: 🔻 −5.0 kg (−5.0%).",
  },
  {
    key: "all_diff",
    title: "Διαφορά όλων",
    description: "Δείχνει αν η τρέχουσα μέτρηση είναι πάνω ή κάτω από τον μέσο όρο όλων των προηγούμενων μετρήσεων. Σταθεροποιεί τη συνολική σας τάση.",
    formula: "Μ.Ο. = άθροισμα όλων των προηγούμενων / πλήθος. Απόλυτη: Τρέχον − Μ.Ο. %: ((Τρέχον − Μ.Ο.) / Μ.Ο.) × 100.",
    example: "Μ.Ο. προηγούμενων 103.5 kg, Τρέχον 95.0 kg → Διαφορά όλων: 🔻 −8.5 kg (−8.2%).",
  },
];
