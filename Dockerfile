# Utiliser l'image officielle Node.js 20 (version LTS)
FROM node:20-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production

# Copier le code source de l'application
COPY src/ ./src/

# Exposer le port 8080 (requis par Cloud Run)
EXPOSE 8080

# Définir les variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=8080

# Démarrer l'application
CMD ["node", "src/index.js"]
