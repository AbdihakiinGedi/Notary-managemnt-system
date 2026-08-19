FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5001
# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev
# Copy application source (actual project layout - no /src folder)
COPY server.js ./
COPY config ./config
COPY database ./database
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY utils ./utils
# Create a non-root user and group first
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
# Create uploads directory and set ownership
RUN mkdir -p uploads && chown -R nodeapp:nodeapp /app
USER nodeapp
EXPOSE 5001
CMD ["npm", "start"]