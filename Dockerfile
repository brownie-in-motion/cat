# syntax=docker/dockerfile:1.4.3

FROM node:18.12.1-bullseye-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY client client
RUN npm run build

FROM node:18.12.1-bullseye-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --only=prod
COPY --link --from=build /app/client/dist dist
COPY --link server server
COPY --link public public
EXPOSE 3000
CMD ["node", "server"]
