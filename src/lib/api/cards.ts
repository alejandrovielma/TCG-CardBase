// Mezclar aleatoriamente un array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
import { Query, type Card } from "@tcgdex/sdk";
import { tcgdex } from "./api";
import { CacheService } from "$lib/cache/cacheService";
import { pageTexts } from "$lib/constants/allTexts";
import { pageLanguage } from "$lib/language/languajeHandler";

//interfaz de carta resume
export interface CleanCardResume {
    id: string;
    localID: string;
    name: string;
    image: string; 
}

//la funcion de limpieza
const cleanCardResumeList = (cardResumes: any[]): CleanCardResume[] => {
    if (!Array.isArray(cardResumes)) {
        console.warn('cleanCardResumeList expects an array.');
        return [];
    }

    return cardResumes.map(cardResume => {                                  
        if (!cardResume || !cardResume.id || !cardResume.name || !cardResume.localId || !cardResume.image) {//asegurando formato valido
            console.warn('Invalid CardResume item found, skipping:', cardResume);
            return null; 
        }

        return {
            id: cardResume.id,
            localID: cardResume.localId,
            name: cardResume.name,
            image: cardResume.image ? `${cardResume.image}/high.webp` : ''  // Guardar la URL de la imagen directamente
        };

    }).filter(item => item !== null) as CleanCardResume[]; // Filtra cualquier null y asegura el tipo
};

// para limpiar los datos de la carta antes de guardarlos en cache
const cleanCardData = (card: any) => {
    if (!card) return null;
    
    // Guardar la URL de la imagen directamente
    const imageUrl = typeof card.getImageURL === 'function' 
        ? card.getImageURL('high', 'webp')
        : card.image 
            ? `${card.image}/high.webp`
            : undefined;

        return {
            id: card.id,
            name: card.name,
            imageUrl,  // URL de la imagen ya procesada
            localID: card.localID,
            types: card.types,
            hp: card.hp,
            rarity: card.rarity,
            attacks: card.attacks,
            weaknesses: card.weaknesses,
            description: card.description,
            // otros campos que se necesiten
        };
};

// Obtener `totalCount` cartas de energia basica, repartidas entre 2 tipos aleatorios
export const getRandomEnergyCards = async (totalCount: number = 10) => {
    // Tipos de energía comunes en Pokémon TCG
    const energyTypes = await tcgdex.energyType.list();
    const cards = await tcgdex.card.list(
        Query.create()
            .contains("energyType", energyTypes[0])
            .not.isNull("image")
            .paginate(0, 2)
    );
    const cleaned = cleanCardResumeList(cards);
    const shuffledCleaned = shuffleArray(cleaned);

    if (shuffledCleaned.length < 2) return cleaned;

    // Repartir el total entre las 2 cartas de energia elegidas
    const firstCount = Math.ceil(totalCount / 2);
    const secondCount = totalCount - firstCount;
    return [
        ...Array(firstCount).fill(shuffledCleaned[0]),
        ...Array(secondCount).fill(shuffledCleaned[1]),
    ];
}

// Obtener Pokémon con al menos 1 básico
export const getPokemonWithBasic = async (amount: number = 20, set: string) => {
    console.log("tipos de pokemon" + await tcgdex.categorie.list());
    // Buscar Pokémon básicos
    const basicCards = await tcgdex.card.list(
        Query.create()
            .contains("stage", pageTexts[pageLanguage].apiStagePokemon) // Usar el texto del idioma actual
            .not.isNull("image")
            .includes("set", set)
            .paginate(0, amount)
    );
    const cleanedBasics = cleanCardResumeList(basicCards);
    if (cleanedBasics.length === 0) return [];

    // Buscar otros Pokémon (no básicos)
    const otherCards = await tcgdex.card.list(
        Query.create()
            .not.contains("stage", pageTexts[pageLanguage].apiStagePokemon)
            .not.isNull("image")
            .includes("set", set)
            .paginate(0, amount + 20)
    );
    const cleanedOthers = cleanCardResumeList(otherCards);

    const shuffledOthers = shuffleArray(cleanedOthers);

    // Retornar al menos 1 básico y el resto hasta completar el amount
    const result = [cleanedBasics[0], ...shuffledOthers.slice(0, amount - 1)];
    return result;
}

const randomCards = async () => {                   //obtiene una lista de cartas random 
    const cacheKey = `random-list-card_${pageLanguage}`;
    // Intentar obtener de cache primero
    const cacheData = CacheService.get(cacheKey);
    if (cacheData) {
        // console.log('Lista de cartas random obtenidas en cache: ', cacheData);
        return cacheData;
    }

    const randomListCards = await tcgdex.card.list(
        Query.create()
        .contains('rarity', 'Rare')
        .paginate(1, 100)
    );

    //guardar en cache
    if (randomListCards) {
        CacheService.set(
            cacheKey,
            randomListCards,
            {
                memoryExpiration: 5 * 60 * 1000,                    // 5 minutos en memoria
                localStorageExpiration: 24 * 60 * 60 * 1000         // 24 horas en localStorage        
            }
        );
    }
    // console.log('debug', randomListCards);
    
    return randomListCards;
}

export const getCardsBySet = async (setURL: string, page: number = 0, pageSize: number = 20) => {
    try {
        // Obtener el set completo
        const set = await tcgdex.set.get(setURL);
        console.log('Set obtenido:', set?.id, 'Total de cartas:', set?.cards?.length);

        if (!set || !set.cards || set.cards.length === 0) {
            console.log('No se encontraron cartas en el set');
            return [];
        }

        // Calcular índices para la paginación
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        
        // Obtener solo las cartas de la página actual
        const cardsForPage = set.cards.slice(startIndex, endIndex);
        console.log(`Página ${page}: cartas ${startIndex + 1} a ${Math.min(endIndex, set.cards.length)} de ${set.cards.length}`);

        // Obtener las cartas completas de esta página
        const fullCardsPromises = cardsForPage.map(async (cardResume) => {
            try {
                const fullCard = await cardResume.getCard();
                return cleanCardData(fullCard);
            } catch (error) {
                console.error(`Error obteniendo carta ${cardResume.id}:`, error);
                return null;
            }
        });

        // Esperar a que todas las cartas se carguen
        const fullCards = await Promise.all(fullCardsPromises);
        
        // Filtrar las cartas que fallaron
        const validCards = fullCards.filter(card => card !== null);
        
        console.log(`Cartas obtenidas para página ${page}:`, validCards.length);
        
        return validCards;
    } catch (error) {
        console.error('Error obteniendo cartas del set:', error);
        return [];
    }
}

export const getTrainerCards = async (page: number = 0, amount: number = 20, set:string) => {
    try {
        const response = await tcgdex.card.list(
            Query.create()
                .contains("trainerType", pageTexts[pageLanguage].apiTrainer)
                .paginate(page, amount)
                .not.isNull("image")
                .includes("set", set)
        );
        return cleanCardResumeList(response);
    } catch (error) {
        console.error('Error obteniendo cartas de Entrenador:', error);
        return [];
    }
};



// cacheKeySuffix identifica de forma unica los filtros aplicados a `query`.
// Necesario porque Query.toString() de @tcgdex/sdk no serializa sus filtros
// (siempre da "[object Object]"), asi que sin esto todas las queries distintas
// colisionaban en la misma entrada de cache.
export const getCardFromQuery = async (query: Query, page: number, amount: number = 20, cacheKeySuffix: string = '') => {
    try {
        const cacheKey = `fromQuery-list-card_${cacheKeySuffix}_page_${page}_${pageLanguage}`
        // Intentar obtener de cache primero
        const cacheData = CacheService.get(cacheKey);
        if (cacheData) {
            return cacheData;
        }

        //si no esta en cache buscar en la api
        const cardsResponse = await tcgdex.card.list(
            query.paginate(page, amount).not.isNull("image") // ejemplo de query, puedes cambiarlo
        );

        //guardar en cache
        const cleanedCards = cleanCardResumeList(cardsResponse);
        if (cleanedCards && cleanedCards.length > 0) {
            if (cardsResponse) {
                CacheService.set(
                    cacheKey,
                    cleanedCards,
                    {
                        memoryExpiration: 5 * 60 * 1000,                    // 5 minutos en memoria
                        localStorageExpiration: 24 * 60 * 60 * 1000         // 24 horas en localStorage
                    }
                );
            }
        }

        return cleanedCards;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

export const getCardsByName = async (name: string, page: number = 0) => {
    try {
        const cacheKey = `fromQuery-list-card_${name.toString()}_page_${page}_${pageLanguage}`
        // Intentar obtener de cache primero
        const cacheData = CacheService.get(cacheKey);
        if (cacheData) {
            // console.log('Lista de cartas byName obtenidas en cache: ', cacheData);
            return cacheData;
        }

        //si no esta en cache buscar en la api
        const cardsResponse = await tcgdex.card.list(
            Query.create()
                .contains("name", name)
                .paginate(page, 20)
        );

        //guardar en cache
        const cleanedCards = cleanCardResumeList(cardsResponse);
        if (cardsResponse) {
            CacheService.set(
                cacheKey,
                cleanedCards,
                {
                    memoryExpiration: 5 * 60 * 1000,                    // 5 minutos en memoria
                    localStorageExpiration: 24 * 60 * 60 * 1000         // 24 horas en localStorage        
                }
            );
            // console.log('cartas de byName guardadas en cache', cleanedCards);
        }    

        return cleanedCards;
    } catch (error) {
        console.error('Error', error);
        return [];
    }
};

export const getCardFromId = async (id: string) => {
    // Intentar obtener de cache primero
    const cachedCard = CacheService.get(`card-${id}_${pageLanguage}`);
    if (cachedCard) {
        return cachedCard;
    }

    // Si no esta en cache, obtener de la API
    const card = await tcgdex.card.get(id);
    if (!card) {
        console.error('Card not found in cache');
        return null;
    }

    // guardar en cache
    const cleanCard = cleanCardData(card);
    try {
        CacheService.set(`card-${id}_${pageLanguage}`, cleanCard, {
            memoryExpiration: 5 * 60 * 1000, // 5 minutos en memoria
            localStorageExpiration: 24 * 60 * 60 * 1000 // 24 horas en localStorage
        });
    } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            console.warn(`Advertencia: El localStorage ha excedido la cuota. No se pudo cachear la carta: card-${id}`);
        } else {
            console.error('Error al guardar en cache:', e);
        }
    }
    return cleanCard;
}

export const getRandomCard = async () => {   
    const cardList = await randomCards();               //obtener una lista de cartas random
    if (!cardList || !Array.isArray(cardList) || cardList.length === 0) {
        console.error('No random cards found');
        return;
    }

    const cardR = cardList[Math.floor(Math.random() * cardList.length)];     //selecciona una carta random de la lista
    if (!cardR) {
        console.error('Card not found');
        return;
    }

    const cardFullData = await getCardFromId(cardR.id);                   //obtiene los detalles de la carta                
            
    return cardFullData;  
}

export const getCardsByType = async (type: string, page: number = 0) => {
    try {
        const cacheKey = `fromQuery-list-card_type_${type}_page_${page}_${pageLanguage}`;
        // Intentar obtener de cache primero
        const cacheData = CacheService.get(cacheKey);
        if (cacheData) {
            return cacheData;
        }

        // Buscar en la API por tipo
        const cardsResponse = await tcgdex.card.list(
            Query.create()
                .contains("types", type)
                .paginate(page, 20)
        );

        // Limpiar y guardar en cache
        const cleanedCards = cleanCardResumeList(cardsResponse);
        if (cardsResponse) {
            CacheService.set(
                cacheKey,
                cleanedCards,
                {
                    memoryExpiration: 5 * 60 * 1000,                    // 5 minutos en memoria
                    localStorageExpiration: 24 * 60 * 60 * 1000         // 24 horas en localStorage        
                }
            );
        }
        return cleanedCards;
    } catch (error) {
        console.error('Error buscando cartas por tipo:', error);
        return [];
    }
}

export const getAllTypes = async () => {
    const cacheKey = `all-types-list_${pageLanguage}`;
    const cacheData = CacheService.get(cacheKey);
    if (cacheData) {
        return cacheData;
    }
    const types = await tcgdex.type.list();
    if (types) {
        CacheService.set(cacheKey, types, {
            memoryExpiration: 5 * 60 * 1000, // 5 minutos en memoria
            localStorageExpiration: 24 * 60 * 60 * 1000 // 24 horas en localStorage
        });
    }
    return types;
}

export const getAllRarities = async () => {
    const cacheKey = `all-rarities-list_${pageLanguage}`;
    const cacheData = CacheService.get(cacheKey);
    if (cacheData) {
        return cacheData;
    }
    const rarities = await tcgdex.rarity.list();
    if (rarities) {
        CacheService.set(cacheKey, rarities, {
            memoryExpiration: 5 * 60 * 1000, // 5 minutos en memoria
            localStorageExpiration: 24 * 60 * 60 * 1000 // 24 horas en localStorage
        });
    }
    return rarities;
}

// Buscar cartas por rareza
export const getCardsByRarity = async (rarity: string, page: number = 0) => {
    try {
        const cacheKey = `fromQuery-list-card_rarity_${rarity}_page_${page}_${pageLanguage}`;
        // Intentar obtener de cache primero
        const cacheData = CacheService.get(cacheKey);
        if (cacheData) {
            return cacheData;
        }
        // Buscar en la API por rareza
        const cardsResponse = await tcgdex.card.list(
            Query.create()
                .contains("rarity", rarity)
                .paginate(page, 20)
        );
        // Limpiar y guardar en cache
        const cleanedCards = cleanCardResumeList(cardsResponse);
        if (cardsResponse) {
            CacheService.set(
                cacheKey,
                cleanedCards,
                {
                    memoryExpiration: 5 * 60 * 1000,                    // 5 minutos en memoria
                    localStorageExpiration: 24 * 60 * 60 * 1000         // 24 horas en localStorage        
                }
            );
        }
        return cleanedCards;
    } catch (error) {
        console.error('Error buscando cartas por rareza:', error);
        return [];
    }
}

// export const getCardFromSet = async (set: string) => {
//     // Intentar obtener de cache primero
//     const cachedCard = CacheService.get(`set-${set}`);
//     if (cachedCard) {
//         // console.log('Card obtenida de caché:', id);
//         return cachedCard;
//     }

//     // Si no esta en cache, obtener de la API
//     const card = await tcgdex.card.get(id);
//     if (!card) {
//         console.error('Card not found in cache');
//         return null;
//     }

//     // guardar en cache
//     const cleanCard = cleanCardData(card);
//     CacheService.set(`card-${id}`, cleanCard, {
//         memoryExpiration: 5 * 60 * 1000, // 5 minutos en memoria
//         localStorageExpiration: 24 * 60 * 60 * 1000 // 24 horas en localStorage
//     });
    
//     return cleanCard;
// }