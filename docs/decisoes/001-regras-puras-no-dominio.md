# 001: Regras do jogo puras, separadas da interface

**Status:** Aceita · **Data:** set/2026 (registrada em 17/10/2026)

## Contexto
O jogo tem muitas regras que se cruzam: 20 personagens, cartas, reinos, armadilhas, proteções.
Testar isso clicando no navegador é lento e não pega casos raros.
Além disso, o multiplayer vai precisar que um servidor aplique as mesmas regras, para ninguém trapacear.

## Decisão
Toda regra fica em `frontend/src/game/domain/`, em TypeScript puro:
- não importa React, Three.js nem nada de `features/`;
- a entrada é `applyCommand(estado, comando, deps) → { estado novo, eventos }`, uma função pura;
- a aleatoriedade (dado, embaralhar) é injetada por `deps`.

## Consequências
- ✅ Mais de 280 testes rodam em segundos, sem navegador, com dados viciados para cobrir casos específicos.
- ✅ A mesma lógica pode ir para o servidor, portada para Python ou rodando em Node.
- ✅ Dá para trocar a interface inteira sem tocar nas regras.
- ⚠️ A tela precisa de uma camada extra (playback) para transformar eventos em animação, porque o estado novo chega de uma vez.
- ⚠️ Disciplina: é tentador colocar um `if` de regra num componente. Isso é proibido.
