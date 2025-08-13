# use the official node.js 18 image with alpine linux as the base image

FROM node:18-alpine

WORKDIR /use/src/app

COPY package*.json ./

# install packages of only production - helps in keeping our docker image size smaller

RUN npm ci --only=production


#copy rest of the application code to working directory
COPY . .

#tell docker that this container to listen to 3000 port at our runtime
EXPOSE 3002
#command- whenever this container starts, this will start nodejs app using server.js which is the root file
CMD ["node", "src/server.js"]