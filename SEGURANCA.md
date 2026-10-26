# Revisão de segurança e funcionamento

Revisão feita sobre o projeto inteiro, com foco no fluxo de pedido.
Tudo verificado com o site rodando; o que foi só lido no código está marcado
como tal.

---

## 1. A arquitetura real (e o que não se aplica)

O projeto tem **14 arquivos**: um HTML, um CSS, dois JS e sete imagens.

- **Sem servidor.** Não há backend, API, banco de dados nem área administrativa.
- **Sem dependências.** Nenhum `package.json`, nenhum `node_modules`, nenhuma
  biblioteca de terceiros. Zero pacotes para ter vulnerabilidade conhecida.
- **Sem requisições.** O código não faz `fetch`, `XMLHttpRequest` nem nada
  parecido — conferido por varredura no código-fonte.
- **Sem processamento de pagamento.** Não existe provedor, gateway, cartão,
  webhook ou cobrança. O pedido vira uma mensagem de texto que o cliente envia
  pelo WhatsApp dele.

### Itens do checklist que não existem neste projeto

Não foram "aprovados": **não existem**, e inventar integração para testá-las
seria pior do que não ter.

| Item pedido | Situação |
|---|---|
| Autenticação, sessões, recuperação de senha, permissões | Não existem. Ninguém faz login. |
| Acesso a pedidos de outras pessoas | Não existe. Nenhum pedido é armazenado fora do aparelho de quem pediu. |
| Validação no servidor, SQL injection | Não existe servidor nem banco. |
| CSRF | Não existe formulário que envie para servidor. A política bloqueia envio (`form-action 'none'`). |
| Dependências vulneráveis | Zero dependências. |
| Pagamento aprovado/recusado/pendente/cancelado/expirado | Não existe pagamento no site. |
| Webhooks, assinatura, eventos repetidos ou fora de ordem | Não existem. |
| Idempotência de cobrança | Não há cobrança. Há proteção contra **item** duplicado — ver item 3.1. |
| Dados de cartão | Nunca pedidos, nunca gravados, nunca registrados. |

### A limitação que importa, e que não dá para corrigir no navegador

**Nenhum valor pode ser validado fora do navegador, porque não há "fora do
navegador".** Qualquer pessoa com um pouco de conhecimento consegue editar os
preços na própria máquina e gerar uma mensagem com valores errados.

Isso não é um defeito do código: é a natureza de um cardápio estático que
encaminha pedido por WhatsApp. O controle que existe é operacional e já é o que
a casa faz hoje ao atender por telefone:

> **A equipe confere o total antes de preparar.** A mensagem é um *pedido*, não
> uma cobrança nem uma confirmação de preço.

Se um dia for preciso que o valor seja confiável no momento do envio, aí sim
entra backend — e passa a valer todo o checklist da seção 2 do briefing.

---

## 2. Problemas encontrados e corrigidos

### 2.1 ALTA — Pedido grande chegava truncado, sem ninguém perceber

Um pedido de 45 itens gerava uma URL de **12.274 caracteres**. Vários
aplicativos cortam mensagens longas abertas por link `wa.me`. O cliente
enviaria, a casa receberia um pedido **incompleto**, e os dois achariam que
estava tudo certo.

**Corrigido:** acima de 1.200 caracteres de texto o site mostra um aviso na tela
de revisão pedindo para conferir se chegou inteiro, e oferece **"Copiar o
pedido"** para colar o texto completo na conversa. Abaixo disso nada muda — um
pedido comum tem ~450 caracteres.

→ `assets/js/app.js`, `assets/css/styles.css`

### 2.2 ALTA — Preço antigo continuaria aparecendo depois de uma atualização

`styles.css`, `dados.js` e `app.js` eram servidos sem versão. Depois de mudar um
preço e subir o arquivo, o celular do cliente continuaria usando a cópia
guardada — podendo mostrar e enviar **preço desatualizado**.

Este foi encontrado durante a própria revisão: as correções não apareciam no
navegador porque ele servia a versão em cache.

**Corrigido:** os três arquivos passam a ser carregados com `?v=3`, e o
`index.html` explica, no lugar onde se mexe, que esse número precisa subir a
cada atualização. O procedimento está em COMO-ATUALIZAR.md.

→ `index.html`

### 2.3 MÉDIA — Dados pessoais guardados sem prazo e sem como apagar

Nome, endereço e ponto de referência ficavam no aparelho **para sempre**, sem
aviso e sem forma de remover. Em celular compartilhado, o próximo a abrir o site
encontrava o endereço de quem pediu antes.

**Corrigido:**
- os dados expiram em **7 dias** e são descartados sozinhos;
- registros no formato antigo, sem carimbo de tempo, são descartados na carga;
- o formulário traz **"Apagar meus dados deste aparelho"**, que limpa na hora;
- junto do botão, um aviso dizendo o que é guardado, por quanto tempo e que
  nada sai do aparelho além da própria mensagem do cliente.

O carrinho continua salvo normalmente — não contém dado pessoal.

→ `assets/js/app.js`, `assets/css/styles.css`

### 2.4 MÉDIA — Nenhuma política de conteúdo

O site não restringia de onde podiam vir scripts, estilos ou imagens.

**Corrigido:** `Content-Security-Policy` estrita no `index.html`, possível porque
o projeto não tem script embutido, nem atributo `style`, nem `url()` no CSS —
todos conferidos por varredura.

```
default-src 'self'; script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self';
connect-src 'none'; object-src 'none';
base-uri 'none'; form-action 'none'; upgrade-insecure-requests
```

Mais `referrer` em `strict-origin-when-cross-origin`.

→ `index.html`

### 2.5 BAIXA — Valores acima de mil ficavam ilegíveis

`R$ 3784,50` em vez de `R$ 3.784,50`. Atrapalha a conferência justamente nos
pedidos grandes, onde errar custa mais.

**Corrigido:** separador de milhar na formatação de moeda.

→ `assets/js/app.js`

### 2.6 BAIXA — Número do WhatsApp entrava nos links sem limpeza

Um espaço, parêntese ou hífen digitado por engano em `dados.js` geraria links
quebrados em todo o site.

**Corrigido:** o número passa por um filtro que mantém só dígitos antes de
compor qualquer link.

→ `assets/js/app.js`

### 2.7 BAIXA — "Copiar o pedido" desistia cedo demais

Quando a API moderna de área de transferência recusava, o site já desistia em
vez de tentar o método antigo.

**Corrigido:** tenta a API moderna, cai no método antigo e só então avisa — e o
aviso aponta o caminho alternativo, sem travar o botão.

→ `assets/js/app.js`

---

## 3. O que já estava correto (verificado, não suposto)

### 3.1 Sem pedido duplicado

Três toques rápidos em "Adicionar" resultaram em **1 item**. O botão trava por
meio segundo; a quantidade intencional continua livre no seletor + / −.
Atualizar a página não relança nada, porque não há envio: o carrinho é só
estado local.

### 3.2 Sem injeção de HTML

Varredura em todos os pontos que escrevem HTML (13 locais). **Todo** dado vindo
do cliente — nome, endereço, referência, troco, observações, itens do carrinho —
passa por `escapar()`, que converte `& < > " '`. O termo de busca nunca é
escrito no HTML, só comparado.

O link do WhatsApp é montado com prefixo fixo e `encodeURIComponent`, sem como
virar `javascript:`.

### 3.3 Nada sensível exposto

Sem senhas, tokens, chaves ou credenciais no código — não há a quem se
autenticar. Nenhum `console.log` em produção. Nenhuma mensagem de erro revela
caminho de arquivo ou estrutura interna.

### 3.4 Dados do navegador tratados como não confiáveis

O que vem do `localStorage` é reconstruído contra o cardápio atual antes de
valer: produto que não existe mais sai, item indisponível sai, adicional
inválido sai, quantidade é limitada entre 1 e 99 e a observação é cortada em
300 caracteres. Preço salvo **nunca** é usado — é sempre recalculado.

### 3.5 Links externos protegidos

Os 8 links com `target="_blank"` têm `rel="noopener"` — conferido por varredura.

---

## 4. Testes executados

Todos em **emulação de viewport no Chromium**, com o site rodando em servidor
local. Nenhum em aparelho real.

### Política de conteúdo — teste de bloqueio

| Tentativa | Resultado |
|---|---|
| Injetar `<script>` embutido | **Bloqueado** |
| Carregar script de `cdn.jsdelivr.net` | **Bloqueado** |
| Carregar imagem de `placehold.co` | **Bloqueado** |
| Fontes do Google (permitidas) | Carregaram; `document.fonts.check` confirmou Antonio e Archivo |

### Fluxo completo (390 px)

Buscar "tudo" → 7 resultados · X Tudo com Picanha 120g + bacon, quantidade 2 →
**R$ 59,80** · BC5 Batata Canoa → 3 itens · subtotal **R$ 99,70** · entrega com
endereço e referência · dinheiro com troco de R$ 150 · revisão · mensagem gerada
com 447 caracteres, acentos e quebras de linha corretos, incluindo
`Forma de pagamento: Dinheiro` e `Troco para: R$ 150`. Sem rolagem horizontal.

### Dados pessoais

| Cenário | Resultado |
|---|---|
| Gravação | Salvo com carimbo de tempo |
| Carimbo de 8 dias atrás | **Descartado** na carga; formulário vazio |
| Formato antigo, sem carimbo | **Descartado** na carga |
| "Apagar meus dados" | Removeu do armazenamento, limpou o formulário, **manteve o carrinho** |

### Carrinho

3 itens semeados sobreviveram a recarga e à revalidação da revisão, com total
**R$ 133,70** correto. Nenhum item perdido, nenhum valor alterado.

### Mensagem longa

| Pedido | Texto | Aviso |
|---|---|---|
| 3 itens | 447 caracteres | não aparece |
| 24 itens | 2.256 caracteres | **aparece**, com botão copiar |

"Copiar o pedido" com toque real: **copiou** e confirmou na tela. Disparado por
script, sem gesto do usuário: caiu no aviso de falha, sem travar nada.

### Acessibilidade e integridade da página

| Verificação | Resultado |
|---|---|
| Âncoras internas quebradas | nenhuma |
| `target="_blank"` sem `noopener` | nenhum |
| Botões sem nome acessível | nenhum |
| Campos sem rótulo | nenhum |
| Imagens sem `alt` | nenhuma |
| Idioma do documento | `pt-BR` |
| Erros de console numa carga limpa | nenhum |
| Imagens com falha de carregamento | nenhuma |

Teclado (verificado em rodada anterior e mantido): Enter abre o produto, o foco
fica preso dentro da janela, Escape fecha e devolve o foco ao cartão de origem.

---

## 5. O que não pôde ser verificado

- **Aparelho real.** Nada foi aberto em iPhone ou Android. Teclado virtual,
  botão Voltar do sistema e o Safari do iOS só se confirmam no aparelho.
- **"Copiar o pedido" em celular.** Funcionou com toque real no navegador do
  computador. Em iOS e Android a API exige contexto seguro (https) e gesto do
  usuário — ambos presentes em produção, mas **não testados lá**.
- **Truncamento real do WhatsApp.** O limite de 1.200 caracteres é conservador,
  escolhido com margem. **Não foi medido** em qual tamanho cada versão do
  WhatsApp corta, porque isso exigiria enviar mensagens reais para a casa.
- **Envio real.** Nenhuma mensagem foi enviada. Conferi o link e o texto.
- **Cabeçalhos HTTP de produção.** `frame-ancestors` (anti-enquadramento),
  `Strict-Transport-Security` e `X-Content-Type-Options` **não podem** vir em
  `<meta>`: dependem da hospedagem. Ver seção 6.
- **Conexão lenta e falha de rede.** A falha de imagem foi simulada no
  navegador; não houve teste com rede degradada de verdade.
- **Leitor de tela.** Não passou por VoiceOver nem TalkBack.

---

## 6. Para completar na hospedagem

A CSP em `<meta>` cobre quase tudo, mas três proteções só existem como cabeçalho
HTTP. Em Netlify ou Vercel, criar um arquivo `_headers` na raiz:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: frame-ancestors 'none'
```

E **publicar em HTTPS** — obrigatório para a área de transferência funcionar e
para o `upgrade-insecure-requests` ter efeito. Netlify, Vercel e GitHub Pages
dão HTTPS sem custo.

---

## 7. Avaliação de prontidão

**Do ponto de vista técnico, o site está pronto para publicar.** Não encontrei
nada que impeça um pedido, perca dados ou mostre valor errado — os sete
problemas achados foram corrigidos e revalidados.

Não prometo segurança absoluta, e a superfície aqui é pequena por construção:
sem servidor, sem login, sem pagamento e sem dependências, não há o que invadir
nem conta para roubar. O risco real do projeto não é técnico: é **informação de
cardápio errada**, e é por isso que o versionamento do item 2.2 importa.

Continuam valendo, e são de conteúdo, não de segurança:

1. **8 preços de adicionais** ilegíveis no PDF — hoje bloqueados no site, o
   cliente não consegue pedir esses itens;
2. **taxa de entrega** por bairro não cadastrada;
3. **abrir uma vez num celular de verdade** antes de divulgar o link.

Os três estão detalhados em [PENDENCIAS.md](PENDENCIAS.md).
