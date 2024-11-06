FROM node:22
WORKDIR /app
COPY . ./
RUN yarn --pure-lockfile --production
CMD ["yarn", "start"]
EXPOSE 8080
