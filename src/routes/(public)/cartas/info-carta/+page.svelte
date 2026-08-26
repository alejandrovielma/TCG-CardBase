<script lang="ts">
    import type { PageLoad } from './$types';
    import { getCardFromId, getCardsByName, getCardFromQuery } from '$lib/api/cards';
    import { onMount } from 'svelte';
    import { Query, type Card } from '@tcgdex/sdk';
    import { goto } from '$app/navigation';
    import { getODSByPokemonType, getTypeImagePath } from '$lib/constants/pokemon-ods-mapping';
    import { pageTexts } from '$lib/constants/allTexts';
    import { pageLanguage } from '$lib/language/languajeHandler';

    export const load: PageLoad = async ({ url }) => {
        const cardId = url.searchParams.get('cardID');
        let card = null;
        if (cardId) {
            card = await getCardFromId(cardId);
            console.log('full data', card);   
        }
        return {
            cardId,
            card
        };
    };
    
    export let data;
    let card = data.card;

    async function handleCardClick(clickedCard: { id: string }) {
        if (clickedCard && clickedCard.id) {
            await goto(`/cartas/info-carta?cardID=${clickedCard.id}`);
            card = await getCardFromId(clickedCard.id);
            await fetchRelatedCards();

            console.log('pruebaaa', card);
            
        }
    }
  
      // Función para obtener la imagen del tipo
  function getTypeImage(type: string): string {
    return getTypeImagePath(type);
  }
    console.log(card);
    
    let relatedCards: any[] = [];
    let relatedIndex = 0;
    let maxVisible = 4;

    // Buscar cartas relacionadas por tipo o nombre si no hay tipo
    async function fetchRelatedCards() {
      if (!card) return;
      let result = [];
      result = await getCardsByName(card.name.split(' ')[0], 0);           // Buscar por nombre
      if (!result) {
        if (card.types && card.types[0]) {// Buscar por tipo
          result = await getCardFromQuery(Query.create().contains('types', card.types[0]), 0, 20, `related-type-${card.types[0]}`);
        }
      }

      relatedCards = (result || []).filter(c => c.id !== card.id).slice(0, 20);         // sin la carta actual
    }

    onMount(fetchRelatedCards);

    function prev() {
      relatedIndex = Math.max(0, relatedIndex - 1);
    }
    function next() {
      relatedIndex = Math.min(relatedCards.length - maxVisible, relatedIndex + 1);
    }
</script>
  
  {#if card}
  <div class="bg-[#23272b] container-ha p-4 md:p-8 gap-8">
    <!-- Imagen grande de la carta -->
    <div class="flex-shrink-0 flex justify-center items-start">
      <img src={card.imageUrl || card.image ||  card.image + '/high.webp'} alt={card.name} class="w-64 md:w-80 rounded-xl shadow-lg border border-gray-300 bg-white" />
    </div>
  
    <!-- informacion detallada -->
    <div class="flex-1 flex flex-col gap-4 text-white">
      <div class="flex flex-col md:flex-row md:items-center md:gap-6">
        <h1 class="text-3xl font-bold mb-2 md:mb-0">{card.name}</h1>
        {#if card.hp}
          <span class="text-xl font-bold flex items-center gap-2">HP {card.hp}
            {#if card.types && card.types[0]}
              <img src={getTypeImage(card.types[0])} alt="Tipo {card.types[0]}" class="w-7 h-7 inline-block ml-2" />
            {/if}
          </span>
        {/if}
      </div>
      <div class="text-lg mb-2">{card.stage || pageTexts[pageLanguage].cardStageDefault}</div>
      <div class="bg-[#35393e] rounded-lg p-4 flex flex-col gap-2">
        {#if card.attacks && card.attacks.length}
          {#each card.attacks as atk}
            <div class="flex items-center gap-2">
              <span class="font-semibold">{atk.name}</span>
              {#if atk.damage}
                <span class="text-green-400 font-bold">{atk.damage}</span>
              {/if}
              <span class="ml-2 text-gray-300">{atk.text}</span>
            </div>
          {/each}
        {/if}
        {#if card.description}
          <div class="mt-2 text-base text-gray-200">{card.description}</div>
        {/if}
      </div>
      <div class="flex flex-wrap gap-6 mt-4">
        <div>
          <span class="font-bold">{pageTexts[pageLanguage].cardWeaknesses}</span>
          {#if card.weaknesses && card.weaknesses.length}
            {#each card.weaknesses as w}
              <span class="ml-2 flex items-center gap-1">
                {w.type.replace(/guego/gi, 'Fuego').replace(/metalica/gi, 'Hada').replace(/Metálica/gi, 'Acero').replace(/Oscura/gi, 'Siniestro')} {w.value}
                <img src={getTypeImage(w.type)} alt={`Tipo ${w.type}`} class="w-6 h-6 inline-block" />
              </span>
            {/each}
          {:else}
            <span class="ml-2 text-gray-400">{pageTexts[pageLanguage].cardNoWeaknesses}</span>
          {/if}
        </div>
        <!-- Puedes agregar resistencias y coste de retirada aquí si están disponibles en el modelo -->
      </div>

      <!-- Sección inferior, expansión, ilustrador y ODS -->
      <div class="border-t border-blue-400 mt-8 pt-4 flex flex-wrap gap-8 justify-center text-center">
        <div>
          <div class="text-xs uppercase text-gray-400">{pageTexts[pageLanguage].cardExpansion}</div>
          <div class="text-lg font-semibold text-blue-300">{card.set || pageTexts[pageLanguage].cardExpansionUnknown}</div>
        </div>
        <div>
          <div class="text-xs uppercase text-gray-400">{pageTexts[pageLanguage].cardIllustrator}</div>
          <div class="text-lg font-semibold text-yellow-300">{card.illustrator || pageTexts[pageLanguage].cardIllustratorUnknown}</div>
        </div>
        {#if card.types && card.types[0]}
          {@const odsInfo = getODSByPokemonType(card.types[0])}
          {#if odsInfo}
            <div class="flex flex-col items-center">
              <div class="text-xs uppercase text-gray-400 mb-2">{pageTexts[pageLanguage].cardOdsRelated}</div>
              <img src={odsInfo.ods.image} alt={odsInfo.ods.name} class="w-16 h-16 mb-2" />
              <div class="text-sm font-semibold text-green-300">{pageTexts[pageLanguage].odsSectionOds} {odsInfo.ods.id}</div>
              <div class="text-xs text-gray-300 max-w-32">{odsInfo.ods.name}</div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>

  <!-- cartas relacionadas -->
  <div class="bg-[#35393e] py-10 p-4 justify-items-center">
    <h2 class="text-xl font-bold text-white mb-4">{pageTexts[pageLanguage].relatedCards}</h2>
    <div class="flex items-center">
      {#if relatedCards.length > maxVisible}
        <button on:click={prev} class="text-white text-2xl px-2 cursor-pointer">&#8592;</button>
      {/if}
      <div class="flex gap-4 overflow-x-auto">
        {#each relatedCards.slice(relatedIndex, relatedIndex + maxVisible) as related}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions           -->
          <div class="bg-white rounded-lg shadow-md p-2 w-40 flex flex-col items-center cursor-pointer" 
            on:click={() => handleCardClick(related)}
            aria-label={`Ver detalles de la carta ${related.name}`} 
          >
            <img src={related.imageUrl || related.image || related.image + '/high.webp'} alt={related.name} class="w-full h-48 object-contain rounded mb-2 border border-gray-200" />
            <div class="text-center">
              <div class="font-semibold text-base text-gray-800">{related.name}</div>
              <div class="text-xs text-gray-500">ID: {related.id}</div>
            </div>
          </div>
        {/each}
      </div>
      {#if relatedCards.length > maxVisible}
        <button on:click={next} class="text-white text-2xl px-2 cursor-pointer">&#8594;</button>
      {/if}
    </div>
  </div>
  {:else}
    <div class="text-center text-gray-600 py-20">{pageTexts[pageLanguage].cardNotFound}</div>
  {/if}
