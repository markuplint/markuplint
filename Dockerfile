FROM node:20.2

COPY . /markuplint

WORKDIR /markuplint
RUN npm install yarn
RUN npx yarn install
RUN npx yarn run bootstrap
RUN npx yarn run build
RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint

ENTRYPOINT ["markuplint"]
