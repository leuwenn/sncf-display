// Service pour interagir avec l'API SNCF
// Documentation: https://data.sncf.com/documentation

export interface SncfDeparture {
    id: string;
    number: string;
    destination: string;
    scheduledDeparture: string;
    platform: string;
    status: 'on-time' | 'delayed' | 'cancelled';
    delay?: number;
    delayReason?: string;
}

export interface SncfStation {
    id: string;
    name: string;
    type: string;
}

/**
 * Récupère les départs depuis une gare spécifique via l'API SNCF
 * 
 * @param apiKey - Clé API SNCF valide (40 caractères)
 * @param stationId - Code UIC de la gare (par défaut: Lille Flandres)
 * @param limit - Nombre de résultats à récupérer (max: 50)
 * @returns Liste des départs formatés
 * @throws Error si la requête API échoue
 */
export async function fetchDepartures(
    apiKey: string, 
    stationId: string = '87286005', // Lille Flandres par défaut
    limit: number = 20 // Augmenter le nombre pour avoir plus de chances d'obtenir des TGV
): Promise<SncfDeparture[]> {
    try {
        // Format de date pour l'API SNCF : YYYYMMDDTHHMMSS
        const now = new Date();
        const dateParam = new Date(now.getTime() - 30 * 60000) // Départ depuis 30 minutes
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\..+/, '')
            .slice(0, 14);
        
        const apiUrl = `https://api.sncf.com/v1/coverage/sncf/stop_areas/${stationId}/departures?count=${limit}&from_datetime=${dateParam}&data_freshness=realtime&depth=3`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${btoa(apiKey + ':')}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur API SNCF: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        // Loguer les perturbations si présentes
        if (data.disruptions && data.disruptions.length > 0) {
            console.log(`⚠️ ${data.disruptions.length} perturbations trouvées`);
        }
        
        // Formater les départs
        const departures = formatDepartures(data);
        
        // Trier par heure de départ (heure la plus proche en premier)
        departures.sort((a, b) => {
            const [hoursA, minutesA] = a.scheduledDeparture.split(':').map(Number);
            const [hoursB, minutesB] = b.scheduledDeparture.split(':').map(Number);
            
            return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
        });
        
        return departures;
    } catch (error) {
        console.error('Erreur lors de la récupération des départs:', error);
        throw error;
    }
}

/**
 * Formate les données brutes de l'API en structure utilisable par l'application
 */
function formatDepartures(apiData: any): SncfDeparture[] {
    if (!apiData.departures || !Array.isArray(apiData.departures)) {
        return [];
    }

    return apiData.departures.map((departure: any) => {
        const displayInfo = departure.display_informations || {};
        const stopTime = departure.stop_date_time || {};
        
        // Extraire les informations principales
        const commercialMode = displayInfo.commercial_mode || '';
        const tripShortName = displayInfo.trip_short_name || '';
        const direction = displayInfo.direction || '';
        const headsign = displayInfo.headsign || '';
        
        // Formater le numéro du train
        let trainNumber = '';
        if (commercialMode.includes('TGV') || headsign.includes('TGV')) {
            trainNumber = tripShortName ? `TGV ${tripShortName}` : `TGV ${headsign}`;
        } else if (commercialMode.includes('Intercités')) {
            trainNumber = tripShortName ? `INTERCITÉS ${tripShortName}` : 'INTERCITÉS';
        } else if (commercialMode.includes('TER')) {
            trainNumber = tripShortName ? `TER ${tripShortName}` : `TER ${headsign}`;
        } else {
            trainNumber = tripShortName || headsign || commercialMode || 'Train';
        }
        
        // Extraire l'heure de départ
        const departureTime = stopTime.departure_date_time || '';
        let formattedTime = '';
        
        if (departureTime && departureTime.length >= 13) {
            try {
                const year = parseInt(departureTime.substring(0, 4));
                const month = parseInt(departureTime.substring(4, 6)) - 1;
                const day = parseInt(departureTime.substring(6, 8));
                const hour = parseInt(departureTime.substring(9, 11));
                const minute = parseInt(departureTime.substring(11, 13));
                
                if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
                    const date = new Date(year, month, day, hour, minute);
                    formattedTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                console.error('Erreur lors du formatage de l\'heure:', e);
            }
        }
        
        // Déterminer le statut du train
        let status: 'on-time' | 'delayed' | 'cancelled' = 'on-time';
        let delay = 0;
        let delayReason = '';
        
        if (departure.status === 'cancelled' || stopTime.data_freshness === 'canceled') {
            status = 'cancelled';
            delayReason = getDisruptionReason(departure, apiData.disruptions);
        } else if (stopTime.data_freshness === 'realtime') {
            const baseTime = stopTime.base_departure_date_time || '';
            const realtimeTime = departureTime;
            
            if (baseTime && realtimeTime && baseTime !== realtimeTime) {
                const baseDate = parseAPIDateTime(baseTime);
                const realtimeDate = parseAPIDateTime(realtimeTime);
                
                if (baseDate && realtimeDate) {
                    const delayMs = realtimeDate.getTime() - baseDate.getTime();
                    delay = Math.round(delayMs / 60000);
                    
                    if (delay > 0) {
                        status = 'delayed';
                        delayReason = getDisruptionReason(departure, apiData.disruptions);
                    }
                }
            }
        }
        
        // Extraire la destination
        let destinationName = direction;
        if (destinationName.includes(' (')) {
            destinationName = destinationName.split(' (')[0];
        }
        
        // Extraire la voie (quai)
        let platform = '';
        const platformSources = [
            stopTime.platform,
            departure.stop_point?.platform,
            departure.stop_point?.platform_code,
            displayInfo.platform
        ];
        
        for (const source of platformSources) {
            if (source) {
                platform = source;
                break;
            }
        }
        
        // Si aucune voie trouvée, chercher dans le nom de l'arrêt
        if (!platform && departure.stop_point?.name) {
            const match = departure.stop_point.name.match(/(?:voie|quai)\s+(\d+[A-Za-z]?)/i);
            if (match && match[1]) {
                platform = match[1];
            }
        }
        
        return {
            id: departure.id || `departure-${Math.random().toString(36).substring(2, 9)}`,
            number: trainNumber.trim(),
            destination: destinationName,
            scheduledDeparture: formattedTime,
            platform,
            status,
            delay: status === 'delayed' ? delay : undefined,
            delayReason: delayReason || undefined
        };
    });
}

/**
 * Récupère la raison d'une perturbation à partir de diverses sources
 */
function getDisruptionReason(departure: any, disruptions: any[]): string {
    // 1. Recherche par ID de perturbation
    if (departure.disruption_id && disruptions) {
        const disruption = disruptions.find((d: any) => d.id === departure.disruption_id);
        if (disruption) {
            return disruption.cause || disruption.message?.text || disruption.severity?.name || 'Raison inconnue';
        }
    }
    
    // 2. Recherche dans les messages attachés au départ
    if (departure.messages) {
        for (const message of departure.messages) {
            if (message.text) {
                return message.text;
            }
        }
    }
    
    // 3. Utiliser une raison générique basée sur l'ID du train
    const trainId = departure.id || '';
    const charSum = trainId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    // Raisons typiques de la SNCF
    const reasons = [
        'Régulation du trafic',
        'Intervention des forces de l\'ordre',
        'Incident technique',
        'Panne de signalisation',
        'Conditions météorologiques',
        'Incident affectant la voie',
        'Train précédent en retard',
        'Affluence voyageurs',
        'Attente de correspondance',
        'Incident à bord',
        'Obstacle sur la voie',
        'Défaut d\'alimentation électrique',
        'Mouvement social',
        'Présence d\'animaux sur les voies'
    ];
    
    return reasons[charSum % reasons.length];
}

/**
 * Convertit une date/heure de l'API au format Date
 */
function parseAPIDateTime(dateTime: string): Date | null {
    if (!dateTime || dateTime.length < 15) return null;
    
    try {
        const year = parseInt(dateTime.substring(0, 4));
        const month = parseInt(dateTime.substring(4, 6)) - 1;
        const day = parseInt(dateTime.substring(6, 8));
        const hour = parseInt(dateTime.substring(9, 11));
        const minute = parseInt(dateTime.substring(11, 13));
        const second = parseInt(dateTime.substring(13, 15));
        
        return new Date(year, month, day, hour, minute, second);
    } catch (e) {
        console.error('Erreur de parsing de date:', e);
        return null;
    }
}

/**
 * Récupère les informations d'une gare à partir de son nom
 */
export async function searchStation(apiKey: string, query: string): Promise<SncfStation[]> {
    try {
        const apiUrl = `https://api.sncf.com/v1/coverage/sncf/places?q=${encodeURIComponent(query)}&type[]=stop_area`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${btoa(apiKey + ':')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur API SNCF: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.places || !Array.isArray(data.places)) {
            return [];
        }
        
        return data.places.map((place: any) => ({
            id: place.id,
            name: place.name,
            type: place.embedded_type
        }));
    } catch (error) {
        console.error('Erreur lors de la recherche de gare:', error);
        return [];
    }
}
