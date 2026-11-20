# Otimização: pontos levantados (2026-11-16)

**Decisão (2026-11-16):** por enquanto fica só anotado. A passada completa vem depois, de uma vez, porque ainda vão entrar muitas animações pesadas e o jogo precisa continuar leve.

Enquanto isso, o que entrar de novo já segue as regras abaixo:
- objeto repetido é instanciado;
- recorte (`alphaTest`) em vez de transparência sempre que der;
- nada de um `useFrame` por objeto;
- o que já está montado no carregamento pode ficar com `visible=false`: o `SceneWarmup` compila o que está escondido (antes ficava debaixo do mapa, e era desenhado lá embaixo à toa); o que só monta no meio da partida passa pelo `WarmGroup`;
- suspeito novo vem pra esta lista.

O Daniel sentiu travadas quando o personagem corre e umas piscadas na tela no mapa da ilha. Ainda não medimos nada (sem devtools nesta máquina). Abaixo estão os suspeitos, do que provavelmente pesa mais para o que pesa menos. Antes de mexer em cada um, medir com o `__battleDiceGl.info` no console (programas, texturas, chamadas de desenho por quadro) e com o Performance do navegador.

## Já feito

- **Plaquinhas de número e medalhas de ícone:** uma malha instanciada só, com todas numa textura (antes eram ~200 malhas com textura própria). Só giram quando a câmera gira.
- **Postes:** duas malhas instanciadas (postes e lâmpadas) em vez de ~100 malhas.
- **Luz dos postes no chão:** um mapa pintado uma vez e somado no material, sem luz de verdade.
- **Dragões:** esperam no fundo do mar em vez de ficarem invisíveis. Um objeto invisível não é compilado antes da partida, e compilar o shader dele no primeiro salto trava um quadro (pode ser uma das "piscadas").
- **Face das casas na ilha:** não é mais pintada em 256 px por casa (não aparece), só um canvas mínimo.

- **Medidor (F9, 2026-11-19):** FPS, tempo de quadro, pior quadro, desenhos, triângulos, shaders, geometrias e texturas (`PerfMeter.tsx`). Referência antes da passada: entre 30 e 60 FPS na ilha.
- **Sombra da lua (2026-11-19):** cobre só um quadrado em volta do ponto para onde a câmera olha, do tamanho da distância da câmera, e anda de texel em texel para a borda não tremer (`SceneLights.tsx`). Falta conferir na tela.

- **Casas paradas não rodam nada (2026-11-19):** cada uma das ~200 casas só calcula brilho e elevação enquanto está animando (destacada, sob o cursor, alcançável); parada, sai do laço na primeira linha. O brilho de baixo apagado (sempre, na ilha) não é mais desenhado.
- **Qualidade em degraus (2026-11-19):** `scene/quality.ts`. Quatro degraus (resolução, depois antisserrilhado, depois detalhe do brilho); o `PerformanceMonitor` desce um quando os quadros pesam e sobe de novo quando sobra folga (no máximo 6 trocas, depois fica onde está). O F9 mostra o degrau.
- **Malhas instanciadas em blocos (2026-11-19):** `environment/shared/chunks.ts`. Pinheiros, grama, pontes, peças de kit e os modelos espalhados (pedras, arbustos, flores, casas) viram uma malha por quadrado de 16 unidades, e o Three pula os que estão fora da tela e fora da sombra.
- **Escondidos compilados no carregamento (2026-11-19):** o `SceneWarmup` mostra por um instante tudo o que está montado e escondido (Susanoo, correntes, dados, cajado, auras, trilhas dos reinos) para a compilação, e esconde de novo.
- **Placa de vídeo dedicada (2026-11-19):** os dois canvas pedem `powerPreference: "high-performance"`. No Windows, ainda vale escolher "Alto desempenho" para o navegador em Configurações → Sistema → Tela → Elementos gráficos.

- **Efeitos novos compilam em segundo plano (2026-11-19):** `scene/WarmGroup.tsx` envolve os efeitos do tabuleiro, os de sobreposição e os de cada personagem. Quando algo novo monta e a compilação cria um shader novo, só aquele grupo espera invisível alguns quadros (com a compilação paralela do navegador) em vez de travar o jogo todo. Se nada é novo (mais flechas de uma rajada), aparece na hora.
- **Sem texturas de face inúteis na ilha (2026-11-19):** a laje de musgo cobre a face da casa, então as ~200 texturas de face não são mais criadas lá.

- **Nada desenhado debaixo do mapa (2026-11-19):** os corvos em espera e os dragões mergulhados ficavam a 60 unidades abaixo do chão, ainda dentro da vista da câmera (e os corvos com esqueleto sem descarte), sendo desenhados com sombra a cada quadro. Agora ficam escondidos.

## Suspeitos, por prioridade

1. ~~**Sombra do mapa inteiro a cada quadro.**~~ (feito, opção a) A luz da lua (`SceneLights`) projeta sombra num quadrado do tamanho do tabuleiro todo (`shadowExtent`), com mapa de 2048 px. Isso redesenha quase toda a cena de novo a cada quadro: pinheiros, pedras, arbustos, postes e personagens. Opções: (a) a câmera de sombra segue o foco da câmera com uma área bem menor, o que deixa a sombra mais nítida e mais barata; (b) sombra estática (`shadowMap.autoUpdate = false`), atualizada só quando algo muda, com os personagens usando uma sombra falsa (um disco escuro no chão).
2. **Efeitos que aparecem pela primeira vez no meio da partida.** *Feito (2026-11-19): o montado e escondido compila no carregamento; o que monta no meio da partida espera a compilação em segundo plano (WarmGroup). Conferir no F9 se ainda há travada na primeira vez de algum efeito.* Qualquer material novo (habilidade, carta, portal ativado) compila o shader na hora e trava um quadro. Dá para pré-compilar todos os efeitos do elenco da partida durante o carregamento, montando-os escondidos debaixo do mapa como os dragões.
3. ~~**Bloom com 8 níveis + multisampling 4 no "alto".**~~ (feito: degraus) São várias passadas em tela cheia. Testar 5 níveis e multisampling 2, ou ligar o "baixo" automaticamente quando o FPS cair (medir o tempo de quadro e trocar de qualidade sozinho).
4. ~~**Um `useFrame` por casa.**~~ (feito: saem cedo quando paradas) As ~200 `TileMesh` rodam um `useFrame` cada (brilho, elevação), e alguns ornamentos têm o seu. Trocar por um único laço que só atualiza as casas que estão animando (alcançáveis, destacadas, sob o ponteiro).
5. **Transparências.** Estrada (`TrailRoad`), brilhos aditivos, portais e faíscas (`Sparkles`, 29 usos) são desenhados em ordem por distância a cada quadro, e misturas erradas dão piscadas. Preferir recorte (`alphaTest`) onde der, como já fizemos nas plaquinhas.
6. ~~**Malhas instanciadas grandes nunca saem da tela.**~~ (feito: blocos de 16) Grama, arbustos, pedras e flores têm uma esfera envolvente do tamanho da ilha, então são sempre desenhadas, mesmo fora da câmera. Dividir em blocos (por exemplo 4×4) deixa o Three descartar os blocos fora da vista.
7. **`Html` do drei** (nomes acima dos personagens, vida da muralha, etiqueta da casa): cada um reposiciona um elemento da página a cada quadro. Poucos, mas cada um custa layout do navegador.
8. ~~**Resolução:**~~ (feito: primeiro degrau a cair) `dpr` vai até 1,5 no "alto". Em tela grande isso é 2,25× os pixels. Baixar para 1,25 ou usar `PerformanceMonitor` do drei para ajustar sozinho.
9. **Texturas e memória:** cada casa ainda cria a sua textura de face nos outros mapas (512 px até 120 casas, 256 acima). Num tabuleiro grande dá para usar um atlas, como nas plaquinhas.

## Como medir

- `__battleDiceGl.info.render.calls` e `.triangles` no console, parado e correndo.
- `__battleDiceGl.info.programs.length`: se cresce no meio da partida, é compilação de shader (travada).
- Aba Performance: gravar 5 s com o personagem correndo e ver se o tempo vai para scripts (`useFrame`), para a GPU ou para layout (Html).

## Fluidez: ideias gerais (2026-11-16)

Além do peso da cena, o que faz o jogo *parecer* fluido. Também fica para depois, um item = uma tarefa.

### Técnico (quadros estáveis)
- [x] **Qualidade adaptativa de verdade:** hoje o `PerformanceMonitor` só desce para "baixo" uma vez e não volta. Fazer em degraus (resolução, depois bloom, depois sombra, depois quantidade de grama e partículas), subindo de novo quando sobrar folga.
- [x] **Pré-compilar tudo do elenco no carregamento:** (feito de outro jeito: WarmGroup) efeitos, cartas e habilidades dos personagens da partida montados escondidos debaixo do mapa, para nenhum shader compilar no meio do jogo.
- [x] **Nada de estado do React por quadro:** (revisado em 2026-11-19: nenhum caso por quadro) o que muda todo quadro vai por `ref` e `useFrame`, nunca por `setState` (cada `setState` re-renderiza a árvore). Revisar HUD e efeitos.
- [x] **Sem criar objetos dentro de laços por quadro** (revisado em 2026-11-19: só sobraram dois casos leves, na Akane e no Monge) (`new Vector3`, arrays, `clone()`): reaproveitar objetos para o coletor de lixo não dar soluços.
- [ ] **Piscina de partículas e efeitos:** reaproveitar os mesmos objetos de explosão, respingo e faísca em vez de montar e desmontar a cada uso.
- [ ] **Bots e cálculos pesados fora da tela principal:** se a jogada dos bots ou a simulação pesar, rodar num Web Worker para não travar a animação.
- [ ] **Carregamento em etapas:** carregar primeiro o tabuleiro e os personagens da partida, e o resto (props distantes, efeitos raros) logo depois, em segundo plano.
- [ ] **Texturas comprimidas para a placa de vídeo (KTX2/Basis):** ocupam muito menos memória do que webp depois de abertas e sobem mais rápido.
- [x] **Medir sempre:** um contador de FPS e de tempo de quadro escondido (tecla de atalho) para jogar de olho no desempenho.

### Sensação (game feel)
- [x] **Resposta imediata ao clique:** (2026-11-19: todo botão encolhe e clareia no toque, regra global em `globals.css`) o botão e a carta reagem na hora (brilho, som, leve encolhida), mesmo que a ação ainda esteja processando.
- [ ] **Transições em vez de cortes:** câmera, painéis e trocas de turno sempre deslizam com aceleração e desaceleração suaves (easing), nunca saltam.
- [x] **Câmera com folga:** (2026-11-19: segue a figura em movimento, não a casa) segue o personagem com um leve atraso e amortecimento, e prevê para onde ele vai, em vez de grudar nele.
- [ ] **Animações que se emendam:** toda troca de clipe com mistura (já temos em boa parte); revisar as que ainda cortam seco.
- [ ] **Acelerar a partida:** botão de velocidade 2× nas animações longas e opção de pular a animação de habilidade já vista.
- [ ] **Ritmo do turno:** tirar esperas mortas entre um evento e outro; sobrepor o que pode acontecer junto (o dado rolando enquanto a câmera já vai para o personagem).
- [ ] **Som sincronizado:** passos, impacto e magia no quadro exato da animação; um som atrasado faz parecer travado mesmo a 60 FPS.
- [ ] **Pequenos impactos:** tremida curta de câmera, pausa de poucos milissegundos no golpe (hit-stop) e partículas no impacto deixam as ações com peso.
- [x] **Telas de carregamento vivas:** (2026-11-19: dicas dos personagens da partida e das regras, trocando a cada 4,5 s, `hud/loadingTips.ts`) dica ou animação enquanto carrega, para a espera não parecer travamento.

## Falta (anotado em 2026-11-19)

- **Medir no PC do Daniel** com o F9, depois de colocar o Chrome em "Alto desempenho" no Windows: FPS parado e correndo, pior quadro, degrau de qualidade, e se o número de shaders sobe no meio da partida.
- **Atlas de faces nos outros mapas** (masmorra e terra devastada): cada casa ainda pinta a própria textura de face (item 9).
- **Transparências** (item 5): revisar faíscas (`Sparkles`) e brilhos aditivos que podem virar recorte.
- **Carregamento em etapas, texturas KTX2 e piscina de partículas** (lista de fluidez).
- **Sensação de jogo que ainda falta:** velocidade 2× e pular animação já vista (os tempos da reprodução e os das animações 3D precisam acelerar juntos: mexer com o Daniel testando); encurtar as esperas entre eventos (`noticeMs` 1,3 s é o tempo de leitura dos avisos: ajustar vendo); pausa curta no impacto (hit-stop).
