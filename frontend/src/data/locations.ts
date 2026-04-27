/**
 * Location data for country and city dropdowns
 * Story 9.3: Editable location fields with dropdown selection
 *
 * To add more countries/cities:
 * 1. Add the country to the appropriate region array
 * 2. Add the cities array for that country in CITIES_BY_COUNTRY
 */

// South America
const SOUTH_AMERICA = [
    'Argentina',
    'Bolivia',
    'Brazil',
    'Chile',
    'Colombia',
    'Ecuador',
    'Guyana',
    'Paraguay',
    'Peru',
    'Suriname',
    'Uruguay',
    'Venezuela',
] as const;

// North America (including Central America and Caribbean)
const NORTH_AMERICA = [
    'Canada',
    'Costa Rica',
    'Cuba',
    'Dominican Republic',
    'El Salvador',
    'Guatemala',
    'Haiti',
    'Honduras',
    'Jamaica',
    'Mexico',
    'Nicaragua',
    'Panama',
    'Puerto Rico',
    'United States',
] as const;

// Europe
const EUROPE = [
    'Austria',
    'Belgium',
    'Croatia',
    'Czech Republic',
    'Denmark',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hungary',
    'Ireland',
    'Italy',
    'Netherlands',
    'Norway',
    'Poland',
    'Portugal',
    'Romania',
    'Spain',
    'Sweden',
    'Switzerland',
    'United Kingdom',
] as const;

// Asia
const ASIA = [
    'China',
    'Hong Kong',
    'India',
    'Indonesia',
    'Japan',
    'Malaysia',
    'Philippines',
    'Singapore',
    'South Korea',
    'Taiwan',
    'Thailand',
    'Vietnam',
] as const;

// Oceania
const OCEANIA = [
    'Australia',
    'New Zealand',
] as const;

/**
 * All supported countries, sorted alphabetically
 */
export const COUNTRIES = [
    ...SOUTH_AMERICA,
    ...NORTH_AMERICA,
    ...EUROPE,
    ...ASIA,
    ...OCEANIA,
].sort() as string[];

/**
 * Cities by country
 * Add cities here as needed - most common/major cities per country
 */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
    // South America
    'Argentina': [
        'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta',
        'Santa Fe', 'San Juan', 'Resistencia', 'Corrientes', 'Posadas', 'Neuquén', 'Formosa', 'San Luis',
        'Bahía Blanca', 'Paraná', 'Santiago del Estero', 'Río Cuarto', 'Comodoro Rivadavia', 'San Salvador de Jujuy',
    ],
    'Bolivia': ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Oruro', 'Tarija', 'Potosí', 'Trinidad', 'Cobija', 'Riberalta'],
    'Brazil': [
        'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre',
        'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'São Luís', 'São Gonçalo', 'Maceió', 'Duque de Caxias', 'Natal', 'Teresina',
        'Campo Grande', 'Nova Iguaçu', 'São Bernardo do Campo', 'João Pessoa', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Florianópolis',
    ],
    'Chile': [
        // Región Metropolitana - Santiago Centro y Comunas Principales
        'Santiago', 'Puente Alto', 'Maipú', 'La Florida', 'Las Condes', 'San Bernardo', 'Peñalolén', 'Providencia',
        'Ñuñoa', 'Vitacura', 'Lo Barnechea', 'La Reina', 'Macul', 'San Miguel', 'La Cisterna', 'El Bosque',
        'Estación Central', 'Cerrillos', 'Pedro Aguirre Cerda', 'Lo Espejo', 'San Joaquín', 'Recoleta',
        'Independencia', 'Conchalí', 'Huechuraba', 'Quilicura', 'Renca', 'Cerro Navia', 'Quinta Normal',
        'Lo Prado', 'Pudahuel', 'La Granja', 'San Ramón', 'La Pintana',
        // Región Metropolitana - Provincias
        'Colina', 'Lampa', 'Til Til', 'Pirque', 'San José de Maipo', 'Buin', 'Calera de Tango', 'Paine',
        'Melipilla', 'Alhué', 'Curacaví', 'María Pinto', 'San Pedro', 'Talagante', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor',
        // Región de Valparaíso
        'Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio', 'Quillota', 'Los Andes', 'San Felipe',
        'Limache', 'Olmué', 'Concón', 'La Calera', 'La Ligua', 'Petorca', 'Cabildo', 'Papudo', 'Zapallar', 'Puchuncaví', 'Quintero', 'Casablanca', 'Algarrobo', 'El Quisco', 'El Tabo', 'Cartagena', 'Santo Domingo',
        // Región del Biobío
        'Concepción', 'Talcahuano', 'Los Ángeles', 'Coronel', 'San Pedro de la Paz', 'Hualpén', 'Chiguayante',
        'Penco', 'Tomé', 'Lota', 'Lebu', 'Arauco', 'Curanilahue', 'Cañete', 'Mulchén', 'Nacimiento', 'Negrete',
        // Región de La Araucanía
        'Temuco', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Lautaro', 'Padre Las Casas', 'Pitrufquén', 'Freire',
        'Nueva Imperial', 'Carahue', 'Traiguén', 'Collipulli', 'Curacautín', 'Lonquimay', 'Cunco', 'Gorbea', 'Loncoche', 'Toltén',
        // Región de Los Lagos
        'Puerto Montt', 'Osorno', 'Puerto Varas', 'Castro', 'Ancud', 'Frutillar', 'Llanquihue', 'Calbuco',
        'Quellón', 'Dalcahue', 'Curaco de Vélez', 'Quinchao', 'Puqueldón', 'Chonchi', 'Queilén', 'Fresia', 'Los Muermos', 'Maullín', 'Cochamó', 'Futaleufú', 'Palena', 'Hualaihué', 'Chaitén',
        // Región de Los Ríos
        'Valdivia', 'La Unión', 'Panguipulli', 'Río Bueno', 'Futrono', 'Lago Ranco', 'Los Lagos', 'Máfil', 'Mariquina', 'Lanco', 'San José de la Mariquina', 'Corral', 'Paillaco',
        // Región del Maule
        'Talca', 'Curicó', 'Linares', 'Cauquenes', 'Constitución', 'Molina', 'San Javier', 'Parral', 'San Clemente', 'Pelarco', 'Río Claro', 'Pencahue', 'Maule', 'Curepto', 'Rauco', 'Teno', 'Romeral', 'Sagrada Familia', 'Licantén', 'Vichuquén', 'Hualañé',
        // Región de O'Higgins
        'Rancagua', 'San Fernando', 'Rengo', 'Machalí', 'Pichilemu', 'Graneros', 'Santa Cruz', 'Chimbarongo', 'San Vicente', 'Peumo', 'Coinco', 'Coltauco', 'Doñihue', 'Las Cabras', 'Mostazal', 'Codegua', 'Olivar', 'Requínoa', 'Pichidegua', 'Marchigüe', 'Paredones', 'Litueche', 'La Estrella', 'Navidad', 'Lolol', 'Palmilla', 'Peralillo', 'Pumanque', 'Nancagua', 'Placilla', 'Chépica',
        // Región de Coquimbo
        'La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Andacollo', 'Salamanca', 'Los Vilos', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado', 'Canela', 'Paihuano', 'La Higuera',
        // Región de Atacama
        'Copiapó', 'Vallenar', 'Caldera', 'Chañaral', 'Diego de Almagro', 'Tierra Amarilla', 'Huasco', 'Freirina', 'Alto del Carmen',
        // Región de Antofagasta
        'Antofagasta', 'Calama', 'Tocopilla', 'Mejillones', 'San Pedro de Atacama', 'Taltal', 'María Elena', 'Sierra Gorda', 'Ollagüe',
        // Región de Tarapacá
        'Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Huara', 'Camiña', 'Colchane',
        // Región de Arica y Parinacota
        'Arica', 'Putre', 'General Lagos', 'Camarones',
        // Región de Aysén
        'Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane', 'Cisnes', 'Guaitecas', 'Lago Verde', 'O\'Higgins', 'Río Ibáñez', 'Tortel',
        // Región de Magallanes
        'Punta Arenas', 'Puerto Natales', 'Porvenir', 'Puerto Williams', 'Primavera', 'Timaukel', 'Laguna Blanca', 'San Gregorio', 'Río Verde', 'Torres del Paine', 'Cabo de Hornos', 'Antártica',
        // Región de Ñuble
        'Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Yungay', 'Quirihue', 'Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Ránquil', 'Treguaco', 'El Carmen', 'Pemuco', 'Pinto', 'Coihueco', 'Ñiquén', 'San Fabián', 'San Ignacio', 'San Nicolás',
    ],
    'Colombia': [
        'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira',
        'Santa Marta', 'Ibagué', 'Pasto', 'Manizales', 'Neiva', 'Villavicencio', 'Armenia', 'Valledupar',
        'Montería', 'Sincelejo', 'Popayán', 'Tunja',
    ],
    'Ecuador': [
        'Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Manta',
        'Portoviejo', 'Ambato', 'Riobamba', 'Ibarra', 'Loja', 'Esmeraldas', 'Milagro', 'Quevedo',
    ],
    'Guyana': ['Georgetown', 'Linden', 'New Amsterdam', 'Anna Regina', 'Bartica'],
    'Paraguay': ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Fernando de la Mora', 'Lambaré', 'Encarnación', 'Pedro Juan Caballero'],
    'Peru': [
        'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco', 'Iquitos', 'Huancayo',
        'Tacna', 'Chimbote', 'Juliaca', 'Pucallpa', 'Ica', 'Sullana', 'Cajamarca', 'Ayacucho', 'Tarapoto', 'Puno',
    ],
    'Suriname': ['Paramaribo', 'Lelydorp', 'Nieuw Nickerie', 'Moengo', 'Nieuw Amsterdam'],
    'Uruguay': ['Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Punta del Este', 'Tacuarembó', 'Melo', 'Mercedes', 'Colonia del Sacramento'],
    'Venezuela': [
        'Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana',
        'Barcelona', 'Maturín', 'Puerto La Cruz', 'Petare', 'Turmero', 'Ciudad Bolívar', 'Mérida', 'San Cristóbal', 'Cumaná',
    ],

    // North America
    'Canada': [
        'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Halifax',
        'Victoria', 'London', 'Saskatoon', 'Regina', 'Kitchener', 'Hamilton', 'St. John\'s', 'Kelowna', 'Barrie',
    ],
    'Costa Rica': ['San José', 'Limón', 'Alajuela', 'Heredia', 'Cartago', 'Puntarenas', 'Liberia', 'San Isidro', 'Nicoya'],
    'Cuba': ['Havana', 'Santiago de Cuba', 'Camagüey', 'Holguín', 'Santa Clara', 'Guantánamo', 'Bayamo', 'Cienfuegos', 'Pinar del Río', 'Matanzas'],
    'Dominican Republic': ['Santo Domingo', 'Santiago', 'San Pedro de Macorís', 'La Romana', 'Puerto Plata', 'San Francisco de Macorís', 'San Cristóbal', 'La Vega', 'Higüey'],
    'El Salvador': ['San Salvador', 'Santa Ana', 'San Miguel', 'Soyapango', 'Mejicanos', 'Santa Tecla', 'Apopa', 'Delgado', 'Sonsonate', 'Usulután'],
    'Guatemala': ['Guatemala City', 'Mixco', 'Villa Nueva', 'Quetzaltenango', 'Petapa', 'San Juan Sacatepéquez', 'Villa Canales', 'Escuintla', 'Chinautla', 'Chimaltenango'],
    'Haiti': ['Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Delmas', 'Les Cayes', 'Jacmel', 'Pétion-Ville', 'Port-de-Paix'],
    'Honduras': ['Tegucigalpa', 'San Pedro Sula', 'La Ceiba', 'Choloma', 'El Progreso', 'Comayagua', 'Puerto Cortés', 'Choluteca', 'Juticalpa', 'Danlí'],
    'Jamaica': ['Kingston', 'Montego Bay', 'Spanish Town', 'Portmore', 'Mandeville', 'May Pen', 'Old Harbour', 'Savanna-la-Mar'],
    'Mexico': [
        'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Cancún', 'Mérida', 'Querétaro', 'Oaxaca',
        'Juárez', 'Toluca', 'Torreón', 'Hermosillo', 'San Luis Potosí', 'Aguascalientes', 'Mexicali', 'Culiacán', 'Chihuahua', 'Morelia',
        'Veracruz', 'Saltillo', 'Acapulco', 'Tampico', 'Villahermosa', 'Tuxtla Gutiérrez', 'Durango', 'Mazatlán', 'Cuernavaca', 'Playa del Carmen',
    ],
    'Nicaragua': ['Managua', 'León', 'Masaya', 'Matagalpa', 'Chinandega'],
    'Panama': ['Panama City', 'San Miguelito', 'Tocumen', 'David', 'Colón'],
    'Puerto Rico': ['San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas'],
    'United States': [
        // Major metros (top 20)
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
        'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'San Francisco',
        'Seattle', 'Denver', 'Boston', 'Miami', 'Atlanta', 'Las Vegas', 'Portland', 'Washington D.C.',
        // Additional major cities (30 more)
        'Detroit', 'Minneapolis', 'Tampa', 'Baltimore', 'St. Louis', 'Pittsburgh',
        'Cincinnati', 'Cleveland', 'Orlando', 'Sacramento', 'Kansas City', 'Indianapolis',
        'Columbus', 'Charlotte', 'Nashville', 'Memphis', 'Milwaukee', 'Jacksonville',
        'Salt Lake City', 'Raleigh', 'Richmond', 'Hartford', 'New Orleans', 'Honolulu',
        'Albuquerque', 'Tucson', 'El Paso', 'Oklahoma City', 'Louisville', 'Buffalo',
    ],

    // Europe
    'Austria': ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels'],
    'Belgium': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons'],
    'Croatia': ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Dubrovnik', 'Zadar', 'Pula', 'Šibenik'],
    'Czech Republic': ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové'],
    'Denmark': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding'],
    'Finland': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Lahti', 'Kuopio'],
    'France': [
        'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
        'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Aix-en-Provence',
    ],
    'Germany': [
        'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Dresden',
        'Essen', 'Bremen', 'Hannover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Mannheim',
    ],
    'Greece': ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina', 'Chania'],
    'Hungary': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét'],
    'Ireland': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Kilkenny'],
    'Italy': [
        'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Venice', 'Verona',
        'Bari', 'Catania', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Modena', 'Pisa', 'Livorno',
    ],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen'],
    'Norway': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Tromsø'],
    'Poland': ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice'],
    'Portugal': ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada', 'Faro'],
    'Romania': ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești'],
    'Spain': [
        'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Granada',
        'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'A Coruña', 'Vitoria-Gasteiz', 'Elche', 'Oviedo', 'Santa Cruz de Tenerife',
    ],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping'],
    'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Lucerne', 'St. Gallen', 'Lugano', 'Winterthur'],
    'United Kingdom': [
        'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff',
        'Leicester', 'Nottingham', 'Newcastle upon Tyne', 'Southampton', 'Brighton', 'Plymouth', 'Reading', 'Aberdeen', 'Cambridge', 'Oxford',
    ],

    // Asia
    'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Xian', 'Nanjing', 'Tianjin'],
    'Hong Kong': ['Hong Kong', 'Kowloon', 'Tsuen Wan', 'Sha Tin'],
    'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Surat'],
    'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Bali'],
    'Japan': ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Hiroshima'],
    'Malaysia': ['Kuala Lumpur', 'George Town', 'Ipoh', 'Shah Alam', 'Petaling Jaya', 'Johor Bahru'],
    'Philippines': ['Manila', 'Quezon City', 'Davao', 'Cebu City', 'Zamboanga', 'Taguig'],
    'Singapore': ['Singapore'],
    'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon'],
    'Taiwan': ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu'],
    'Thailand': ['Bangkok', 'Chiang Mai', 'Pattaya', 'Nonthaburi', 'Hat Yai', 'Phuket'],
    'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Haiphong', 'Can Tho', 'Nha Trang'],

    // Oceania
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Hobart'],
    'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Queenstown'],
};

/**
 * Get cities for a given country, sorted alphabetically
 * Returns empty array if country not found
 * Story 9.17: Ensures cities are always displayed in alphabetical order
 */
export function getCitiesForCountry(country: string): string[] {
    const cities = CITIES_BY_COUNTRY[country] || [];
    return [...cities].sort((a, b) => a.localeCompare(b));
}

/**
 * Check if a city exists in a country
 */
export function isCityInCountry(city: string, country: string): boolean {
    const cities = CITIES_BY_COUNTRY[country] || [];
    return cities.includes(city);
}

/**
 * Find a city with normalized case (case-insensitive matching)
 * Useful for AI-scanned locations where OCR might return "VILLARRICA" instead of "Villarrica"
 * Story 9.17: AC #8 - Case-insensitive city matching
 *
 * @param country - The country to search in
 * @param cityInput - The city name to find (case-insensitive)
 * @returns The properly-cased city name if found, or null if not found
 */
export function findCityWithNormalizedCase(country: string, cityInput: string): string | null {
    const cities = CITIES_BY_COUNTRY[country];
    if (!cities) return null;
    const normalized = cityInput.toLowerCase().trim();
    return cities.find(c => c.toLowerCase() === normalized) || null;
}
