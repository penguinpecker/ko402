FROM node:22
WORKDIR /app
COPY . .
RUN npm install --force --legacy-peer-deps
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
