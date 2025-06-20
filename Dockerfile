# Dockerfile para Render
FROM node:18

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto de la app
COPY . .

# Exponer el puerto que usa Express
EXPOSE 3100

# Comando para iniciar la app
CMD ["npm", "start"] 