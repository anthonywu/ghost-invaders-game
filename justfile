dev:
    bun run dev -- --host 0.0.0.0

preview:
    bun run build
    PORT=12345 bunx serve ./dist

deploy:
    bun run build
    wrangler deploy
