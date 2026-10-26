# Bullburger — Na Brasa

Site com cardápio digital e pedidos pelo WhatsApp, para a Bullburger — Na Brasa,
em Paty do Alferes/RJ.

O cardápio foi montado a partir do arquivo **CARDÁPIO BULLBURGUER 2026.pdf**
enviado pela casa. Não há produto, preço ou ingrediente inventado: o que não
estava legível no PDF está marcado como pendência em [PENDENCIAS.md](PENDENCIAS.md).

---

## O que o site faz

- Cardápio completo com busca e filtro por categoria.
- Tabela de carnes dos X (Tradicional, Maturata, Picanha 90g/120g, Artesanal
  bovino e frango), com o preço mudando conforme a escolha.
- Personalização por item: quantidade, adicionais, retirada de ingredientes e
  campo de observações, com o preço atualizando na hora.
- Carrinho que sobrevive a atualizar a página, com editar, remover e alterar
  quantidade.
- Finalização que monta a mensagem do pedido e abre o WhatsApp da casa.

## O que o site **não** faz

- Não processa pagamento.
- Não confirma pedido automaticamente nem acompanha o preparo.
- Não calcula taxa de entrega enquanto a tabela de bairros não for cadastrada.

Abrir o WhatsApp **não** significa pedido recebido. O cliente precisa tocar em
enviar no aplicativo e esperar a resposta da equipe. O site diz isso em dois
lugares: na seção "Como pedir" e na tela de revisão, antes do botão de envio.

---

## Identidade visual

Preto e grafite com um laranja de brasa (menos neon que laranja puro), texto em
branco osso e tipografia condensada — **Antonio** nos títulos, próxima do
letreiro do cardápio impresso, e **Archivo** no texto corrido.

As imagens são todas da própria marca:

| Arquivo | O que é |
|---|---|
| `logo-mark.png` | selo circular recortado do emblema original do cardápio |
| `logo.jpg` | logotipo completo (usado na prévia de link em redes sociais) |
| `brasa.jpg` | fundo da abertura, composto a partir das chamas do próprio logotipo: ampliadas, espelhadas, desfocadas e escurecidas até virarem textura |
| `batata-palito`, `batata-canoa`, `anel-cebola`, `nuggets` | fotos reais, extraídas do PDF do cardápio |

**Sobre geração de imagem por IA:** foi testada, mas não entrou no site. Os dois
serviços disponíveis exigem plano pago para gerar, e o único que rodou no plano
gratuito devolve a imagem **com marca d'água da OpenArt** atravessada no meio —
inutilizável num site comercial. Por isso o fundo da abertura foi composto a
partir do material da própria Bullburger: autêntico, sem marca d'água e sem
depender de licença de terceiros. Se quiser imagens geradas depois, é trocar um
arquivo só (`assets/img/brasa.jpg`).

## Arquivos

```
index.html                  página única do site
assets/css/styles.css       estilos
assets/js/dados.js          ← CARDÁPIO E CONFIGURAÇÕES (é aqui que se mexe)
assets/js/app.js            lógica do carrinho e do WhatsApp
assets/img/                 logotipo, fundo e fotos
COMO-ATUALIZAR.md           passo a passo para mudar preços, fotos e itens
PENDENCIAS.md               o que falta confirmar antes de publicar
SEGURANCA.md                revisão de segurança e funcionamento
.claude/launch.json         atalho para rodar o site localmente
```

O site inteiro pesa cerca de **600 KB**, sem framework, sem compilação e sem
nenhuma dependência além das duas fontes do Google Fonts.

## Como rodar no seu computador

O site é HTML, CSS e JavaScript puros — não precisa instalar nada nem compilar.

**Jeito mais simples:** dê dois cliques em `index.html`. Abre no navegador e
funciona.

**Com servidor local** (recomendado, porque é assim que vai ficar publicado):

```bash
python -m http.server 5173
```

Depois abra <http://localhost:5173> no navegador.

## Como publicar

Qualquer hospedagem de site estático serve. Suba a pasta inteira (com
`index.html` na raiz) em um destes:

| Onde | Como |
|---|---|
| **Netlify** | netlify.com → "Add new site" → "Deploy manually" → arraste a pasta |
| **Vercel** | vercel.com → "New Project" → arraste a pasta |
| **GitHub Pages** | suba a pasta num repositório → Settings → Pages → branch `main` |
| **Hospedagem comum (cPanel, Hostinger…)** | envie os arquivos para `public_html` |

Depois é só apontar o domínio da casa (ou usar o endereço gratuito que a
hospedagem dá) e colocar o link na bio do Instagram.

---

## Pensado para o celular

A maior parte dos pedidos vem do telefone, então o site é construído em cima
disso:

- **Rolagem de fundo travada de verdade.** `overflow: hidden` no body não
  segura o Safari do iPhone. O site usa `position: fixed`, guarda a posição e
  devolve exatamente onde estava ao fechar a janela.
- **O Voltar do aparelho fecha a janela**, em vez de tirar o cliente do site.
- **O pedido e os dados sobrevivem a recarregar a página.** Nome, endereço e
  referência ficam salvos junto com o carrinho — voltar do WhatsApp não apaga
  nada, e nada é limpo só porque o aplicativo abriu.
- **Botão de enviar é um link de verdade**, não `window.open`: bloqueador de
  pop-up não tem como barrar.
- **Toque duplo não duplica item.** O botão trava por meio segundo; a
  quantidade continua livre no seletor + / −.
- **"Remover" fica longe do "+"** da quantidade, para não ser tocado por engano.
- **Alvos de toque de 44 px** em botões, categorias e links de ação.
- **Teclado virtual:** campos com 16 px (o iPhone não dá zoom), rótulos
  visíveis, teclado certo por campo, preenchimento automático de nome e
  endereço, e o campo focado rola sozinho para continuar à vista.
- **Foto que não carrega** vira o espaço preparado, não ícone quebrado.
- **A régua de categorias esmaece na borda** quando há mais para o lado.

## O que foi testado

Tudo abaixo foi **executado em emulação de viewport no Chromium**, com o site
rodando. **Nada foi testado em aparelho real** — ver as limitações no fim.

### Fluxo completo (390 px)

Buscar "bull" → 20 resultados · abrir X Bacon, trocar para Maturata 180g, somar
ovo, marcar "sem bacon" → **R$ 25,90** · somar um BP4 → 2 itens · editar o
X Bacon pelo carrinho → **reabriu com carne, adicional e retirada preservados** e
o botão dizendo "Salvar alterações" · aumentar quantidade do BP4 → total
**R$ 91,70** · escolher retirada → endereço some · revisar → mensagem gerada.

Nome digitado como `"  Maria  "` saiu `Maria` na mensagem. Acentos e quebras de
linha conferidos no texto final.

### Comportamentos verificados um a um

| O quê | Resultado |
|---|---|
| Rolagem de fundo com janela aberta | body vira `fixed`, fundo não rola |
| Posição ao fechar | voltou exatamente a 1500 px |
| Três toques rápidos em "Adicionar" | **1 item** no carrinho |
| Voltar do aparelho com a janela aberta | fechou a janela, seguiu no site |
| Recarregar a página | nome, endereço, referência, modalidade e 3 itens restaurados |
| Botão de enviar | `<a href="https://wa.me/5524981142237?text=…" target="_blank">` |
| Foco ao mudar quantidade | permaneceu no mesmo botão nos 3 toques |
| Distância entre "+" e "Remover" | 108 px |
| Altura dos links de ação | 44 px |
| Categorias com mais itens ao lado | classe de esmaecido aplicada |
| Imagem que falha | virou o espaço preparado, com rótulo correto |
| Carrinho vazio | mensagem + botão para voltar ao cardápio |

### Pagamento e troco

As quatro formas informadas pela casa estão cadastradas: **Pix, dinheiro,
cartão de débito e cartão de crédito**.

Verificado: as quatro aparecem na ordem certa; o campo de troco fica escondido
e só abre no dinheiro (não abre no Pix nem no crédito); **R$ 20 para um pedido
de R$ 35,90 foi barrado** com "O troco precisa cobrir pelo menos R$ 35,90";
`"nao sei"` foi barrado com "Escreva só o valor, por exemplo 100."; R$ 50
passou e a mensagem saiu com `Forma de pagamento: Dinheiro` e
`Troco para: R$ 50`.

Na entrega, com a taxa ainda não cadastrada, a mensagem de erro acrescenta
"fora a taxa de entrega" — porque o valor final ainda vai subir.

### Larguras

320, 360, 390, 430, 768, 1024, 1280 e 1440 px — **nenhuma com rolagem
horizontal** (medido e varrendo todos os elementos em busca de transbordamento).
Colunas do cardápio: 1 em linha até 619 px, 2 em 768, 3 em 1024, 4 em 1440.

**Paisagem 844 × 390:** a gaveta cabe inteira, o rodapé fica visível e os dois
botões são alcançáveis. Na janela de produto a foto some para liberar altura.

### Seis defeitos encontrados e corrigidos

1. **Rolagem de fundo** só usava `overflow: hidden` — não seguraria no iPhone, e
   a posição se perdia.
2. **Dados do formulário se perdiam** ao recarregar depois de abrir o WhatsApp.
3. **Toque duplo em "Adicionar"** podia lançar o item duas vezes.
4. **`window.open`** podia ser barrado por bloqueador de pop-up, e mesmo assim o
   site dizia que o WhatsApp tinha aberto.
5. **O foco se perdia** a cada toque em + / − no carrinho.
6. **Em paisagem o rodapé da gaveta transbordava** e o botão "Finalizar o
   pedido" ficava fora da tela — o aviso longo da taxa saiu do rodapé e foi para
   o corpo.

Além disso: o aviso flutuante cobria o botão principal com a gaveta aberta
(agora sobe para o topo), e o ícone do WhatsApp estourava o botão de enviar.

## O que não foi testado

- **Aparelho real.** Nenhum teste rodou em iPhone ou Android de verdade. O
  comportamento do teclado virtual, o Voltar do sistema, a barra de endereço
  que some ao rolar e o Safari do iOS só se confirmam no aparelho. **É o teste
  que mais vale fazer antes de divulgar.**
- **Envio real pelo WhatsApp.** O link e o texto foram conferidos; nenhuma
  mensagem foi enviada para a casa.
- **Conexão lenta e falha de rede real.** A falha de imagem foi simulada no
  navegador; não houve teste com 3G lento ou rede caindo.
- **Leitor de tela.** Há rótulos, foco visível, nomes acessíveis e navegação por
  teclado (testada), mas não passou por VoiceOver ou TalkBack.
- **Aumento de texto do sistema.** O site usa `rem` e permite zoom, mas não foi
  verificado com a fonte do sistema aumentada.
- **Taxa de entrega por bairro.** O caminho existe no código e está desligado
  por falta de dados; só o caminho "a confirmar" rodou de verdade. O endereço
  fora da área atendida **não existe como regra** — não há área cadastrada.
  É a última pendência que bloqueia a publicação (ver PENDENCIAS.md).

---

## Abertura (última alteração)

A seção principal foi refeita com a foto real de um lanche da casa, recortada
do fundo, e com mais presença visual:

- **Faixa de aviso no topo**, com o horário vindo de `dados.js`.
- **Título maior**, com a última palavra em laranja e um risco desenhado
  embaixo.
- **Foto do lanche** ocupando mais espaço que o texto (proporção 1.05 contra
  0.95), com o brilho de brasa por trás.
- **Selo circular** girando devagar com o slogan real da casa: "Blends · Fogo ·
  Atitude · Na brasa".
- **Recado escrito à mão** com seta apontando para o lanche, no vazio acima
  dele — nunca por cima do pão.
- **Ação secundária virou link de texto** com seta, em vez de um segundo botão,
  para o "Ver cardápio" ficar sozinho como ação principal.

A identidade continua preta e laranja: a referência enviada tinha fundo claro,
mas o preto com fogo é o que a marca já usa no cardápio impresso e no logotipo.

### A foto

Veio da casa, com o logotipo da Bullburger ao fundo. O tratamento foi:

1. recorte do fundo (parede verde e tábua de madeira);
2. correção do resíduo verde nas bordas — 207.241 pixels ajustados;
3. corte no conteúdo e redimensionamento para 1040 × 939;
4. exportação em **WebP com transparência: 173 KB**.

O mesmo arquivo em PNG daria 1.317 KB — mais que o dobro do site inteiro. Por
isso WebP, que todo navegador atual lê. Se por algum motivo não carregar, o
site mostra o espaço preparado em vez de ícone quebrado.

### Testado nesta alteração

| Largura | Resultado |
|---|---|
| 320 px | sem rolagem horizontal; recado cabe (15 → 185 px) |
| 390 px | ordem título → descrição → botões → foto → informações |
| 1024 px | duas colunas, sem sobreposição |
| 1280 px | foto 570 × 514 px, **não cortada**; recado acima do pão |

Também verificado: a fonte Caveat (recado à mão) carrega; o selo circular
renderiza; a faixa do topo mostra o horário vindo de `dados.js`; o fluxo do
pedido continua terminando em `wa.me/5524981142237`; a imagem entra sem
carregamento tardio, com `fetchpriority="high"` e medidas declaradas
(1040 × 939) para não dar salto no layout.

**Não testado:** aparelho real. O selo gira com `animation`, respeitando
`prefers-reduced-motion`, mas não foi visto num celular de verdade.

## Marca em letreiro (última alteração)

O cabeçalho deixou de usar o emblema do cão e passou a ser **só o nome**, numa
fonte script (**Lobster**), seguindo a referência enviada.

- **Cabeçalho:** "Bullburger" em script, com "Na Brasa" em caixa-alta pequena
  abaixo. Sem emblema.
- **Rodapé:** mesmo letreiro, mas **com** o emblema ao lado — é onde a marca
  original da casa continua presente na página.
- **Ícone da aba e prévia de link:** continuam com o emblema. Um letreiro
  escrito não se lê a 32 px; o cão, sim.

A fonte fica numa variável só (`--letreiro`), para trocar sem caçar no CSS.
COMO-ATUALIZAR.md lista quatro alternativas gratuitas no mesmo espírito.

### Testado

| Largura | Letreiro | Colisão com os botões |
|---|---|---|
| 320 px | 16 → 116 px | não (botões começam em 124) |
| 390 px | — | não |
| 768 px | — | não |
| 1440 px | 134 px | não, com a navegação |

Nenhuma largura com rolagem horizontal. Cabeçalho ficou em 58 px no celular e
70 px no desktop — a mesma altura de antes, porque o letreiro ocupa menos
espaço que o emblema mais o texto condensado.

Como o emblema saiu do cabeçalho, o "Na Brasa" voltou a aparecer em 320 px:
antes estava escondido para o emblema caber.

## Vitrine do cardápio (última alteração)

Inspirada no cardápio do site da Hamburgueria Tradi, que o cliente mandou como
referência: foto grande no topo, miniaturas para navegar, categorias abaixo.

O que foi adaptado:

- **Slide grande** com foto, categoria, nome, descrição, preço e "Adicionar".
- **Miniaturas** embaixo, a ativa marcada em laranja.
- **Setas** no desktop; no celular arrasta com o dedo (`scroll-snap`, sem JS de
  arrasto). Setas do teclado também funcionam.
- **Contador** `01 / 04`, com o número atual em laranja.

Uma diferença proposital: no site de referência a vitrine só mostra — eles nem
publicam preço, mandam consultar a unidade. Aqui **tocar no slide abre o
produto e leva ao carrinho**, porque o nosso cardápio vende.

### Por que o fundo do slide é desfocado

As fotos que temos vêm em formatos diferentes — as batatas são verticais, as
porções quase quadradas. Num slide largo, o corte simples mostrava só o meio da
batata. A solução foi **a própria foto ampliada e desfocada ao fundo, com a
imagem inteira por cima** (`object-fit: contain`). Funciona com qualquer
proporção e nenhuma foto precisa ser cortada.

### O que entra na vitrine

Produtos com `destaque: true` **e** foto cadastrada. Hoje são quatro: BP1, BC1,
Anel de Cebola e Nuggets — os únicos com foto real.

> A vitrine está mostrando acompanhamentos, não lanches. É o que temos de foto.
> Quando as fotos dos Bull chegarem, marque os mais vendidos e tire as batatas.

**Com menos de dois itens a seção some inteira** — testado: deixei um só
destaque e a vitrine desapareceu, com o cardápio seguindo normal e sem erro.

### Testado

| Largura | Resultado |
|---|---|
| 320 px | sem rolagem horizontal |
| 390 px | slide 356 × 267, setas escondidas, arrasto funcionando |
| 1280 px | slide completo, setas, sem rolagem horizontal |

Navegação conferida: seta avança para `02 / 04`; miniatura 4 leva a `04 / 04` e
desabilita a seta de avançar; seta do teclado volta para `03 / 04`; arrastar o
trilho até o terceiro slide atualiza contador e miniatura. Tocar no segundo
slide abriu "BC1 — Batata Canoa" a R$ 32,00.

O fluxo do pedido segue intacto, terminando em `wa.me/5524981142237`.
