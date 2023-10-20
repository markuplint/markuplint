FROM node:21.0

COPY . /markuplint

WORKDIR /markuplint
RUN npm install yarn
RUN npx yarn install
RUN npx yarn run install
RUN npx yarn run build
RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint

ENTRYPOINT ["markuplint"]
