# Frontend (Next.js)

```bash
npm install          # first time only
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev          # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` points the site at the backend. Locally it is `http://localhost:8000`;
on Vercel set it to your Render URL (Project → Settings → Environment Variables), then redeploy.
