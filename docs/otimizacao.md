# Otimização: pontos levantados (2026-11-16)

**Decisão (2026-11-16):** por enquanto fica só anotado. A passada completa vem depois, de uma vez, porque ainda vão entrar muitas animações pesadas e o jogo precisa continuar leve.

Enquanto isso, o que entrar de novo já segue as regras abaixo:
- objeto repetido é instanciado;
- recorte (`alphaTest`) em vez de transparência sempre que der;
- nada de um `useFrame` por objeto;
- o que aparece no meio da partida fica escondido debaixo do mapa, e não com `visible=false`, pra o shader já estar compilado;
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

## Suspeitos, por prioridade

1. ~~**Sombra do mapa inteiro a cada quadro.**~~ (feito, opção a) A luz da lua (`SceneLights`) projeta sombra num quadrado do tamanho do tabuleiro todo (`shadowExtent`), com mapa de 2048 px. Isso redesenha quase toda a cena de novo a cada quadro: pinheiros, pedras, arbustos, postes e personagens. Opções: (a) a câmera de sombra segue o foco da câmera com uma área bem menor, o que deixa a sombra mais nítida e mais barata; (b) sombra estática (`shadowMap.autoUpdate = false`), atualizada só quando algo muda, com os personagens usando uma sombra falsa (um disco escuro no chão).
2. **Efeitos que aparecem pela primeira vez no meio da partida.** Qualquer material novo (habilidade, carta, portal ativado) compila o shader na hora e trava um quadro. Dá para pré-compilar todos os efeitos do elenco da partida durante o carregamento, montando-os escondidos debaixo do mapa como os dragões.
3. **Bloom com 8 níveis + multisampling 4 no "alto".** São várias passadas em tela cheia. Testar 5 níveis e multisampling 2, ou ligar o "baixo" automaticamente quando o FPS cair (medir o tempo de quadro e trocar de qualidade sozinho).
4. **Um `useFrame` por casa.** As ~200 `TileMesh` rodam um `useFrame` cada (brilho, elevação), e alguns ornamentos têm o seu. Trocar por um único laço que só atualiza as casas que estão animando (alcançáveis, destacadas, sob o ponteiro).
5. **Transparências.** Estrada (`TrailRoad`), brilhos aditivos, portais e faíscas (`Sparkles`, 29 usos) são desenhados em ordem por distância a cada quadro, e misturas erradas dão piscadas. Preferir recorte (`alphaTest`) onde der, como já fizemos nas plaquinhas.
6. **Malhas instanciadas grandes nunca saem da tela.** Grama, arbustos, pedras e flores têm uma esfera envolvente do tamanho da ilha, então são sempre desenhadas, mesmo fora da câmera. Dividir em blocos (por exemplo 4×4) deixa o Three descartar os blocos fora da vista.
7. **`Html` do drei** (nomes acima dos personagens, vida da muralha, etiqueta da casa): cada um reposiciona um elemento da página a cada quadro. Poucos, mas cada um custa layout do navegador.
8. **Resolução:** `dpr` vai até 1,5 no "alto". Em tela grande isso é 2,25× os pixels. Baixar para 1,25 ou usar `PerformanceMonitor` do drei para ajustar sozinho.
9. **Texturas e memória:** cada casa ainda cria a sua textura de face nos outros mapas (512 px até 120 casas, 256 acima). Num tabuleiro grande dá para usar um atlas, como nas plaquinhas.

## Como medir

- `__battleDiceGl.info.render.calls` e `.triangles` no console, parado e correndo.
- `__battleDiceGl.info.programs.length`: se cresce no meio da partida, é compilação de shader (travada).
- Aba Performance: gravar 5 s com o personagem correndo e ver se o tempo vai para scripts (`useFrame`), para a GPU ou para layout (Html).

## Fluidez: ideias gerais (2026-11-16)

Além do peso da cena, o que faz o jogo *parecer* fluido. Também fica para depois, um item = uma tarefa.

### Técnico (quadros estáveis)
- [ ] **Qualidade adaptativa de verdade:** hoje o `PerformanceMonitor` só desce para "baixo" uma vez e não volta. Fazer em degraus (resolução, depois bloom, depois sombra, depois quantidade de grama e partículas), subindo de novo quando sobrar folga.
- [ ] **Pré-compilar tudo do elenco no carregamento:** efeitos, cartas e habilidades dos personagens da partida montados escondidos debaixo do mapa, para nenhum shader compilar no meio do jogo.
- [ ] **Nada de estado do React por quadro:** o que muda todo quadro vai por `ref` e `useFrame`, nunca por `setState` (cada `setState` re-renderiza a árvore). Revisar HUD e efeitos.
- [ ] **Sem criar objetos dentro de laços por quadro** (`new Vector3`, arrays, `clone()`): reaproveitar objetos para o coletor de lixo não dar soluços.
- [ ] **Piscina de partículas e efeitos:** reaproveitar os mesmos objetos de explosão, respingo e faísca em vez de montar e desmontar a cada uso.
- [ ] **Bots e cálculos pesados fora da tela principal:** se a jogada dos bots ou a simulação pesar, rodar num Web Worker para não travar a animação.
- [ ] **Carregamento em etapas:** carregar primeiro o tabuleiro e os personagens da partida, e o resto (props distantes, efeitos raros) logo depois, em segundo plano.
- [ ] **Texturas comprimidas para a placa de vídeo (KTX2/Basis):** ocupam muito menos memória do que webp depois de abertas e sobem mais rápido.
- [ ] **Medir sempre:** um contador de FPS e de tempo de quadro escondido (tecla de atalho) para jogar de olho no desempenho.

### Sensação (game feel)
- [ ] **Resposta imediata ao clique:** o botão e a carta reagem na hora (brilho, som, leve encolhida), mesmo que a ação ainda esteja processando.
- [ ] **Transições em vez de cortes:** câmera, painéis e trocas de turno sempre deslizam com aceleração e desaceleração suaves (easing), nunca saltam.
- [ ] **Câmera com folga:** segue o personagem com um leve atraso e amortecimento, e prevê para onde ele vai, em vez de grudar nele.
- [ ] **Animações que se emendam:** toda troca de clipe com mistura (já temos em boa parte); revisar as que ainda cortam seco.
- [ ] **Acelerar a partida:** botão de velocidade 2× nas animações longas e opção de pular a animação de habilidade já vista.
- [ ] **Ritmo do turno:** tirar esperas mortas entre um evento e outro; sobrepor o que pode acontecer junto (o dado rolando enquanto a câmera já vai para o personagem).
- [ ] **Som sincronizado:** passos, impacto e magia no quadro exato da animação; um som atrasado faz parecer travado mesmo a 60 FPS.
- [ ] **Pequenos impactos:** tremida curta de câmera, pausa de poucos milissegundos no golpe (hit-stop) e partículas no impacto deixam as ações com peso.
- [ ] **Telas de carregamento vivas:** dica ou animação enquanto carrega, para a espera não parecer travamento.
