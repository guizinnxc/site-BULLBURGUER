/* ==========================================================================
   BULLBURGER — NA BRASA
   FONTE DE DADOS ÚNICA DO SITE

   Tudo que aparece no site sai deste arquivo: contato, horário, formas de
   pagamento, taxas de entrega, categorias, produtos, preços e adicionais.
   Para atualizar o cardápio você só precisa mexer aqui.

   Leia COMO-ATUALIZAR.md antes de editar. Regras rápidas:
   - Preço é número, com ponto no lugar da vírgula:  42.90  (não "42,90")
   - preco: null  =>  o site mostra "a confirmar" e não deixa pedir o item
   - disponivel: false  =>  item aparece como esgotado e não pode ser somado
   ========================================================================== */

window.BULL = (function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. CONFIGURAÇÕES GERAIS                                            */
  /* ------------------------------------------------------------------ */
  var config = {
    marca: {
      nome: 'Bullburger',
      complemento: 'Na Brasa',
      slogan: 'Blends, fogo e atitude na brasa',
      // Logotipo oficial, extraído do cardápio em PDF enviado pela casa.
      logo: 'assets/img/logo.jpg',
      logoMarca: 'assets/img/logo-mark.png',

      /* FOTO DE DESTAQUE DA ABERTURA
         Três valores possíveis:

         'assets/img/hero-lanche.png'  mostra a foto ao lado do título
         null                          mostra o espaço preparado para recebê-la
         false                         abertura em uma coluna só, sem espaço vazio

         Quando a foto do lanche chegar, salve em assets/img/ e escreva o
         caminho aqui. O ideal é PNG com fundo transparente, deitado ou
         quadrado, a partir de 1200px de largura — ver PENDENCIAS.md. */
      fotoDestaque: 'assets/img/hero-lanche.webp',
      fotoDestaqueAlt: 'Hambúrguer da Bullburger com bacon, queijo e anéis de cebola',
      // largura e altura do arquivo acima, em pixels. Servem para o navegador
      // reservar o espaço antes de baixar a foto e o texto não dar um salto.
      // Se trocar a foto, ajuste estes dois números.
      fotoDestaqueTamanho: [1040, 939]
    },

    contato: {
      // Número usado para montar o link do WhatsApp (só dígitos, com DDI 55).
      whatsapp: '5524981142237',
      telefoneExibicao: '(24) 98114-2237',
      instagram: 'bullburger2025',
      instagramUrl: 'https://www.instagram.com/bullburger2025/',
      cidade: 'Paty do Alferes/RJ',
      endereco: 'Av. Osório Duque Estrada, nº 281 — Centro, Paty do Alferes/RJ',
      referencia: 'Em frente à Casa das Pedras'
    },

    funcionamento: {
      // Texto exibido no site, exatamente como a casa informa.
      texto: 'De terça a domingo, a partir das 19h',
      // "Aberto agora" só liga quando dias, horário de fechamento e fuso
      // estiverem configurados abaixo. Enquanto isso, fica desligado.
      mostrarAbertoAgora: false,
      fuso: 'America/Sao_Paulo',
      // Exemplo de preenchimento (abre=19:00, fecha=23:30):
      // dias: { ter: ['19:00','23:30'], qua: ['19:00','23:30'], ... }
      dias: null
    },

    pedido: {
      // Modalidades oferecidas. Remova uma linha para desativá-la.
      modalidades: [
        { id: 'entrega', nome: 'Entrega', pedeEndereco: true },
        { id: 'retirada', nome: 'Retirada no balcão', pedeEndereco: false }
      ],

      /* FORMAS DE PAGAMENTO
         Informadas pela casa. Quem tem "troco: true" faz aparecer sozinho o
         campo "Precisa de troco? Para quanto?" na finalização — e o site
         recusa um troco menor que o valor do pedido.
         Para tirar uma opção, apague a linha dela. */
      pagamentos: [
        { id: 'pix', nome: 'Pix' },
        { id: 'dinheiro', nome: 'Dinheiro', troco: true },
        { id: 'debito', nome: 'Cartão de débito' },
        { id: 'credito', nome: 'Cartão de crédito' }
      ]
    },

    entrega: {
      /* TAXA DE ENTREGA
         Ainda não informada. Enquanto "definida" for false, o site mostra
         "Taxa de entrega a confirmar", chama o valor do pedido de SUBTOTAL
         e nunca sugere frete grátis.

         Para ligar: defina definida: true e preencha as regiões.
         Exemplo:
         definida: true,
         regioes: [
           { id: 'centro',   nome: 'Centro',        taxa: 5.00 },
           { id: 'avelar',   nome: 'Avelar',        taxa: 9.00 }
         ]
      */
      definida: false,
      regioes: []
    }
  };

  /* ------------------------------------------------------------------ */
  /* 2. CATEGORIAS                                                      */
  /*    A ordem aqui é a ordem no site. Categoria sem produto cadastrado */
  /*    não aparece.                                                     */
  /* ------------------------------------------------------------------ */
  var categorias = [
    { id: 'hamburgueres', nome: 'Hambúrgueres', chamada: 'Monte o seu: escolha o lanche e o tipo de carne.' },
    { id: 'artesanais', nome: 'Artesanais Especiais', chamada: 'Os doze Bull, cada um com uma ideia própria.' },
    { id: 'combos', nome: 'Combos', chamada: 'Lanche, batata e bebida em um pedido só.' },
    { id: 'hotdogs', nome: 'Hot Dogs', chamada: 'Do tradicional ao completão.' },
    { id: 'batatas', nome: 'Batatas', chamada: 'Palito ou canoa, simples ou coberta.' },
    { id: 'porcoes', nome: 'Porções', chamada: 'Para dividir — ou não.' },
    { id: 'bebidas', nome: 'Bebidas', chamada: 'Para acompanhar a brasa.' }
  ];

  /* ------------------------------------------------------------------ */
  /* 3. ADICIONAIS                                                      */
  /*    Cada produto aponta para um destes grupos pelo nome.            */
  /*    preco: null => "a confirmar", não selecionável.                 */
  /* ------------------------------------------------------------------ */
  var adicionais = {
    lanche: [
      { id: 'ad-bacon', nome: 'Bacon', preco: 2.00 },
      { id: 'ad-carne-artesanal-200', nome: 'Carne Artesanal 200g', preco: null },
      { id: 'ad-carne-artesanal-fb', nome: 'Carne Artesanal Frango ou Boi', preco: 7.00 },
      { id: 'ad-carne-picanha', nome: 'Carne Picanha', preco: 9.00 },
      { id: 'ad-carne-tradicional', nome: 'Carne Tradicional', preco: 3.00 },
      { id: 'ad-catupiry', nome: 'Catupiry', preco: 4.00 },
      { id: 'ad-cebola-caramelizada', nome: 'Cebola Caramelizada', preco: 5.00 },
      { id: 'ad-cheddar', nome: 'Cheddar', preco: 4.00 },
      { id: 'ad-gorgonzola', nome: 'Gorgonzola Cremoso', preco: null },
      { id: 'ad-gouda', nome: 'Gouda Cremoso', preco: null },
      { id: 'ad-maionese-verde', nome: 'Maionese Verde da Casa', preco: 7.00 },
      { id: 'ad-mussarela', nome: 'Mussarela', preco: 5.00 },
      { id: 'ad-ovo', nome: 'Ovo', preco: 3.00 },
      { id: 'ad-salada', nome: 'Salada', preco: 2.00 }
    ],
    batata: [
      { id: 'adb-bacon', nome: 'Bacon p/ Batata 350g', preco: 7.00 },
      { id: 'adb-calabresa', nome: 'Calabresa p/ Batata 350g', preco: 6.00 },
      { id: 'adb-catupiry', nome: 'Catupiry p/ Batata 350g', preco: 8.00 },
      { id: 'adb-cheddar', nome: 'Cheddar p/ Batata 350g', preco: 8.00 },
      { id: 'adb-gorgonzola', nome: 'Gorgonzola Cremoso p/ Batata 350g', preco: null },
      { id: 'adb-gouda', nome: 'Gouda Cremoso p/ Batata 350g', preco: null },
      { id: 'adb-mussarela', nome: 'Mussarela p/ Batata 390g', preco: null }
    ],
    hotdog: [
      { id: 'adh-linguica', nome: 'Linguiça na Brasa', preco: null },
      { id: 'adh-salsicha', nome: 'Salsicha', preco: null },
      { id: 'adh-bacon', nome: 'Bacon', preco: 2.00 },
      { id: 'adh-cheddar', nome: 'Cheddar', preco: 4.00 },
      { id: 'adh-catupiry', nome: 'Catupiry', preco: 4.00 },
      { id: 'adh-ovo', nome: 'Ovo', preco: 3.00 }
    ]
  };

  /* Tipos de carne da tabela de hambúrgueres.
     O preço aqui SUBSTITUI o preço do lanche (não soma). */
  function carnes(trad, maturata, pic90, pic120, artBovino, artFrango) {
    return {
      titulo: 'Escolha a carne',
      ajuda: 'O preço do lanche muda conforme a carne.',
      opcoes: [
        { id: 'tradicional', nome: 'Tradicional', preco: trad },
        { id: 'maturata-180', nome: 'Maturata 180g', preco: maturata },
        { id: 'picanha-90', nome: 'Picanha 90g', preco: pic90 },
        { id: 'picanha-120', nome: 'Picanha 120g', preco: pic120 },
        { id: 'artesanal-bovino', nome: 'Artesanal Bovino', preco: artBovino },
        { id: 'artesanal-frango', nome: 'Artesanal Frango', preco: artFrango }
      ]
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4. PRODUTOS                                                        */
  /*    imagem: null => o site desenha um espaço preparado para receber  */
  /*    a foto real. Coloque o arquivo em assets/img/ e escreva o        */
  /*    caminho aqui, ex.: 'assets/img/bull-1.jpg'                       */
  /* ------------------------------------------------------------------ */
  var produtos = [

    /* ---------- HAMBÚRGUERES (tabela de carnes) ---------- */
    {
      id: 'x-burguer', categoria: 'hamburgueres', nome: 'X Burguer',
      descricao: 'Pão, carne e queijo.',
      imagem: null, disponivel: true,
      variacoes: carnes(9.90, 17.90, 15.90, 17.90, 14.90, 14.90),
      adicionais: 'lanche',
      retirar: ['Queijo']
    },
    {
      id: 'x-salada', categoria: 'hamburgueres', nome: 'X Salada',
      descricao: 'Pão, carne, queijo e salada.',
      imagem: null, disponivel: true,
      variacoes: carnes(13.90, 19.90, 17.90, 19.90, 16.90, 16.90),
      adicionais: 'lanche',
      retirar: ['Queijo', 'Salada']
    },
    {
      id: 'x-bacon', categoria: 'hamburgueres', nome: 'X Bacon',
      descricao: 'Pão, carne, queijo e bacon.',
      imagem: null, disponivel: true,
      variacoes: carnes(15.90, 22.90, 19.90, 22.90, 19.90, 19.90),
      adicionais: 'lanche',
      retirar: ['Queijo', 'Bacon']
    },
    {
      id: 'x-egg', categoria: 'hamburgueres', nome: 'X Egg',
      descricao: 'Pão, carne, queijo e ovo.',
      imagem: null, disponivel: true,
      variacoes: carnes(12.90, 20.90, 18.90, 20.90, 17.90, 17.90),
      adicionais: 'lanche',
      retirar: ['Queijo', 'Ovo']
    },
    {
      id: 'x-tudo', categoria: 'hamburgueres', nome: 'X Tudo',
      descricao: 'Pão, carne, queijo, bacon, presunto, ovo e salada.',
      imagem: null, disponivel: true,
      variacoes: carnes(19.90, 27.90, 23.90, 27.90, 24.90, 24.90),
      adicionais: 'lanche',
      retirar: ['Queijo', 'Bacon', 'Presunto', 'Ovo', 'Salada']
    },

    /* ---------- ARTESANAIS ESPECIAIS ---------- */
    {
      id: 'bull-1', categoria: 'artesanais', nome: 'Bull 1', preco: 47.90,
      descricao: 'Pão de brioche, maionese, melado, vinagrete, queijo coalho, linguiça de churrasco, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Maionese', 'Melado', 'Vinagrete', 'Queijo coalho', 'Linguiça de churrasco', 'Queijo']
    },
    {
      id: 'bull-2', categoria: 'artesanais', nome: 'Bull 2', preco: 42.90,
      descricao: 'Pão de brioche, maionese, cebola roxa, carne seca, catupiry, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Maionese', 'Cebola roxa', 'Carne seca', 'Catupiry', 'Queijo']
    },
    {
      id: 'bull-3', categoria: 'artesanais', nome: 'Bull 3', preco: 45.90,
      descricao: 'Pão de brioche, cebola caramelizada, creme de gorgonzola, bacon, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Cebola caramelizada', 'Creme de gorgonzola', 'Bacon', 'Queijo']
    },
    {
      id: 'bull-4', categoria: 'artesanais', nome: 'Bull 4', preco: 41.90,
      descricao: 'Pão de brioche, melado, abacaxi grelhado, queijo coalho, queijo e blend de carne de pernil.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Melado', 'Abacaxi grelhado', 'Queijo coalho', 'Queijo']
    },
    {
      id: 'bull-5', categoria: 'artesanais', nome: 'Bull 5', preco: 35.90,
      descricao: 'Pão de brioche, cheddar cremoso, bacon, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Cheddar cremoso', 'Bacon', 'Queijo']
    },
    {
      id: 'bull-6', categoria: 'artesanais', nome: 'Bull 6', preco: 37.90,
      descricao: 'Pão de brioche, tomate, alface, rúcula, pepino, cebola roxa, bacon, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Tomate', 'Alface', 'Rúcula', 'Pepino', 'Cebola roxa', 'Bacon', 'Queijo']
    },
    {
      id: 'bull-7', categoria: 'artesanais', nome: 'Bull 7', preco: 42.90,
      descricao: 'Pão de brioche, creme de queijo gouda, anel de cebola, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Creme de queijo gouda', 'Anel de cebola', 'Queijo']
    },
    {
      id: 'bull-8', categoria: 'artesanais', nome: 'Bull 8', preco: 35.90,
      descricao: 'Pão de brioche, tomate, cebola roxa, alface, ovo, bacon, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Tomate', 'Cebola roxa', 'Alface', 'Ovo', 'Bacon', 'Queijo']
    },
    {
      id: 'bull-9', categoria: 'artesanais', nome: 'Bull 9', preco: 49.90,
      selo: 'Tudo em dobro',
      descricao: 'Pão de brioche, bacon em dobro, cheddar em dobro, queijo e blend de carne 200g em dobro.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Bacon', 'Cheddar', 'Queijo']
    },
    {
      id: 'bull-10', categoria: 'artesanais', nome: 'Bull 10', preco: 42.90,
      descricao: 'Pão de brioche, agrião, costela desfiada, catupiry, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Agrião', 'Costela desfiada', 'Catupiry', 'Queijo']
    },
    {
      id: 'bull-11', categoria: 'artesanais', nome: 'Bull 11', preco: 42.90,
      descricao: 'Pão de brioche, marshmallow maçaricado, farofa de bacon, bacon, doce de leite, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Marshmallow maçaricado', 'Farofa de bacon', 'Bacon', 'Doce de leite', 'Queijo']
    },
    {
      id: 'bull-12', categoria: 'artesanais', nome: 'Bull 12', preco: 42.90,
      descricao: 'Pão de brioche, goiabada cremosa, bacon, catupiry, queijo empanado, queijo e blend de carne 200g.',
      imagem: null, disponivel: true, adicionais: 'lanche',
      retirar: ['Goiabada cremosa', 'Bacon', 'Catupiry', 'Queijo empanado', 'Queijo']
    },

    /* ---------- COMBOS ---------- */
    {
      id: 'combull-kids', categoria: 'combos', nome: 'Combull Kids', preco: 18.90,
      descricao: 'X Burguer Tradicional, Batata Palito 100g, Guaravita e um Docile.',
      imagem: null, disponivel: true
    },
    {
      id: 'combull-tradicional', categoria: 'combos', nome: 'Combull Tradicional', preco: 24.90,
      descricao: 'X Tudo Tradicional, Batata Palito 100g e Coca-Cola Mini 200ml.',
      imagem: null, disponivel: true
    },
    {
      id: 'combull-picanha-120', categoria: 'combos', nome: 'Combull Picanha 120g', preco: 32.90,
      descricao: 'X Tudo Picanha 120g, Batata Palito 100g e Coca-Cola Mini 200ml.',
      imagem: null, disponivel: true
    },
    {
      id: 'combull-artesanal', categoria: 'combos', nome: 'Combull Artesanal', preco: 34.90,
      descricao: 'X Tudo Artesanal (bovino ou frango), Batata Palito 100g e Coca-Cola Mini 200ml.',
      imagem: null, disponivel: true,
      opcoes: [{
        id: 'carne-artesanal', titulo: 'Carne artesanal',
        obrigatorio: true, min: 1, max: 1,
        itens: [
          { id: 'bovino', nome: 'Bovino', preco: 0 },
          { id: 'frango', nome: 'Frango', preco: 0 }
        ]
      }]
    },
    {
      id: 'combull-maturata', categoria: 'combos', nome: 'Combull Maturata', preco: 32.90,
      descricao: 'X Tudo Maturata, Batata Palito 100g e Coca-Cola Mini 200ml.',
      imagem: null, disponivel: true
    },
    {
      id: 'combull-casal', categoria: 'combos', nome: 'Combull Casal', preco: 59.90,
      descricao: '2 Picanha Tudo 120g, 1 Batata Palito 350g e 1 Guaraná 1L.',
      imagem: null, disponivel: true
    },
    {
      id: 'combull-casal-turbinado', categoria: 'combos', nome: 'Combull Casal Turbinado', preco: 62.90,
      descricao: '2 Picanha Tudo 90g, 2 Batata Palito 100g, 6 Anéis de Cebola, 6 Nuggets e 2 Guaraná Leão.',
      imagem: null, disponivel: true
    },
    {
      id: 'combull-familia', categoria: 'combos', nome: 'Combull Família', preco: 68.90,
      descricao: '4 X Burguer Tradicionais, 1 Batata Palito 350g, 12 Anéis de Cebola, 12 Nuggets e 1 Guaraná 1L.',
      imagem: null, disponivel: true
    },

    /* ---------- HOT DOGS ---------- */
    {
      id: 'hd-tradicional-salsicha', categoria: 'hotdogs', nome: 'Tradicional Salsicha', preco: 19.90,
      descricao: 'Pão, molho, salsicha, milho, ervilha, bacon, passas, queijo, batata palha, ovo, maionese, ketchup e mostarda.',
      imagem: null, disponivel: true, adicionais: 'hotdog',
      retirar: ['Milho', 'Ervilha', 'Bacon', 'Passas', 'Queijo', 'Batata palha', 'Ovo', 'Maionese', 'Ketchup', 'Mostarda']
    },
    {
      id: 'hd-tradicional-linguica', categoria: 'hotdogs', nome: 'Tradicional Linguiça', preco: 24.90,
      descricao: 'Pão, molho, linguiça na brasa, milho, ervilha, bacon, passas, queijo, batata palha, ovo, maionese, ketchup e mostarda.',
      imagem: null, disponivel: true, adicionais: 'hotdog',
      retirar: ['Milho', 'Ervilha', 'Bacon', 'Passas', 'Queijo', 'Batata palha', 'Ovo', 'Maionese', 'Ketchup', 'Mostarda']
    },
    {
      id: 'hd-completao-salsicha', categoria: 'hotdogs', nome: 'Completão Salsicha', preco: 24.90,
      descricao: 'Pão, molho, salsicha, milho, ervilha, bacon, passas, queijo, batata palha, ovo, cheddar, catupiry, calabresa, maionese, ketchup e mostarda.',
      imagem: null, disponivel: true, adicionais: 'hotdog',
      retirar: ['Milho', 'Ervilha', 'Bacon', 'Passas', 'Queijo', 'Batata palha', 'Ovo', 'Cheddar', 'Catupiry', 'Calabresa', 'Maionese', 'Ketchup', 'Mostarda']
    },
    {
      id: 'hd-completao-linguica', categoria: 'hotdogs', nome: 'Completão Linguiça', preco: 28.90,
      descricao: 'Pão, molho, linguiça na brasa, milho, ervilha, bacon, passas, queijo, batata palha, ovo, cheddar, catupiry, calabresa, maionese, ketchup e mostarda.',
      imagem: null, disponivel: true, adicionais: 'hotdog',
      retirar: ['Milho', 'Ervilha', 'Bacon', 'Passas', 'Queijo', 'Batata palha', 'Ovo', 'Cheddar', 'Catupiry', 'Calabresa', 'Maionese', 'Ketchup', 'Mostarda']
    },

    /* ---------- BATATAS ---------- */
    { id: 'bp1', categoria: 'batatas', nome: 'BP1 — Batata Palito', preco: 26.90, descricao: '350g de batata, cheddar e bacon.', imagem: 'assets/img/batata-palito.jpg', disponivel: true, destaque: true, adicionais: 'batata' },
    { id: 'bp2', categoria: 'batatas', nome: 'BP2 — Batata Palito', preco: 29.90, descricao: '350g de batata, cheddar e costela.', imagem: 'assets/img/batata-palito.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bp3', categoria: 'batatas', nome: 'BP3 — Batata Palito', preco: 29.90, descricao: '350g de batata, catupiry e carne seca.', imagem: 'assets/img/batata-palito.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bp4', categoria: 'batatas', nome: 'BP4 — Batata Palito', preco: 32.90, descricao: '350g de batata, catupiry, cheddar, bacon e calabresa.', imagem: 'assets/img/batata-palito.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bp5', categoria: 'batatas', nome: 'BP5 — Batata Palito', preco: 32.90, descricao: '350g de batata, catupiry, parmesão, provolone e mussarela.', imagem: 'assets/img/batata-palito.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bp6', categoria: 'batatas', nome: 'BP6 — Batata Palito Simples', preco: 15.00, descricao: '350g de batata simples.', imagem: 'assets/img/batata-palito.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bp7', categoria: 'batatas', nome: 'BP7 — Batata Palito Simples', preco: 7.00, descricao: '100g de batata simples.', imagem: 'assets/img/batata-palito.jpg', disponivel: true },

    { id: 'bc1', categoria: 'batatas', nome: 'BC1 — Batata Canoa', preco: 32.00, descricao: '350g de batata, cheddar e bacon.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true, destaque: true, adicionais: 'batata' },
    { id: 'bc2', categoria: 'batatas', nome: 'BC2 — Batata Canoa', preco: 36.90, descricao: '350g de batata, cheddar e costela.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bc3', categoria: 'batatas', nome: 'BC3 — Batata Canoa', preco: 36.90, descricao: '350g de batata, catupiry e carne seca.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bc4', categoria: 'batatas', nome: 'BC4 — Batata Canoa', preco: 38.00, descricao: '350g de batata, catupiry, cheddar, bacon e calabresa.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bc5', categoria: 'batatas', nome: 'BC5 — Batata Canoa', preco: 39.90, descricao: '350g de batata, catupiry, parmesão, provolone e mussarela.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bc6', categoria: 'batatas', nome: 'BC6 — Batata Canoa Simples', preco: 23.00, descricao: '350g de batata simples.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true, adicionais: 'batata' },
    { id: 'bc7', categoria: 'batatas', nome: 'BC7 — Batata Canoa Simples', preco: 10.00, descricao: '100g de batata simples.', imagem: 'assets/img/batata-canoa.jpg', disponivel: true },

    /* ---------- PORÇÕES ---------- */
    { id: 'anel-cebola', categoria: 'porcoes', nome: 'Anel de Cebola', preco: 9.99, descricao: '6 unidades.', imagem: 'assets/img/anel-cebola.jpg', disponivel: true, destaque: true },
    { id: 'nuggets', categoria: 'porcoes', nome: 'Nuggets', preco: 6.99, descricao: '6 unidades.', imagem: 'assets/img/nuggets.jpg', disponivel: true, destaque: true },

    /* ---------- BEBIDAS ---------- */
    { id: 'agua-com-gas', categoria: 'bebidas', nome: 'Água com gás', preco: 4.00, descricao: '', imagem: null, disponivel: true },
    { id: 'agua-sem-gas', categoria: 'bebidas', nome: 'Água sem gás', preco: 3.50, descricao: '', imagem: null, disponivel: true },
    { id: 'coca-350', categoria: 'bebidas', nome: 'Coca-Cola 350ml', preco: 8.00, descricao: '', imagem: null, disponivel: true },
    { id: 'coca-15', categoria: 'bebidas', nome: 'Coca-Cola 1,5L', preco: 14.00, descricao: '', imagem: null, disponivel: true },
    { id: 'coca-mini', categoria: 'bebidas', nome: 'Coca-Cola Mini', preco: 4.50, descricao: '200ml.', imagem: null, disponivel: true },
    { id: 'coca-2l', categoria: 'bebidas', nome: 'Coca-Cola Retornável 2L', preco: 12.00, descricao: '', imagem: null, disponivel: true },
    { id: 'del-valle', categoria: 'bebidas', nome: 'Del Valle Sabores 290ml', preco: 8.00, descricao: '', imagem: null, disponivel: true },
    { id: 'energetico', categoria: 'bebidas', nome: 'Energético', preco: 16.00, descricao: '', imagem: null, disponivel: true },
    { id: 'guarana-350', categoria: 'bebidas', nome: 'Guaraná 350ml', preco: 8.00, descricao: '', imagem: null, disponivel: true },
    { id: 'guarana-1l', categoria: 'bebidas', nome: 'Guaraná 1L', preco: 10.00, descricao: '', imagem: null, disponivel: true },
    { id: 'guaravita', categoria: 'bebidas', nome: 'Guaravita', preco: 4.50, descricao: '', imagem: null, disponivel: true },
    { id: 'guarana-leao', categoria: 'bebidas', nome: 'Guaraná Leão', preco: 4.00, descricao: '', imagem: null, disponivel: true },
    { id: 'guaraviton', categoria: 'bebidas', nome: 'Guaraviton Ginseng', preco: 6.00, descricao: '', imagem: null, disponivel: true },
    { id: 'h2o', categoria: 'bebidas', nome: 'H2O Limoneto 500ml', preco: 8.00, descricao: '', imagem: null, disponivel: true }
  ];

  return {
    config: config,
    categorias: categorias,
    adicionais: adicionais,
    produtos: produtos
  };
})();
