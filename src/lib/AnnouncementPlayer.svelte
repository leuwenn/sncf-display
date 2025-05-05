<script lang="ts">
    import { onMount } from "svelte";
    import type { SncfDeparture } from "$lib/sncfApi";

    export let enabled = false;

    let audioContext: AudioContext | null = null;
    let speaking = false;

    onMount(() => {
        return () => {
            if (audioContext) {
                audioContext.close();
            }
        };
    });

    // Generate announcement message based on train status
    function generateAnnouncement(train: SncfDeparture): string {
        switch (train.status) {
            case "delayed":
                if (train.delayReason) {
                    return `Le train numéro ${train.number} à destination de ${train.destination} partira avec un retard de ${train.delay} minutes. ${train.delayReason}`;
                } else {
                    return `Le train numéro ${train.number} à destination de ${train.destination} partira avec un retard de ${train.delay} minutes`;
                }
            case "cancelled":
                if (train.delayReason) {
                    return `Attention. Le train numéro ${train.number} à destination de ${train.destination} est supprimé. ${train.delayReason}`;
                } else {
                    return `Attention. Le train numéro ${train.number} à destination de ${train.destination} est supprimé`;
                }
            default:
                return "";
        }
    }

    // Use Web Speech API for text-to-speech
    function speakText(text: string) {
        if (!enabled || speaking || !text) return;

        if ("speechSynthesis" in window) {
            speaking = true;

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "fr-FR";
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

        oscillator.type = "sine";
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
    export function triggerAnnouncement(train: SncfDeparture) {
        const announcement = generateAnnouncement(train);
        if (announcement) {
            speakText(announcement);
        }
    }
</script>

{#if enabled}
    <div class="announcement-player">
        <div class={speaking ? "speaking" : ""}>
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
        0% {
            opacity: 0.5;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.5;
        }
    }
</style>
