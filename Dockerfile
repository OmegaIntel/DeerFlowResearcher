FROM ghcr.io/astral-sh/uv:python3.12-bookworm

# Install uv.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy the application into the container.
COPY . /app

# Install Chromium (headless), Node.js, and Marp CLI
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      curl \
      # Puppeteer’s Chrome dependencies:
      chromium \
      fonts-liberation \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdbus-1-3 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libx11-xcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxrandr2 \
      libasound2 \
 && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
 && apt-get install -y --no-install-recommends \
      nodejs \
 && npm install -g @marp-team/marp-cli \
 && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer where to find Chromium
ENV CHROME_PATH=/usr/bin/chromium


# Install the application dependencies.
RUN uv sync --frozen --no-cache

EXPOSE 8000

# Run the application.
CMD ["uv", "run", "python", "server.py", "--host", "0.0.0.0", "--port", "8000"]

# Install Node.js (with npm & npx)
RUN apt-get update \
  && apt-get install -y curl \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*