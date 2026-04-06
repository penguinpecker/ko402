FROM node:22 AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --force --package-lock-only
RUN npm install --force
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
