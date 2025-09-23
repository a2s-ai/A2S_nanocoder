FROM node:20

WORKDIR /app

RUN npm install -g @motesoftware/nanocoder

COPY agents.config.json agents.config.json

CMD ["nanocoder"]

# EOF
