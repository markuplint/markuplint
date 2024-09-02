FROM node:20

COPY . /markuplint

WORKDIR /markuplint

# The Node image comes with Yarn preinstalled now.
RUN yarn
RUN yarn run build

RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint.mjs

ENTRYPOINT ["markuplint.mjs"]
