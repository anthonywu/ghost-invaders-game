dev:
    bun run dev

deploy:
    bun run build
    wrangler deploy
