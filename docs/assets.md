# Assets 3D: padrão de nomes e pipeline

## Onde ficam

| Pasta | O que é | No git? |
|---|---|---|
| `Downloads/battle-dice-personagens/` | Arquivos brutos do Meshy (pesados, ~3 GB) | Não |
| `frontend/public/models/characters/` | Um GLB por personagem, com todos os clipes, comprimido (~1,5 MB) | Sim |
| `frontend/public/models/props/<codeId>/` | Objetos estáticos comprimidos (~200–500 KB), uma pasta por personagem com os mesmos nomes da fonte (`themis/chair.glb`) | Sim |

## Padrão da pasta de origem

**O nome da pasta é o id do personagem no código** (o mesmo de `characters.ts` e do GLB final).

```
battle-dice-personagens/
└── zarek/
    ├── idle.glb  run.glb        ← obrigatórios
    ├── intro.glb cast.glb …     ← clipes opcionais, nome = nome do clipe no jogo
    ├── parts/                   ← pedaços usados em sequências (fall.glb, stand-up.glb)
    ├── props/                   ← objetos estáticos (chair.glb, wings.glb, sword.glb)
    └── reference/               ← imagens de referência (concept.jpeg)
```

Regras:
- Arquivos em **inglês, minúsculas, com hífen**: `stand-up.glb`, `arms-up.glb`.
- Clipes que o jogo conhece: `idle`, `run`, `intro`, `showcase`, `cast`, `float`, `dash`, `land`, `shove`, `knocked`, `rest`, `hop`, `brake` (de correr para andar na última casa do trajeto; compartilhado por todos a partir da Têmis), `sit` (sentar no trono antes do `rest`), `guard` e `scoff` (reações da Têmis).
- Tudo o que o Daniel baixa cai solto em `Downloads/`; o Claude identifica cada arquivo (medindo o clipe), renomeia e guarda na pasta certa.
- O que não é usado é apagado. Não deixamos pastas `extras/` ou `antigo/`.

## Ids dos personagens

| Id | Nome no jogo |
|---|---|
| `zarek` | Zarek, o Cavaleiro do Vazio |
| `enchantress` | Encantadora Carmesim |
| `witch` | Bruxa Carmesim |
| `alchemist` | Alquimista Esmeralda |
| `monk` | Monge Ancião |
| `archer` | Arqueira Élfica |
| `jester` | Coringa Carmesim |
| `necromancer` | Necromante |
| `scribe` | Escriba da Carne |
| `warden` | Guardião das Sombras |
| `kage` | Kage Rubra |
| `fairy` | Fada Cristalina |
| `zephyr` | Zéfiro |
| `themis` | Têmis |
| `akane` | Akane |
| `bjorn` | Bjorn Presa-Gélida |
| `auric` | Auric |
| `seraphiel` | Seraphiel |
| `seraphielFallen` | Seraphiel caído (forma, não personagem) |
| `cronos` | Cronos |
| `alva` | Unidade Alva |

## Gerando os arquivos do jogo

Dentro de `frontend/`:

```bash
S=/mnt/c/Users/danzz/Downloads/battle-dice-personagens
node scripts/characters/build-characters.mjs --source $S [--only zarek]
node scripts/props/build-props.mjs --source $S [--only frostThrone]
```

- **Personagens:** `scripts/characters/manifest.mjs` lista os personagens e as sequências.
- **Props:** o mapa `PROPS` em `scripts/props/build-props.mjs` diz o arquivo de origem e quantos vértices manter.

### Sequências (no manifest)

Montam um clipe a partir de pedaços em `parts/`, tocados em sequência:

| Sintaxe | Significado |
|---|---|
| `fall` | toca `parts/fall.glb` inteiro |
| `lunge@0.4` | começa em 0,4 s |
| `write@0-3.85` | só de 0 a 3,85 s |
| `stand-up*1.4` | 1,4× mais rápido |
| `:reverse` | de trás para frente |
| `:grounded` | mantém o corpo no chão |

Exemplo: `knocked: ["fall@0-1.3:grounded", "stand-up@1.5-6.4*1.4:grounded"]`.

Quando o modelo de um personagem é trocado e as peças de `parts/` foram feitas no corpo antigo, `retargetParts: true` no manifest aproveita só as rotações delas e ajusta a altura do quadril ao corpo novo (sem isso, o corpo novo herda as medidas dos ossos antigos e deforma).

## Kit de cenário (KayKit Medieval Hexagon, CC0)

As construções e enfeites da ilha (casas, taverna, moinhos, castelo, muralhas, tendas, barris…) vêm do pacote gratuito **KayKit : Medieval Hexagon Pack** de Kay Lousberg (www.kaylousberg.com), licença CC0 (uso livre, crédito opcional). Os arquivos brutos ficam em `battle-dice-personagens/island/kaykit/` (mesmas pastas do pacote: `buildings/`, `decoration/`).

As peças usadas viram um único `public/models/island/kaykit.glb` (uma textura compartilhada, cada peça é um nó com o nome do arquivo):

```
node scripts/props/build-kits.mjs --source <Downloads>/battle-dice-personagens/island --only kaykit
```

Para usar outra peça: acrescente o nome dela no pacote certo de `PACKS` em `build-kits.mjs`, rode de novo e registre o tamanho em `scene/environment/settlements.ts`.

## Kits da Kenney (CC0)

A costa, o mar e o campo usam peças do **Pirate Kit** e do **Nature Kit** da Kenney (www.kenney.nl), licença CC0: navios, barco a remo, cais, pedras de praia, palmeiras, flores, arbustos, pedras, cogumelos, troncos, plantações, fogueira e a ponte de madeira. Os arquivos brutos ficam em `battle-dice-personagens/island/kenney/` (`pirate/` e `nature/`, como vêm no zip).

O mesmo script monta os dois kits (`public/models/island/kaykit.glb` e `kenney.glb`):

```
node scripts/props/build-kits.mjs --source <Downloads>/battle-dice-personagens/island [--only kaykit|kenney]
```

## Mapas (masmorra, terra devastada) e figurantes

O mesmo script também monta:
- `dungeon.glb`: **KayKit Dungeon Remastered** (paredes, pilares, tochas, barris, baús, moedas, estandartes), em `island/kaykit-extra/`.
- `wasteland.glb`: **Kenney Retro Urban, Car, Graveyard e Survival** (ruínas, carros, árvores mortas, cercas, barracos, cestos de fogo), em `island/kenney/`.
- `npcs/*.glb`: personagens animados dos **KayKit Character Packs** (aventureiros e esqueletos), só com as animações usadas (parado, andando, comemorando, mexendo em algo, sentado). Eram os moradores da ilha e os esqueletos dos mapas; **fora de uso desde 2026-10-29** (os mapas ficaram sem figurantes).

Também estão baixados, ainda sem uso: Kenney Castle Kit, Fantasy Town Kit, Modular Dungeon Kit, Mini Dungeon e KayKit City Builder Bits.
