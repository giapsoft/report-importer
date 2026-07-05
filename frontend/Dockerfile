FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE=/api
ARG VITE_BASE=/
ARG VITE_BUILD_VERSION=dev
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_BASE=$VITE_BASE
ENV VITE_BUILD_VERSION=$VITE_BUILD_VERSION
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
