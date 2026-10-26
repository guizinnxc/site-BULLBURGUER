# Como atualizar o site

Tudo que aparece no site sai de **um arquivo só**: `assets/js/dados.js`.
Abra com o Bloco de Notas, o VS Code ou qualquer editor de texto.

Depois de salvar, atualize a página no navegador (F5) para ver a mudança.
Se o site já estiver publicado, envie o arquivo alterado para a hospedagem.

> **Três regras que evitam 90% dos problemas**
> 1. Preço é número com **ponto**, não vírgula: `42.90` ✅ — `42,90` ❌
> 2. Cada linha de produto termina com **vírgula**, menos a última da lista.
> 3. Depois de subir o arquivo, **suba o número da versão** — passo abaixo.

## Depois de qualquer alteração: suba a versão

Sem isso, quem já visitou o site continua vendo o cardápio antigo guardado no
celular — inclusive **preços desatualizados**.

Abra o `index.html` e troque os três `?v=` para o número seguinte:

```html
<link rel="stylesheet" href="assets/css/styles.css?v=3">
<script src="assets/js/dados.js?v=3"></script>
<script src="assets/js/app.js?v=3"></script>
```

Mudou para `?v=4` nos três, salvou e subiu: todo mundo recebe a versão nova na
próxima visita. O número não significa nada além de "mudou" — pode ser 4, 5, 6.

---

## Mudar um preço

Procure o produto pelo nome e troque o número depois de `preco:`.

```js
{ id: 'bull-5', categoria: 'artesanais', nome: 'Bull 5', preco: 35.90, ...
                                                          ↑ troque aqui
```

**Nos X (hambúrgueres)** o preço fica na linha `variacoes: carnes(...)`. São seis
números, sempre nesta ordem:

```js
variacoes: carnes(19.90, 27.90, 23.90, 27.90, 24.90, 24.90),
//              Tradic. Maturata Pic.90 Pic.120 Art.Boi Art.Frango
```

## Marcar um item como esgotado

Troque `disponivel: true` por `disponivel: false`. O item continua no cardápio,
mas aparece escurecido, com a tarja **Indisponível**, e não pode ser adicionado.
Quando voltar, é só trocar de volta para `true`.

## Mudar o nome, a descrição ou os ingredientes

Edite o texto entre aspas em `nome:` e `descricao:`.
Se mudar os ingredientes, ajuste também a lista `retirar:` — é o que o cliente
pode pedir para tirar do lanche.

## Colocar a foto de um produto

1. Salve a foto em `assets/img/` com um nome simples e sem acento, por exemplo
   `bull-5.jpg`.
2. No produto, troque `imagem: null` pelo caminho do arquivo:

```js
imagem: 'assets/img/bull-5.jpg',
```

**Dica de foto:** deitada (paisagem), com a comida bem no centro, pelo menos
1000 px de largura. Antes de subir, reduza para no máximo ~1200 px de largura e
salve como `.jpg` — foto de celular sem redimensionar tem 5 MB e deixa o site
lento no 4G.

Enquanto `imagem` for `null`, o site desenha um espaço preparado com uma chama e
o texto "foto em breve". Não fica buraco nem imagem quebrada.

## Trocar a fonte do letreiro da marca

O nome "Bullburger" no cabeçalho e no rodapé usa uma fonte script
(**Lobster**). Para experimentar outra, são dois lugares:

**1.** No `index.html`, no endereço do Google Fonts, troque `family=Lobster`
pelo nome da nova. **2.** No `assets/css/styles.css`, no topo, troque a linha:

```css
--letreiro: 'Lobster', 'Brush Script MT', cursive;
```

Outras scripts gratuitas do Google Fonts no mesmo espírito:

| Fonte | Como é |
|---|---|
| **Lobster** (atual) | pesada, retrô, traço grosso |
| **Pacifico** | mais redonda e solta |
| **Yellowtail** | pincelada, traço mais fino |
| **Grand Hotel** | mais fina e elegante |
| **Kaushan Script** | pincel seco, mais informal |

Se o nome ficar largo demais no celular, ajuste o tamanho em
`.marca-texto .letreiro`, no CSS.

## Textos da abertura

Estes três ficam no `index.html`, não no `dados.js`, porque são texto fixo da
página. Procure pelo trecho e troque o que está entre as tags:

| O quê | Onde procurar | Está escrito |
|---|---|---|
| Faixa do topo | `class="faixa-topo"` | "Fome de coisa boa?" |
| Título | `class="abertura-titulo"` | "Fogo na brasa. / Atitude em cada mordida." |
| Recado à mão | `class="recado"` | "Pode chegar com fome." |
| Selo redondo | `class="selo-redondo"` | "BLENDS · FOGO · ATITUDE · NA BRASA ·" |

O horário dentro da faixa do topo **não** se mexe aqui: ele vem de
`config.funcionamento.texto` no `dados.js`, para não ficar escrito em dois
lugares diferentes.

No título, a palavra em laranja com o risco embaixo é a que está dentro de
`<span class="palavra-fogo">`. Para marcar outra palavra, é só mover o span.

No selo, o texto gira em volta do círculo: mantenha curto e **termine sempre
com ` · `**, senão a volta não fecha direito.

## Colocar a foto do lanche na abertura

Salve o arquivo em `assets/img/` e, em `config.marca` (no começo do
`dados.js`), escreva o caminho:

```js
fotoDestaque: 'assets/img/hero-lanche.png',
```

Os três valores possíveis:

| Valor | O que acontece |
|---|---|
| `'assets/img/hero-lanche.png'` | mostra a foto ao lado do título |
| `null` | mostra o espaço preparado, com "foto em breve" |
| `false` | abertura em uma coluna só, sem espaço vazio |

O ideal é **PNG com fundo transparente** — assim o lanche se integra ao fundo
preto, sem moldura. Detalhes de tamanho e enquadramento em PENDENCIAS.md.

Para trocar o texto alternativo da imagem (o que o leitor de tela anuncia),
edite `fotoDestaqueAlt` logo abaixo.

## Escolher o que aparece na vitrine

No topo do cardápio há uma **vitrine**: foto grande, nome, preço e botão de
adicionar, com miniaturas embaixo para trocar de item.

Para um produto entrar na vitrine, ele precisa de **duas coisas**:

1. `destaque: true` na linha dele;
2. uma **foto cadastrada** em `imagem:`.

```js
{ id: 'bull-5', ..., imagem: 'assets/img/bull-5.jpg', disponivel: true, destaque: true },
```

Para tirar da vitrine, apague o `destaque: true` — o produto continua no
cardápio normalmente.

> **A vitrine só aparece com dois ou mais itens.** Com menos que isso ela some
> sozinha, junto com as miniaturas. Vitrine com um item só fica pior do que
> vitrine nenhuma.

Hoje estão na vitrine os quatro itens que já têm foto: BP1, BC1, Anel de Cebola
e Nuggets. **Quando as fotos dos lanches chegarem**, marque os Bull mais
vendidos e tire as batatas — é só mover o `destaque: true` de linha.

Não há limite de quantos podem entrar, mas acima de uns seis a vitrine fica
cansativa de percorrer.

## Acrescentar um produto novo

Copie uma linha inteira de um produto parecido, cole logo abaixo e mude
`id`, `nome`, `descricao` e `preco`. O `id` precisa ser único e sem espaço nem
acento (`bull-13`, `milkshake-morango`).

```js
{ id: 'bull-13', categoria: 'artesanais', nome: 'Bull 13', preco: 44.90,
  descricao: 'Pão de brioche, ...',
  imagem: null, disponivel: true, adicionais: 'lanche',
  retirar: ['Bacon', 'Queijo'] },
```

O campo `categoria` precisa bater com um dos ids da lista `categorias`:
`hamburgueres`, `artesanais`, `combos`, `hotdogs`, `batatas`, `porcoes`,
`bebidas`.

## Remover um produto

Apague a linha inteira dele, da `{` até a `},`.

## Mexer nos adicionais

Ficam no bloco `adicionais`, divididos em três grupos: `lanche`, `batata` e
`hotdog`. Cada produto escolhe o grupo na linha `adicionais: 'lanche'`.

Adicional com `preco: null` aparece no site como **"preço a confirmar"** e fica
desativado — é assim que estão os adicionais cujo preço não deu para ler no PDF
(veja `PENDENCIAS.md`). Para liberar, troque `null` pelo valor:

```js
{ id: 'ad-gouda', nome: 'Gouda Cremoso', preco: null },   // antes
{ id: 'ad-gouda', nome: 'Gouda Cremoso', preco: 6.00 },   // depois
```

---

## Mudar as formas de pagamento

Já estão cadastradas em `config.pedido.pagamentos`:

```js
pagamentos: [
  { id: 'pix',      nome: 'Pix' },
  { id: 'dinheiro', nome: 'Dinheiro', troco: true },
  { id: 'debito',   nome: 'Cartão de débito' },
  { id: 'credito',  nome: 'Cartão de crédito' }
]
```

- **Tirar uma opção:** apague a linha inteira dela.
- **Acrescentar:** copie uma linha e mude `id` e `nome`. O `id` tem que ser
  único e sem espaço nem acento (`vale`, `ticket`).
- **`troco: true`** faz aparecer sozinho o campo "Precisa de troco? Para
  quanto?" quando o cliente escolhe essa forma. O site recusa um troco menor
  que o valor do pedido, então não ponha isso em cartão nem em Pix.

Se a lista ficar vazia, o site volta a dizer que o pagamento é combinado no
WhatsApp — não quebra.

## Ligar a taxa de entrega por bairro

Hoje o site mostra **"Taxa de entrega a confirmar"** e chama o valor do pedido de
subtotal. Em `config.entrega`, mude para:

```js
definida: true,
regioes: [
  { id: 'centro',  nome: 'Centro',           taxa: 5.00 },
  { id: 'avelar',  nome: 'Avelar',           taxa: 9.00 },
  { id: 'arcozelo', nome: 'Arcozelo',        taxa: 12.00 }
]
```

A partir daí o cliente escolhe o bairro na finalização, a taxa entra na conta e
o site passa a mostrar **Total** em vez de subtotal.

## Ligar o "Aberto agora"

O site **não** mostra "aberto agora" de propósito: só o horário de abertura foi
informado, e dizer que está aberto sem saber a hora de fechar engana o cliente.

Para ligar, em `config.funcionamento` preencha os dias e mude
`mostrarAbertoAgora` para `true`:

```js
mostrarAbertoAgora: true,
dias: {
  ter: ['19:00', '23:30'],
  qua: ['19:00', '23:30'],
  qui: ['19:00', '23:30'],
  sex: ['19:00', '00:30'],
  sab: ['19:00', '00:30'],
  dom: ['19:00', '23:00']
}
```

> Atenção: a lógica do selo ainda **não foi escrita** — o site só prepara o lugar.
> Quem for programar precisa implementar essa parte. Enquanto não implementar,
> deixe `mostrarAbertoAgora: false`.

## Mudar contato, endereço ou horário

Tudo em `config.contato` e `config.funcionamento`, no começo do arquivo.
Se trocar o número do WhatsApp, mude **os dois**: `whatsapp` (só dígitos, com o
55 na frente) e `telefoneExibicao` (como aparece escrito no site).

---

## Se algo quebrar

Sintoma mais comum: a página abre em branco ou o cardápio some. Quase sempre é
uma vírgula a mais, uma a menos ou uma aspa não fechada.

1. No navegador, aperte **F12** e abra a aba **Console**. O erro aparece com o
   número da linha.
2. Volte no `dados.js`, olhe essa linha e a de cima.
3. Se não achar, desfaça a última mudança (Ctrl+Z) e refaça com calma.

Vale guardar uma cópia do `dados.js` antes de uma alteração grande.
