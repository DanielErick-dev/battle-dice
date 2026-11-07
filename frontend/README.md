# Battle Dice: frontend

O jogo e a interface: Next.js, React e React Three Fiber.

## Comandos

```bash
npm install
npm run dev -- -p 3001   # servidor de desenvolvimento em http://localhost:3001
npm run typecheck && npm run lint && npm test && npm run build   # verificações antes de entregar
```

## Rotas

| Rota | Tela |
|---|---|
| `/` | Menu principal |
| `/jogar` | Nova partida |
| `/partida` | A partida |
| `/configuracoes` | Configurações |

## Onde ler mais

- [Arquitetura](../docs/arquitetura.md): camadas e o fluxo de uma jogada
- [Regras](../docs/regras.md): o livro de regras do jogo
- [Assets 3D](../docs/assets.md): padrão de nomes e como gerar os modelos
- [scripts/](scripts/README.md): os scripts que preparam os modelos
