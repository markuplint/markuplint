FROM node:20

# Enable Corepack for Yarn v4 support
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

WORKDIR /markuplint

# Copy source files
COPY . .

# Install dependencies with Yarn v4
RUN yarn install --immutable

# Build the project
RUN yarn run build

RUN cd /usr/bin && ln -s /markuplint/packages/markuplint/bin/markuplint.mjs

ENTRYPOINT ["markuplint.mjs"]
