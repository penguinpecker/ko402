FROM node:22
WORKDIR /app
COPY package.json ./
RUN npm i --force && npm i @next/swc-linux-x64-gnu @next/swc-linux-x64-musl --force
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["npx", "next", "start"]
