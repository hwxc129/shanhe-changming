FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node server.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.mjs"]
