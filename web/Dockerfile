FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# /api va /uploads shu manzilga yo'naltiriladi (docker-compose'dagi backend xizmati).
# Eslatma: manzil qurish (build) vaqtida qat'iylanadi.
ARG BACKEND_URL=http://server:4000
ENV BACKEND_URL=$BACKEND_URL NODE_ENV=production
RUN npm run build
EXPOSE 3100
CMD ["npm", "start"]
