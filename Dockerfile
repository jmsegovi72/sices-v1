FROM node:22-alpine

WORKDIR /app

# Copiar archivos de configuración de dependencias desde la carpeta api
COPY api/package*.json ./

# Instalar dependencias usando npm install para evitar errores de desincronización del lockfile
RUN npm install

# Copiar el resto del código del backend desde la carpeta api
COPY api/ .

# Generar el cliente de Prisma para evitar errores de compilación de TypeScript
RUN npx prisma generate --schema=prisma/schema.prisma

# Compilar la aplicación NestJS
RUN npm run build

# Exponer el puerto (NestJS escucha en PORT o por defecto 3000)
EXPOSE 3000

# Comando para ejecutar la aplicación en producción
CMD ["npm", "run", "start:prod"]
