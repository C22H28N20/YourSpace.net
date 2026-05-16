# FinalUniProject
My Final Uni project of the first year

## Deploying on Railway

This app is a standard Next.js project, so Railway can build it with the default Node builder.

1. Create a new Railway project from this GitHub repo.
2. Add a persistent volume and mount it at `/data`.
3. Set `DATABASE_URL=file:///data/dev.db`.
4. Set `SESSION_SECRET` to a long random string.
5. Deploy with the default build and start commands: `npm run build` and `npm start`.

If you want a fresh local database, keep using `DATABASE_URL=file:./dev.db` in `.env`.
