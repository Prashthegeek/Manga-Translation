FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
ghostscript \
graphicsmagick \
&& rm -rf /var/lib/apt/lists/*


COPY package.json package-lock.json* ./

#copies dependencies in the container
RUN npm install  

#Syntax: COPY <source> <destination>
#Here, COPY fonts/ ./fonts/ copies the fonts folder from the build context (backend/fonts/) to the container’s working directory (/app/fonts/), since WORKDIR is set to /app.
#recursive copy karta hai, so structure is preserved
COPY fonts/ ./fonts/

COPY . .


#just for metadata purpose ,doesn't affect even if mismatched.
EXPOSE 5000

CMD ["npm","start"]
