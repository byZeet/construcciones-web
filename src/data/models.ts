export interface ModelSpecs {
    surface: string;
    rooms: number;
    bathrooms: number;
    floors: number;
    description: string;
    price: string;
}

export interface ModelData {
    id: string;
    name: string;
    specs: ModelSpecs;
}

// Datos de ejemplo para algunos modelos conocidos
const knownModels: Record<string, Partial<ModelData>> = {
    "Amazon": {
        name: "Modelo Amazon",
        specs: {
            surface: "120 m²",
            rooms: 3,
            bathrooms: 2,
            floors: 1,
            description: "Una casa espaciosa ideal para familias, con un diseño moderno y amplia iluminación natural.",
            price: "Desde 85.000 €"
        }
    },
    "Amur": {
        name: "Modelo Amur",
        specs: {
            surface: "95 m²",
            rooms: 2,
            bathrooms: 1,
            floors: 1,
            description: "Diseño compacto y eficiente, perfecto para parejas o como segunda residencia.",
            price: "Desde 65.000 €"
        }
    },
    "Ararat": { name: "Modelo Ararat" },
    "Basalt": { name: "Modelo Basalt" },
    "Bremen": { name: "Modelo Bremen" },
    "Cairo": { name: "Modelo Cairo" },
    "Catalan": { name: "Modelo Catalan" },
    "Denver": { name: "Modelo Denver" },
    "Dijon": { name: "Modelo Dijon" },
    "Don": { name: "Modelo Don" },
    "Dublin": { name: "Modelo Dublin" },
    "Duero": { name: "Modelo Duero" },
    "Ebro": { name: "Modelo Ebro" },
    "Elbrus": { name: "Modelo Elbrus" },
    "Fortuna": { name: "Modelo Fortuna" },
    "Fuji": { name: "Modelo Fuji" },
    "Genoa": { name: "Modelo Genoa" },
    "Granada": { name: "Modelo Granada" },
    "Madrid": { name: "Modelo Madrid" },
    "Manitoba": { name: "Modelo Manitoba" },
    "Maracaibo": { name: "Modelo Maracaibo" },
    "Marseille": { name: "Modelo Marseille" },
    "Michigan": { name: "Modelo Michigan" },
    "Milan": { name: "Modelo Milan" },
    "Milk": { name: "Modelo Milk" },
    "Mini Giza": { name: "Modelo Mini Giza" },
    "Moderna": { name: "Modelo Moderna" },
    "Nantes": { name: "Modelo Nantes" },
    "Oka": { name: "Modelo Oka" },
    "Rio Grande": { name: "Modelo Rio Grande" },
    "Sinai": { name: "Modelo Sinai" },
    "Skadar": { name: "Modelo Skadar" },
    "Sofia": { name: "Modelo Sofia" },
    "Victoria": { name: "Modelo Victoria" },
    "Winnipeg": { name: "Modelo Winnipeg" }
};

export function getModelData(id: string): ModelData {
    // Generate deterministic specs based on string ID for models without data
    const hashCode = id.split("").reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);

    const absHash = Math.abs(hashCode);
    const basePrice = 35000 + (absHash % 40) * 1500; // Price between 35k and 95k
    const baseSurface = 40 + (absHash % 100); // Surface between 40 and 140m2
    const baseRooms = 1 + (absHash % 4); // 1 to 4 rooms

    const defaults = {
        id,
        name: `Modelo ${id}`,
        specs: {
            surface: `${baseSurface} m²`,
            rooms: baseRooms,
            bathrooms: 1,
            floors: 1,
            description: "Contacte con nosotros para más información sobre este modelo.",
            price: `Desde ${basePrice.toLocaleString('es-ES')} €`
        }
    };

    const specific = knownModels[id] || {};

    return {
        ...defaults,
        ...specific,
        specs: { ...defaults.specs, ...(specific.specs || {}) }
    };
}
