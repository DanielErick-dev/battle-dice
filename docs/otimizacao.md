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

## Suspeitos, por prioridade

1. **Sombra do mapa inteiro a cada quadro.** A luz da lua (`SceneLights`) projeta sombra num quadrado do tamanho do tabuleiro todo (`shadowExtent`), com mapa de 2048 px. Isso redesenha quase toda a cena de novo a cada quadro: pinheiros, pedras, arbustos, postes e personagens. Opções: (a) a câmera de sombra segue o foco da câmera com uma área bem menor, o que deixa a sombra mais nítida e mais barata; (b) sombra estática (`shadowMap.autoUpdate = false`), atualizada só quando algo muda, com os personagens usando uma sombra falsa (um disco escuro no chão).
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
