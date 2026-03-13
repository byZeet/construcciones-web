import pool from '../src/config/database.js';

const knownModels = {
    "Amazon": {
        name: "Modelo Amazon",
        specs: { surface: "120 m²", rooms: 3, bathrooms: 2, floors: 1, description: "Una casa espaciosa ideal para familias, con un diseño moderno y amplia iluminación natural.", price: "85000" }
    },
    "Amur": {
        name: "Modelo Amur",
        specs: { surface: "95 m²", rooms: 2, bathrooms: 1, floors: 1, description: "Diseño compacto y eficiente, perfecto para parejas o como segunda residencia.", price: "65000" }
    }
};

const allModels = ["Amazon", "Amur", "Ararat", "Basalt", "Bremen", "Cairo", "Catalan", "Denver", "Dijon", "Don", "Dublin", "Duero", "Ebro", "Elbrus", "Fortuna", "Fuji", "Genoa", "Granada", "Madrid", "Manitoba", "Maracaibo", "Marseille", "Michigan", "Milan", "Milk", "Mini Giza", "Moderna", "Nantes", "Oka", "Rio Grande", "Sinai", "Skadar", "Sofia", "Victoria", "Winnipeg"];

function getGeneratedSpecs(id) {
    const hashCode = id.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const absHash = Math.abs(hashCode);
    const basePrice = 35000 + (absHash % 40) * 1500;
    const baseSurface = 40 + (absHash % 100);
    const baseRooms = 1 + (absHash % 4);
    
    return {
        title: `Modelo ${id}`,
        description: "Contacte con nosotros para más información sobre este modelo.",
        price: basePrice,
        area: baseSurface,
        bedrooms: baseRooms,
        bathrooms: 1
    };
}

async function seed() {
    try {
        await pool.query('DELETE FROM properties'); // clear existing
        
        for (const id of allModels) {
            let data = getGeneratedSpecs(id);
            if (knownModels[id]) {
                data.title = knownModels[id].name;
                data.description = knownModels[id].specs.description || data.description;
                data.price = parseFloat(knownModels[id].specs.price);
                data.area = parseFloat(knownModels[id].specs.surface.replace(/[^\d]/g, ''));
                data.bedrooms = knownModels[id].specs.rooms || data.bedrooms;
                data.bathrooms = knownModels[id].specs.bathrooms || data.bathrooms;
            }
            
            await pool.query(
                `INSERT INTO properties (title, description, price, area, bedrooms, bathrooms, status) VALUES (?, ?, ?, ?, ?, ?, 'disponible')`,
                [data.title, data.description, data.price, data.area, data.bedrooms, data.bathrooms]
            );
        }
        console.log('✅ Base de datos poblada con éxito con las casas de prueba originales.');
    } catch(err) {
        console.error('❌ Error poblando:', err);
    } finally {
        process.exit(0);
    }
}
seed();
