
export interface CambodiaProvince {
    
    id: string;
    nameEn: string;
    nameKm: string;
    
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
