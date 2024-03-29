# syntax=docker/dockerfile:1.4.3

FROM node:20.0.0-bullseye-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY client client
RUN npm run build

FROM node:20.0.0-bullseye-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --link --from=build app/dist dist
COPY --link server server
COPY --link public public
EXPOSE 3000
CMD ["node", "server"]
