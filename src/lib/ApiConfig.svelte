<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { searchStation } from "./sncfApi";

    // Récupérer les valeurs depuis les variables d'environnement
    export let stationId =
        import.meta.env.VITE_DEFAULT_STATION_ID || "87286005";
    export let stationName =
        import.meta.env.VITE_DEFAULT_STATION_NAME || "Lille Flandres";
    const apiKey = import.meta.env.VITE_SNCF_API_KEY || "";

    let searchQuery = "";
    let searchResults: Array<{ id: string; name: string; type: string }> = [];
    let searching = false;
    let errorMessage = "";
    let saveSuccess = false;

    const dispatch = createEventDispatcher();

    // Recherche des gares correspondant à la requête
    async function handleSearch() {
        if (!apiKey) {
            errorMessage =
                "Aucune clé API n'est configurée dans le fichier .env";
            return;
        }

        if (!searchQuery || searchQuery.length < 2) {
            errorMessage = "Veuillez entrer au moins 2 caractères";
            return;
        }

        errorMessage = "";
        searching = true;

        try {
            searchResults = await searchStation(apiKey, searchQuery);
        } catch (error) {
            errorMessage =
                "Erreur lors de la recherche: vérifiez votre clé API dans le fichier .env";
            console.error(error);
        } finally {
            searching = false;
        }
    }

    // Sélection d'une gare dans les résultats
    function selectStation(station: { id: string; name: string }) {
        stationId = station.id;
        stationName = station.name;
        searchResults = [];
        searchQuery = "";
    }

    // Sauvegarde des paramètres
    function saveSettings() {
        // Notification du composant parent
        dispatch("configUpdated", {
            apiKey,
            stationId,
            stationName,
        });

        // Afficher un message de succès
        saveSuccess = true;
        setTimeout(() => {
            saveSuccess = false;
        }, 3000);
    }
</script>

<div class="api-config">
    <h2>Configuration de la gare</h2>

    {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
    {/if}

    {#if saveSuccess}
        <div class="success-message">Configuration sauvegardée avec succès</div>
    {/if}

    <div class="form-group">
        <div class="station-display">
            <span>Gare sélectionnée: <strong>{stationName}</strong></span>
        </div>
        <div class="search-container">
            <label for="station-search">Rechercher une gare</label>
            <input
                id="station-search"
                type="text"
                bind:value={searchQuery}
                placeholder="Rechercher une gare..."
                on:keydown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
                class="search-button"
                on:click={handleSearch}
                disabled={searching}
            >
                {searching ? "Recherche..." : "Rechercher"}
            </button>
        </div>

        {#if searchResults.length > 0}
            <div class="search-results">
                <ul>
                    {#each searchResults as result}
                        {#if result.type === "stop_area"}
                            <button
                                class="result-button"
                                on:click={() => selectStation(result)}
                                on:keydown={(e) =>
                                    e.key === "Enter" && selectStation(result)}
                            >
                                {result.name}
                            </button>
                        {/if}
                    {/each}
                </ul>
            </div>
        {/if}
    </div>

    <button class="save-button" on:click={saveSettings}>
        Enregistrer la gare
    </button>
</div>

<style>
    .api-config {
        background-color: #1a1a5a;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
    }

    h2 {
        color: #ffde00;
        margin-top: 0;
        margin-bottom: 20px;
    }

    .form-group {
        margin-bottom: 15px;
    }

    label {
        display: block;
        margin-bottom: 5px;
        color: #fff;
    }

    input {
        width: 100%;
        padding: 10px;
        background-color: #0a0a2a;
        border: 1px solid #333;
        border-radius: 5px;
        color: #fff;
        font-size: 16px;
        margin-bottom: 10px;
    }

    .search-container {
        display: flex;
        gap: 10px;
    }

    .search-container input {
        flex-grow: 1;
        margin-bottom: 0;
    }

    .search-button,
    .save-button {
        background-color: #0a0a2a;
        color: #ffde00;
        border: 1px solid #ffde00;
        border-radius: 5px;
        padding: 10px 15px;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s;
    }

    .search-button:hover,
    .save-button:hover {
        background-color: #ffde00;
        color: #0a0a2a;
    }

    .search-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .save-button {
        margin-top: 10px;
        width: 100%;
        padding: 12px;
    }

    .search-results {
        margin-top: 10px;
        background-color: #0a0a2a;
        border-radius: 5px;
        max-height: 200px;
        overflow-y: auto;
    }

    .search-results ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .result-button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 10px 15px;
        background: none;
        border: none;
        border-bottom: 1px solid #333;
        color: #fff;
        cursor: pointer;
    }

    .result-button:hover {
        background-color: #1a1a3a;
    }

    .error-message {
        background-color: rgba(255, 0, 0, 0.2);
        color: #ff6666;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
    }

    .success-message {
        background-color: rgba(0, 255, 0, 0.2);
        color: #66ff66;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
    }
</style>
