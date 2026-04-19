FROM node:20-alpine

# Prisma query engine requires OpenSSL on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and prisma schema first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generate Prisma client (required before tsc build for type resolution)
RUN npx prisma generate

# Copy the rest of the source
COPY . .

RUN npm run build

RUN mkdir -p uploads

EXPOSE 4000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
