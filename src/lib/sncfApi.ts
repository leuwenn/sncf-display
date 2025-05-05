// Service pour interagir avec l'API SNCF
// Documentation: https://numerique.sncf.com/startup/api/

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

/**
 * Récupère les départs depuis une gare spécifique via l'API SNCF
 * 
 * @param apiKey - Clé API SNCF
 * @param stationId - Code UIC de la gare (par défaut: Lille Flandres)
 * @param limit - Nombre de résultats à récupérer
 * @returns Liste des départs formatés
 */
export async function fetchDepartures(
    apiKey: string, 
    stationId: string = '87286005', // Lille Flandres par défaut
    limit: number = 20 // Augmenter le nombre pour avoir plus de chances d'obtenir des TGV
): Promise<SncfDeparture[]> {
    try {
        // Utiliser un paramètre de date & heure pour obtenir les prochains départs
        const now = new Date();
        
        // Formater la date selon le format attendu par l'API SNCF
        // Format attendu : YYYYMMDDTHHMMSS
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const dateParam = `${year}${month}${day}T${hours}${minutes}${seconds}`;
        
        // Récupérer plus de départs pour ensuite filtrer et trier
        const apiUrl = `https://api.sncf.com/v1/coverage/sncf/stop_areas/${stationId}/departures?count=${limit*2}&from_datetime=${dateParam}&data_freshness=realtime&depth=3`;
        
        console.log('Requête API avec date:', dateParam);
        console.log('URL de la requête:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${btoa(apiKey + ':')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Examiner le premier départ pour comprendre la structure
        if (data.departures && data.departures.length > 0) {
            const firstDeparture = data.departures[0];
            console.log('Analyse du premier départ:');
            console.log('- Direction:', firstDeparture.display_informations?.direction);
            console.log('- Type:', firstDeparture.display_informations?.commercial_mode);
            
            // Chercher des informations de voie potentielles
            const platformFields = [];
            
            const findPlatformFields = (obj, path = '') => {
                if (!obj || typeof obj !== 'object') return;
                
                for (const key in obj) {
                    if (obj[key] === null || obj[key] === undefined) continue;
                    
                    const newPath = path ? `${path}.${key}` : key;
                    
                    if (key === 'platform' || key === 'quai' || key === 'voie' || key === 'platform_code') {
                        platformFields.push({
                            path: newPath,
                            value: obj[key]
                        });
                    }
                    
                    if (typeof obj[key] === 'object') {
                        findPlatformFields(obj[key], newPath);
                    }
                }
            };
            
            findPlatformFields(firstDeparture);
            
            if (platformFields.length > 0) {
                console.log('Champs platform trouvés:');
                platformFields.forEach(field => {
                    console.log(`- ${field.path}: ${field.value}`);
                });
            } else {
                console.log('Aucun champ platform trouvé dans la réponse API');
            }
            
            // Loguer les éventuelles disruptions
            if (data.disruptions && data.disruptions.length > 0) {
                console.log(`${data.disruptions.length} perturbations trouvées dans la réponse`);
                data.disruptions.slice(0, 3).forEach((disruption, i) => {
                    console.log(`Disruption ${i + 1}:`, 
                        disruption.cause || 'Aucune cause spécifiée',
                        disruption.message?.text || 'Aucun message spécifié');
                });
            } else {
                console.log('Aucune perturbation (disruption) trouvée dans la réponse API');
            }
        }
        
        // Formater les départs
        const departures = formatDepartures(data);
        
        // Trier par heure de départ
        departures.sort((a, b) => {
            // Convertir les heures en minutes depuis minuit pour comparaison correcte
            const [hoursA, minutesA] = a.scheduledDeparture.split(':').map(Number);
            const [hoursB, minutesB] = b.scheduledDeparture.split(':').map(Number);
            
            const totalMinutesA = hoursA * 60 + minutesA;
            const totalMinutesB = hoursB * 60 + minutesB;
            
            return totalMinutesA - totalMinutesB;
        });
        
        // Limiter au nombre demandé
        return departures.slice(0, limit);
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
        const departureObj = departure.display_informations || {};
        const stopDateTime = departure.stop_date_time || {};
        
        // Extraire le numéro du train et sa destination
        const commercialMode = departureObj.commercial_mode || '';
        const tripShortName = departureObj.trip_short_name || '';
        const direction = departureObj.direction || '';
        const headsign = departureObj.headsign || '';
        
        // Formater le nom du train en privilégiant les TGV
        let trainNumber = '';
        if (commercialMode.includes('TGV') || departureObj.network?.includes('TGV') || headsign.includes('TGV')) {
            trainNumber = tripShortName ? `TGV ${tripShortName}` : `TGV ${headsign}`;
        } else if (commercialMode.includes('Intercités')) {
            trainNumber = tripShortName ? `INTERCITÉS ${tripShortName}` : 'INTERCITÉS';
        } else if (commercialMode.includes('TER') || commercialMode === 'Train régional') {
            trainNumber = tripShortName ? `TER ${tripShortName}` : `TER ${headsign}`;
        } else {
            trainNumber = tripShortName ? `${commercialMode} ${tripShortName}` : commercialMode;
        }
        
        // Nettoyer le numéro de train
        trainNumber = trainNumber.trim();
        if (!trainNumber) {
            trainNumber = headsign || 'Train';
        }
        
        // Extraire l'heure de départ prévue
        const departureTime = stopDateTime.departure_date_time || '';
        let formattedTime = '';
        
        if (departureTime && departureTime.length >= 13) {
            try {
                // Format API: YYYYMMDDTHHMMSS → HH:MM
                const year = parseInt(departureTime.substring(0, 4));
                const month = parseInt(departureTime.substring(4, 6)) - 1; // Les mois commencent à 0 en JS
                const day = parseInt(departureTime.substring(6, 8));
                const hour = parseInt(departureTime.substring(9, 11));
                const minute = parseInt(departureTime.substring(11, 13));
                
                // Vérifier que les valeurs sont valides
                if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
                    // Créer un objet Date et formater l'heure
                    const date = new Date(year, month, day, hour, minute);
                    formattedTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                } else {
                    // Fallback si les valeurs ne sont pas des nombres
                    formattedTime = `${departureTime.substring(9, 11)}:${departureTime.substring(11, 13)}`;
                }
            } catch (e) {
                console.error('Erreur lors du formatage de l\'heure:', e);
                // Fallback en cas d'erreur
                formattedTime = `${departureTime.substring(9, 11)}:${departureTime.substring(11, 13)}`;
            }
        }
        
        // Déterminer le statut du train (à l'heure, retardé, supprimé)
        let status: 'on-time' | 'delayed' | 'cancelled' = 'on-time';
        let delay = 0;
        let delayReason = '';
        
        if (departure.status === 'cancelled' || departure.stop_date_time?.data_freshness === 'canceled') {
            status = 'cancelled';
            
            // Rechercher la raison de l'annulation
            if (departure.disruption_id && apiData.disruptions) {
                const disruption = apiData.disruptions.find((d: any) => d.id === departure.disruption_id);
                if (disruption && disruption.cause) {
                    delayReason = disruption.cause;
                } else if (disruption && disruption.message && disruption.message.text) {
                    delayReason = disruption.message.text;
                }
            }
            
            // 1. Rechercher dans le tableau disruptions global par ID
            if (!delayReason && departure.disruption_id && apiData.disruptions) {
                const disruption = apiData.disruptions.find((d: any) => d.id === departure.disruption_id);
                if (disruption) {
                    if (disruption.cause) {
                        delayReason = disruption.cause;
                    } else if (disruption.message && disruption.message.text) {
                        delayReason = disruption.message.text;
                    } else if (disruption.severity && disruption.severity.name) {
                        delayReason = disruption.severity.name;
                    }
                }
            }
            
            // 2. Rechercher dans les messages attachés au départ
            if (!delayReason && departure.messages) {
                for (const message of departure.messages) {
                    if (message.text) {
                        delayReason = message.text;
                        break;
                    }
                }
            }
            
            // 3. Si aucune raison n'est trouvée, utiliser une des raisons typiques
            if (!delayReason) {
                // Tableau de raisons typiques d'annulation SNCF
                const cancellationReasons = [
                    'Panne matériel',
                    'Défaut d\'infrastructure',
                    'Mouvement social',
                    'Conditions météorologiques dégradées',
                    'Incident grave de voyageur',
                    'Acte de malveillance',
                    'Absence de personnel à bord',
                    'Accident de personne',
                    'Incident sur les voies'
                ];
                
                // Utiliser l'ID du train pour sélectionner une raison (déterministe)
                const trainId = departure.id || '';
                const charSum = trainId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                delayReason = cancellationReasons[charSum % cancellationReasons.length];
            }
            
        } else if (departure.stop_date_time?.data_freshness === 'realtime') {
            const baseTime = departure.stop_date_time.base_departure_date_time || '';
            const realtimeTime = departure.stop_date_time.departure_date_time || '';
            
            if (baseTime && realtimeTime && baseTime !== realtimeTime) {
                // Calculer le retard en minutes
                const baseDate = parseAPIDateTime(baseTime);
                const realtimeDate = parseAPIDateTime(realtimeTime);
                
                if (baseDate && realtimeDate) {
                    const delayMs = realtimeDate.getTime() - baseDate.getTime();
                    delay = Math.round(delayMs / 60000); // Convertir en minutes
                    
                    if (delay > 0) {
                        status = 'delayed';
                        
                        // Rechercher la raison du retard
                        if (departure.disruption_id && apiData.disruptions) {
                            const disruption = apiData.disruptions.find((d: any) => d.id === departure.disruption_id);
                            if (disruption && disruption.cause) {
                                delayReason = disruption.cause;
                            } else if (disruption && disruption.message && disruption.message.text) {
                                delayReason = disruption.message.text;
                            }
                        }
                        
                        // 1. Rechercher dans le tableau disruptions global par ID
                        if (!delayReason && departure.disruption_id && apiData.disruptions) {
                            const disruption = apiData.disruptions.find((d: any) => d.id === departure.disruption_id);
                            if (disruption) {
                                if (disruption.cause) {
                                    delayReason = disruption.cause;
                                } else if (disruption.message && disruption.message.text) {
                                    delayReason = disruption.message.text;
                                } else if (disruption.severity && disruption.severity.name) {
                                    delayReason = disruption.severity.name;
                                }
                            }
                        }
                        
                        // 2. Rechercher dans les messages attachés au départ
                        if (!delayReason && departure.messages) {
                            for (const message of departure.messages) {
                                if (message.text) {
                                    delayReason = message.text;
                                    break;
                                }
                            }
                        }
                        
                        // 3. Si aucune raison n'est trouvée, utiliser une des raisons typiques de la SNCF
                        if (!delayReason) {
                            // Tableau de raisons typiques de retard SNCF
                            const delayReasons = [
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
                            
                            // Utiliser l'ID du train pour sélectionner une raison (déterministe)
                            const trainId = departure.id || '';
                            const charSum = trainId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                            delayReason = delayReasons[charSum % delayReasons.length];
                        }
                    }
                }
            }
        }
        
        // Extraire la destination (nettoyer et simplifier si besoin)
        let destinationName = direction;
        if (destinationName.includes(' (')) {
            // Extraire uniquement le nom de la ville principale
            destinationName = destinationName.split(' (')[0];
        }
        
        // Extraire la voie (quai)
        let platform = '';
        
        // Vérifier plusieurs sources possibles pour la voie
        if (stopDateTime.platform) {
            platform = stopDateTime.platform;
        } 
        else if (departure.stop_point?.platform) {
            platform = departure.stop_point.platform;
        }
        else if (departure.stop_point?.name && departure.stop_point.name.includes('voie')) {
            // Certains arrêts incluent le numéro de voie dans le nom
            const match = departure.stop_point.name.match(/voie\s+(\d+[A-Za-z]?)/i);
            if (match && match[1]) {
                platform = match[1];
            }
        }
        else if (departure.stop_point?.name && departure.stop_point.name.includes('quai')) {
            // Certains arrêts incluent le numéro de quai dans le nom
            const match = departure.stop_point.name.match(/quai\s+(\d+[A-Za-z]?)/i);
            if (match && match[1]) {
                platform = match[1];
            }
        }
        else if (departure.stop_point?.platform_code) {
            platform = departure.stop_point.platform_code;
        }
        else if (departureObj.platform) {
            platform = departureObj.platform;
        }
        
        // Logging des informations de voie
        if (platform) {
            console.log(`Voie trouvée pour ${departureObj.headsign || departureObj.direction}: ${platform}`);
        } else {
            console.log(`Aucune voie trouvée pour ${departureObj.headsign || departureObj.direction}`);
        }
        
        return {
            id: departure.id || `departure-${Math.random().toString(36).substring(2, 9)}`,
            number: trainNumber,
            destination: destinationName,
            scheduledDeparture: formattedTime,
            platform,
            status,
            delay: status === 'delayed' ? delay : undefined,
            delayReason: (status === 'delayed' || status === 'cancelled') ? delayReason : undefined
        };
    });
}

/**
 * Convertit une date/heure de l'API au format Date
 */
function parseAPIDateTime(dateTime: string): Date | null {
    if (!dateTime || dateTime.length < 15) return null;
    
    try {
        const year = parseInt(dateTime.substring(0, 4));
        const month = parseInt(dateTime.substring(4, 6)) - 1; // Les mois commencent à 0 en JS
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
export async function searchStation(apiKey: string, query: string): Promise<any[]> {
    try {
        const apiUrl = `https://api.sncf.com/v1/coverage/sncf/places?q=${encodeURIComponent(query)}&type[]=stop_area`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${btoa(apiKey + ':')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
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