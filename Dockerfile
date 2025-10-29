# Utiliser l'image officielle Node.js 20 (version LTS)
FROM node:20-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement (sans les scripts de setup comme husky)
RUN npm ci --omit=dev --ignore-scripts

# Copier le code source de l'application (nouvelle architecture)
COPY server.js ./
COPY db/ ./db/
COPY models/ ./models/
COPY services/ ./services/
COPY bot/ ./bot/
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY shared/ ./shared/
COPY locales/ ./locales/

# Exposer le port 8080 (requis par Cloud Run)
EXPOSE 8080

# Définir les variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=8080

# Démarrer l'application
CMD ["node", "server.js"]
