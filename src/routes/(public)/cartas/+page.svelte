<script lang="ts">
  import { onMount } from "svelte";
  import { getCardsByName, getCardFromQuery, getCardFromId, getCardsBySet } from "$lib/api/cards";
  import { Query, type CardResume } from "@tcgdex/sdk";
  import SelectButton from "$lib/components/Select-button.svelte";
  import SearchBar from "$lib/components/Search-bar.svelte";
  import GeneralButton from "$lib/components/General-button.svelte";
  import AcancedSearchDropdown from "./_components/AvancedSearchDropdown.svelte";
  import DropdownCard from "$lib/components/DropdownCard.svelte";
  import { page } from '$app/stores';
  import { getNameById } from "$lib/api/sets";
  import { pageTexts } from '$lib/constants/allTexts';
  import { pageLanguage } from '$lib/language/languajeHandler';

  export let set;
  
  let result: CardResume[] = [];
  let cards: CardResume[] = [];
  let filteredCards: CardResume[] = [];
  let search = "";
  let loading = true;
  let error = "";

  let lastSearch = "";
  let paginate = 0;
  let hasMore = true;

  let showDialog = false;
  let selectedCardFull: any = null;
  let loadingCard = false;
  let cardsFromSet = false;
  let currentSetId = '';
  let currentSetName = '';

  // Variables para el ordenamiento
  let sortBy: 'id' | 'name' = 'id';
  let sortOrder: 'asc' | 'desc' = 'asc';

  let advancedType = "";
  let selectedPokemonType = "";
  let showAllODS = false;

  // para ordenar las cartas
  function sortCards(cardsToSort: CardResume[]): CardResume[] {
    if (!cardsToSort || cardsToSort.length === 0) return cardsToSort;
    return [...cardsToSort].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'id') {
        comparison = a.id.localeCompare(b.id, 'es', {
          sensitivity: 'base',
          numeric: true
        });
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'es', { 
          sensitivity: 'base',
          numeric: true 
        });
      }

      return sortOrder === 'asc' ? comparison : -comparison;                // Aplicar el orden (ascendente o descendente)
    });
  }

  // para cambiar el ordenamiento
  function changeSort(newSortBy: 'id' | 'name') {
    if (sortBy === newSortBy) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';               // Si es el mismo campo, cambiar el orden
    } else {
      sortBy = newSortBy;
      sortOrder = 'asc';
    }
    
    filteredCards = sortCards(cards);         // Reordenar las cartas actuales
  }

  //  obtener el estado de seleccion de un boton
  function isButtonSelected(buttonSortBy: 'id' | 'name'): boolean {
    return sortBy === buttonSortBy;
  }

  async function fetchCards(reset = true) {
    loading = true;
    error = "";

    const setId = $page.url.searchParams.get('set');          // Obtener el ID del set desde la URL    

    if (reset) {
      cards = [];
      filteredCards = [];
      paginate = 0;
      hasMore = true;
      cardsFromSet = false;
      currentSetId = '';
      currentSetName = '';
    }

    try {
      if (setId) {        
        currentSetId = setId;
        currentSetName = await getNameById(setId) || '';
        result = await getCardsBySet(setId, paginate, 20) || [];
        hasMore = result && result.length === 20;                       // Verificar si hay mas pag
        if (!result || result.length == 0) {                            //en caso de qu eno hayan cartas en ese sets, cargamos las normales
          result = await getCardFromQuery(Query.create(), paginate, 20, 'all') || [];

          hasMore = result.length === 20;
          cardsFromSet = false; // Indicar que no son cartas del set
        } else {
          cardsFromSet = true; // Indicar que sí son cartas del set
        }
      } else {                                                        //si no existe un set en la url, muestras cartas normales
        result = await getCardFromQuery(Query.create(), paginate, 20, 'all') || [];
        hasMore = result.length === 20;
        cardsFromSet = false;
      }
    } catch (e) {
      console.error('Error al cargar cartas:', e);
      error = "Error al cargar cartas";
      result = [];
      hasMore = false;
      cardsFromSet = false;
    } finally{
      if (reset) {        
        cards = result || [];        
      } else {
        const ids = new Set(cards.map((c: CardResume) => c.id));
        cards = [...cards, ...result.filter((c: CardResume) => !ids.has(c.id))];
      }
      // Aplicar ordenamiento despues de obtener las cartas
      filteredCards = sortCards(cards);
      loading = false;
    }
  }

  async function fetchFilteredCards(name: string, reset = true) {
    loading = true;
    error = "";
    if (reset) {
      cards = [];
      filteredCards = [];
      paginate = 0;
      hasMore = true;
    }
    try {
      let result: CardResume[] = [];
      if (!name) {
        result = await getCardFromQuery(Query.create(), paginate, 20, 'all') || [];
      } else {
        result = await getCardsByName(name, paginate) || [];
      }
      if (reset) {
        cards = result || [];
      } else {
        const ids = new Set(cards.map(c => c.id));
        cards = [...cards, ...result.filter(c => !ids.has(c.id))];
      }
      // Aplicar ordenamiento despues de obtener las cartas
      filteredCards = sortCards(cards);
      hasMore = (result || []).length === 20;
    } catch (e) {
      error = "Error al buscar cartas";
      cards = [];
      filteredCards = [];
      hasMore = false;
    }
    loading = false;
  }

  let lastAdvancedFilters: { tipo?: string; set?: string; rareza?: string } | null = null;

  function handleAdvancedSearch(event: CustomEvent<{ tipo?: string; set?: string; rareza?: string }>) {
    const { tipo, set, rareza } = event.detail;
    advancedType = tipo || "";
    search = "";
    paginate = 0;
    if (!set && !tipo && !rareza) {
      lastAdvancedFilters = null;
      fetchCards(true);
      return;
    }
    lastAdvancedFilters = { tipo, set, rareza };
    fetchCardsAdvanced(lastAdvancedFilters, true);
  }

  // Combina set + tipo + rareza en una sola query, en vez de aplicar solo el de mayor prioridad
  async function fetchCardsAdvanced(filters: { tipo?: string; set?: string; rareza?: string }, reset = true) {
    loading = true;
    error = "";
    if (reset) {
      cards = [];
      filteredCards = [];
      paginate = 0;
      hasMore = true;
    }
    try {
      let query = Query.create();
      if (filters.set) query = query.includes("set", filters.set);
      if (filters.tipo) query = query.contains("types", filters.tipo);
      if (filters.rareza) query = query.contains("rarity", filters.rareza);

      const cacheKeySuffix = `advanced_set-${filters.set ?? ''}_tipo-${filters.tipo ?? ''}_rareza-${filters.rareza ?? ''}`;
      const result: CardResume[] = await getCardFromQuery(query, paginate, 20, cacheKeySuffix) || [];
      if (reset) {
        cards = result || [];
      } else {
        const ids = new Set(cards.map((c: CardResume) => c.id));
        cards = [...cards, ...result.filter((c: CardResume) => !ids.has(c.id))];
      }
      filteredCards = sortCards(cards);
      hasMore = (result || []).length === 20;
    } catch (e) {
      error = "Error al buscar cartas";
      cards = [];
      filteredCards = [];
      hasMore = false;
    }
    loading = false;
  }

  // Reactive statement para reordenar cuando cambie el ordenamiento
  $: if (cards.length > 0) {
    filteredCards = sortCards(cards);
  }
  
  $: if (search !== lastSearch) {
    lastSearch = search;
    paginate = 0;
    fetchFilteredCards(search, true);
  }

  function cargarMas() {
    paginate += 1;

    if (search && search.trim() !== "") {
      fetchFilteredCards(search, false);
    } else if (lastAdvancedFilters) {
      fetchCardsAdvanced(lastAdvancedFilters, false);
    } else {
      fetchCards(false);
    }
  }

  onMount(() => fetchCards(true));

  async function handleCardClick(card) {
    showDialog = true;
    loadingCard = true;
    selectedCardFull = null;
    // Espera la info completa de la carta
    const cardFull = await getCardFromId(card.id);

    selectedCardFull = cardFull;
    loadingCard = false;
    
    // Actualizar el tipo seleccionado para mostrar la ODS relacionada
    if (cardFull && cardFull.types && cardFull.types[0]) {
      selectedPokemonType = cardFull.types[0];
      showAllODS = false;
    }
  }
</script>

<section class="bg-white">
  <div class="mx-auto container py-4">
    <h2 class="text-2xl">{pageTexts[pageLanguage].searchByName}</h2>
    <SearchBar
      bind:value={search}
      placeholder={pageTexts[pageLanguage].searchBarPlaceholder}
    />
  </div>
  <AcancedSearchDropdown on:search={handleAdvancedSearch} />
  
</section>
<main>
  <section class="bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 ">
    <div class="mx-auto container py-4">
      <!-- Indicador de Set -->
      {#if currentSetId && !loading}
        <div class="pt-4 justify-self-center">
          <div class="flex items-center">
            <div class="ml-3">
              {#if cardsFromSet}
                <p class="text-2xl text-white">
                  <span class="font-medium">{pageTexts[pageLanguage].showingCardsFromSet}</span> {currentSetName}
                </p>
              {:else}
                <p class="text-sm text-orange-700">
                  <span class="font-medium">{pageTexts[pageLanguage].noCardsInSet} {currentSetName}.</span> 
                  {pageTexts[pageLanguage].showingGeneralCards}
                </p>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <header class="flex flex-col gap-4 py-4 md">
        <h3 class="text-xl text-white">{pageTexts[pageLanguage].sortBy}</h3>
        <span class="flex gap-2">
          <SelectButton 
            selected={isButtonSelected('id')} 
            onClick={() => changeSort('id')}
          >
            {pageTexts[pageLanguage].sortById} {sortBy === 'id' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </SelectButton>
          <SelectButton 
            selected={isButtonSelected('name')} 
            onClick={() => changeSort('name')}
          >
            {pageTexts[pageLanguage].sortByName} {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </SelectButton>
        </span>
      </header>

      {#if loading && filteredCards.length === 0}
        <div class="text-center py-10">
          <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-white shadow rounded-md">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {pageTexts[pageLanguage].loadingCards}
          </div>
        </div>
      {:else if error}
        <div class="text-center py-10">
          <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-red-500 bg-red-100 rounded-md">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 110-2 1 1 0 010 2z" clip-rule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      {:else if search && filteredCards.length === 0}
        <div class="text-center py-10">
          <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-white bg-gray-600 rounded-md">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
            {pageTexts[pageLanguage].noCardFound}
          </div>
        </div>
      {:else}
        <div class="flex flex-wrap gap-6 justify-center">
          {#each filteredCards as card}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="bg-white rounded-lg shadow-lg p-2 w-48 flex flex-col items-center hover:scale-105 transition-transform cursor-pointer relative"
              on:click={() => handleCardClick(card)}
              aria-label={`Ver detalles de la carta ${card.name}`}
            >
              <!-- Indicador de set en la esquina -->
              {#if cardsFromSet && currentSetId}
                <div class="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {currentSetId.toUpperCase()}
                </div>
              {/if}
              
              <img
                src={ card.imageUrl || card.image || card.image + '/low.webp'} 
                alt={card.name}
                class="w-full h-64 object-contain rounded mb-2 border border-gray-200"
                loading="lazy"
              />
              <div class="text-center">
                <div class="font-semibold text-lg">{card.name}</div>
                <div class="text-xs text-gray-500">ID: {card.id}</div>
              </div>
            </div>
          {/each}
        </div>
        {#if hasMore && !loading}
          <div class="flex justify-center mt-6">
            <GeneralButton isLoading={loading} onClick={cargarMas}>
              {pageTexts[pageLanguage].loadMore}
            </GeneralButton>
          </div>
        {/if}
        {#if loading && filteredCards.length > 0}
          <div class="text-center py-4">
            <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-white shadow rounded-md">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {pageTexts[pageLanguage].loadingMoreCards}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </section>
</main>

<DropdownCard
  open={showDialog}
  card={selectedCardFull}
  loading={loadingCard}
  on:close={() => showDialog = false}
/>
