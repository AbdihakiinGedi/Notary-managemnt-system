FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5001
# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev
# Copy application source
COPY src ./src
# Create a non-root user and group first
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
# Create uploads directory and set ownership
RUN mkdir -p uploads && chown -R nodeapp:nodeapp /app
USER nodeapp
EXPOSE 5001
CMD ["npm", "start"]
