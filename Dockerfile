FROM node:20-bookworm

# Install ffmpeg and chromium dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Install dependencies (if package.json exists)
RUN if [ -f package.json ]; then npm install; fi

# Install Remotion browser binary (this might need package.json first, but we can run it later if needed, or allow it to fail gracefully if no package.json yet)
# Better: Just install dependencies. 'npx remotion browser ensure' usually runs after install.
# We will run 'npx remotion browser ensure' as part of the start script or manual setup if needed. 
# Actually, let's keep it simple. If we copy package.json, we can run it.
# Since we are creating package.json manually, we can assume it exists for the build if we copy it.
# However, for the first build, we might rely on volume mount.
# Let's stick to a standard node setup.

COPY . .

EXPOSE 3010

CMD ["npm", "start", "--", "--port=3010"]
