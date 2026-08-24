/**
 * Cambodia's 25 provinces (incl. the capital, Phnom Penh) — a fixed list
 * shipped in code, not a database table. Nobody here maintains a seeded
 * division table, and this list barely changes (the last split — Tboung
 * Khmum out of Kampong Cham — was 2013), so there's nothing to keep in sync.
 *
 * A geocoder's raw text ("Phnom Penh", "ភ្នំពេញ", "Phnom Penh Province" —
 * whichever a given map pin happens to return) gets normalized against this
 * list via {@link matchCambodiaProvince} so the value that's actually saved
 * is always one of these 25, never a geocoder's inconsistent spelling.
 */
export interface CambodiaProvince {
    /** Stable, URL-safe identifier — not from any external source. */
    id: string;
    nameEn: string;
    nameKm: string;
    /** Other spellings a geocoder might return for the same province. */
    aliases?: string[];
}

export const CAMBODIA_PROVINCES: CambodiaProvince[] = [
    { id: "phnom-penh", nameEn: "Phnom Penh", nameKm: "ភ្នំពេញ", aliases: ["Krong Phnom Penh", "Phnom Penh City"] },
    { id: "banteay-meanchey", nameEn: "Banteay Meanchey", nameKm: "បន្ទាយមានជ័យ" },
    { id: "battambang", nameEn: "Battambang", nameKm: "បាត់ដំបង" },
    { id: "kampong-cham", nameEn: "Kampong Cham", nameKm: "កំពង់ចាម" },
    { id: "kampong-chhnang", nameEn: "Kampong Chhnang", nameKm: "កំពង់ឆ្នាំង" },
    { id: "kampong-speu", nameEn: "Kampong Speu", nameKm: "កំពង់ស្ពឺ" },
    { id: "kampong-thom", nameEn: "Kampong Thom", nameKm: "កំពង់ធំ" },
    { id: "kampot", nameEn: "Kampot", nameKm: "កំពត" },
    { id: "kandal", nameEn: "Kandal", nameKm: "កណ្តាល" },
    { id: "kep", nameEn: "Kep", nameKm: "កែប" },
    { id: "koh-kong", nameEn: "Koh Kong", nameKm: "កោះកុង" },
    { id: "kratie", nameEn: "Kratie", nameKm: "ក្រចេះ" },
    { id: "mondulkiri", nameEn: "Mondulkiri", nameKm: "មណ្ឌលគិរី" },
    { id: "oddar-meanchey", nameEn: "Oddar Meanchey", nameKm: "ឧត្តរមានជ័យ" },
    { id: "pailin", nameEn: "Pailin", nameKm: "ប៉ៃលិន" },
    { id: "preah-vihear", nameEn: "Preah Vihear", nameKm: "ព្រះវិហារ" },
    { id: "prey-veng", nameEn: "Prey Veng", nameKm: "ព្រៃវែង" },
    { id: "pursat", nameEn: "Pursat", nameKm: "ពោធិ៍សាត់" },
    { id: "ratanakiri", nameEn: "Ratanakiri", nameKm: "រតនគិរី" },
    { id: "siem-reap", nameEn: "Siem Reap", nameKm: "សៀមរាប" },
    { id: "preah-sihanouk", nameEn: "Preah Sihanouk", nameKm: "ព្រះសីហនុ", aliases: ["Sihanoukville"] },
    { id: "stung-treng", nameEn: "Stung Treng", nameKm: "ស្ទឹងត្រែង" },
    { id: "svay-rieng", nameEn: "Svay Rieng", nameKm: "ស្វាយរៀង" },
    { id: "takeo", nameEn: "Takeo", nameKm: "តាកែវ" },
    { id: "tboung-khmum", nameEn: "Tboung Khmum", nameKm: "ត្បូងឃ្មុំ" },
];

/** Lowercased, trimmed, and stripped of the "Province"/"ខេត្ត"/"ក្រុង" prefixes a geocoder tends to include inconsistently. */
function normalize(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/^(khett?|krong)\s+/i, "")
        .replace(/\s+province$/i, "")
        .replace(/^ខេត្ត\s*/u, "")
        .replace(/^ក្រុង\s*/u, "")
        .replace(/\s+/g, " ");
}

/**
 * Matches a geocoder's free-text province/state field against the fixed
 * list — exact match first, then a loose substring match for text that
 * carries extra words a geocoder sometimes adds. Returns null rather than
 * guessing when nothing lines up, so the caller can leave the field for the
 * owner to pick by hand instead of saving a wrong province silently.
 */
export function matchCambodiaProvince(rawText: string | null | undefined): CambodiaProvince | null {
    if (!rawText?.trim()) return null;

    const target = normalize(rawText);

    for (const province of CAMBODIA_PROVINCES) {
        const candidates = [province.nameEn, province.nameKm, ...(province.aliases ?? [])];
        if (candidates.some((candidate) => normalize(candidate) === target)) {
            return province;
        }
    }

    for (const province of CAMBODIA_PROVINCES) {
        const candidates = [province.nameEn, province.nameKm, ...(province.aliases ?? [])];
        if (
            candidates.some((candidate) => {
                const normalizedCandidate = normalize(candidate);
                return target.includes(normalizedCandidate) || normalizedCandidate.includes(target);
            })
        ) {
            return province;
        }
    }

    return null;
}
