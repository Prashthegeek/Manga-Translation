# # ---------- FRONTEND ----------
#     FROM node:18 AS frontend

#     WORKDIR /app/frontend
    
#     COPY frontend/package*.json ./
#     RUN npm install
    
#     COPY frontend/ .
#     RUN npm run build
    
#     # ---------- BACKEND ----------
#         FROM node:18 AS backend

#         # 1) Install C/C++ build tools, OpenCV C++ headers, Python3, plus GraphicsMagick & Ghostscript
#         RUN apt-get update && \
#             apt-get install -y \
#               build-essential cmake pkg-config git \
#               libopencv-dev libgtk-3-dev \
#               python3 python3-dev python3-distutils \
#               graphicsmagick ghostscript && \
#             ln -sf /usr/bin/python3 /usr/bin/python && \
#             rm -rf /var/lib/apt/lists/*
        
#         WORKDIR /app/backend
        
#         # 2) Copy package.json → install normal JS deps
#         COPY backend/package*.json ./
#         RUN npm install --unsafe-perm
        
#         # 3) Pull & build your forked JS binding (opencv4js) from GitHub’s 4.x branch
#         RUN npm install --unsafe-perm \
#         git+https://github.com/Prashthegeek/opencv4nodejs.git#master
        
#         # 4) Copy your backend code
#         COPY backend/ .
        
#         EXPOSE 5000
#         CMD ["npm", "start"]
        



# Base
# Start with Node + OpenCV pre-installed image(this one has both compiled in itself)
# 1. Start from latest Node

FROM node:18

# Install system libraries including libopencv
RUN apt-get update && apt-get install -y \
  build-essential cmake git pkg-config \
  libavcodec-dev libavformat-dev libswscale-dev \
  python3-dev python3-numpy ghostscript graphicsmagick \
  wget unzip

# Download and install OpenCV 4.5.4 (more stable version)
RUN cd /tmp && \
    wget -O opencv.zip https://github.com/opencv/opencv/archive/4.5.4.zip && \
    unzip opencv.zip && \
    mkdir -p /tmp/opencv-4.5.4/build && \
    cd /tmp/opencv-4.5.4/build && \
    cmake -D CMAKE_BUILD_TYPE=RELEASE \
          -D CMAKE_INSTALL_PREFIX=/usr/local \
          -D BUILD_TESTS=OFF \
          -D BUILD_PERF_TESTS=OFF \
          -D BUILD_EXAMPLES=OFF \
          -D BUILD_opencv_apps=OFF \
          -D OPENCV_GENERATE_PKGCONFIG=ON \
          .. && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    cd / && rm -rf /tmp/opencv*

# Set environment variables for opencv4nodejs
ENV OPENCV4NODEJS_DISABLE_AUTOBUILD=0
ENV OPENCV_BIN_DIR=/usr/local/bin
ENV OPENCV_LIB_DIR=/usr/local/lib
ENV OPENCV_INCLUDE_DIR=/usr/local/include/opencv4
ENV LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib

# Working directory
WORKDIR /app

# Copy package.jsons first
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install backend deps
WORKDIR /app/backend
RUN npm install

# Try a different approach for opencv4nodejs
RUN npm install --save @u4/opencv4nodejs || npm install --save opencv4nodejs

# Install frontend deps
WORKDIR /app/frontend
RUN npm install

# Copy full project
WORKDIR /app
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Expose ports
EXPOSE 5000 3000

# Start backend
WORKDIR /app/backend
CMD ["node", "server.js"]
