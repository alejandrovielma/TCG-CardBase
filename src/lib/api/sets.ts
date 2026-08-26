import { Query, type Card, type StringEndpoint } from "@tcgdex/sdk";
import { tcgdex } from "./api";
import { CacheService } from "$lib/cache/cacheService";
import { pageLanguage } from "$lib/language/languajeHandler";

export const getSetById = async (id: string) =>{
    const set = await tcgdex.set.get(id);

    return set
}

export const getNameById = async (setId: string) => {
    const set = await tcgdex.set.get(setId);

    return set?.name;
}

export const getListSetFullData = async (sets: any[]) => {
    if (!Array.isArray(sets)) {
        console.error('El argumento debe ser un array de sets');
        return [];
    }

    // Mapea cada set para obtener su información completa
    const setsFullData = await Promise.all(
        sets.map(async (setResume) => {
            if (!setResume || !setResume.id) {
                return null;
            }
            // Llama a la función que obtiene el set completo
            const setFull = await getSetById(setResume.id);
            return setFull;
        })
    );    

    // Filtra los posibles nulls 
    return setsFullData.filter(Boolean);
};

export const getAllSets = async () => {
    // Intenta obtener de cache primero
    const cacheKey = `all-sets-list_${pageLanguage}`;
    const cacheData = CacheService.get(cacheKey);
    if (cacheData) {
        return cacheData;
    }
    // Obtener la lista de sets desde la API
    const sets = await tcgdex.fetch('sets');
    if (sets) {
        CacheService.set(cacheKey, sets, {
            memoryExpiration: 5 * 60 * 1000, // 5 minutos en memoria
            localStorageExpiration: 24 * 60 * 60 * 1000 // 24 horas en localStorage
        });
    }
    return sets;
}