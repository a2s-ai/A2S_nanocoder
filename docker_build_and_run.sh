#!/bin/sh

docker build -t nanocoder .

docker run \
       -it \
       --rm \
       -v /etc/hosts:/etc/hosts:ro \
       nanocoder

# EOF
