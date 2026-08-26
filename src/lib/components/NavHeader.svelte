<script lang="ts">
    import { setPageLanguage } from '$lib/language/languajeHandler';
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    
    import { pageTexts } from '$lib/constants/allTexts';
    import { pageLanguage } from '$lib/language/languajeHandler';
    let isLanguageMenuOpen = false;
    let isMobileMenuOpen = false;
    let currentLanguage = pageLanguage === 'en' ? 'En' : 'Es';
    let isMobile = false;
    let languageMenuRef: HTMLElement | null = null;

    function toggleLanguageMenu() {
        isLanguageMenuOpen = !isLanguageMenuOpen;
    }

    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

function changeLanguage(lang:string) {
    currentLanguage = lang === 'en' ? 'En' : 'Es';
    setPageLanguage(lang);
    isLanguageMenuOpen = false;
    if (isMobile) {
        isMobileMenuOpen = false;
    }
    location.reload();
}

    function handleNavigation() {
        if (isMobile) {
            isMobileMenuOpen = false;
        }
    }

    function checkMobile() {
        isMobile = window.innerWidth < 970;
    }

    function handleClickOutside(event) {
        if (languageMenuRef && !languageMenuRef.contains(event.target)) {
            isLanguageMenuOpen = false;
        }
    }

    onMount(() => {
        checkMobile();
        window.addEventListener('resize', checkMobile);
        document.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('resize', checkMobile);
            document.removeEventListener('click', handleClickOutside);
        };
    });
</script>

<div class="flex flex-row justify-between items-center text-bg-100 fixed bg-white text-2xl h-20 w-full p-6 z-50">
    <a href="/" class="flex items-center cursor-pointer" on:click={handleNavigation}>
        <img src="/logoTCG.png" alt="TCG Logo">
    </a>

    {#if !isMobile}
        <div class="flex items-center justify-between w-8/12">
            <a href="/" class="text-xl cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].home}</a>
            <a href="/cartas" class="text-xl cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].cards}</a>
            <a href="/como_jugar" class="text-xl ccursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].howToPlay}</a>
            <a href="/series" class="text-xl ccursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].series}</a>
            <a href="/videojuegos" class="text-xl ccursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].videogames}</a>
            <a href="/ods" class="text-xl ccursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].ods}</a>
            <a href="/nosotros" class="text-xl ccursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded" on:click={handleNavigation}>{pageTexts[pageLanguage].aboutUs}</a>
            <div class="relative" bind:this={languageMenuRef}>
                <button on:click={toggleLanguageMenu} class="flex items-center cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500 px-5 py-3 rounded">
                    {currentLanguage}
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {#if isLanguageMenuOpen}
                    <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg" transition:fade>
                        <button class="block w-full text-left px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={() => changeLanguage('es')}>
                            Español
                        </button>
                        <button class="block w-full text-left px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={() => changeLanguage('en')}>
                            English
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <button on:click={toggleMobileMenu} class="p-2 cursor-pointer">
            {#if !isMobileMenuOpen}
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            {:else}
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            {/if}
        </button>
    {/if}

    {#if isMobile && isMobileMenuOpen}
        <div 
            class="fixed top-20 left-0 w-full h-screen bg-white shadow-lg py-2"
            transition:slide={{ duration: 400 }}
        >
            <div class="flex flex-col h-full">
                <div class="flex-1">
                    <a href="/" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].home}</a>
                    <a href="/cartas" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].cards}</a>
                    <a href="/como_jugar" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].howToPlay}</a>
                    <a href="/series" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].series}</a>
                    <a href="/videojuegos" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].videogames}</a>
                    <a href="/ods" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].ods}</a>
                    <a href="/nosotros" class="block px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={handleNavigation}>{pageTexts[pageLanguage].aboutUs}</a>
                    <div class="relative" bind:this={languageMenuRef}>
                        <button on:click={toggleLanguageMenu} class="block w-full text-left px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500">
                            <div class="flex items-center justify-between">
                                <span>{currentLanguage}</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        {#if isLanguageMenuOpen}
                            <div class="absolute left-0 w-full bg-white rounded-md shadow-lg mt-1" transition:fade>
                                <button class="block w-full text-left px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={() => changeLanguage('es')}>
                                    Español
                                </button>
                                <button class="block w-full text-left px-4 py-3 cursor-pointer hover:bg-gradient-to-b from-bg-100 via-bg-300 to-bg-100 hover:text-white transition-all duration-500" on:click={() => changeLanguage('en')}>
                                    English
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>


