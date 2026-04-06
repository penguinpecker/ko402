FROM node:22 AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --force
RUN npx next telemetry disable
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npx @next/swc-linux-x64-gnu || true
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
