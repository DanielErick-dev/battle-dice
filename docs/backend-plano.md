# Plano do backend (FastAPI)

Roteiro para estudar e construir o backend. **O Daniel escreve o código**; o Claude explica cada passo e revisa.
Cada marco termina com algo funcionando e testado.

## Como estudar (combinado de 26/10/2026)

O objetivo é **saber fazer na mão**, não só ter o backend pronto. Regras:

1. **O Daniel escreve todo o código do backend.** O Claude não entrega código pronto: explica o conceito, aponta a documentação, dá dicas em níveis (primeiro só a direção, depois mais detalhe se travar) e revisa o que foi escrito.
2. **Primeiro a documentação oficial**, depois a pergunta. O tutorial do FastAPI é muito bom.
3. **Regra dos 20 minutos:** travou, tente sozinho por uns 20 minutos (ler o erro, ler a doc, testar) antes de pedir ajuda. Ao pedir, diga o que já tentou.
4. **Digitar, nunca colar.** Mesmo um exemplo da doc: digitar é o que fixa.
5. **Explicar de volta:** ao terminar um marco, explique com suas palavras o que cada parte faz. Se não conseguir, ainda não entendeu.
6. **Testes provam que funciona**, não "funcionou no /docs".
7. Marcos pequenos: melhor um marco por sessão do que tudo pela metade.

## A stack e o papel de cada peça

| Peça | Para que serve |
|---|---|
| **FastAPI** | As rotas HTTP e o WebSocket. Gera a documentação em `/docs` sozinho. |
| **Pydantic v2** | Valida o que entra e o que sai de cada rota (os "schemas"). |
| **Postgres** | O banco: usuários, coleção de cartas, partidas. Roda em Docker. |
| **SQLAlchemy 2** | A ponte Python ↔ banco: você escreve classes (`User`) e ele faz as tabelas e consultas. |
| **Alembic** | Migrações, o "git do banco". Cada mudança num model vira um arquivo versionado; o banco local e o da AWS ficam iguais sem perder dados. |
| **pwdlib (argon2)** | Guarda a senha como hash, nunca em texto. |
| **PyJWT** | Gera e confere o token de login. |
| **pytest + httpx** | Testes das rotas sem abrir o navegador. |
| **uv** | Cria o projeto, instala dependências e roda os comandos. |

## Arquitetura

### Backend: camadas

A mesma ideia do `game/domain` no frontend: a regra não sabe que existe HTTP.

```
backend/
├── app/
│   ├── main.py              ← cria o app, liga o CORS, inclui os routers
│   ├── core/
│   │   ├── config.py        ← settings lidos do .env (pydantic-settings)
│   │   └── security.py      ← hash de senha e JWT
│   ├── db/
│   │   ├── base.py          ← a Base dos models
│   │   └── session.py       ← conexão com o Postgres (uma sessão por requisição)
│   └── modules/
│       └── auth/
│           ├── router.py    ← só HTTP: recebe, chama o service, responde
│           ├── schemas.py   ← Pydantic: RegisterIn, LoginIn, UserOut, TokenOut
│           ├── service.py   ← a regra: o e-mail já existe? a senha confere?
│           └── models.py    ← a tabela User (SQLAlchemy)
├── alembic/                 ← as migrações
├── tests/
├── docker-compose.yml       ← o Postgres local
└── pyproject.toml
```

Fluxo de uma requisição: `router` → `service` → `models`/banco, e a resposta volta pelo `schema`.
Cada módulo novo (cartas, salas, partidas) ganha a mesma pasta com os mesmos quatro arquivos.

### Frontend: como a tela consome a API

```
frontend/src/
├── lib/api/http.ts          ← uma instância do axios: URL da API e interceptors
└── features/auth/
    ├── api.ts               ← login(), register(), me(): só as chamadas
    ├── hooks.ts             ← useLogin (useMutation), useMe (useQuery) com TanStack Query
    └── ui/LoginForm.tsx
```

- **axios** é o transporte. O interceptor de requisição coloca o token; o de resposta trata o 401 (sessão expirada).
- **TanStack Query** guarda o estado que vem do servidor: carregando, erro, cache, nova tentativa.
- **A partida não passa por aqui.** Ela vai por WebSocket, pelo `WebSocketGameClient` (ver [decisão 002](decisoes/002-gameclient-porta-multiplayer.md)).

## Marcos

### Marco 1: o primeiro FastAPI
- Criar o projeto com `uv` dentro de `backend/`.
- Uma rota `GET /health` devolvendo `{"ok": true}`.
- Abrir `http://localhost:8000/docs` e testar por lá.
- **Aprende:** rotas, o servidor (uvicorn), a documentação automática.

### Marco 2: banco e migrações
- `docker-compose.yml` com o Postgres.
- `core/config.py` lendo a URL do banco do `.env`.
- O model `User` (id, email, nome, hash da senha, criado em).
- Alembic: `init`, gerar a primeira migração, aplicar (`upgrade head`), conferir a tabela no banco.
- **Aprende:** SQLAlchemy, sessões, por que migração existe.

### Marco 3: cadastro e login
- `POST /auth/register`: valida com Pydantic, recusa e-mail repetido, salva com a senha em hash.
- `POST /auth/login`: confere a senha e devolve um JWT de acesso (curto, ~30 min).
- `GET /me`: lê o token (dependência `get_current_user`) e devolve o usuário.
- Testes com pytest para os três, incluindo os casos de erro (senha errada, token inválido).
- **Aprende:** dependências (`Depends`), segurança, tratamento de erro, testes.
- Referência: tutorial oficial do FastAPI, "Security → OAuth2 with Password (and hashing), Bearer with JWT tokens".

### Marco 4: o React consome o login
- CORS no FastAPI liberando o endereço do frontend (porta 3001).
- `lib/api/http.ts`, `features/auth/` e uma tela `/entrar`.
- O token fica guardado; o `useMe` mostra o nome do jogador no menu.
- **Depois (evolução):** trocar para um *refresh token* em cookie httpOnly, mais seguro contra roubo de token.

### Marco 5: salas
- `POST /rooms` (cria), `POST /rooms/{id}/join` (entra), `GET /rooms` (lista as abertas).
- Escolha de personagem dentro da sala.

### Marco 6: a partida online (WebSocket)
- Um WebSocket por sala. O cliente manda um `GameCommand`; todos recebem os `GameEvent` e o estado novo.
- Depende da decisão sobre o engine, na seção abaixo.

## A decisão sobre o engine

### O que é o engine
É o **livro de regras em forma de código**: a pasta `frontend/src/game/domain/` (cerca de 4.500 linhas de regras e 3.000 de testes).
O coração dele é uma função:

```ts
applyCommand(estado, comando) → { estadoNovo, eventos }
```

Ela recebe "o jogo está assim" + "o jogador X rolou o dado" e devolve "o jogo ficou assim" + "o que aconteceu, em ordem" (dado rolou 4, andou até a 12, caiu na armadilha…).
Ela não sabe que existe tela, 3D ou som. Hoje roda **no navegador**, dentro do `LocalGameClient`.

### Por que o servidor precisa dele
No online, quem decide o resultado de cada jogada tem que ser o **servidor**. Se fosse o navegador de cada jogador:
- dava para trapacear (mandar "rolei 6" sempre);
- os segredos vazavam: a mão dos outros e as armadilhas escondidas estariam no navegador de todo mundo.

Então o servidor precisa rodar essas mesmas regras. O problema: elas estão em TypeScript, e o FastAPI é Python.

### As opções

| Opção | Como funciona | A favor | Contra |
|---|---|---|---|
| **A. Portar para Python** | Reescrever as regras em Python dentro do FastAPI. | Um backend só, tudo em Python. | ~7.500 linhas para reescrever, e **toda regra nova teria que ser feita duas vezes** (TS e Python). Com as regras mudando toda semana, as duas versões iam divergir. |
| **B. Serviço de engine em Node** | O FastAPI cuida de contas, salas e do WebSocket. A cada comando, ele repassa para um serviço pequeno em Node que só roda o `applyCommand` (o mesmo código TS) e devolve o resultado. | As regras continuam num lugar só. O FastAPI continua sendo o backend principal (é onde você aprende). | Dois processos para subir (o FastAPI e o Node), e uma chamada a mais por jogada. |
| **C. Servidor de partidas em Node** | O FastAPI cuida só de contas e salas; um servidor Node separado cuida do WebSocket e das partidas. | Simples, regras num lugar só. | A parte mais interessante (tempo real) sai do FastAPI. |
| **D. Navegador do anfitrião decide** | O engine roda no navegador de quem criou a sala; o FastAPI só repassa as mensagens. | O mais rápido de ter funcionando. | Dá para trapacear e os segredos vazam. Serve só como protótipo entre amigos. |

### Recomendação
**B como destino.** As regras ficam num lugar só, e o FastAPI continua sendo o backend principal, onde você aprende.
Se quiser jogar online com amigos antes, **D serve como degrau** e depois troca para B sem mexer na tela, graças ao `GameClient`.

### Como ficam os serviços na opção B

```
 Navegador (React)
   │  HTTP (login, salas)         WebSocket (a partida)
   ▼                                   ▼
 ┌───────────────────── FastAPI ─────────────────────┐
 │ contas, salas, quem está em cada partida,          │
 │ guarda o estado de cada partida, manda os eventos  │
 └───────┬───────────────────────────────┬───────────┘
         │ SQL                           │ HTTP interno: "aplica este comando neste estado"
         ▼                               ▼
     Postgres                     Engine (Node)
  (usuários, cartas,           só o applyCommand, sem banco
   histórico)                  e sem saber de jogadores
```

- **Frontend (Next.js)**: a tela. O jogador só fala com ele e com o FastAPI.
- **FastAPI**: o "juiz da mesa". Conhece os jogadores, guarda a partida, decide quem pode jogar e esconde os segredos de cada um.
- **Engine (Node)**: o "livro de regras". Não guarda nada: recebe estado + comando e devolve estado novo + eventos. Ninguém de fora acessa ele, só o FastAPI.
- **Postgres**: o banco.

Com um `docker-compose.yml`, um comando sobe tudo. Na AWS são containers lado a lado.

Essa decisão só pesa no **Marco 6**. Os marcos 1 a 5 não dependem dela.

## O que o curso de FastAPI já cobre (revisão de 26/10/2026)

Tópicos do curso: Type Hints/Annotations/Pydantic, primeiros passos, URLs e Routers, UV + FastAPI, Schemas, CRUD básico, Models/ORM/Banco, CRUD de usuários, CRUD de marcas e carros, programação assíncrona.

| Marco | Situação |
|---|---|
| 1. Primeiro FastAPI | ✅ coberto |
| 2. Banco e migrações | ✅ quase; falta o **Alembic** |
| 3. Cadastro e login | metade: falta **hash de senha + JWT** e **testes (pytest)** |
| 4–5. React consumindo, salas | CRUD + CORS, pouca coisa nova |
| 6. WebSocket | falta; a **programação assíncrona** do curso é a base. O difícil é organizar o estado das salas, não a sintaxe |

O que vale para o mercado: CRUD com FastAPI/Pydantic/SQLAlchemy é o dia a dia de backend em Python. Com autenticação JWT, Alembic, pytest e Docker, o perfil fica completo para vagas de backend; WebSocket e tempo real são diferencial.

## DevOps e AWS

A matéria de DevOps da faculdade encaixa direto no projeto. Caminho sugerido:

1. **Docker + docker-compose**: FastAPI, Postgres (e o engine depois) sobem com um comando.
2. **CI no GitHub Actions**: os testes rodam a cada push.
3. **AWS, começo simples**: uma **EC2** rodando o docker-compose.
4. **AWS, evolução**: **RDS** (Postgres gerenciado), **ECS/Fargate** (containers gerenciados), domínio e HTTPS.

Cursos:
- **AWS Skill Builder** (oficial, muito conteúdo gratuito). Começar pelo "AWS Cloud Practitioner Essentials".
- **AWS Educate**, voltado para estudantes.
- Trilha de certificação comum: **Cloud Practitioner → Solutions Architect Associate**.

O Battle Dice serve de projeto prático para tudo isso.

## Integração com o Organizador

O **Organizador** já está no ar (`organizador.monarcafinanceiro.com.br`): um gerenciador de tarefas gamificado, com categorias (Corpo, Trabalho, Estudos, Desenvolvimento, Outros), hoje/backlog, **nível e XP** no perfil.

### A ideia (Daniel, 26/10/2026)
- Concluir tarefas no Organizador dá **XP e moedas**.
- O **nível é o mesmo** nos dois, sincronizado, e **só sobe usando o Organizador**. Isso estimula a usar o Organizador, que ajuda na rotina.
- No Organizador entram **metas** a cumprir, para estimular ainda mais.
- As moedas são gastas no Battle Dice (roletas, cartas, carta diária).
- Login: **uma conta só para os dois** (OAuth2), com **login pelo Google** também.

### Proposta de divisão (a decidir)

| Fica com | O quê |
|---|---|
| **Conta** (um lugar só) | Usuário, login por e-mail/senha e pelo Google. Emite o token que os dois aceitam. |
| **Organizador** | Tarefas, categorias, metas. Ao concluir uma tarefa, credita XP e moedas. |
| **Progressão** (compartilhada) | XP, nível e **carteira de moedas**. A carteira guarda cada movimento ("+10 tarefa concluída", "-50 roleta") em vez de só o saldo, para nunca perder ou duplicar moedas. |
| **Battle Dice** | Coleção de cartas, decks, partidas, ranking. Gasta moedas e lê o nível. |

### O Organizador já tem backend (resposta de 26/10/2026)
O Organizador é **FastAPI + React**, com login próprio. Isso muda a recomendação:

- **O backend do Organizador vira o centro de contas e progressão.** Ele já tem os usuários, o login, o XP e o nível. É natural que ele também guarde a carteira de moedas e ganhe o login pelo Google.
- **O backend do Battle Dice cuida só do jogo** (cartas, decks, salas, partidas). Ele **aceita o mesmo token** emitido pelo Organizador (o mesmo segredo JWT, ou melhor, uma chave pública que o Organizador publica) e chama a API do Organizador para ler o nível e gastar moedas.
- Resultado: o jogador entra uma vez só e é a mesma pessoa nos dois.
- Efeito nos marcos: o **Marco 3** (login) passa a ser feito **no Organizador** (login pelo Google e o token compartilhado). O backend do Battle Dice só aprende a conferir esse token.

```
React do Organizador ─┐                    ┌─ React do Battle Dice
                      ▼                    ▼
           FastAPI do Organizador ◄──── FastAPI do Battle Dice
           (contas, Google, tarefas,     (cartas, decks, salas,
            metas, XP, nível, moedas)     partidas; gasta moedas)
                      │                    │
                      ▼                    ▼
                  Postgres             Postgres
```

### Seção do jogo dentro do Organizador (Daniel, 26/10/2026)
- O Organizador ganha uma **seção do Battle Dice no menu lateral**, mostrando coleção de cartas, decks, nível e moedas.
- Os dados **continuam no backend do Battle Dice**: o React do Organizador só os busca pela API do Battle Dice, com o mesmo token. Cada backend é dono do que é seu; a tela pode juntar tudo.

### O ecossistema
- **Organizador**: FastAPI + React (contas, tarefas, metas, XP, nível, moedas).
- **Battle Dice**: FastAPI + Next.js (o jogo).
- **Monarca Financeiro**: Django + React. Pode entrar na mesma conta mais tarde: o Django também confere o mesmo token.
- Tudo em **Python** no backend, de propósito: focar numa linguagem só (Go ficou de fora).
