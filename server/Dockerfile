FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8001

CMD ["npm", "start"]
