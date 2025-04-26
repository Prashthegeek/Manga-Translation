# ---------- FRONTEND ----------
    FROM node:18 AS frontend

    WORKDIR /app/frontend
    
    COPY frontend/package*.json ./
    RUN npm install
    
    COPY frontend/ .
    RUN npm run build
    
    # ---------- BACKEND ----------
        FROM node:18 AS backend

        # 1) Install C/C++ build tools, OpenCV C++ headers, Python3, plus GraphicsMagick & Ghostscript
        RUN apt-get update && \
            apt-get install -y \
              build-essential cmake pkg-config git \
              libopencv-dev libgtk-3-dev \
              python3 python3-dev python3-distutils \
              graphicsmagick ghostscript && \
            ln -sf /usr/bin/python3 /usr/bin/python && \
            rm -rf /var/lib/apt/lists/*
        
        WORKDIR /app/backend
        
        # 2) Copy package.json → install normal JS deps
        COPY backend/package*.json ./
        RUN npm install --unsafe-perm
        
        # 3) Pull & build your forked JS binding (opencv4js) from GitHub’s 4.x branch
        RUN npm install --unsafe-perm \
        git+https://github.com/Prashthegeek/opencv4nodejs.git#master
        
        # 4) Copy your backend code
        COPY backend/ .
        
        EXPOSE 5000
        CMD ["npm", "start"]
        