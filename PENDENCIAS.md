# Pendências antes de publicar

Lista do que falta confirmar com a Bullburger. Nada aqui foi inventado ou
chutado: o que não dava para ler no PDF ficou marcado como pendente no site.

Onde mexer está em [COMO-ATUALIZAR.md](COMO-ATUALIZAR.md).

## Já resolvido

- **Formas de pagamento** — a casa informou: Pix, dinheiro, cartão de débito e
  cartão de crédito. Cadastradas em `config.pedido.pagamentos`. O campo de troco
  aparece sozinho no dinheiro e o site recusa troco menor que o valor do pedido.
- **Foto de destaque da abertura** — a casa mandou uma foto real de um lanche.
  O fundo (parede verde e tábua) foi recortado, o resíduo verde das bordas foi
  corrigido e o arquivo entrou como `assets/img/hero-lanche.webp`, com fundo
  transparente. A abertura agora tem o lanche ao lado do título.

---

## 1. Bloqueia a publicação

### 1.1 Preços de adicionais ilegíveis no PDF

Oito adicionais estão com **`preco: null`**. No site aparecem como
*"preço a confirmar"* e **não podem ser selecionados** — ou seja, hoje o cliente
não consegue pedir esses itens.

O nome dá para ler; o preço, não — a arte do cardápio está borrada justamente
nessas células.

| Grupo | Adicional |
|---|---|
| Lanche | Carne Artesanal 200g |
| Lanche | Gorgonzola Cremoso |
| Lanche | Gouda Cremoso |
| Batata | Gorgonzola Cremoso p/ Batata 350g |
| Batata | Gouda Cremoso p/ Batata 350g |
| Batata | Mussarela p/ Batata 390g |
| Hot dog | Linguiça na Brasa (cachorro quente) |
| Hot dog | Salsicha (cachorro quente) |

→ Arquivo `assets/js/dados.js`, bloco `adicionais`.

### 1.2 Taxa de entrega e área de atendimento

Não informadas. O site mostra *"Taxa de entrega a confirmar"*, chama o valor de
**subtotal** (não de total) e avisa que a taxa será combinada no WhatsApp.
Em nenhum momento sugere frete grátis.

Falta saber: quais bairros atende e quanto cobra em cada um. Tem pedido mínimo?

→ `config.entrega`.

---

## 2. Conferir antes de divulgar

### 2.1 Grafia do nome

O logotipo e o cardápio escrevem **BULLBURGUER** (com U). O Instagram e o
material da marca escrevem **Bullburger**.

Hoje o site usa **Bullburger** no texto e **a imagem original do logotipo** como
está, com BULLBURGUER. Se a casa preferir uma grafia só, é uma linha para mudar.

→ `config.marca.nome`.

### 2.2 Descrições que o PDF não deixou ler por inteiro

Nestes itens a arte do cardápio tem linhas sobrepostas ou borradas. A descrição
no site é a leitura mais provável, mas precisa de conferência:

| Item | O que conferir |
|---|---|
| **Bull 1** | o trecho "queijo coalho, linguiça de churrasco" |
| **Bull 7** | "creme de queijo gouda, anel de cebola" |
| **Bull 11** | a sequência "farofa de bacon, bacon, doce de leite" |
| **Completão Salsicha** | duas linhas ilegíveis; foi usada a mesma composição do Completão Linguiça |
| **Tradicional Salsicha** | há um ingrediente entre "ovo" e "maionese" que não dá para ler |

### 2.3 Abrir uma vez num celular de verdade

Todo o site foi verificado em emulação de viewport, de 320 a 1440 px, incluindo
paisagem. **Nada rodou em aparelho real.** O que só se confirma no telefone:

- o teclado virtual subindo sobre o formulário;
- o botão Voltar do Android;
- a barra de endereço que aparece e some ao rolar;
- o Safari do iPhone, que trata rolagem travada de forma própria.

É o teste de maior retorno antes de divulgar o link. Basta abrir o site no
celular e fazer um pedido de ponta a ponta.

### 2.4 Detalhes de escrita nas bebidas

- **Del Valle Sabores 290ml** — pode ser 280ml.
- **H2O Limoneto 500ml** — provavelmente "H2OH! Limoneto".

### 2.5 Horário de fechamento

A casa informa *"de terça a domingo, a partir das 19h"*, sem hora de encerrar.
Por isso o site **não** mostra selo de "aberto agora" — mostraria uma informação
que ninguém pode garantir. A seção Informações diz, com todas as letras, que o
horário de encerramento não está publicado.

Com os horários de cada dia, dá para ligar o selo (instruções no
COMO-ATUALIZAR.md — a lógica ainda precisa ser programada).

---

## 3. Melhora bastante, mas não bloqueia

### 3.1 Fotos dos lanches

**Esta é a maior diferença visual que o site pode ganhar.**

O PDF só tinha foto de batata palito, batata canoa, anel de cebola, nuggets e
bebidas. As quatro primeiras já estão no site. Todo o resto — os 5 X, os 12
Bull, os 8 combos e os 4 hot dogs — está com um espaço preparado, que mostra uma
chama e "foto em breve".

Prioridade sugerida, se for fotografar aos poucos:

1. Os 12 Bull (são os mais caros e os que mais vendem por imagem)
2. X Tudo e X Bacon
3. Os combos
4. Os hot dogs

Como colocar: ver COMO-ATUALIZAR.md, "Colocar a foto de um produto".

> As fotos do Instagram **não** foram recortadas para o site. Print de rede
> social perde qualidade e corta a composição; o certo é usar o arquivo
> original.

### 3.3 Retirada no balcão

O site oferece entrega **e** retirada. Se a casa não trabalha com retirada, é só
apagar essa linha de `config.pedido.modalidades`.

### 3.4 Logotipo em arquivo original

O selo do cabeçalho (`logo-mark.png`) é o emblema do cardápio recortado em
círculo, com transparência — ficou nítido e legível em 40 px. Mesmo assim, é um
recorte de uma imagem achatada. Se existir o arquivo original (`.png` com
transparência, `.ai` ou `.svg`), vale substituir: o traço fica mais limpo em
telas de alta densidade e o arquivo fica menor.

→ `assets/img/logo-mark.png` (selo) e `assets/img/logo.jpg` (prévia de link).

### 3.5 Domínio e endereço do site

Definir onde publicar e qual endereço usar, para colocar o link na bio do
Instagram. Opções no README.md.
