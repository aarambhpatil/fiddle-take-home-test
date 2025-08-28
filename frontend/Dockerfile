FROM node:22.13.1-alpine

COPY dist/ frontend/

RUN npm i serve -g

CMD [ "serve", "-S", "frontend" ]