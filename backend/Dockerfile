FROM node:20-alpine AS deps

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

RUN mkdir -p uploads && chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 5000

CMD ["npm", "start"]
