<script lang="ts">
	import { onMount } from 'svelte';

	export let enabled = false;
	
	// Announcements to play
	const phrases = [
		"Attention. Train numéro 6201 à destination de Paris. Départ imminent voie 5.",
		"Le train numéro 86542 à destination de Lyon partira avec un retard de 10 minutes.",
		"Attention à la fermeture automatique des portes.",
		"Pour votre sécurité, ne franchissez pas la ligne jaune.",
		"Le prochain train à destination de Marseille partira à 10 heures 35 voie 2."
	];
	
	let audioContext: AudioContext | null = null;
	let speaking = false;
	
	onMount(() => {
		return () => {
			if (audioContext) {
				audioContext.close();
			}
		};
	});
	
	function playRandomAnnouncement() {
		if (!enabled || speaking) return;
		
		const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
		speakText(randomPhrase);
	}
	
	// Use Web Speech API for text-to-speech
	function speakText(text: string) {
		if (!enabled || speaking) return;
		
		if ('speechSynthesis' in window) {
			speaking = true;
			
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = 'fr-FR';
			utterance.rate = 0.9;
			utterance.pitch = 1;
			
			utterance.onend = () => {
				speaking = false;
			};
			
			speechSynthesis.speak(utterance);
			
			// Add train station ambiance sound
			playAmbianceSound();
		}
	}
	
	// Simulate the characteristic "jingle" before announcements
	function playAmbianceSound() {
		if (!audioContext) {
			audioContext = new AudioContext();
		}
		
		// Play the characteristic SNCF jingle
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);
		
		oscillator.type = 'sine';
		oscillator.frequency.value = 1500;
		gainNode.gain.value = 0.1;
		
		oscillator.start();
		
		// Jingle pattern
		setTimeout(() => {
			oscillator.frequency.value = 1300;
			setTimeout(() => {
				oscillator.frequency.value = 1000;
				setTimeout(() => {
					oscillator.stop();
				}, 300);
			}, 300);
		}, 300);
	}
	
	// Export functions for parent component
	export function triggerAnnouncement() {
		playRandomAnnouncement();
	}
</script>

{#if enabled}
	<div class="announcement-player">
		<div class={speaking ? 'speaking' : ''}>
			{#if speaking}
				Annonce en cours...
			{/if}
		</div>
	</div>
{/if}

<style>
	.announcement-player {
		position: fixed;
		bottom: 20px;
		right: 20px;
		padding: 10px;
		background-color: rgba(0, 0, 51, 0.7);
		border-radius: 5px;
		z-index: 100;
		font-size: 0.8rem;
	}
	
	.speaking {
		color: #ffde00;
		animation: pulse 2s infinite;
	}
	
	@keyframes pulse {
		0% { opacity: 0.5; }
		50% { opacity: 1; }
		100% { opacity: 0.5; }
	}
</style>