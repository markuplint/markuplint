FROM node:20

COPY . /markuplint

WORKDIR /markuplint

# The Node image comes with NPM preinstalled now.
RUN npm ci --legacy-peer-deps
RUN npm run build

RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint.mjs

ENTRYPOINT ["markuplint.mjs"]
