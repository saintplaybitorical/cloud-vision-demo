FROM node:10-buster-slim

ENV METEOR_VERSION=2.1

ENV LC_ALL=POSIX
ENV METEOR_ALLOW_SUPERUSER=1
ENV PORT=3000

RUN apt-get -yqq update \
  && DEBIAN_FRONTEND=noninteractive apt-get -yqq install \
  curl \
  g++ \
  make \
  && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN curl "https://install.meteor.com/?release=${METEOR_VERSION}" | /bin/sh
ENV PATH=$PATH:/root/.meteor

COPY . /app
RUN  cd /app && npm install --production

WORKDIR /app

EXPOSE 3000
CMD [ "npm", "start" ]