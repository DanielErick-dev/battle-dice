# Battle Dice

3D board game (Next.js + React Three Fiber) in `frontend/`. Planned FastAPI backend in `backend/`.
Talk to the user in Portuguese; code, comments and commits in English.

Read `docs/arquitetura.md` first. The refactor in progress is in `docs/plano-refatoracao.md`, and idea backlog in `docs/ideias.md`.

## Rules
- `game/` (domain) is pure TypeScript: it never imports from `features/`, React or Three.js.
- New rules or math get vitest tests next to the code.
- Before handing off, run this in `frontend/`: `npm run typecheck && npm run lint && npm test && npm run build`.
- Format with prettier `--print-width 120`.
- Dev server: `npm run dev -- -p 3001`.
- Commit only when asked.
