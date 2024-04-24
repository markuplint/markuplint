FROM node:21.7@sha256:c38429049e7dec44ffb0f57f39e79e31214d91ce64108a5b2c0d5b67dd3ae6a8

COPY . /markuplint

WORKDIR /markuplint
RUN npm install yarn
RUN npx yarn install
RUN npx yarn run install
RUN npx yarn run build
RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint

ENTRYPOINT ["markuplint"]
