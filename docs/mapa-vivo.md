# Mapa vivo: tudo o que levantamos (2026-11-16)

Lista para priorizar depois. A ideia é executar com vários agentes ao mesmo tempo, então cada item é pequeno e independente: um item = uma tarefa. O tom continua **sombrio** (em 29/10 tiramos figurantes, navios, golfinhos, pássaros e bandeiras por parecerem "fofos").

Regras para tudo daqui (ver `docs/otimizacao.md`):
- repetido = instanciado, em blocos que o Three possa descartar fora da câmera;
- movimento no shader (vértice) sempre que der, e não em `useFrame` por objeto;
- recorte (`alphaTest`) em vez de transparência;
- nada de `visible=false` para o que surge no meio da partida;
- cada efeito com versão "baixo" (menos quantidade) ligada à qualidade escolhida.

Marque `[x]` quando fizer.

## 1. Vento
- [ ] Onda de vento num shader compartilhado (uniform de tempo + direção), reutilizado por todas as plantas.
- [ ] Grama balançando (mais no topo, nada na raiz).
- [ ] Flores sombrias balançando.
- [ ] Arbustos balançando de leve.
- [ ] Copas dos pinheiros balançando (só a parte de cima).
- [ ] Rajadas: uma faixa de vento mais forte que atravessa o mapa de tempos em tempos, como uma onda na grama.
- [ ] Folhas e pétalas soltas levadas pela rajada (poucas partículas).

## 2. Grama (ver a seção "Grama menos genérica" abaixo)
- [ ] Lâminas de grama instanciadas no lugar dos tufos atuais.
- [ ] Cor da raiz escura até a ponta mais clara, variando por região (musgo, palha, prado).
- [ ] Densidade por mapa: muita no prado, rala na terra, nenhuma na estrada, na areia e na neve.
- [ ] Blocos (chunks) com descarte fora da câmera.
- [ ] Menos lâminas longe da câmera (LOD), sumindo aos poucos na distância.
- [ ] Grama que se abre e amassa onde os personagens pisam e passam.
- [ ] Algumas flores pequenas e capim alto misturados nas bordas.

## 3. Névoa e atmosfera
- [ ] Névoa rasteira se arrastando sobre a grama (faixas, não um véu uniforme).
- [ ] Névoa mais densa nos vales e sobre o rio.
- [ ] Vaga-lumes (poucos) perto dos postes, das flores sombrias e da mata, num único sistema de partículas.
- [ ] Brasas subindo perto de fogueiras e tochas.
- [ ] Neve ou cinza fina caindo (já há partículas de reino: revisar para combinar).

## 4. Céu e luz
- [ ] Nuvens passando na frente da lua.
- [ ] Luz do mapa escurecendo e clareando junto com as nuvens.
- [ ] Relâmpago distante de vez em quando, que clareia o mapa por um instante (com trovão abafado depois).
- [ ] Sombras das nuvens deslizando pelo chão.

## 5. Água
- [ ] Espuma onde o rio bate nas pedras.
- [ ] Espuma nas pilastras das pontes.
- [ ] Reflexo tremido da luz dos postes na água.
- [ ] Reflexo da lua no rio, além do mar.
- [ ] Respingo e ondas em anel quando algo cai ou pula na água (já existe no dragão: reaproveitar).

## 6. Fauna sombria
- [ ] Corvos pousados que levantam voo quando um personagem passa perto. *Feito em parte (2026-11-19): pousados na beira da estrada, olham em volta, bicam, grasnam e saltitam. Para voar falta um modelo de corvo de asas abertas (o atual tem as asas presas ao corpo no esqueleto).*
- [x] Morcegos rondando as montanhas (`island/Fauna.tsx`, asas animadas pelos ossos).
- [ ] Olhos brilhando na mata escura, que somem quando a câmera chega perto.
- [ ] Dragão com coluna procedural (abaixo).

### Dragão com coluna procedural
- [ ] No build, gerar ~12 ossos em fila ao longo do corpo do modelo do Meshy e pintar cada vértice no osso mais próximo (pesos suaves entre dois ossos).
- [ ] No jogo, a cabeça segue a trajetória e cada osso segue o da frente com atraso (o corpo serpenteia).
- [ ] Onda passando pelo corpo enquanto nada; cauda chicoteando no salto.
- [ ] Mergulho de cabeça e saída de cabeça, com respingo nos dois.

## 7. O mapa reage aos personagens
- [ ] **Coveiro da armadilha (próximo, pedido em 2026-11-19):** quem cai na armadilha de espinhos da ilha é levado de volta por um coveiro sombrio com um carrinho de mão (modelos do Meshy: *gravedigger* + *wheelbarrow*). A armadilha (`SpikeTrap.tsx`) já sobe quando alguém pisa.
- [ ] Poeira levantando no passo de quem corre.
- [ ] Grama amassando por onde passam (some aos poucos).
- [ ] Folhas voando quando alguém passa correndo.
- [ ] Postes piscando quando uma habilidade sombria é usada.
- [ ] Pegadas na areia e na neve.
- [ ] Água espirrando ao atravessar as pontes molhadas (chuva, se um dia houver).

## 8. Variedade (contra a repetição)
- [ ] Mais modelos de árvores pequenas, pedras e troncos (Meshy), como o Daniel já pediu.
- [ ] Cada cópia com tamanho, rotação e tom de cor um pouco diferentes (cor por instância).
- [ ] Agrupar em "manchas" naturais (moitas juntas, clareiras vazias) em vez de espalhar por igual.
- [ ] Troncos caídos, cogumelos sombrios e raízes expostas na mata.

## 9. Animação dos personagens (técnicas que comentamos)
- [ ] IK nos pés: o pé encontra o chão nas ladeiras e degraus em vez de atravessar.
- [ ] Física secundária: capa, cabelo, cauda e asas balançando por simulação leve.
- [ ] Mistura de clipes pela velocidade (andar → correr) em vez de troca seca.
- [ ] Reações físicas simples ao levar golpe (inclinar, cambalear) em vez de só tocar um clipe.

## 10. Superfícies e luz (o lado "realista")
- [ ] Materiais com relevo (normal map) nas pedras, na estrada e nas lajes, para a luz desenhar textura.
- [ ] Chão com textura em mais de uma escala (detalhe de perto, manchas de longe).
- [ ] Oclusão de ambiente: escurecer onde as coisas encostam no chão (base das pedras, árvores e postes), pintada no chão para não pesar.
- [ ] Luz rebatida falsa: um leve tom quente no chão perto dos postes e das fogueiras (a poça já existe; revisar).

## Grama menos genérica

Hoje a grama são tufos escuros espetados, todos iguais. A técnica usada em jogos como Ghost of Tsushima, numa versão leve:

1. **Lâminas, não tufos:** cada lâmina é uma tira fina e curva de 3 a 5 vértices. Desenhamos dezenas de milhares numa só chamada (instanciadas).
2. **Tudo no shader:** a curva, o balanço do vento e a cor (raiz escura → ponta clara, variando por região) são calculados na placa de vídeo, sem custo para o JavaScript.
3. **Densidade por mapa:** a mesma função do terreno (`groundAt`) diz quanto de grama vai em cada ponto. Muita no prado, rala na terra batida, nenhuma na estrada.
4. **Perto denso, longe ralo:** o mapa é dividido em blocos. Os perto da câmera têm muitas lâminas, os longe têm poucas, e os fora da tela nem são desenhados. O chão já tem a cor da grama por baixo, então o longe continua parecendo gramado.
5. **Interação:** a posição dos personagens vai para o shader, e as lâminas perto deles se inclinam para fora.
6. **Qualidade:** no "baixo", um quarto das lâminas e sem interação.

Para conferir antes de fazer: medir o custo com ~50 mil lâminas no "alto" (`__battleDiceGl.info`) e garantir que não piora o lag já anotado.
