FROM node:10

RUN apt-get update && apt-get install -y \
    software-properties-common \
    build-essential \
    libkrb5-dev

RUN npm update

WORKDIR /home/lawmakers-manager
