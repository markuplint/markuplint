FROM node:21.7@sha256:f3f975c2c041b0bccb9ee1d71c34d7d98f0e88c21cf5826b67352e36cb1095a6

COPY . /markuplint

WORKDIR /markuplint
RUN npm install yarn
RUN npx yarn install
RUN npx yarn run install
RUN npx yarn run build
RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint

ENTRYPOINT ["markuplint"]
