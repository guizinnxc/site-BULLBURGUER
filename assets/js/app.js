/* ==========================================================================
   BULLBURGER — NA BRASA
   Cardápio digital, carrinho e encaminhamento do pedido pelo WhatsApp.

   Nenhum dado de cardápio mora aqui: tudo vem de assets/js/dados.js.
   ========================================================================== */

(function () {
  'use strict';

  var DADOS = window.BULL;
  var CFG = DADOS.config;
  var CHAVE = 'bullburger.carrinho.v1';
  var CHAVE_CLIENTE = 'bullburger.cliente.v1';
  var MS_SAIDA = 280;   // acompanha --t-lenta no CSS

  /* Nome e endereço são dados pessoais: ficam no aparelho por pouco tempo.
     Em celular compartilhado, o próximo a usar não encontra o endereço de
     quem pediu antes. O carrinho não tem dado pessoal e não expira. */
  var VALIDADE_CLIENTE = 7 * 24 * 60 * 60 * 1000;   // 7 dias

  /* Link wa.me muito longo é truncado por alguns aplicativos: o pedido
     chegaria incompleto na cozinha. Acima disto o site avisa e oferece
     copiar o texto inteiro. ~1200 caracteres dão ~1900 de URL codificada. */
  var LIMITE_MENSAGEM = 1200;

  /* ================================================================== */
  /* Utilidades                                                         */
  /* ================================================================== */

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
  }

  function dinheiro(v) {
    var p = Number(v).toFixed(2).split('.');
    return 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1];
  }

  /* O número do WhatsApp é usado para montar links: só dígitos entram. */
  function numeroWhats() {
    return String(CFG.contato.whatsapp || '').replace(/\D/g, '');
  }

  function escapar(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalizar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  function produtoPorId(id) {
    for (var i = 0; i < DADOS.produtos.length; i++) {
      if (DADOS.produtos[i].id === id) return DADOS.produtos[i];
    }
    return null;
  }

  function adicionalPorId(grupo, id) {
    var lista = DADOS.adicionais[grupo] || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /* O preço da variação substitui o preço do produto (não soma). */
  function precoBase(p, variacaoId) {
    if (p.variacoes) {
      var ops = p.variacoes.opcoes;
      for (var i = 0; i < ops.length; i++) if (ops[i].id === variacaoId) return ops[i].preco;
      return null;
    }
    return typeof p.preco === 'number' ? p.preco : null;
  }

  function precoVitrine(p) {
    if (!p.variacoes) return typeof p.preco === 'number' ? p.preco : null;
    var menor = null;
    p.variacoes.opcoes.forEach(function (o) {
      if (typeof o.preco === 'number' && (menor === null || o.preco < menor)) menor = o.preco;
    });
    return menor;
  }

  /* ================================================================== */
  /* Ícones                                                             */
  /* ================================================================== */

  var icoChama =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 2.6c.6 3-1.1 4.3-2.5 5.6C8 9.6 6.3 11.3 6.3 14a5.7 5.7 0 0 0 11.4 0' +
    'c0-2.3-1.1-4-2.3-5.4-.7.9-1.4 1.3-2.1 1 .9-2.5.3-5.2-1.3-7Z" ' +
    'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  var icoWhats =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 2.4a9.6 9.6 0 0 0-8.3 14.4l-1.2 4.4 4.5-1.2A9.6 9.6 0 1 0 12 2.4Z" ' +
    'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

  var icoInsta =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" fill="none" stroke="currentColor" stroke-width="1.7"/>' +
    '<circle cx="12" cy="12" r="3.9" fill="none" stroke="currentColor" stroke-width="1.7"/>' +
    '<circle cx="17.2" cy="6.9" r="1.1" fill="currentColor"/></svg>';

  var icoCarrinhoVazio =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M3.2 4.5h2L7.6 15a1.8 1.8 0 0 0 1.8 1.4h7.3a1.8 1.8 0 0 0 1.76-1.4L20 8.2H6.1" ' +
    'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ================================================================== */
  /* Estado                                                             */
  /* ================================================================== */

  var carrinho = [];
  var filtroCategoria = 'todas';
  var termoBusca = '';
  var etapa = 'carrinho';          // carrinho | dados | revisao

  var cliente = {
    nome: '', modalidade: '', endereco: '', referencia: '',
    pagamento: '', trocoPara: '', observacoes: '', regiao: ''
  };

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(carrinho)); } catch (e) { /* sem armazenamento */ }
  }

  function carregar() {
    try {
      var cru = localStorage.getItem(CHAVE);
      if (!cru) return;
      var lido = JSON.parse(cru);
      if (Array.isArray(lido)) carrinho = lido.filter(valido).map(normalizarItem);
    } catch (e) { carrinho = []; }
  }

  /* Os dados do cliente também ficam salvos: ao voltar do WhatsApp o celular
     costuma recarregar a página, e digitar endereço de novo é o que mais faz
     desistir do pedido. */
  function salvarCliente() {
    try {
      localStorage.setItem(CHAVE_CLIENTE, JSON.stringify({ em: Date.now(), dados: cliente }));
    } catch (e) { /* sem armazenamento */ }
  }

  function esquecerCliente() {
    try { localStorage.removeItem(CHAVE_CLIENTE); } catch (e) { /* sem armazenamento */ }
    Object.keys(cliente).forEach(function (k) { cliente[k] = ''; });
  }

  function carregarCliente() {
    try {
      var cru = JSON.parse(localStorage.getItem(CHAVE_CLIENTE) || 'null');
      if (!cru || typeof cru !== 'object') return;

      // formato antigo, sem carimbo de tempo, ou passado da validade: descarta
      if (typeof cru.em !== 'number' || !cru.dados ||
          Date.now() - cru.em > VALIDADE_CLIENTE) {
        localStorage.removeItem(CHAVE_CLIENTE);
        return;
      }

      var lido = cru.dados;
      Object.keys(cliente).forEach(function (k) {
        if (typeof lido[k] === 'string') cliente[k] = lido[k].slice(0, 400);
      });
      // uma modalidade ou pagamento que saiu da configuração não vale mais
      if (!CFG.pedido.modalidades.some(function (m) { return m.id === cliente.modalidade; })) {
        cliente.modalidade = '';
      }
      if (!CFG.pedido.pagamentos.some(function (p) { return p.id === cliente.pagamento; })) {
        cliente.pagamento = '';
      }
      if (!CFG.entrega.regioes.some(function (r) { return r.id === cliente.regiao; })) {
        cliente.regiao = '';
      }
    } catch (e) { /* mantém os campos vazios */ }
  }

  function valido(item) {
    if (!item || typeof item !== 'object') return false;
    var p = produtoPorId(item.produtoId);
    if (!p || p.disponivel === false) return false;
    if (precoBase(p, item.variacaoId) === null) return false;
    return Number(item.qtd) > 0;
  }

  /* Recalcula o item contra o cardápio atual — nunca confia no que foi salvo. */
  function normalizarItem(item) {
    var p = produtoPorId(item.produtoId);
    var opcoes = {};
    (p.opcoes || []).forEach(function (g) {
      opcoes[g.id] = ((item.opcoes && item.opcoes[g.id]) || []).filter(function (id) {
        return g.itens.some(function (i) { return i.id === id; });
      });
    });
    return {
      uid: item.uid,
      produtoId: item.produtoId,
      variacaoId: item.variacaoId || null,
      opcoes: opcoes,
      adicionais: (item.adicionais || []).filter(function (id) {
        var a = p.adicionais ? adicionalPorId(p.adicionais, id) : null;
        return a && typeof a.preco === 'number';
      }),
      retirados: (item.retirados || []).filter(function (n) {
        return (p.retirar || []).indexOf(n) !== -1;
      }),
      obs: String(item.obs || '').slice(0, 300),
      qtd: Math.min(99, Math.max(1, parseInt(item.qtd, 10) || 1))
    };
  }

  function precoUnitario(item) {
    var p = produtoPorId(item.produtoId);
    if (!p) return 0;
    var total = precoBase(p, item.variacaoId) || 0;
    (p.opcoes || []).forEach(function (g) {
      (item.opcoes[g.id] || []).forEach(function (id) {
        var a = g.itens.filter(function (i) { return i.id === id; })[0];
        if (a && typeof a.preco === 'number') total += a.preco;
      });
    });
    (item.adicionais || []).forEach(function (id) {
      var a = p.adicionais ? adicionalPorId(p.adicionais, id) : null;
      if (a && typeof a.preco === 'number') total += a.preco;
    });
    return total;
  }

  function subtotal() {
    return carrinho.reduce(function (s, i) { return s + precoUnitario(i) * i.qtd; }, 0);
  }

  function totalItens() {
    return carrinho.reduce(function (s, i) { return s + i.qtd; }, 0);
  }

  /* Assinatura: junta itens idênticos e separa personalizações diferentes. */
  function assinatura(item) {
    var ops = Object.keys(item.opcoes || {}).sort().map(function (k) {
      return k + ':' + (item.opcoes[k] || []).slice().sort().join('+');
    }).join('|');
    return [
      item.produtoId, item.variacaoId || '-', ops,
      (item.adicionais || []).slice().sort().join('+'),
      (item.retirados || []).slice().sort().join('+'),
      normalizar(item.obs || '')
    ].join('::');
  }

  function taxaEntrega() {
    if (cliente.modalidade !== 'entrega') return { definida: true, valor: 0 };
    if (!CFG.entrega.definida) return { definida: false, valor: 0 };
    var r = CFG.entrega.regioes.filter(function (x) { return x.id === cliente.regiao; })[0];
    return r ? { definida: true, valor: r.taxa } : { definida: false, valor: 0 };
  }

  function nomeVariacao(item) {
    var p = produtoPorId(item.produtoId);
    if (!p || !p.variacoes) return '';
    var o = p.variacoes.opcoes.filter(function (x) { return x.id === item.variacaoId; })[0];
    return o ? o.nome : '';
  }

  function detalhes(item) {
    var p = produtoPorId(item.produtoId);
    var partes = [];
    var v = nomeVariacao(item);
    if (v) partes.push(v);
    (p.opcoes || []).forEach(function (g) {
      (item.opcoes[g.id] || []).forEach(function (id) {
        var a = g.itens.filter(function (i) { return i.id === id; })[0];
        if (a) partes.push(a.nome);
      });
    });
    var extras = (item.adicionais || []).map(function (id) {
      var a = adicionalPorId(p.adicionais, id);
      return a ? a.nome : null;
    }).filter(Boolean);
    if (extras.length) partes.push('+ ' + extras.join(', '));
    if ((item.retirados || []).length) {
      partes.push('sem ' + item.retirados.join(', ').toLowerCase());
    }
    return partes;
  }

  /* ================================================================== */
  /* Camadas: abrir e fechar com transição                              */
  /* ================================================================== */

  var focoAnterior = null;
  var temporizadores = {};
  var rolagemSalva = 0;
  var fundoTravado = false;

  /* Trava a rolagem de fundo guardando a posição.
     `overflow: hidden` no body não segura o Safari do iPhone — lá a página
     atrás continua rolando. Com `position: fixed` segura, mas a página pula
     para o topo, então a posição é guardada e devolvida ao destravar. */
  function travarFundo() {
    if (fundoTravado) return;
    rolagemSalva = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = (-rolagemSalva) + 'px';
    document.body.classList.add('travado');
    fundoTravado = true;
  }

  function destravarFundo() {
    if (!fundoTravado) return;
    document.body.classList.remove('travado');
    document.body.style.top = '';
    fundoTravado = false;
    window.scrollTo(0, rolagemSalva);
  }

  /* O botão Voltar do celular fecha a janela aberta em vez de sair do site.
     Só a janela de produto e a gaveta empilham histórico; o menu lateral não,
     para não brigar com a navegação por âncora. */
  var CAMADAS_COM_HISTORICO = ['#overlay-produto', '#overlay-carrinho'];
  var historicoAberto = false;

  function empilharHistorico(seletor) {
    if (historicoAberto || CAMADAS_COM_HISTORICO.indexOf(seletor) === -1) return;
    try { history.pushState({ bull: 'camada' }, ''); historicoAberto = true; } catch (e) { /* sem histórico */ }
  }

  function desempilharHistorico() {
    if (!historicoAberto) return;
    historicoAberto = false;
    try { history.back(); } catch (e) { /* sem histórico */ }
  }

  window.addEventListener('popstate', function () {
    if (!historicoAberto) return;
    historicoAberto = false;
    var aberta = camadaAberta();
    if (aberta && aberta.id !== 'nav-movel') fecharCamada('#' + aberta.id, true);
  });

  function focaveis(raiz) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
              ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', raiz)
      .filter(function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      });
  }

  function abrirCamada(seletor, caixaSel) {
    var el = $(seletor);
    if (!el) return;
    clearTimeout(temporizadores[seletor]);

    if (!camadaAberta()) focoAnterior = document.activeElement;

    el.hidden = false;
    travarFundo();
    empilharHistorico(seletor);
    // força o cálculo antes de animar, senão a transição não roda
    void el.offsetWidth;
    el.classList.add('aberta');

    var caixa = caixaSel ? $(caixaSel) : el;
    var alvo = focaveis(caixa)[0];
    if (alvo) alvo.focus({ preventScroll: true });
  }

  /* manterHistorico: true quando outra camada vai abrir em seguida (editar um
     item) ou quando o fechamento já veio do próprio botão Voltar. */
  function fecharCamada(seletor, manterHistorico) {
    var el = seletor ? $(seletor) : camadaAberta();
    if (!el || el.hidden) return;

    if (!manterHistorico) desempilharHistorico();
    el.classList.remove('aberta');
    var chave = '#' + el.id;
    clearTimeout(temporizadores[chave]);
    temporizadores[chave] = setTimeout(function () {
      el.hidden = true;
      if (!camadaAberta()) {
        destravarFundo();
        if (focoAnterior && document.contains(focoAnterior)) {
          focoAnterior.focus({ preventScroll: true });
        }
        focoAnterior = null;
      }
    }, semMovimento.matches ? 0 : MS_SAIDA);
  }

  function camadaAberta() {
    return $$('.camada, .nav-movel').filter(function (c) { return !c.hidden; })[0] || null;
  }

  /* ================================================================== */
  /* Cardápio                                                           */
  /* ================================================================== */

  function montarFiltros() {
    var alvo = $('#filtros');
    var usadas = DADOS.categorias.filter(function (c) {
      return DADOS.produtos.some(function (p) { return p.categoria === c.id; });
    });

    alvo.innerHTML =
      '<button type="button" class="chip" role="tab" data-cat="todas" aria-selected="true">Tudo</button>' +
      usadas.map(function (c) {
        return '<button type="button" class="chip" role="tab" data-cat="' + escapar(c.id) +
               '" aria-selected="false">' + escapar(c.nome) + '</button>';
      }).join('');

    alvo.addEventListener('click', function (ev) {
      var chip = ev.target.closest('.chip');
      if (!chip) return;
      filtroCategoria = chip.dataset.cat;
      $$('.chip', alvo).forEach(function (c) {
        c.setAttribute('aria-selected', String(c === chip));
      });
      chip.scrollIntoView({
        block: 'nearest', inline: 'center',
        behavior: semMovimento.matches ? 'auto' : 'smooth'
      });
      montarCardapio();
      atualizarSombraFiltros();
    });

    alvo.addEventListener('scroll', atualizarSombraFiltros, { passive: true });
    window.addEventListener('resize', atualizarSombraFiltros, { passive: true });
  }

  /* ================================================================== */
  /* Vitrine de destaques                                               */
  /*                                                                    */
  /* Mostra em foto grande os itens marcados com destaque: true que já  */
  /* tenham imagem cadastrada. Com menos de dois, a seção inteira some: */
  /* vitrine vazia é pior que vitrine nenhuma.                          */
  /* ================================================================== */

  var vitrine = { itens: [], atual: 0 };

  function nomeCategoria(id) {
    var c = DADOS.categorias.filter(function (x) { return x.id === id; })[0];
    return c ? c.nome : '';
  }

  function montarVitrine() {
    var secao = $('#vitrine');
    vitrine.itens = DADOS.produtos.filter(function (p) {
      return p.destaque === true && p.imagem && p.disponivel !== false;
    });

    if (vitrine.itens.length < 2) { secao.remove(); return; }
    secao.hidden = false;

    $('#vitrine-trilho').innerHTML = vitrine.itens.map(function (p, i) {
      var preco = precoVitrine(p);
      return '<button type="button" class="vitrine-slide" data-produto="' + escapar(p.id) + '"' +
        ' role="group" aria-roledescription="slide"' +
        ' aria-label="' + escapar(p.nome) + ', destaque ' + (i + 1) +
        ' de ' + vitrine.itens.length + '">' +
        /* fundo desfocado da própria foto: as imagens vêm em formatos
           diferentes e assim nenhuma precisa ser cortada */
        '<span class="vitrine-fundo" aria-hidden="true">' +
          '<img src="' + escapar(p.imagem) + '" alt="" loading="lazy" decoding="async">' +
        '</span>' +
        '<img class="vitrine-principal" src="' + escapar(p.imagem) + '" alt=""' +
          (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') +
          ' decoding="async" width="900" height="600">' +
        '<span class="vitrine-veu"></span>' +
        '<span class="vitrine-texto">' +
          '<span class="vitrine-cat">' + escapar(nomeCategoria(p.categoria)) + '</span>' +
          '<span class="vitrine-nome">' + escapar(p.nome) + '</span>' +
          (p.descricao ? '<span class="vitrine-desc">' + escapar(p.descricao) + '</span>' : '') +
          '<span class="vitrine-pe">' +
            (preco === null ? '<span class="preco preco-nd">Preço a confirmar</span>'
                            : '<span class="preco">' + dinheiro(preco) + '</span>') +
            '<span class="card-add">Adicionar</span>' +
          '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    $('#vitrine-miniaturas').innerHTML = vitrine.itens.map(function (p, i) {
      return '<button type="button" class="vitrine-mini" role="tab" data-i="' + i + '"' +
        ' aria-selected="' + (i === 0) + '" aria-label="Ver ' + escapar(p.nome) + '">' +
        '<img src="' + escapar(p.imagem) + '" alt="" loading="lazy" decoding="async"' +
        ' width="160" height="120"></button>';
    }).join('');

    atualizarVitrine();
  }

  function atualizarVitrine() {
    var total = vitrine.itens.length;
    if (!total) return;
    var i = Math.min(Math.max(0, vitrine.atual), total - 1);
    vitrine.atual = i;

    $('#vitrine-conta').textContent =
      String(i + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');

    $$('#vitrine-miniaturas .vitrine-mini').forEach(function (b, n) {
      b.setAttribute('aria-selected', String(n === i));
    });

    $('#vitrine-ant').disabled = i === 0;
    $('#vitrine-prox').disabled = i === total - 1;
  }

  function irParaDestaque(i, suave) {
    var trilho = $('#vitrine-trilho');
    var slide = trilho.children[i];
    if (!slide) return;
    vitrine.atual = i;
    trilho.scrollTo({
      left: slide.offsetLeft - trilho.offsetLeft,
      behavior: (suave && !semMovimento.matches) ? 'smooth' : 'auto'
    });
    atualizarVitrine();
  }

  function ligarVitrine() {
    var secao = $('#vitrine');
    if (!secao) return;
    var trilho = $('#vitrine-trilho');

    // abrir o produto é a ação principal do slide
    trilho.addEventListener('click', function (ev) {
      var s = ev.target.closest('.vitrine-slide');
      if (s) abrirProduto(s.dataset.produto, null);
    });

    $('#vitrine-miniaturas').addEventListener('click', function (ev) {
      var b = ev.target.closest('.vitrine-mini');
      if (b) irParaDestaque(parseInt(b.dataset.i, 10), true);
    });

    $('#vitrine-ant').addEventListener('click', function () { irParaDestaque(vitrine.atual - 1, true); });
    $('#vitrine-prox').addEventListener('click', function () { irParaDestaque(vitrine.atual + 1, true); });

    // arrastar com o dedo move o trilho: o índice vem da própria rolagem
    var t = null;
    trilho.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var meio = trilho.scrollLeft + trilho.clientWidth / 2;
        var perto = 0, menor = Infinity;
        Array.prototype.forEach.call(trilho.children, function (s, n) {
          var c = s.offsetLeft - trilho.offsetLeft + s.offsetWidth / 2;
          if (Math.abs(c - meio) < menor) { menor = Math.abs(c - meio); perto = n; }
        });
        vitrine.atual = perto;
        atualizarVitrine();
      }, 90);
    }, { passive: true });

    // setas do teclado quando o foco está na vitrine
    secao.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') { ev.preventDefault(); irParaDestaque(vitrine.atual + 1, true); }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); irParaDestaque(vitrine.atual - 1, true); }
    });
  }

  /* Avisa, com um esmaecido na borda, que a régua de categorias continua. */
  function atualizarSombraFiltros() {
    var el = $('#filtros');
    if (!el) return;
    var sobra = el.scrollWidth - el.clientWidth - el.scrollLeft;
    el.classList.toggle('mais-dir', sobra > 4);
    el.classList.toggle('mais-esq', el.scrollLeft > 4);
  }

  function combina(p) {
    if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false;
    if (!termoBusca) return true;
    var alvo = normalizar(p.nome + ' ' + (p.descricao || ''));
    return termoBusca.split(/\s+/).every(function (t) { return alvo.indexOf(t) !== -1; });
  }

  function semFoto(p) {
    return '<span class="sem-foto" role="img" aria-label="Foto de ' + escapar(p.nome) +
           ' ainda não cadastrada">' + icoChama +
           '<small aria-hidden="true">foto em breve</small></span>';
  }

  function cartao(p) {
    var preco = precoVitrine(p);
    var off = p.disponivel === false;
    var aPartir = !!p.variacoes;

    var pill = preco === null
      ? '<span class="preco preco-nd">Preço a confirmar</span>'
      : '<span class="preco">' + (aPartir ? '<small>a partir de</small>' : '') +
        dinheiro(preco) + '</span>';

    var selo = off
      ? '<span class="selo selo-off">Indisponível</span>'
      : (p.selo ? '<span class="selo">' + escapar(p.selo) + '</span>' : '');

    var foto = p.imagem
      ? '<img src="' + escapar(p.imagem) + '" alt="' + escapar(p.nome) +
        '" loading="lazy" decoding="async" width="400" height="300">'
      : semFoto(p);

    return '<button type="button" class="card" data-produto="' + escapar(p.id) + '"' +
             (off ? ' disabled' : '') + '>' +
             '<span class="card-foto">' + selo + foto + '</span>' +
             '<span class="card-corpo">' +
               '<span class="card-nome">' + escapar(p.nome) + '</span>' +
               (p.descricao ? '<span class="card-desc">' + escapar(p.descricao) + '</span>' : '') +
               '<span class="card-pe">' + pill +
                 '<span class="card-add">' + (off ? 'Esgotado' : 'Adicionar') + '</span>' +
               '</span>' +
             '</span>' +
           '</button>';
  }

  function montarCardapio() {
    var html = '';
    var achou = false;

    DADOS.categorias.forEach(function (cat) {
      var itens = DADOS.produtos.filter(function (p) {
        return p.categoria === cat.id && combina(p);
      });
      if (!itens.length) return;      // categoria sem produto não aparece
      achou = true;

      html += '<section class="grupo" id="cat-' + escapar(cat.id) + '">' +
                '<header class="grupo-topo">' +
                  '<h3>' + escapar(cat.nome) + '</h3>' +
                  '<span class="grupo-conta">' + itens.length +
                    (itens.length === 1 ? ' item' : ' itens') + '</span>' +
                  (cat.chamada ? '<p class="grupo-chamada">' + escapar(cat.chamada) + '</p>' : '') +
                '</header>' +
                '<div class="produtos">' + itens.map(cartao).join('') + '</div>' +
              '</section>';
    });

    $('#lista-cardapio').innerHTML = html;
    $('#cardapio-vazio').hidden = achou;
  }

  /* ================================================================== */
  /* Modal de produto                                                   */
  /* ================================================================== */

  var modal = { produto: null, qtd: 1, editando: null };

  function abrirProduto(id, existente) {
    var p = produtoPorId(id);
    if (!p || p.disponivel === false) return;

    modal.produto = p;
    modal.qtd = existente ? existente.qtd : 1;
    modal.editando = existente ? existente.uid : null;

    $('#produto-corpo').innerHTML = corpoProduto(p, existente);
    atualizarQtd();
    atualizarPreco();
    abrirCamada('#overlay-produto', '#modal-produto');
  }

  function corpoProduto(p, item) {
    var html = '<div class="modal-foto">' +
      (p.imagem
        ? '<img src="' + escapar(p.imagem) + '" alt="' + escapar(p.nome) + '" width="560" height="315">'
        : semFoto(p)) +
      '</div>';

    html += '<div class="modal-texto"><h2 id="produto-titulo">' + escapar(p.nome) + '</h2>' +
            (p.descricao ? '<p>' + escapar(p.descricao) + '</p>' : '') + '</div>';

    /* variações — o preço substitui o base */
    if (p.variacoes) {
      var sel = item ? item.variacaoId : null;
      if (!sel) {
        var primeira = p.variacoes.opcoes.filter(function (o) { return typeof o.preco === 'number'; })[0];
        sel = primeira ? primeira.id : null;
      }
      html += '<fieldset class="opc-grupo" data-tipo="variacao">' +
                '<div class="opc-cab"><h3>' + escapar(p.variacoes.titulo) + '</h3>' +
                '<span class="tag">Obrigatório</span>' +
                (p.variacoes.ajuda ? '<p class="opc-ajuda">' + escapar(p.variacoes.ajuda) + '</p>' : '') +
                '</div><div class="opc-lista">';
      p.variacoes.opcoes.forEach(function (o) {
        var nd = typeof o.preco !== 'number';
        html += '<label class="opc' + (o.id === sel ? ' marcada' : '') + '">' +
                  '<input type="radio" name="variacao" value="' + escapar(o.id) + '"' +
                    (o.id === sel ? ' checked' : '') + (nd ? ' disabled' : '') + '>' +
                  '<span class="opc-nome">' + escapar(o.nome) + '</span>' +
                  '<span class="opc-preco' + (nd ? ' nd' : '') + '">' +
                    (nd ? 'a confirmar' : dinheiro(o.preco)) + '</span></label>';
      });
      html += '</div></fieldset>';
    }

    /* grupos de escolha */
    (p.opcoes || []).forEach(function (g) {
      var marcadas = (item && item.opcoes && item.opcoes[g.id]) || [];
      if (!marcadas.length && g.obrigatorio && g.max === 1) marcadas = [g.itens[0].id];
      var umSo = g.max === 1;

      html += '<fieldset class="opc-grupo" data-grupo="' + escapar(g.id) + '">' +
                '<div class="opc-cab"><h3>' + escapar(g.titulo) + '</h3>' +
                '<span class="tag">' + (g.obrigatorio ? 'Obrigatório' : 'Opcional') +
                (!umSo && g.max ? ' · até ' + g.max : '') + '</span></div><div class="opc-lista">';
      g.itens.forEach(function (i) {
        var m = marcadas.indexOf(i.id) !== -1;
        html += '<label class="opc' + (m ? ' marcada' : '') + '">' +
                  '<input type="' + (umSo ? 'radio' : 'checkbox') + '" name="grp-' + escapar(g.id) +
                    '" value="' + escapar(i.id) + '"' + (m ? ' checked' : '') + '>' +
                  '<span class="opc-nome">' + escapar(i.nome) + '</span>' +
                  (i.preco ? '<span class="opc-preco">+ ' + dinheiro(i.preco) + '</span>' : '') +
                '</label>';
      });
      html += '</div></fieldset>';
    });

    /* adicionais */
    if (p.adicionais && DADOS.adicionais[p.adicionais]) {
      var jaTem = (item && item.adicionais) || [];
      html += '<fieldset class="opc-grupo" data-tipo="adicionais">' +
              '<div class="opc-cab"><h3>Adicionais</h3><span class="tag">Opcional</span></div>' +
              '<div class="opc-lista">';
      DADOS.adicionais[p.adicionais].forEach(function (a) {
        var nd = typeof a.preco !== 'number';
        var m = jaTem.indexOf(a.id) !== -1;
        html += '<label class="opc' + (m ? ' marcada' : '') + '">' +
                  '<input type="checkbox" name="adicional" value="' + escapar(a.id) + '"' +
                    (m ? ' checked' : '') + (nd ? ' disabled' : '') + '>' +
                  '<span class="opc-nome">' + escapar(a.nome) + '</span>' +
                  '<span class="opc-preco' + (nd ? ' nd' : '') + '">' +
                    (nd ? 'preço a confirmar' : '+ ' + dinheiro(a.preco)) + '</span></label>';
      });
      html += '</div></fieldset>';
    }

    /* retirar ingredientes */
    if (p.retirar && p.retirar.length) {
      var fora = (item && item.retirados) || [];
      html += '<fieldset class="opc-grupo" data-tipo="retirar">' +
              '<div class="opc-cab"><h3>Prefere sem algum ingrediente?</h3>' +
              '<span class="tag">Opcional</span></div><div class="opc-lista">';
      p.retirar.forEach(function (n) {
        var m = fora.indexOf(n) !== -1;
        html += '<label class="opc' + (m ? ' marcada' : '') + '">' +
                  '<input type="checkbox" name="retirar" value="' + escapar(n) + '"' +
                    (m ? ' checked' : '') + '>' +
                  '<span class="opc-nome">Sem ' + escapar(n.toLowerCase()) + '</span></label>';
      });
      html += '</div></fieldset>';
    }

    html += '<div class="campo"><label for="obs-produto">Observações</label>' +
            '<textarea id="obs-produto" maxlength="300" rows="2" ' +
            'placeholder="Ex.: ponto da carne, cortar ao meio…">' +
            escapar(item ? item.obs : '') + '</textarea>' +
            '<p class="dica">Pedidos especiais dependem da confirmação da equipe no WhatsApp.</p></div>';

    return html;
  }

  function lerModal() {
    var p = modal.produto;
    var corpo = $('#produto-corpo');
    var opcoes = {};
    (p.opcoes || []).forEach(function (g) {
      opcoes[g.id] = $$('input[name="grp-' + g.id + '"]:checked', corpo)
        .map(function (i) { return i.value; });
    });
    var r = p.variacoes ? $('input[name="variacao"]:checked', corpo) : null;

    return {
      produtoId: p.id,
      variacaoId: r ? r.value : null,
      opcoes: opcoes,
      adicionais: $$('input[name="adicional"]:checked', corpo).map(function (i) { return i.value; }),
      retirados: $$('input[name="retirar"]:checked', corpo).map(function (i) { return i.value; }),
      obs: ($('#obs-produto', corpo).value || '').trim().slice(0, 300),
      qtd: modal.qtd
    };
  }

  function atualizarPreco() {
    var item = lerModal();
    $('#preco-modal').textContent = dinheiro(precoUnitario(item) * item.qtd);

    /* Em vez de só desabilitar o botão, ele diz o que falta escolher. */
    var p = modal.produto;
    var falta = null;
    if (p.variacoes && !item.variacaoId) falta = p.variacoes.titulo;
    (p.opcoes || []).forEach(function (g) {
      var n = (item.opcoes[g.id] || []).length;
      if (!falta && g.obrigatorio && n < (g.min || 1)) falta = g.titulo;
      if (!falta && g.max && n > g.max) falta = g.titulo + ': no máximo ' + g.max;
    });

    var btn = $('#btn-adicionar');
    btn.disabled = !!falta;
    btn.querySelector('span').textContent = falta
      ? falta
      : (modal.editando ? 'Salvar alterações' : 'Adicionar ao pedido');
  }

  function atualizarQtd() {
    $('#qtd-valor').textContent = String(modal.qtd);
    $('#qtd-menos').disabled = modal.qtd <= 1;
    $('#qtd-mais').disabled = modal.qtd >= 99;
  }

  var adicionando = false;

  function adicionar() {
    // dois toques rápidos no mesmo botão não podem virar dois itens;
    // a quantidade continua livre pelo seletor + / −
    if (adicionando) return;
    adicionando = true;
    $('#btn-adicionar').disabled = true;
    setTimeout(function () { adicionando = false; }, 600);

    var novo = lerModal();
    novo.uid = assinatura(novo);

    if (modal.editando) {
      carrinho = carrinho.filter(function (i) { return i.uid !== modal.editando; });
    }
    var existente = carrinho.filter(function (i) { return i.uid === novo.uid; })[0];
    if (existente) existente.qtd = Math.min(99, existente.qtd + novo.qtd);
    else carrinho.push(novo);

    salvar();
    atualizarContadores();

    var editava = modal.editando;
    modal.editando = null;
    // ao salvar uma edição a gaveta reabre: o histórico continua empilhado
    fecharCamada('#overlay-produto', !!editava);

    if (editava) {
      setTimeout(function () { abrirGaveta('carrinho'); }, semMovimento.matches ? 0 : 140);
      avisar('Item atualizado');
    } else {
      avisar(novo.qtd + '× ' + produtoPorId(novo.produtoId).nome + ' no pedido');
      pulsarCarrinho();
    }
  }

  function pulsarCarrinho() {
    if (semMovimento.matches) return;
    var b = $('#btn-carrinho');
    b.classList.remove('pulsa');
    void b.offsetWidth;
    b.classList.add('pulsa');
  }

  /* ================================================================== */
  /* Gaveta: carrinho, dados e revisão                                  */
  /* ================================================================== */

  function abrirGaveta(qual) {
    etapa = qual || 'carrinho';
    desenharGaveta();
    abrirCamada('#overlay-carrinho', '#gaveta');
  }

  function desenharGaveta() {
    var corpo = $('#gaveta-corpo');
    var pe = $('#gaveta-pe');

    if (!carrinho.length && etapa !== 'carrinho') etapa = 'carrinho';
    $('#gaveta-voltar').hidden = etapa === 'carrinho';

    if (etapa === 'carrinho') {
      $('#gaveta-titulo').textContent = 'Seu pedido';
      corpo.innerHTML = htmlCarrinho();
      pe.innerHTML = carrinho.length
        ? htmlResumo(false) +
          '<button type="button" class="btn btn-primario btn-bloco" data-acao="ir-dados">Finalizar o pedido</button>' +
          '<button type="button" class="btn btn-suave btn-bloco" data-acao="fechar">Continuar comprando</button>'
        : '';
    } else if (etapa === 'dados') {
      $('#gaveta-titulo').textContent = 'Seus dados';
      corpo.innerHTML = htmlFormulario();
      pe.innerHTML =
        '<button type="button" class="btn btn-primario btn-bloco" data-acao="revisar">Revisar pedido</button>' +
        '<button type="button" class="btn btn-suave btn-bloco" data-acao="voltar-carrinho">Continuar comprando</button>';
    } else {
      $('#gaveta-titulo').textContent = 'Revisar e enviar';
      corpo.innerHTML = htmlRevisao();
      // link de verdade, não window.open: bloqueador de pop-up não barra
      pe.innerHTML =
        '<a class="btn btn-primario btn-bloco" data-acao="enviar" target="_blank" rel="noopener" ' +
          'href="' + escapar(linkWhatsApp()) + '">' +
          icoWhats + '<span>Enviar pedido pelo WhatsApp</span></a>' +
        '<div class="pe-dupla">' +
          '<button type="button" class="btn btn-suave" data-acao="copiar">Copiar o pedido</button>' +
          '<button type="button" class="btn btn-suave" data-acao="voltar-dados">Corrigir dados</button>' +
        '</div>';
    }
    corpo.scrollTop = 0;
  }

  function htmlCarrinho() {
    if (!carrinho.length) {
      return '<div class="vazio-carrinho">' + icoCarrinhoVazio +
        '<h3>Seu pedido está vazio</h3>' +
        '<p>Escolha um lanche no cardápio para começar.</p>' +
        '<button type="button" class="btn btn-primario" data-acao="ir-cardapio">Ver cardápio</button></div>';
    }

    return '<ul>' + carrinho.map(function (item) {
      var p = produtoPorId(item.produtoId);
      var det = detalhes(item);
      var foto = p.imagem
        ? '<img src="' + escapar(p.imagem) + '" alt="" width="58" height="58" loading="lazy">'
        : icoChama;

      return '<li class="item">' +
        '<div class="item-foto">' + foto + '</div>' +
        '<div class="item-corpo">' +
          '<div class="item-cab">' +
            '<h4 class="item-nome">' + escapar(p.nome) + '</h4>' +
            '<span class="item-valor">' + dinheiro(precoUnitario(item) * item.qtd) + '</span>' +
          '</div>' +
          (det.length ? '<p class="item-det">' + escapar(det.join(' · ')) + '</p>' : '') +
          (item.obs ? '<p class="item-obs">Obs.: ' + escapar(item.obs) + '</p>' : '') +
          '<div class="item-acoes">' +
            '<div class="qtd" role="group" aria-label="Quantidade de ' + escapar(p.nome) + '">' +
              '<button type="button" data-acao="menos" data-uid="' + escapar(item.uid) + '" aria-label="Diminuir">&minus;</button>' +
              '<output>' + item.qtd + '</output>' +
              '<button type="button" data-acao="mais" data-uid="' + escapar(item.uid) + '" aria-label="Aumentar">+</button>' +
            '</div>' +
            '<span class="item-links">' +
              '<button type="button" class="link-acao" data-acao="editar" data-uid="' + escapar(item.uid) + '">Editar</button>' +
              '<button type="button" class="link-acao perigo" data-acao="remover" data-uid="' + escapar(item.uid) + '">Remover</button>' +
            '</span>' +
          '</div>' +
        '</div></li>';
    }).join('') + '</ul>';
  }

  /* comNota: o aviso da taxa pendente é alto e só cabe no corpo, nunca no
     rodapé da gaveta — em paisagem ele empurraria os botões para fora. */
  function htmlResumo(comNota) {
    var sub = subtotal();
    var taxa = taxaEntrega();
    var entrega = cliente.modalidade === 'entrega';
    var pendente = entrega && !taxa.definida;

    var h = '<div class="resumo">' +
      '<div class="resumo-linha"><span>Subtotal</span><span>' + dinheiro(sub) + '</span></div>';

    if (entrega) {
      h += '<div class="resumo-linha"><span>Taxa de entrega</span>' +
           (taxa.definida ? '<span>' + dinheiro(taxa.valor) + '</span>'
                          : '<span class="nd">a confirmar</span>') + '</div>';
    }

    h += pendente
      ? '<div class="resumo-linha total"><span>Subtotal</span><span>' + dinheiro(sub) + '</span></div>'
      : '<div class="resumo-linha total"><span>Total</span><span>' + dinheiro(sub + taxa.valor) + '</span></div>';

    h += '</div>';

    if (pendente && comNota) {
      h += '<p class="nota"><strong>A taxa de entrega ainda será confirmada</strong> pela equipe no ' +
           'WhatsApp. O valor acima é só o subtotal dos itens.</p>';
    }
    return h;
  }

  function htmlFormulario() {
    var pags = CFG.pedido.pagamentos;
    var entrega = cliente.modalidade === 'entrega';

    var h = '<div class="campo" data-campo="nome">' +
      '<label for="f-nome">Seu nome *</label>' +
      '<input id="f-nome" type="text" autocomplete="name" enterkeyhint="next" ' +
      'value="' + escapar(cliente.nome) + '" placeholder="Como devemos chamar você?">' +
      '<p class="campo-erro" hidden>Informe seu nome.</p></div>';

    h += '<fieldset class="opc-grupo" data-campo="modalidade">' +
         '<div class="opc-cab"><h3>Entrega ou retirada *</h3></div><div class="opc-lista">';
    CFG.pedido.modalidades.forEach(function (m) {
      var sel = cliente.modalidade === m.id;
      h += '<label class="opc' + (sel ? ' marcada' : '') + '">' +
             '<input type="radio" name="modalidade" value="' + escapar(m.id) + '"' +
             (sel ? ' checked' : '') + '>' +
             '<span class="opc-nome">' + escapar(m.nome) + '</span></label>';
    });
    h += '</div><p class="campo-erro" hidden>Escolha entrega ou retirada.</p></fieldset>';

    h += '<div id="bloco-endereco"' + (entrega ? '' : ' hidden') + '>';
    if (CFG.entrega.definida && CFG.entrega.regioes.length) {
      h += '<div class="campo" data-campo="regiao"><label for="f-regiao">Bairro / região *</label>' +
           '<select id="f-regiao"><option value="">Selecione…</option>';
      CFG.entrega.regioes.forEach(function (r) {
        h += '<option value="' + escapar(r.id) + '"' + (cliente.regiao === r.id ? ' selected' : '') +
             '>' + escapar(r.nome) + ' — ' + dinheiro(r.taxa) + '</option>';
      });
      h += '</select><p class="campo-erro" hidden>Escolha a região de entrega.</p></div>';
    }
    h += '<div class="campo" data-campo="endereco">' +
         '<label for="f-endereco">Endereço completo *</label>' +
         '<textarea id="f-endereco" rows="2" autocomplete="street-address" ' +
         'placeholder="Rua, número, complemento e bairro">' + escapar(cliente.endereco) + '</textarea>' +
         '<p class="campo-erro" hidden>Informe o endereço para a entrega.</p></div>' +
         '<div class="campo" data-campo="referencia">' +
         '<label for="f-referencia">Ponto de referência *</label>' +
         '<input id="f-referencia" type="text" enterkeyhint="next" value="' + escapar(cliente.referencia) +
         '" placeholder="Ex.: ao lado da padaria">' +
         '<p class="campo-erro" hidden>Informe um ponto de referência.</p></div>';
    if (!CFG.entrega.definida) {
      h += '<div class="campo"><p class="nota"><strong>Taxa de entrega a confirmar.</strong> ' +
           'Ainda não há tabela de taxas por bairro cadastrada, então o valor da entrega será ' +
           'combinado com a equipe no WhatsApp.</p></div>';
    }
    h += '</div>';

    if (pags.length) {
      h += '<fieldset class="opc-grupo" data-campo="pagamento">' +
           '<div class="opc-cab"><h3>Forma de pagamento *</h3></div><div class="opc-lista">';
      pags.forEach(function (pg) {
        var sel = cliente.pagamento === pg.id;
        h += '<label class="opc' + (sel ? ' marcada' : '') + '">' +
               '<input type="radio" name="pagamento" value="' + escapar(pg.id) + '"' +
               (sel ? ' checked' : '') + '>' +
               '<span class="opc-nome">' + escapar(pg.nome) + '</span></label>';
      });
      h += '</div><p class="campo-erro" hidden>Escolha a forma de pagamento.</p></fieldset>';

      var atual = pags.filter(function (x) { return x.id === cliente.pagamento; })[0];
      h += '<div class="campo" id="bloco-troco" data-campo="troco"' +
           (atual && atual.troco ? '' : ' hidden') + '>' +
           '<label for="f-troco">Precisa de troco? Para quanto?</label>' +
           '<input id="f-troco" type="text" inputmode="decimal" enterkeyhint="done" value="' +
           escapar(cliente.trocoPara) + '" placeholder="Ex.: 100 — deixe vazio se não precisa">' +
           '<p class="campo-erro" hidden></p>' +
           '<p class="dica">Deixe vazio se for pagar o valor certo.</p></div>';
    } else {
      h += '<div class="campo"><span class="rotulo">Forma de pagamento</span>' +
           '<p class="nota">As formas de pagamento aceitas ainda não foram cadastradas no site. ' +
           '<strong>O pagamento será combinado no WhatsApp</strong> junto com a confirmação do pedido.</p></div>';
    }

    h += '<div class="campo"><label for="f-obs">Observações gerais</label>' +
         '<textarea id="f-obs" rows="2" maxlength="400" ' +
         'placeholder="Algo que a cozinha ou o entregador precisa saber?">' +
         escapar(cliente.observacoes) + '</textarea></div>';

    /* Mostrado sempre: além do botão, é o aviso de privacidade do formulário. */
    h += '<div class="campo campo-apagar">' +
         '<button type="button" class="link-acao" data-acao="esquecer">' +
         'Apagar meus dados deste aparelho</button>' +
         '<p class="dica">Seu nome e endereço ficam guardados só neste celular, por 7 dias, ' +
         'para você não digitar de novo. Não são enviados para lugar nenhum além da sua ' +
         'própria mensagem de WhatsApp.</p></div>';

    return h;
  }

  function limparErro(bloco) {
    if (!bloco) return;
    bloco.classList.remove('invalido');
    var e = $('.campo-erro', bloco);
    if (e) e.hidden = true;
  }

  function validar() {
    var corpo = $('#gaveta-corpo');
    var faltas = [];

    $$('.campo, .opc-grupo', corpo).forEach(limparErro);

    function marcar(sel, nome, texto) {
      var el = $(sel, corpo);
      if (el) {
        el.classList.add('invalido');
        var e = $('.campo-erro', el);
        if (e) {
          if (texto) e.textContent = texto;
          e.hidden = false;
        }
      }
      faltas.push(nome);
    }

    if (!cliente.nome.trim()) marcar('[data-campo="nome"]', 'nome');
    if (!cliente.modalidade) marcar('[data-campo="modalidade"]', 'entrega ou retirada');

    var mod = CFG.pedido.modalidades.filter(function (m) { return m.id === cliente.modalidade; })[0];
    if (mod && mod.pedeEndereco) {
      if (!cliente.endereco.trim()) marcar('[data-campo="endereco"]', 'endereço');
      if (!cliente.referencia.trim()) marcar('[data-campo="referencia"]', 'referência');
      if (CFG.entrega.definida && CFG.entrega.regioes.length && !cliente.regiao) {
        marcar('[data-campo="regiao"]', 'região');
      }
    }
    if (CFG.pedido.pagamentos.length && !cliente.pagamento) {
      marcar('[data-campo="pagamento"]', 'pagamento');
    }

    /* Troco menor que o valor devido só gera confusão na entrega. */
    var pg = CFG.pedido.pagamentos.filter(function (x) { return x.id === cliente.pagamento; })[0];
    if (pg && pg.troco && cliente.trocoPara.trim()) {
      var informado = parseFloat(
        cliente.trocoPara.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
      );
      var devido = subtotal() + taxaEntrega().valor;
      if (isNaN(informado)) {
        marcar('[data-campo="troco"]', 'troco', 'Escreva só o valor, por exemplo 100.');
      } else if (informado < devido) {
        marcar('[data-campo="troco"]', 'troco',
          'O troco precisa cobrir pelo menos ' + dinheiro(devido) +
          (taxaEntrega().definida ? '.' : ', fora a taxa de entrega.'));
      }
    }

    if (faltas.length) {
      var alvo = $('.invalido input, .invalido textarea, .invalido select', corpo);
      if (alvo) {
        alvo.focus({ preventScroll: true });
        alvo.scrollIntoView({ block: 'center', behavior: semMovimento.matches ? 'auto' : 'smooth' });
      }
      avisar('Faltou preencher: ' + faltas.join(', '));
      return false;
    }
    return true;
  }

  function htmlRevisao() {
    var mod = CFG.pedido.modalidades.filter(function (m) { return m.id === cliente.modalidade; })[0];
    var pg = CFG.pedido.pagamentos.filter(function (x) { return x.id === cliente.pagamento; })[0];

    var h = '<div class="revisao"><div class="rev-bloco"><h3>Quem pede</h3>' +
      '<p><strong>' + escapar(cliente.nome) + '</strong></p>' +
      '<p>' + escapar(mod ? mod.nome : '—') + '</p>';
    if (mod && mod.pedeEndereco) {
      h += '<p>' + escapar(cliente.endereco) + '</p>' +
           '<p>Referência: ' + escapar(cliente.referencia) + '</p>';
    }
    h += '</div>';

    h += '<div class="rev-bloco"><h3>Itens</h3><ul class="rev-itens">';
    carrinho.forEach(function (item) {
      var p = produtoPorId(item.produtoId);
      var det = detalhes(item);
      h += '<li><div class="linha"><span>' + item.qtd + '× ' + escapar(p.nome) + '</span>' +
           '<span>' + dinheiro(precoUnitario(item) * item.qtd) + '</span></div>' +
           (det.length ? '<div class="sub">' + escapar(det.join(' · ')) + '</div>' : '') +
           (item.obs ? '<div class="sub">Obs.: ' + escapar(item.obs) + '</div>' : '') + '</li>';
    });
    h += '</ul></div>';

    h += '<div class="rev-bloco"><h3>Valores</h3>' + htmlResumo(true) + '</div>';

    h += '<div class="rev-bloco"><h3>Pagamento</h3>';
    if (pg) {
      h += '<p><strong>' + escapar(pg.nome) + '</strong></p>';
      if (pg.troco && cliente.trocoPara.trim()) {
        h += '<p>Troco para R$ ' + escapar(cliente.trocoPara.trim()) + '</p>';
      }
    } else {
      h += '<p>A combinar pelo WhatsApp.</p>';
    }
    h += '</div>';

    if (cliente.observacoes.trim()) {
      h += '<div class="rev-bloco"><h3>Observações gerais</h3><p>' +
           escapar(cliente.observacoes.trim()) + '</p></div>';
    }

    /* Pedido grande demais para caber com folga num link wa.me. */
    if (montarMensagem().length > LIMITE_MENSAGEM) {
      h += '<p class="nota nota-atencao"><strong>Pedido grande.</strong> Alguns celulares cortam ' +
           'mensagens longas abertas por link. Depois de abrir o WhatsApp, <strong>confira se o ' +
           'pedido chegou inteiro</strong> antes de enviar — ou toque em "Copiar o pedido" e cole ' +
           'na conversa.</p>';
    }

    h += '<p class="nota"><strong>Confira antes de enviar.</strong> Ao tocar no botão abaixo o ' +
         'WhatsApp abre com a mensagem pronta — <strong>você ainda precisa tocar em enviar</strong> ' +
         'no aplicativo e aguardar a confirmação da nossa equipe. Este site não processa pagamento ' +
         'nem confirma o pedido sozinho.</p></div>';
    return h;
  }

  /* ---------------- mensagem do WhatsApp ---------------- */

  function montarMensagem() {
    var mod = CFG.pedido.modalidades.filter(function (m) { return m.id === cliente.modalidade; })[0];
    var pg = CFG.pedido.pagamentos.filter(function (x) { return x.id === cliente.pagamento; })[0];
    var taxa = taxaEntrega();
    var sub = subtotal();
    var entrega = mod && mod.pedeEndereco;

    var L = ['NOVO PEDIDO — BULLBURGER', '',
             'Nome: ' + cliente.nome.trim(),
             'Entrega ou retirada: ' + (mod ? mod.nome : '—')];

    if (entrega) {
      L.push('Endereço: ' + cliente.endereco.trim().replace(/\s*\n\s*/g, ', '));
      L.push('Referência: ' + cliente.referencia.trim());
      var reg = CFG.entrega.regioes.filter(function (r) { return r.id === cliente.regiao; })[0];
      if (reg) L.push('Bairro/região: ' + reg.nome);
    }

    L.push('', 'ITENS');

    carrinho.forEach(function (item) {
      var p = produtoPorId(item.produtoId);
      L.push('');
      L.push(item.qtd + 'x ' + p.nome);

      var v = nomeVariacao(item);
      if (v) L.push('   Carne: ' + v);

      (p.opcoes || []).forEach(function (g) {
        var nomes = (item.opcoes[g.id] || []).map(function (id) {
          var a = g.itens.filter(function (i) { return i.id === id; })[0];
          return a ? a.nome : null;
        }).filter(Boolean);
        if (nomes.length) L.push('   ' + g.titulo + ': ' + nomes.join(', '));
      });

      var extras = (item.adicionais || []).map(function (id) {
        var a = adicionalPorId(p.adicionais, id);
        return a ? a.nome + ' (' + dinheiro(a.preco) + ')' : null;
      }).filter(Boolean);
      if (extras.length) L.push('   Adicionais: ' + extras.join(', '));

      if ((item.retirados || []).length) L.push('   Sem: ' + item.retirados.join(', ').toLowerCase());
      if (item.obs) L.push('   Obs.: ' + item.obs);
      L.push('   Valor: ' + dinheiro(precoUnitario(item) * item.qtd));
    });

    L.push('', 'Subtotal: ' + dinheiro(sub));

    if (entrega) {
      if (taxa.definida) {
        L.push('Taxa de entrega: ' + dinheiro(taxa.valor));
        L.push('Total: ' + dinheiro(sub + taxa.valor));
      } else {
        L.push('Taxa de entrega: a confirmar');
        L.push('Subtotal (pendente da taxa de entrega): ' + dinheiro(sub));
      }
    } else {
      L.push('Total: ' + dinheiro(sub));
    }

    L.push('Forma de pagamento: ' + (pg ? pg.nome : 'a combinar'));
    if (pg && pg.troco && cliente.trocoPara.trim()) {
      L.push('Troco para: R$ ' + cliente.trocoPara.trim());
    }
    if (cliente.observacoes.trim()) {
      L.push('Observações gerais: ' + cliente.observacoes.trim());
    }

    L.push('', '— Enviado pelo site da Bullburger');
    return L.join('\n');
  }

  function linkWhatsApp() {
    return 'https://wa.me/' + numeroWhats() + '?text=' +
           encodeURIComponent(montarMensagem());
  }

  /* Copiar o pedido: salva-vidas quando o aplicativo trunca a mensagem.
     Tenta a API moderna e, se ela recusar, cai no método antigo antes de
     desistir — em http simples ou navegador antigo só o segundo funciona. */
  function copiarPedido() {
    var texto = montarMensagem();

    function porTextarea() {
      try {
        var area = document.createElement('textarea');
        area.value = texto;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, texto.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
      } catch (e) { return false; }
    }

    function concluir(ok) {
      avisar(ok
        ? 'Pedido copiado. Cole na conversa do WhatsApp.'
        : 'Não consegui copiar aqui. Use o botão de enviar pelo WhatsApp.');
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto)
        .then(function () { concluir(true); })
        .catch(function () { concluir(porTextarea()); });
      return;
    }
    concluir(porTextarea());
  }

  /* ================================================================== */
  /* Aviso flutuante                                                    */
  /* ================================================================== */

  var tToast = null, tToastFim = null;
  function avisar(texto) {
    var el = $('#toast');
    clearTimeout(tToast); clearTimeout(tToastFim);
    el.textContent = texto;
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('aberto');
    tToast = setTimeout(function () {
      el.classList.remove('aberto');
      tToastFim = setTimeout(function () { el.hidden = true; }, semMovimento.matches ? 0 : 200);
    }, 3000);
  }

  /* ================================================================== */
  /* Contadores e barra inferior                                        */
  /* ================================================================== */

  function atualizarContadores() {
    var qtd = totalItens();
    var c = $('#contador-carrinho');
    c.textContent = String(qtd);
    c.hidden = qtd === 0;
    $('#btn-carrinho').setAttribute('aria-label', qtd === 0
      ? 'Abrir o carrinho, vazio'
      : 'Abrir o carrinho, ' + qtd + (qtd === 1 ? ' item' : ' itens'));

    $('#barra-mobile').hidden = qtd === 0;
    document.body.classList.toggle('tem-barra', qtd > 0);
    $('#barra-qtd').textContent = qtd + (qtd === 1 ? ' item' : ' itens');
    $('#barra-valor').textContent = dinheiro(subtotal());
  }

  /* ================================================================== */
  /* Informações e rodapé                                               */
  /* ================================================================== */

  /* Foto de destaque da abertura.
     É a primeira imagem visível: entra sem carregamento tardio e com
     prioridade alta, e com medidas fixas para o texto ao lado não saltar. */
  function montarFotoDestaque() {
    var alvo = $('#abertura-foto');
    var foto = CFG.marca.fotoDestaque;

    if (foto === false) {                 // abertura em uma coluna só
      alvo.remove();
      document.querySelector('.abertura-grade').classList.add('sem-foto-destaque');
      return;
    }

    alvo.hidden = false;

    if (typeof foto === 'string' && foto) {
      var tam = CFG.marca.fotoDestaqueTamanho || [1000, 1000];
      alvo.innerHTML =
        '<span class="abertura-brilho" aria-hidden="true"></span>' +
        '<img src="' + escapar(foto) + '" alt="' +
        escapar(CFG.marca.fotoDestaqueAlt || '') + '"' +
        ' width="' + (parseInt(tam[0], 10) || 1000) + '"' +
        ' height="' + (parseInt(tam[1], 10) || 1000) + '"' +
        ' fetchpriority="high" decoding="async">';
      return;
    }

    // sem foto ainda: espaço preparado, com a mesma geometria da foto real
    alvo.classList.add('aguardando');
    alvo.innerHTML =
      '<span class="abertura-brilho" aria-hidden="true"></span>' +
      '<span class="abertura-vaga" role="img" aria-label="Foto do lanche ainda não cadastrada">' +
        icoChama + '<small>foto do lanche em breve</small>' +
      '</span>';
  }

  function montarInformacoes() {
    var c = CFG.contato;

    var h = '<div class="info-card"><h3>Funcionamento</h3>' +
      '<p><strong>' + escapar(CFG.funcionamento.texto) + '</strong></p>' +
      '<p>O horário de encerramento não está publicado aqui — confirme pelo WhatsApp antes de pedir mais tarde.</p></div>';

    h += '<div class="info-card"><h3>Onde estamos</h3>' +
      '<p><strong>' + escapar(c.endereco) + '</strong></p>' +
      '<p>' + escapar(c.referencia) + '</p></div>';

    h += '<div class="info-card"><h3>Pedidos e contato</h3>' +
      '<p><a href="https://wa.me/' + escapar(numeroWhats()) + '" target="_blank" rel="noopener">WhatsApp ' +
      escapar(c.telefoneExibicao) + '</a></p>' +
      '<p><a href="' + escapar(c.instagramUrl) + '" target="_blank" rel="noopener">@' +
      escapar(c.instagram) + '</a></p></div>';

    h += '<div class="info-card"><h3>Entrega</h3>';
    if (CFG.entrega.definida && CFG.entrega.regioes.length) {
      h += '<p>Entregamos nas seguintes regiões:</p>';
      CFG.entrega.regioes.forEach(function (r) {
        h += '<p>' + escapar(r.nome) + ' — <strong>' + dinheiro(r.taxa) + '</strong></p>';
      });
    } else {
      h += '<p><strong>Taxa de entrega a confirmar.</strong></p>' +
           '<p>A área de entrega e o valor do frete são combinados com a equipe pelo WhatsApp no momento do pedido.</p>';
    }
    h += '</div>';

    $('#bloco-informacoes').innerHTML = h;

    $('#meta-funcionamento').textContent = CFG.funcionamento.texto;
    var faixa = $('#faixa-horario');
    if (faixa) faixa.textContent = CFG.funcionamento.texto;
    // na abertura cabe só a rua; a cidade já aparece na sobrancelha
    $('#meta-endereco').textContent = c.endereco.split(', ' + c.cidade)[0];
    var zap = $('#meta-whats');
    zap.textContent = c.telefoneExibicao;
    zap.href = 'https://wa.me/' + numeroWhats();

    $('#rodape-slogan').textContent = CFG.marca.slogan;
    $('#rodape-endereco').innerHTML =
      escapar(c.endereco) + '<span class="rodape-ref">' + escapar(c.referencia) + '</span>';
    $('#rodape-horario').textContent = CFG.funcionamento.texto;

    // o ícone já diz qual é o canal; o texto fica só com o dado. O nome do
    // canal entra no aria-label, senão o leitor de tela anuncia um número solto.
    $('#rodape-links').innerHTML =
      '<li><a href="https://wa.me/' + escapar(numeroWhats()) + '" target="_blank" rel="noopener" ' +
      'aria-label="WhatsApp ' + escapar(c.telefoneExibicao) + '">' +
      icoWhats + '<span>' + escapar(c.telefoneExibicao) + '</span></a></li>' +
      '<li><a href="' + escapar(c.instagramUrl) + '" target="_blank" rel="noopener" ' +
      'aria-label="Instagram @' + escapar(c.instagram) + '">' +
      icoInsta + '<span>@' + escapar(c.instagram) + '</span></a></li>';

    $('#rodape-copy').textContent =
      '© ' + new Date().getFullYear() + ' ' + CFG.marca.nome + '. Todos os direitos reservados.';
  }

  /* ================================================================== */
  /* Menu do celular                                                    */
  /* ================================================================== */

  function abrirMenu() {
    var btn = $('#btn-menu');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Fechar o menu');
    abrirCamada('#nav-movel', '.nav-movel-painel');
  }

  function fecharMenu() {
    var btn = $('#btn-menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Abrir o menu');
    fecharCamada('#nav-movel');
  }

  /* ================================================================== */
  /* Eventos                                                            */
  /* ================================================================== */

  function marcarOpcoes(raiz) {
    $$('.opc', raiz).forEach(function (l) {
      var i = $('input', l);
      if (i) l.classList.toggle('marcada', i.checked);
    });
  }

  function ligarEventos() {
    /* cardápio -> modal */
    $('#lista-cardapio').addEventListener('click', function (ev) {
      var card = ev.target.closest('.card');
      if (card && !card.disabled) abrirProduto(card.dataset.produto, null);
    });

    /* modal de produto */
    $('#fechar-produto').addEventListener('click', function () { fecharCamada('#overlay-produto'); });
    $('#qtd-menos').addEventListener('click', function () {
      modal.qtd = Math.max(1, modal.qtd - 1); atualizarQtd(); atualizarPreco();
    });
    $('#qtd-mais').addEventListener('click', function () {
      modal.qtd = Math.min(99, modal.qtd + 1); atualizarQtd(); atualizarPreco();
    });
    $('#btn-adicionar').addEventListener('click', adicionar);
    $('#produto-corpo').addEventListener('change', function () {
      marcarOpcoes($('#produto-corpo')); atualizarPreco();
    });

    /* carrinho */
    $('#btn-carrinho').addEventListener('click', function () { abrirGaveta('carrinho'); });
    $('#barra-ver-pedido').addEventListener('click', function () { abrirGaveta('carrinho'); });
    $('#fechar-carrinho').addEventListener('click', function () { fecharCamada('#overlay-carrinho'); });
    $('#gaveta-voltar').addEventListener('click', function () {
      etapa = etapa === 'revisao' ? 'dados' : 'carrinho';
      desenharGaveta();
    });

    $('#gaveta').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-acao]');
      if (!btn) return;
      var acao = btn.dataset.acao, uid = btn.dataset.uid;

      if (acao === 'mais' || acao === 'menos') {
        var it = carrinho.filter(function (i) { return i.uid === uid; })[0];
        if (!it) return;
        it.qtd = acao === 'mais' ? Math.min(99, it.qtd + 1) : it.qtd - 1;
        var sumiu = it.qtd <= 0;
        if (sumiu) carrinho = carrinho.filter(function (i) { return i.uid !== uid; });
        salvar(); atualizarContadores(); desenharGaveta();
        // a lista é redesenhada: devolve o foco ao mesmo botão para
        // quem está tocando repetido não perder o controle
        if (!sumiu) {
          var volta = $$('[data-acao="' + acao + '"]', $('#gaveta'))
            .filter(function (b) { return b.dataset.uid === uid; })[0];
          if (volta) volta.focus({ preventScroll: true });
        }

      } else if (acao === 'remover') {
        var alvo = carrinho.filter(function (i) { return i.uid === uid; })[0];
        carrinho = carrinho.filter(function (i) { return i.uid !== uid; });
        salvar(); atualizarContadores(); desenharGaveta();
        if (alvo) avisar(produtoPorId(alvo.produtoId).nome + ' removido');

      } else if (acao === 'editar') {
        var ed = carrinho.filter(function (i) { return i.uid === uid; })[0];
        if (!ed) return;
        // a janela do produto abre em seguida: mantém o histórico empilhado
        fecharCamada('#overlay-carrinho', true);
        setTimeout(function () { abrirProduto(ed.produtoId, ed); }, semMovimento.matches ? 0 : 140);

      } else if (acao === 'ir-cardapio') {
        fecharCamada('#overlay-carrinho');
        setTimeout(function () {
          $('#cardapio').scrollIntoView({ behavior: semMovimento.matches ? 'auto' : 'smooth' });
        }, 60);

      } else if (acao === 'fechar') {
        fecharCamada('#overlay-carrinho');

      } else if (acao === 'ir-dados') {
        etapa = 'dados'; desenharGaveta();

      } else if (acao === 'voltar-carrinho') {
        etapa = 'carrinho'; desenharGaveta();

      } else if (acao === 'voltar-dados') {
        etapa = 'dados'; desenharGaveta();

      } else if (acao === 'revisar') {
        if (!validar()) return;
        var antes = carrinho.length;
        carrinho = carrinho.filter(valido).map(normalizarItem);
        salvar(); atualizarContadores();
        if (carrinho.length !== antes) {
          avisar('Alguns itens saíram do cardápio e foram retirados do pedido.');
          etapa = 'carrinho'; desenharGaveta(); return;
        }
        etapa = 'revisao'; desenharGaveta();

      } else if (acao === 'copiar') {
        copiarPedido();

      } else if (acao === 'esquecer') {
        esquecerCliente();
        desenharGaveta();
        avisar('Seus dados foram apagados deste aparelho.');

      } else if (acao === 'enviar') {
        // é um link: o navegador abre o WhatsApp sozinho.
        // O pedido e os dados continuam salvos — nada é limpo aqui.
        avisar('Agora toque em enviar dentro do WhatsApp.');
      }
    });

    /* formulário — o corpo da gaveta é reescrito, o ouvinte fica no pai */
    var corpoGaveta = $('#gaveta-corpo');

    corpoGaveta.addEventListener('change', function (ev) {
      if (etapa !== 'dados') return;
      var alvo = ev.target;

      if (alvo.name === 'modalidade') {
        cliente.modalidade = alvo.value;
        var m = CFG.pedido.modalidades.filter(function (x) { return x.id === alvo.value; })[0];
        var bloco = $('#bloco-endereco', corpoGaveta);
        if (bloco) bloco.hidden = !(m && m.pedeEndereco);
      }
      if (alvo.name === 'pagamento') {
        cliente.pagamento = alvo.value;
        var pg = CFG.pedido.pagamentos.filter(function (x) { return x.id === alvo.value; })[0];
        var troco = $('#bloco-troco', corpoGaveta);
        if (troco) troco.hidden = !(pg && pg.troco);
      }
      if (alvo.id === 'f-regiao') cliente.regiao = alvo.value;

      limparErro(alvo.closest('.opc-grupo, .campo'));
      marcarOpcoes(corpoGaveta);
      salvarCliente();
    });

    corpoGaveta.addEventListener('input', function (ev) {
      if (etapa !== 'dados') return;
      var mapa = {
        'f-nome': 'nome', 'f-endereco': 'endereco', 'f-referencia': 'referencia',
        'f-troco': 'trocoPara', 'f-obs': 'observacoes'
      };
      var chave = mapa[ev.target.id];
      if (chave) {
        cliente[chave] = ev.target.value;
        limparErro(ev.target.closest('.campo'));
        salvarCliente();
      }
    });

    /* teclado virtual: mantém o campo focado à vista */
    $$('#gaveta-corpo, #produto-corpo').forEach(function (area) {
      area.addEventListener('focusin', function (ev) {
        if (!ev.target.matches('input, textarea, select')) return;
        setTimeout(function () {
          ev.target.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }, 280);
      });
    });

    /* busca */
    var campo = $('#campo-busca'), limpar = $('#limpar-busca');
    campo.addEventListener('input', function () {
      termoBusca = normalizar(campo.value.trim());
      limpar.hidden = !campo.value;
      montarCardapio();
    });
    campo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && campo.value) {
        ev.stopPropagation();
        campo.value = ''; termoBusca = ''; limpar.hidden = true; montarCardapio();
      }
    });
    limpar.addEventListener('click', function () {
      campo.value = ''; termoBusca = ''; limpar.hidden = true;
      montarCardapio(); campo.focus();
    });

    /* Foto que não carrega vira o espaço preparado, em vez de ícone quebrado.
       O evento error não sobe na árvore, por isso o ouvinte é de captura. */
    document.addEventListener('error', function (ev) {
      var img = ev.target;
      if (!img || img.tagName !== 'IMG') return;
      var caixa = img.closest('.card-foto, .modal-foto, .item-foto');
      if (!caixa) return;

      var substituto;
      if (caixa.classList.contains('item-foto')) {
        substituto = icoChama;
      } else {
        var dono = img.closest('[data-produto]');
        var p = dono ? produtoPorId(dono.dataset.produto) : modal.produto;
        substituto = semFoto(p || { nome: img.alt || 'produto' });
      }
      img.insertAdjacentHTML('afterend', substituto);
      img.remove();
    }, true);

    /* menu do celular */
    $('#btn-menu').addEventListener('click', function () {
      if ($('#nav-movel').hidden) abrirMenu(); else fecharMenu();
    });
    $('#nav-movel').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-fechar-menu]') || ev.target.tagName === 'A') fecharMenu();
    });

    /* fecha camada ao clicar fora */
    $$('.camada').forEach(function (c) {
      c.addEventListener('mousedown', function (ev) {
        if (ev.target === c) fecharCamada('#' + c.id);
      });
    });

    /* teclado global */
    document.addEventListener('keydown', function (ev) {
      var aberta = camadaAberta();
      if (!aberta) return;

      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (aberta.id === 'nav-movel') fecharMenu();
        else fecharCamada('#' + aberta.id);
        return;
      }

      if (ev.key === 'Tab') {
        var caixa = $('.modal, .gaveta, .nav-movel-painel', aberta);
        if (!caixa) return;
        var lista = focaveis(caixa);
        if (!lista.length) return;
        var primeiro = lista[0], ultimo = lista[lista.length - 1];
        if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
      }
    });
  }

  /* ================================================================== */
  /* Início                                                             */
  /* ================================================================== */

  function iniciar() {
    document.title = CFG.marca.nome + ' — ' + CFG.marca.complemento +
                     ' | Cardápio e pedidos em ' + CFG.contato.cidade;
    carregar();
    carregarCliente();
    montarFotoDestaque();
    montarVitrine();
    ligarVitrine();
    montarFiltros();
    montarCardapio();
    montarInformacoes();
    ligarEventos();
    atualizarContadores();
    atualizarSombraFiltros();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
