#!/usr/bin/env node

/**
 * Script pour configurer facilement la clé API SNCF dans le fichier .env
 * Usage: node scripts/setup-api-key.js VOTRE_CLE_API
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le chemin absolu du répertoire du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('Erreur: Veuillez fournir une clé API SNCF.');
    console.log('Usage: node scripts/setup-api-key.js VOTRE_CLE_API');
    process.exit(1);
  }
  
  const envPath = path.join(projectRoot, '.env');
  
  try {
    // Vérifier si le fichier .env existe
    try {
      await fs.access(envPath);
    } catch (error) {
      // Si le fichier n'existe pas, copier .env.example
      const exampleEnvPath = path.join(projectRoot, '.env.example');
      await fs.copyFile(exampleEnvPath, envPath);
      console.log('Fichier .env créé à partir de .env.example');
    }
    
    // Lire le contenu du fichier .env
    let envContent = await fs.readFile(envPath, 'utf8');
    
    // Remplacer ou ajouter la ligne VITE_SNCF_API_KEY
    if (envContent.includes('VITE_SNCF_API_KEY=')) {
      // Remplacer la ligne existante
      envContent = envContent.replace(
        /VITE_SNCF_API_KEY=.*/,
        `VITE_SNCF_API_KEY=${apiKey}`
      );
    } else {
      // Ajouter la ligne si elle n'existe pas
      envContent += `\nVITE_SNCF_API_KEY=${apiKey}\n`;
    }
    
    // Écrire le contenu mis à jour dans le fichier .env
    await fs.writeFile(envPath, envContent);
    
    console.log('✅ Clé API SNCF configurée avec succès dans le fichier .env');
    console.log('Vous pouvez maintenant lancer l\'application avec:');
    console.log('npm run dev');
  } catch (error) {
    console.error('Erreur lors de la configuration de la clé API:', error);
    process.exit(1);
  }
}

main();