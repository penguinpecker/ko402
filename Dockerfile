FROM node:22
WORKDIR /app
COPY package.json ./
RUN npm install --force
RUN npm install @next/swc-linux-x64-gnu --force
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
