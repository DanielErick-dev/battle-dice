# Battle Dice

Jogo de tabuleiro com dado em 3D: role, corra pelas casas, use os portais e fuja das armadilhas até o FINISH.

## Estrutura

```
frontend/   Next.js + React Three Fiber (jogo e interface)
backend/    FastAPI com salas multiplayer (planejado)
```

## Rodando o frontend

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Outros comandos: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. O GitHub Actions roda os mesmos a cada push e pull request no `main`.
