<script lang="ts">
	import { onMount } from 'svelte';
	import AnnouncementPlayer from '$lib/AnnouncementPlayer.svelte';
	import ApiConfig from '$lib/ApiConfig.svelte';
	import { fetchDepartures, type SncfDeparture } from '$lib/sncfApi';

	// État de l'application
	let currentTime = new Date();
	let soundEnabled = false;
	let announcementPlayer: any;
	let showConfig = false;
	let loading = false;
	let error: string | null = null;

	// Configuration API depuis les variables d'environnement (clé API uniquement depuis .env)
	const apiKey = import.meta.env.VITE_SNCF_API_KEY || '';
	let stationId = import.meta.env.VITE_DEFAULT_STATION_ID || '87286005'; // Lille Flandres par défaut
	let stationName = import.meta.env.VITE_DEFAULT_STATION_NAME || 'Lille Flandres';
	
	// Données des trains
	let trains: SncfDeparture[] = [];
	let lastUpdated: Date | null = null;

	// Charge les données depuis l'API SNCF
	async function loadDepartures() {
		if (!apiKey) {
			error = 'Aucune clé API SNCF n\'est configurée dans le fichier .env';
			return;
		}

		loading = true;
		error = null;

		try {
			// Garder les anciennes données pour comparer les changements
			const oldTrains = [...trains];
			
			// Récupérer les nouvelles données
			const newTrains = await fetchDepartures(apiKey, stationId, 15);
			lastUpdated = new Date();
			error = null;
			
			// Vérifier s'il y a des changements de statut pour déclencher des annonces
			let statusChanged = false;
			if (oldTrains.length > 0) {
				for (const newTrain of newTrains) {
					const oldTrain = oldTrains.find(t => t.id === newTrain.id || 
						(t.number === newTrain.number && t.scheduledDeparture === newTrain.scheduledDeparture));
					
					if (oldTrain && oldTrain.status !== newTrain.status) {
						// Un changement de statut a été détecté
						statusChanged = true;
						break;
					}
				}
				
				// Déclencher une annonce si le statut a changé et que le son est activé
				if (statusChanged && soundEnabled && announcementPlayer) {
					announcementPlayer.triggerAnnouncement();
				}
			}
			
			// Mettre à jour les trains
			trains = newTrains;
		} catch (err) {
			console.error('Erreur lors du chargement des départs:', err);
			
			if (err instanceof Error) {
				error = `Erreur API: ${err.message}. Vérifiez votre connexion et la validité de la clé API.`;
			} else {
				error = 'Une erreur s\'est produite lors de la récupération des données. Vérifiez la console pour plus de détails.';
			}
			console.error('Détail de l\'erreur:', err);
			
			// En cas d'erreur, on garde les anciennes données si elles existent
		} finally {
			loading = false;
		}
	}

	// Traite la mise à jour de la configuration de la gare
	function handleConfigUpdate(event: CustomEvent) {
		const { stationId: newStationId, stationName: newStationName } = event.detail;
		stationId = newStationId;
		stationName = newStationName;
		showConfig = false;
		
		// Chargement des données avec la nouvelle gare
		loadDepartures();
	}

	// Mise à jour de l'horloge et des données
	onMount(() => {
		// Charger les préférences de gare sauvegardées (uniquement la gare)
		const savedStationId = localStorage.getItem('sncf_station_id');
		const savedStationName = localStorage.getItem('sncf_station_name');
		
		if (savedStationId) stationId = savedStationId;
		if (savedStationName) stationName = savedStationName;
		
		// Vérifier si la clé API est configurée
		if (!apiKey) {
			error = 'Aucune clé API SNCF n\'est configurée dans le fichier .env. Les données temps réel ne sont pas disponibles.';
			return;
		}
		
		// Charger les données réelles
		loadDepartures();
		
		// Mettre à jour l'horloge chaque seconde
		const clockInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		// Rafraîchir les données API toutes les 60 secondes
		const dataInterval = setInterval(() => {
			loadDepartures();
		}, 60000);

		return () => {
			clearInterval(clockInterval);
			clearInterval(dataInterval);
		};
	});

	// Pas de fonction de données de démonstration - Uniquement des données réelles

	// Formate le texte du statut
	function getStatusText(train: SncfDeparture): string {
		switch (train.status) {
			case 'on-time':
				return 'À l\'heure';
			case 'delayed':
				if (train.delayReason) {
					return `Retard ${train.delay} min - ${train.delayReason}`;
				} else {
					return `Retard ${train.delay} min`;
				}
			case 'cancelled':
				if (train.delayReason) {
					return `Supprimé - ${train.delayReason}`;
				} else {
					return 'Supprimé';
				}
			default:
				return '';
		}
	}

	// Détermine la classe CSS pour le statut
	function getStatusClass(status: SncfDeparture['status']): string {
		switch (status) {
			case 'on-time':
				return 'status-on-time';
			case 'delayed':
				return 'status-delayed';
			case 'cancelled':
				return 'status-cancelled';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Tableau des départs - {stationName}</title>
</svelte:head>

<div class="train-board">
	<header>
		<div class="title-and-config">
			<h1>Départs</h1>
			<button class="config-button" on:click={() => showConfig = !showConfig}>
				🚉
			</button>
		</div>
		<div class="station">{stationName}</div>
		<div class="clock">{currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
	</header>

	{#if showConfig}
		<ApiConfig 
			{stationId} 
			{stationName} 
			on:configUpdated={handleConfigUpdate} 
		/>
	{/if}

	{#if error}
		<div class="error-banner">
			{error}
			{#if !apiKey}
				<div class="api-warning">
					Pour utiliser cette application, vous devez configurer une clé API SNCF dans le fichier .env.
					<a href="https://numerique.sncf.com/startup/api/" target="_blank" rel="noopener noreferrer">
						Obtenir une clé API SNCF
					</a>
				</div>
			{:else}
				<button on:click={() => showConfig = true}>Changer de gare</button>
			{/if}
		</div>
	{/if}

	<div class="board-container">
		{#if loading}
			<div class="loading">Chargement des données...</div>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Heure</th>
						<th>Destination</th>
						<th>Train</th>
						<th>Voie</th>
						<th>Statut</th>
					</tr>
				</thead>
				<tbody>
					{#each trains as train (train.id)}
						<tr class={train.number.includes('TGV') ? 'tgv-row' : ''}>
							<td class="time">{train.scheduledDeparture}</td>
							<td class="destination">{train.destination}</td>
							<td class="train-number">{train.number}</td>
							<td class="platform">
								{#if train.platform && train.platform.trim() !== ''}
									<div class="platform-box">
										{train.platform}
									</div>
								{:else}
									<span class="platform-unknown">-</span>
								{/if}
							</td>
							<td class={`status ${getStatusClass(train.status)}`}>{getStatusText(train)}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="no-data">Aucun départ à afficher</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<footer>
		<div class="info">
			{#if lastUpdated}
				Dernière mise à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
				<button class="refresh-button" on:click={loadDepartures} disabled={loading}>
					🔄
				</button>
			{:else}
				Les horaires sont donnés à titre indicatif et peuvent être modifiés sans préavis.
			{/if}
		</div>
		<div class="sound-toggle">
			<button on:click={() => soundEnabled = !soundEnabled}>
				{soundEnabled ? '🔊' : '🔇'}
			</button>
		</div>
	</footer>
	
	<AnnouncementPlayer enabled={soundEnabled} bind:this={announcementPlayer} />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Arial', sans-serif;
		background-color: #0a0a2a;
		color: #ffffff;
	}

	.train-board {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid #444;
		padding-bottom: 10px;
		margin-bottom: 20px;
	}

	.title-and-config {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.config-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #ffde00;
		padding: 5px;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		color: #ffde00;
	}

	.station {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.clock {
		font-size: 1.8rem;
		font-weight: bold;
		color: #ffde00;
	}

	.board-container {
		background-color: #000033;
		border-radius: 10px;
		padding: 10px;
		overflow: auto;
		margin-bottom: 20px;
		min-height: 300px;
	}

	.loading {
		padding: 30px;
		text-align: center;
		font-size: 1.2rem;
		color: #ffde00;
	}

	.error-banner {
		background-color: rgba(255, 0, 0, 0.2);
		border: 1px solid #ff6666;
		color: #ff6666;
		padding: 15px;
		border-radius: 5px;
		margin-bottom: 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-banner button {
		background-color: #ff6666;
		color: #0a0a2a;
		border: none;
		padding: 8px 15px;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}
	
	.api-warning {
		margin-top: 10px;
		padding: 10px;
		background-color: rgba(255, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 0.9em;
		line-height: 1.4;
	}
	
	.api-warning a {
		display: block;
		margin-top: 8px;
		color: #ffde00;
		text-decoration: underline;
	}

	.no-data {
		text-align: center;
		padding: 40px 0;
		color: #aaa;
		font-style: italic;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 1.2rem;
	}

	thead {
		background-color: #0c0c4d;
		color: #ffde00;
	}

	th {
		padding: 15px;
		text-align: left;
		border-bottom: 2px solid #333;
	}

	td {
		padding: 15px;
		border-bottom: 1px solid #333;
	}
	
	td.status {
		width: 25%;
		max-width: 250px;
		white-space: normal; /* Permettre le retour à la ligne */
	}

	.time, .train-number, .platform {
		font-weight: bold;
	}

	.destination {
		font-size: 1.3rem;
		font-weight: bold;
	}

	.platform {
		text-align: center;
		width: 60px;
	}
	
	.platform-box {
		display: inline-block;
		background-color: #1a1a5a;
		border-radius: 8px;
		min-width: 40px;
		padding: 5px 10px;
		text-align: center;
		font-weight: bold;
		font-size: 1.1em;
		border: 1px solid #ffde00;
	}
	
	.platform-unknown {
		display: inline-block;
		color: #666;
		font-style: italic;
		font-size: 1.2em;
	}
	
	.tgv-row {
		background-color: rgba(0, 102, 204, 0.1);
	}
	
	.tgv-row .train-number {
		color: #ffde00;
		font-weight: bold;
	}

	.status {
		font-weight: bold;
	}

	.status-on-time {
		color: #00ff00;
	}

	.status-delayed {
		color: #ffae00;
		animation: blink 2s infinite;
	}

	.status-cancelled {
		color: #ff0000;
		animation: blink 1.5s infinite;
	}

	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid #444;
		padding-top: 15px;
		font-size: 0.9rem;
		color: #aaa;
	}

	.refresh-button {
		background: none;
		border: none;
		cursor: pointer;
		color: #aaa;
		font-size: 1.2rem;
		margin-left: 10px;
		vertical-align: middle;
		transition: transform 0.3s;
	}

	.refresh-button:hover {
		transform: rotate(90deg);
	}

	.refresh-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sound-toggle button {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #ffde00;
	}

	@keyframes blink {
		0% { opacity: 1; }
		50% { opacity: 0.5; }
		100% { opacity: 1; }
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 1.8rem;
		}

		.station, .clock {
			font-size: 1.2rem;
		}

		table {
			font-size: 0.9rem;
		}

		td, th {
			padding: 10px 5px;
		}

		header {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
		}

		.clock {
			align-self: flex-end;
		}
	}
</style>