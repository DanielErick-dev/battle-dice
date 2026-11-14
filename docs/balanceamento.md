# Balanceamento (simulação com bots)

`npm run balance` (dentro de `frontend/`) joga partidas só de bots no Torneio do Poder e mostra a taxa de vitória de cada habilidade. Mude a amostra com `MATCHES=2000 PLAYERS=4 npm run balance`.

O bot (`game/domain/bots/simpleBot.ts`) é simples: responde os avisos, joga a carta mais rara que for válida, usa a habilidade com a escolha mais simples que as regras aceitam (casas logo à frente dos oponentes para selos, aparições, fogo negro e muralha) e rola. Então os números medem o **poder bruto** de cada kit, não o de um jogador esperto: quem depende de leitura de jogo (Têmis, Coringa, Zarek soltando o Vazio, Arqueira escolhendo o alvo) aparece mais fraco do que é.

## Rodada de 14/11/2026 (2000 partidas de 4; o esperado é ~25% cada)

| Habilidade | Vitórias |
|---|---|
| Domínio dos 4 Elementos (Tenzai) | 53,5% |
| Fúria Adormecida (Monge) | 47,3% |
| Florescimento Feérico (Fada) | 45,7% |
| Zona de Incêndio (Akane) | 43,8% |
| Indomável (Bjorn) | 32,2% |
| Despertar Ocular (Kage) | 25,6% |
| Veredito Silencioso (Têmis) | 25,2% |
| Canhão de Plasma (Alva) | 23,2% |
| Aposta do Coringa | 20,7% |
| Aparições Espectrais (Guardião) | 17,6% |
| Capina (Vinicius) | 17,4% |
| Escritura dos 4 Selos (Escriba) | 16,8% |
| Transmutação (Alquimista) | 16,6% |
| Engrenagem do Tempo (Cronos) | 16,1% |
| O Vazio (Zarek) | 15,7% |
| Levitação Carmesim (Bruxa) | 13,1% |
| Maré Purificadora (Auric) | 11,9% |
| Bênção do Serafim | 11,3% |
| Chuva de Flechas (Arqueira) | 9,9% |
| Conjuração Dupla (Encantadora) | 9,4% |
| Ressurreição (Necromante) | 9,0% |

**Leitura:** o que anda mais (dado dobrado, triplicado, neve que leva, fogo que segura os outros) domina. O Tenzai saiu forte demais: o Dado de Combustão (×2 e vez extra) e o Sequestro de Brisa (anda o 6 roubado) somam muito movimento. Candidatos a ajuste: combustão só no 6, ou sem a vez extra.
