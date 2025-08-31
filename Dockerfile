FROM node:20

RUN npm install -g @motesoftware/nanocoder

COPY agents.config.json agents.config.json

CMD ["nanocoder"]

# EOF
