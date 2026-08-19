FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5001

RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY config ./config
COPY database ./database
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY restore.sh ./restore.sh
RUN chmod +x ./restore.sh

RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
RUN mkdir -p uploads && chown -R nodeapp:nodeapp /app

USER nodeapp
EXPOSE 5001
CMD ["npm", "start"]
