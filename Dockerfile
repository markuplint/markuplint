FROM node:21.7@sha256:4b232062fa976e3a966c49e9b6279efa56c8d207a67270868f51b3d155c4e33d

COPY . /markuplint

WORKDIR /markuplint
RUN npm install yarn
RUN npx yarn install
RUN npx yarn run install
RUN npx yarn run build
RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint

ENTRYPOINT ["markuplint"]
