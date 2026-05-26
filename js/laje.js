// ==================== ESTADO DO MÓDULO LAJES ====================
const LAJE = {
  comodosTemp: [],
  orcamentosList: [],
  produtosList: [],          // cache da tabela laje_produtos
  editandoId: null,
  tabAtiva: 'orcamento',
  algoritmoCorte: 'DP',
  planoCorteCache: null,
  editandoComodoIndex: null
};



function switchLajeTab(tab) {
  LAJE.tabAtiva = tab;
  document.getElementById('laje-tab-orcamento').classList.toggle('hidden', tab !== 'orcamento');
  document.getElementById('laje-tab-corte').classList.toggle('hidden', tab !== 'corte');
  document.getElementById('laje-tab-detalhamento').classList.toggle('hidden', tab !== 'detalhamento');
  document.getElementById('laje-tab-itens').classList.toggle('hidden', tab !== 'itens');
  document.getElementById('laje-tab-entregas').classList.toggle('hidden', tab !== 'entregas');

  ['orcamento','corte','detalhamento','itens','entregas'].forEach(t => {
    const btn = document.getElementById(`tab-${t}-btn`);
    if (!btn) return;
    btn.className = tab === t
      ? 'px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow'
      : 'px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200';
  });

  if (tab === 'corte') carregarSelectOrcamentosAprovados();
  if (tab === 'detalhamento') carregarSelectTodosOrcamentos();
  if (tab === 'itens') carregarProdutosLaje();
  if (tab === 'entregas') {
    carregarSelectOrcamentosEntregas();
    document.getElementById('laje-entrega-resumo').classList.add('hidden');
  }
  lucide.createIcons();
}


// ==================== CRUD PRODUTOS (Itens Fabricação) ====================
async function carregarProdutosLaje() {
  const { data, error } = await sb.from('laje_produtos').select('*').order('descricao');
  if (error) return showToast('Erro ao carregar produtos.', true);
  LAJE.produtosList = data || [];
  renderProdutosLaje();
}

async function carregarProdutosLajeSilencioso() {
  const { data } = await sb.from('laje_produtos').select('*').order('descricao');
  if (data) LAJE.produtosList = data;
}

function renderProdutosLaje() {
  const tbody = document.getElementById('laje-produtos-tbody');
  if (!tbody) return;
  if (LAJE.produtosList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = LAJE.produtosList.map(p => `
    <tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-medium">${p.descricao}</td>
      <td class="p-3">${p.unidade}</td>
      <td class="p-3 text-right">${formatMoney(p.custo_unitario)}</td>
      <td class="p-3 text-xs capitalize">${p.tipo}</td>
      <td class="p-3 text-center flex gap-2 justify-center">
        <button onclick="editarProdutoLaje(${p.id})" class="text-blue-600 hover:text-blue-800"><i data-lucide="edit-3" width="16"></i></button>
        <button onclick="excluirProdutoLaje(${p.id})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" width="16"></i></button>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

function abrirModalProduto(id) {
  document.getElementById('modal-produto-laje').classList.remove('hidden');
  document.getElementById('modal-produto-titulo').innerText = id ? 'Editar Produto' : 'Novo Produto';
  if (id) {
    const p = LAJE.produtosList.find(x => x.id == id);
    if (p) {
      document.getElementById('laje-produto-id').value = p.id;
      document.getElementById('laje-produto-descricao').value = p.descricao;
      document.getElementById('laje-produto-unidade').value = p.unidade;
      document.getElementById('laje-produto-custo').value = p.custo_unitario;
      document.getElementById('laje-produto-tipo').value = p.tipo;
    }
  } else {
    document.getElementById('laje-produto-id').value = '';
    document.getElementById('laje-produto-descricao').value = '';
    document.getElementById('laje-produto-unidade').value = '';
    document.getElementById('laje-produto-custo').value = '';
    document.getElementById('laje-produto-tipo').value = 'material';
  }
}

function fecharModalProduto() {
  document.getElementById('modal-produto-laje').classList.add('hidden');
}

async function salvarProdutoLaje() {
  const id = document.getElementById('laje-produto-id').value;
  const descricao = document.getElementById('laje-produto-descricao').value.trim();
  const unidade = document.getElementById('laje-produto-unidade').value.trim();
  const custo = parseFloat(document.getElementById('laje-produto-custo').value) || 0;
  const tipo = document.getElementById('laje-produto-tipo').value;

  if (!descricao || !unidade) return showToast('Preencha descrição e unidade.', true);

  const payload = { descricao, unidade, custo_unitario: custo, tipo };

  let error;
  if (id) {
    ({ error } = await sb.from('laje_produtos').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('laje_produtos').insert(payload));
  }
  if (error) return showToast('Erro ao salvar: ' + error.message, true);

  fecharModalProduto();
  carregarProdutosLaje();
  showToast('Produto salvo!');
}

async function excluirProdutoLaje(id) {
  if (!confirm('Excluir este produto?')) return;
  const { error } = await sb.from('laje_produtos').delete().eq('id', id);
  if (error) return showToast('Erro ao excluir: ' + error.message, true);
  carregarProdutosLaje();
  showToast('Produto excluído.');
}

async function editarProdutoLaje(id) {
  abrirModalProduto(id);
}

// ==================== MODAL CÔMODO ====================
function abrirModalComodo() {
  LAJE.editandoComodoIndex = null; // novo cômodo
  limparFormLaje();
  document.getElementById('modal-comodo-laje').classList.remove('hidden');
  lucide.createIcons();
}

function abrirModalEditarComodo(index) {
  const c = LAJE.comodosTemp[index];
  if (!c) return;
  LAJE.editandoComodoIndex = index;
  document.getElementById('laje-comodo-nome').value = c.nome;
  document.getElementById('laje-vao-menor').value = c.vaoMenor;
  document.getElementById('laje-vao-maior').value = c.vaoMaior;
  document.getElementById('laje-tipo-enchimento').value = c.tipo;
  document.getElementById('laje-altura').value = c.altura;
  document.getElementById('laje-largura-viga').value = c.larguraViga;
  calcularLajePreview();
  document.getElementById('modal-comodo-laje').classList.remove('hidden');
  lucide.createIcons();
}

function fecharModalComodo() {
  document.getElementById('modal-comodo-laje').classList.add('hidden');
  LAJE.editandoComodoIndex = null;
}

function limparFormLaje() {
  document.getElementById('laje-comodo-nome').value = '';
  document.getElementById('laje-vao-menor').value = '';
  document.getElementById('laje-vao-maior').value = '';
  document.getElementById('laje-tipo-enchimento').value = 'EPS';
  document.getElementById('laje-altura').value = '8';
  document.getElementById('laje-largura-viga').value = '0';
  document.getElementById('laje-preview').classList.add('hidden');
}

// ==================== CÁLCULO DO CÔMODO ====================
function obterConfig(nome, padrao = 0) {
  const entry = STATE.configLaje?.[nome];
  if (entry !== undefined) return Number(entry);
  const global = STATE.configuracoes?.[nome];
  return global !== undefined ? Number(global) : padrao;
}

function calcularLaje(vaoMenor, vaoMaior, tipoEnchimento, altura, larguraViga = 0) {
  const vm = parseFloat(vaoMenor) || 0;
  const vM = parseFloat(vaoMaior) || 0;
  const lv = parseFloat(larguraViga) || 0; // cm
  if (vm <= 0 || vM <= 0) return null;

  const acrescimo = lv / 100;
  const tamVigota = vm + acrescimo;
  const interEixo = tipoEnchimento === 'EPS' ? obterConfig('inter_eixo_eps', 0.50) : obterConfig('inter_eixo_lajota_ceramica', 0.43);
  const qtdVigotas = Math.ceil(vM / interEixo);
  const epsLinear = tipoEnchimento === 'EPS' ? (qtdVigotas - 1) * vm : 0;
  const area = vm * vM;

  const configKey = `preco_m2_laje_${tipoEnchimento.toLowerCase()}_h${altura}`;
  const precoM2 = obterConfig(configKey, 0);
  const valorEstimado = area * precoM2;

  return {
    vaoMenor: vm, vaoMaior: vM, tipo: tipoEnchimento, altura: parseInt(altura),
    larguraViga: parseInt(lv),
    qtdVigotas, tamVigota: parseFloat(tamVigota.toFixed(3)),
    epsLinear: parseFloat(epsLinear.toFixed(3)),
    area: parseFloat(area.toFixed(3)),
    precoM2: parseFloat(precoM2.toFixed(2)),
    valorEstimado: parseFloat(valorEstimado.toFixed(2))
  };
}

function calcularLajePreview() {
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const altura = document.getElementById('laje-altura').value;
  const larguraViga = document.getElementById('laje-largura-viga').value;
  const res = calcularLaje(vm, vM, tipo, altura, larguraViga);
  const previewDiv = document.getElementById('laje-preview');

  if (!res) { previewDiv.classList.add('hidden'); return; }
  previewDiv.classList.remove('hidden');
  document.getElementById('laje-prev-vigotas').innerText = res.qtdVigotas + ' unidades';
  document.getElementById('laje-prev-tamanho').innerText = res.tamVigota.toFixed(2) + ' m';
  document.getElementById('laje-prev-eps').innerText = res.tipo === 'EPS' ? res.epsLinear.toFixed(2) + ' m' : 'Não se aplica (Lajota)';
  document.getElementById('laje-prev-area').innerText = res.area.toFixed(2) + ' m²';
  document.getElementById('laje-prev-valor').innerText = formatMoney(res.valorEstimado);
}

// ==================== MANIPULAÇÃO DOS CÔMODOS TEMPORÁRIOS ====================
function adicionarComodoLaje() {
  const nome = document.getElementById('laje-comodo-nome').value.trim();
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const altura = document.getElementById('laje-altura').value;
  const larguraViga = document.getElementById('laje-largura-viga').value;
  const res = calcularLaje(vm, vM, tipo, altura, larguraViga);

  if (!nome) return showToast('Informe o nome do cômodo.', true);
  if (!res) return showToast('Informe vão menor e vão maior válidos.', true);

  if (LAJE.editandoComodoIndex !== null) {
    // Editando cômodo existente
    LAJE.comodosTemp[LAJE.editandoComodoIndex] = { nome, ...res };
  } else {
    LAJE.comodosTemp.push({ nome, ...res });
  }

  renderComodosTemp();
  fecharModalComodo();
}

function removerComodoLaje(index) {
  LAJE.comodosTemp.splice(index, 1);
  renderComodosTemp();
}

function limparComodosLaje() {
  if (!confirm('Limpar todos os cômodos do orçamento atual?')) return;
  LAJE.comodosTemp = [];
  LAJE.editandoId = null;
  document.getElementById('laje-cliente-nome').value = '';
  renderComodosTemp();
}

function renderComodosTemp() {
  const tbody = document.getElementById('laje-comodos-tbody');
  const count = LAJE.comodosTemp.length;
  document.getElementById('laje-comodos-count').innerText = count;

  if (count === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center text-slate-400">Nenhum cômodo adicionado.</td></tr>';
    return;
  }

  let areaTotal = 0, valorTotal = 0;
  tbody.innerHTML = LAJE.comodosTemp.map((c, i) => {
    areaTotal += c.area;
    valorTotal += c.valorEstimado;
    return `<tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-medium">${c.nome}</td>
      <td class="p-3">${c.vaoMenor.toFixed(2)} m</td>
      <td class="p-3">${c.vaoMaior.toFixed(2)} m</td>
      <td class="p-3 text-xs">${c.tipo === 'EPS' ? 'Isopor (EPS)' : 'Lajota Cerâmica'}</td>
      <td class="p-3">${c.altura} cm</td>
      <td class="p-3 font-bold">${c.qtdVigotas}</td>
      <td class="p-3">${c.tamVigota.toFixed(2)} m</td>
      <td class="p-3">${c.larguraViga} cm</td>
      <td class="p-3">${c.tipo === 'EPS' ? c.epsLinear.toFixed(2) + ' m' : '-'}</td>
      <td class="p-3">${c.area.toFixed(2)} m²</td>
      <td class="p-3 text-center">
        <button onclick="abrirModalEditarComodo(${i})" class="text-blue-500 hover:text-blue-700 mr-2" title="Editar cômodo"><i data-lucide="edit-3" width="16"></i></button>
        <button onclick="removerComodoLaje(${i})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" width="16"></i></button>
      </td>
    </tr>`;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td colspan="9" class="p-3 text-right">Área Total / Valor Estimado:</td>
      <td class="p-3">${areaTotal.toFixed(2)} m²</td>
      <td class="p-3 text-green-700">${formatMoney(valorTotal)}</td>
    </tr>
  `);
  lucide.createIcons();
}

// ==================== SALVAR / EDITAR / EXCLUIR ORÇAMENTO ====================
async function salvarOrcamentoLaje() {
  const cliente = document.getElementById('laje-cliente-nome').value.trim();
  if (!cliente) return showToast('Informe o nome do cliente.', true);
  if (LAJE.comodosTemp.length === 0) return showToast('Adicione pelo menos 1 cômodo.', true);

  showLoading(true);
  const areaTotal = LAJE.comodosTemp.reduce((s, c) => s + c.area, 0);
  const valorTotal = LAJE.comodosTemp.reduce((s, c) => s + c.valorEstimado, 0);

  try {
    let idOrc;
    if (LAJE.editandoId) {
      await sb.from('laje_orcamentos').update({
        cliente_nome: cliente,
        valor_total_estimado: valorTotal,
        area_total: areaTotal
      }).eq('id', LAJE.editandoId);
      await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', LAJE.editandoId);
      idOrc = LAJE.editandoId;
    } else {
      const { data: cab, error: errCab } = await sb.from('laje_orcamentos').insert({
        cliente_nome: cliente,
        status: 'ABERTO',
        valor_total_estimado: valorTotal,
        area_total: areaTotal
      }).select('id').single();
      if (errCab) throw new Error(errCab.message);
      idOrc = cab.id;
    }

    const itens = LAJE.comodosTemp.map(c => ({
      id_orcamento: idOrc,
      comodo: c.nome,
      vao_menor: c.vaoMenor,
      vao_maior: c.vaoMaior,
      tipo_enchimento: c.tipo,
      altura: c.altura,
      qtd_vigotas: c.qtdVigotas,
      tamanho_vigota: c.tamVigota,
      metragem_eps: c.epsLinear,
      area: c.area,
      valor_estimado: c.valorEstimado,
      largura_viga: c.larguraViga
    }));

    const { error: errItens } = await sb.from('laje_itens_orcamento').insert(itens);
    if (errItens) throw new Error(errItens.message);

    LAJE.comodosTemp = [];
    LAJE.editandoId = null;
    document.getElementById('laje-cliente-nome').value = '';
    renderComodosTemp();
    showToast(`Orçamento #${idOrc} salvo com sucesso!`);
    carregarOrcamentosLaje();
  } catch (e) {
    showToast('Erro: ' + e.message, true);
  }
  showLoading(false);
}

async function carregarOrcamentosLaje() {
  const tbody = document.getElementById('laje-orcamentos-tbody');
  if (!tbody) return;

  const { data: orcs, error } = await sb.from('laje_orcamentos')
    .select('*').order('id', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-red-400">Erro ao carregar.</td></tr>`;
    return;
  }

  LAJE.orcamentosList = orcs || [];
  if (LAJE.orcamentosList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>`;
    return;
  }

  const rows = await Promise.all(LAJE.orcamentosList.map(async (orc) => {
    const { data: itens } = await sb.from('laje_itens_orcamento')
      .select('comodo, area, valor_estimado').eq('id_orcamento', orc.id);
    const comodosNomes = (itens || []).map(i => i.comodo).join(', ');
    const areaTotal = (itens || []).reduce((s, i) => s + Number(i.area||0), 0);
    const badge = orc.status === 'ABERTO' ? 'bg-yellow-100 text-yellow-700' : (orc.status === 'APROVADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');
    return `<tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-mono">#${orc.id}</td>
      <td class="p-3 font-medium">${orc.cliente_nome}</td>
      <td class="p-3 text-xs">${formatDate(orc.data)}</td>
      <td class="p-3 text-xs max-w-[120px] truncate" title="${comodosNomes}">${comodosNomes || '-'}</td>
      <td class="p-3">${areaTotal.toFixed(2)} m²</td>
      <td class="p-3 font-bold text-green-700">${formatMoney(orc.valor_total_estimado)}</td>
      <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${badge}">${orc.status}</span></td>
      <td class="p-3 flex gap-2 justify-center">
        <button onclick="editarOrcamentoLaje(${orc.id})" class="text-blue-600 hover:text-blue-800" title="Editar"><i data-lucide="edit-3" width="16"></i></button>
        <button onclick="alterarStatusLaje(${orc.id},'APROVADO')" class="text-green-600 hover:text-green-800" title="Aprovar"><i data-lucide="check" width="16"></i></button>
        <button onclick="alterarStatusLaje(${orc.id},'CANCELADO')" class="text-red-500 hover:text-red-700" title="Cancelar"><i data-lucide="x" width="16"></i></button>
        <button onclick="duplicarOrcamentoLaje(${orc.id})" class="text-indigo-500 hover:text-indigo-700" title="Duplicar"><i data-lucide="copy" width="16"></i></button>
        <button onclick="excluirOrcamentoLaje(${orc.id})" class="text-slate-400 hover:text-red-600" title="Excluir"><i data-lucide="trash-2" width="16"></i></button>
      </td>
    </tr>`;
  }));

  tbody.innerHTML = rows.join('');
  lucide.createIcons();
}

async function editarOrcamentoLaje(id) {
  const orc = LAJE.orcamentosList.find(o => o.id == id);
  if (!orc) return;
  document.getElementById('laje-cliente-nome').value = orc.cliente_nome;
  LAJE.editandoId = id;

  const { data: itens } = await sb.from('laje_itens_orcamento').select('*').eq('id_orcamento', id);
  LAJE.comodosTemp = (itens || []).map(i => ({
    nome: i.comodo,
    vaoMenor: Number(i.vao_menor),
    vaoMaior: Number(i.vao_maior),
    tipo: i.tipo_enchimento,
    altura: i.altura,
    qtdVigotas: Number(i.qtd_vigotas),
    tamVigota: Number(i.tamanho_vigota),
    epsLinear: Number(i.metragem_eps),
    area: Number(i.area || (i.vao_menor * i.vao_maior)),
    valorEstimado: Number(i.valor_estimado || 0),
    larguraViga: Number(i.largura_viga) || 0
  }));
  renderComodosTemp();
  switchLajeTab('orcamento');
  showToast(`Editando orçamento #${id}. Clique no lápis ao lado do cômodo para alterar.`);
}

async function alterarStatusLaje(id, novoStatus) {
  const { error } = await sb.from('laje_orcamentos').update({ status: novoStatus }).eq('id', id);
  if (error) return showToast('Erro: ' + error.message, true);
  showToast(`Orçamento #${id} ${novoStatus === 'APROVADO' ? 'aprovado' : 'cancelado'}!`);
  carregarOrcamentosLaje();
}

async function excluirOrcamentoLaje(id) {
  if (!confirm('Excluir permanentemente o orçamento #' + id + '?')) return;
  showLoading(true);
  await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', id);
  await sb.from('laje_orcamentos').delete().eq('id', id);
  showToast('Orçamento excluído.');
  carregarOrcamentosLaje();
  showLoading(false);
}

// ==================== PLANO DE CORTE ====================
async function carregarSelectOrcamentosAprovados() {
  const sel = document.getElementById('laje-corte-select');
  const { data } = await sb.from('laje_orcamentos')
    .select('id,cliente_nome').eq('status', 'APROVADO').order('id', { ascending: false });
  sel.innerHTML = '<option value="">-- Selecione --</option>' +
    (data || []).map(o => `<option value="${o.id}">#${o.id} – ${o.cliente_nome}</option>`).join('');
}

function binPackingFFD(tamanhos, comprimentoBarra = 12.0) {
  const sorted = [...tamanhos].sort((a, b) => b - a);
  const barras = [];
  for (const tam of sorted) {
    let alocado = false;
    for (const barra of barras) {
      const usado = barra.cortes.reduce((s, c) => s + c, 0);
      if (usado + tam <= comprimentoBarra + 0.001) {
        barra.cortes.push(tam);
        alocado = true;
        break;
      }
    }
    if (!alocado) barras.push({ cortes: [tam] });
  }
  for (const barra of barras) {
    const usado = barra.cortes.reduce((s, c) => s + c, 0);
    barra.sobra = parseFloat((comprimentoBarra - usado).toFixed(3));
    barra.usado = usado;
  }
  barras.sort((a, b) => a.sobra - b.sobra);
  return barras;
}

function binPackingBFD(tamanhos, comprimentoBarra = 12.0) {
  const sorted = [...tamanhos].sort((a, b) => b - a);
  const barras = [];
  for (const tam of sorted) {
    let bestIdx = -1, bestSobra = Infinity;
    for (let i = 0; i < barras.length; i++) {
      const usado = barras[i].cortes.reduce((s, c) => s + c, 0);
      const sobraAtual = comprimentoBarra - usado;
      if (sobraAtual >= tam) {
        const novaSobra = sobraAtual - tam;
        if (novaSobra < bestSobra) {
          bestSobra = novaSobra;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) {
      barras[bestIdx].cortes.push(tam);
    } else {
      barras.push({ cortes: [tam] });
    }
  }
  for (const barra of barras) {
    const usado = barra.cortes.reduce((s, c) => s + c, 0);
    barra.sobra = parseFloat((comprimentoBarra - usado).toFixed(3));
    barra.usado = usado;
  }
  barras.sort((a, b) => a.sobra - b.sobra);
  return barras;
}


async function gerarPlanoCorte() {
  const idOrc = document.getElementById('laje-corte-select').value;
  if (!idOrc) return showToast('Selecione um orçamento aprovado.', true);
  showLoading(true);

  const { data: itens, error } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas').eq('id_orcamento', idOrc);
  if (error || !itens?.length) {
    showLoading(false);
    return showToast('Nenhuma vigota encontrada.', true);
  }

  const tamanhos = [];
  for (const item of itens) {
    for (let i = 0; i < Number(item.qtd_vigotas); i++) {
      tamanhos.push(Number(item.tamanho_vigota));
    }
  }

  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhos, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhos, barra12m, 100);
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhos, barra12m);
  } else {
    barras = binPackingFFD(tamanhos, barra12m);
  }
  LAJE.planoCorteCache = { barras, idOrc };

  document.getElementById('laje-corte-resultado').classList.remove('hidden');
  const tbody = document.getElementById('laje-corte-tbody');
  let totalSobra = 0;

  tbody.innerHTML = barras.map((b, i) => {
    totalSobra += b.sobra;
    const aproveitamento = ((b.usado / barra12m) * 100).toFixed(1);
    let statusHtml = '';
    if (b.sobra < 0.30) statusHtml = '<span class="text-green-600 font-bold">🟢 Ótimo</span>';
    else if (b.sobra < 0.80) statusHtml = '<span class="text-amber-600 font-bold">🟡 Atenção</span>';
    else statusHtml = '<span class="text-red-600 font-bold">🔴 Desperdício</span>';
    return `<tr class="border-b">
      <td class="p-3 font-bold">Barra ${i+1}</td>
      <td class="p-3 font-mono">${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</td>
      <td class="p-3">${b.sobra.toFixed(2)} m</td>
      <td class="p-3">${aproveitamento}%</td>
      <td class="p-3">${statusHtml}</td>
    </tr>`;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td colspan="5" class="p-3 text-center">
        Total: ${barras.length} barra(s) de 12,00 m | Sobra acumulada: ${totalSobra.toFixed(2)} m (${((totalSobra/(barras.length*12))*100).toFixed(1)}% de perda)
      </td>
    </tr>
  `);

  showLoading(false);
  lucide.createIcons();
}

/* ======================================================================================================================== */

function imprimirPlanoCorte() {
  if (!LAJE.planoCorteCache) return showToast('Gere o plano de corte primeiro.', true);
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  const { barras, idOrc } = LAJE.planoCorteCache;
  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  const cliente = orc ? orc.cliente_nome : 'Não informado';

  // Agrupa barras com cortes idênticos
  const gruposMap = new Map();
  barras.forEach(b => {
    const chave = JSON.stringify(b.cortes);
    if (!gruposMap.has(chave)) {
      gruposMap.set(chave, { cortes: b.cortes, qtd: 0, sobra: b.sobra });
    }
    gruposMap.get(chave).qtd++;
  });

  // Converte para array e ordena por quantidade decrescente (maior → menor)
  const grupos = Array.from(gruposMap.values())
    .sort((a, b) => b.qtd - a.qtd);

  // Paleta de cores profissionais (sem rosa)
  const coresFundo = ['#e0f2fe', '#fef9c3', '#dcfce7', '#e2e8f0', '#f3e8ff', '#dbeafe'];
  let corIndex = 0;

  let totalSobra = 0;
  let linhas = grupos.map((g, idx) => {
    totalSobra += g.sobra * g.qtd;
    const cor = coresFundo[corIndex % coresFundo.length];
    corIndex++;

    const cortesTd = g.cortes.map(c => 
      `<span style="display:inline-block; margin-right:8px; font-weight:bold; font-size:13px;">${c.toFixed(2)} m</span><span style="font-size:14px;">☐</span>`
    ).join('<span style="margin:0 4px; color:#999;">|</span>');

    return `<tr style="background-color:${cor};">
      <td style="padding:5px; border:1px solid #000; text-align:center; font-weight:bold;">${g.qtd}x</td>
      <td style="padding:5px; border:1px solid #000;">${cortesTd}</td>
    </tr>`;
  }).join('');

  const perdaPerc = ((totalSobra / (barras.length * 12)) * 100).toFixed(1);

  printArea.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding:10mm; max-width:190mm; margin:0 auto; background:#fff; font-size:12px;">
      <table width="100%" style="border-bottom:1px solid #ea580c; padding-bottom:5px; margin-bottom:10px;">
        <tr>
          <td width="45"><img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="height:28px;"></td>
          <td><strong style="color:#ea580c; font-size:15px;">RV BLOCOS</strong><br><span style="font-size:10px;">Plano de Corte de Treliças</span></td>
          <td align="right" style="font-size:10px;">
            <strong>Orçamento #${idOrc}</strong><br>
            Cliente: ${cliente}<br>
            Data: ${new Date().toLocaleDateString('pt-BR')}
          </td>
        </tr>
      </table>
      <div style="margin-bottom:10px; font-size:11px;">
        <strong>Total de barras:</strong> ${barras.length} | 
        <strong>Sobra total:</strong> ${totalSobra.toFixed(2)} m (${perdaPerc}%) |
        <strong>Cortes:</strong> ${barras.reduce((s,b) => s + b.cortes.length, 0)} unidades
      </div>
      <p style="font-size:11px; margin:0 0 8px 0;">🔹 Cada linha representa um <strong>grupo de barras idênticas</strong>. A quantidade está na primeira coluna.</p>
      <table width="100%" style="border-collapse:collapse; margin-bottom:15px;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="padding:6px; border:1px solid #000; width:60px;">Qtd</th>
            <th style="padding:6px; border:1px solid #000;">Cortes (☐ após cada = concluído)</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <div style="border-top:1px solid #ea580c; padding-top:8px; display:flex; justify-content:space-between; font-size:10px;">
        <div>Conferido por: ________________________</div>
        <div>Data: _____ / _____ / __________</div>
      </div>
    </div>
  `;
  setTimeout(() => { window.print(); limparAreaImpressao(); }, 300);
}



// ==================== DETALHAMENTO ====================
async function carregarSelectTodosOrcamentos() {
  const sel = document.getElementById('laje-detalhamento-select');
  const { data } = await sb.from('laje_orcamentos').select('id,cliente_nome').order('id', { ascending: false });
  sel.innerHTML = '<option value="">-- Selecione --</option>' +
    (data || []).map(o => `<option value="${o.id}">#${o.id} – ${o.cliente_nome}</option>`).join('');
}




async function gerarDetalhamento() {
  const idOrc = document.getElementById('laje-detalhamento-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);
  showLoading(true);

  // 1. Buscar itens do orçamento
  const { data: itens, error } = await sb.from('laje_itens_orcamento').select('*').eq('id_orcamento', idOrc);
  if (error || !itens?.length) { showLoading(false); return showToast('Nenhum item.', true); }

  // 2. Garantir lista de produtos carregada
  await carregarProdutosLajeSilencioso();

  let totalVigotas = 0, totalArea = 0, totalEpsLinear = 0;
  const tamanhosVigota = [];
  const tiposEnchimento = new Set();
  const alturas = new Set();
  itens.forEach(i => {
    totalVigotas += Number(i.qtd_vigotas);
    totalArea += Number(i.area || (i.vao_menor * i.vao_maior));
    if (i.tipo_enchimento === 'EPS') totalEpsLinear += Number(i.metragem_eps);
    for (let j = 0; j < Number(i.qtd_vigotas); j++) tamanhosVigota.push(Number(i.tamanho_vigota));
    tiposEnchimento.add(i.tipo_enchimento);
    alturas.add(i.altura);
  });

  const metrosLinearesTrelica = tamanhosVigota.reduce((a, b) => a + b, 0);

  // ========== ALGORITMO DE CORTE DAS TRELIÇAS (conforme escolha do usuário) ==========
  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhosVigota, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhosVigota, barra12m, 100);
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhosVigota, barra12m);
  } else {
    barras = binPackingFFD(tamanhosVigota, barra12m);
  }

  const numBarras = barras.length;
  const alturaModa = [...alturas].sort((a, b) => b - a)[0] || 8;
  const tipoPredominante = [...tiposEnchimento][0] || 'EPS';

  // Capeamento (apenas sobre as vigotas)
  const espessuraCapeamento = 0.02; // 2 cm fixo
  const larguraCapeamento = 0.12;   // 12 cm de largura
  const secaoCapeamento = larguraCapeamento * espessuraCapeamento;
  const volumeConcreto = metrosLinearesTrelica * secaoCapeamento;

  // Traço (rendimento linear de 48 m por traço)
  const volumePorTraco = 0.1152;
  const numTracos = Math.ceil(volumeConcreto / volumePorTraco);
  const metrosLinearesPorTraco = 48;
  const sacosCimento = Math.ceil(numTracos * 1.5);
  const areiaM3 = numTracos * (6.5 * 0.018);
  const britaM3 = numTracos * (5 * 0.018);
  const latasAreia = Math.round(areiaM3 / 0.018);
  const latasBrita = Math.round(britaM3 / 0.018);

  // ========== VERGALHÃO 6mm (ID 26) – SEMPRE COM ALGORITMO DP (ÓTIMO) ==========
  // Coleta todos os comprimentos das vigotas que atendem à condição (>= 3,40 m)
  const comprimentosVergalhao = [];
  for (const item of itens) {
    const tamVigota = Number(item.tamanho_vigota);
    const qtdVigotas = Number(item.qtd_vigotas);
    if (tamVigota >= 3.40) {
      for (let i = 0; i < qtdVigotas; i++) {
        comprimentosVergalhao.push(tamVigota);
      }
    }
  }

  let barrasVergalhao = 0;
  let custoTotalVergalhao = 0;
  let gruposVergalhao = []; // para exibição

  if (comprimentosVergalhao.length > 0) {
    // Usa o algoritmo DP (Programação Dinâmica) para otimizar o corte do vergalhão
    const corteVergalhao = binPackingDP(comprimentosVergalhao, 12.0);
    barrasVergalhao = corteVergalhao.length;

    // Agrupa os cortes iguais para exibição
    const gruposMap = new Map();
    corteVergalhao.forEach(barra => {
      barra.cortes.forEach(corte => {
        const key = corte.toFixed(2);
        gruposMap.set(key, (gruposMap.get(key) || 0) + 1);
      });
    });
    gruposVergalhao = Array.from(gruposMap.entries())
      .map(([tamanho, qtd]) => ({ tamanho: parseFloat(tamanho), qtd }))
      .sort((a, b) => b.tamanho - a.tamanho);

    const custoPorBarraVerg = custoProdutoPorId(26, 25.00);
    custoTotalVergalhao = barrasVergalhao * custoPorBarraVerg;
  }

  // Funções auxiliares
  function custoProduto(nomePadrao, padrao = 0) {
    const p = LAJE.produtosList.find(x => x.descricao === nomePadrao);
    return p ? Number(p.custo_unitario) : padrao;
  }

  function custoProdutoPorId(id, padrao = 0) {
    const p = LAJE.produtosList.find(x => x.id === id);
    return p ? Number(p.custo_unitario) : padrao;
  }

  const linhas = [];
  let custoTotal = 0;

  function addLinha(desc, qtd, composicao, vlrUnit, vlrTotal) {
    linhas.push({
      desc,
      qtd,
      composicao: composicao || '',
      unitario: formatMoney(vlrUnit),
      total: formatMoney(vlrTotal)
    });
    custoTotal += vlrTotal;
  }

  // Treliça
  const trelicaNome = `Treliça TG${alturaModa} 12m`;
  const custoTrelica = custoProduto(trelicaNome, alturaModa <= 8 ? 68 : (alturaModa <= 12 ? 92 : 105));
  addLinha('Treliça', `${numBarras} barras`, `${metrosLinearesTrelica.toFixed(2)} m lineares`, custoTrelica, numBarras * custoTrelica);

  // Enchimento – EPS
  if (tiposEnchimento.has('EPS')) {
    const placasEps = Math.ceil(totalEpsLinear);
    const epsNome = `EPS H${alturaModa} placa 50x100`;
    const custoEpsPlaca = custoProduto(epsNome, 11.90);
    addLinha(
      'EPS (isopor)',
      `${placasEps} placas`,
      `${totalEpsLinear.toFixed(2)} m lineares (equivale a ${placasEps} placas de 1,00×0,50 m)`,
      custoEpsPlaca,
      placasEps * custoEpsPlaca
    );
    const freteIsopor = custoProduto('Frete Isopor', 0);
    if (freteIsopor > 0) addLinha('Frete do isopor', '1 un', '', freteIsopor, freteIsopor);
  }

  // Enchimento – Lajota
  if (tiposEnchimento.has('LAJOTA_CERAMICA')) {
    const totalLajotas = Math.ceil(totalArea * 12);
    const custoLajota = custoProduto('Lajota Cerâmica', 1.7);
    addLinha('Lajota', `${totalLajotas} peças`, '', custoLajota, totalLajotas * custoLajota);
    const freteLajota = custoProduto('Frete Lajota', 50);
    addLinha('Frete da lajota', '1 un', '', freteLajota, freteLajota);
  }

  // Concreto
  addLinha(
    'Cimento',
    `${sacosCimento} sacos`,
    `${numTracos} traços (${metrosLinearesPorTraco.toFixed(0)} m lineares de capeamento por traço)`,
    custoProduto('Cimento CP II 50kg', 37),
    sacosCimento * custoProduto('Cimento CP II 50kg', 37)
  );
  addLinha(
    'Areia Grossa',
    `${areiaM3.toFixed(3)} m³`,
    `${latasAreia} latas (18 L)`,
    custoProduto('Areia Grossa', 200),
    areiaM3 * custoProduto('Areia Grossa', 200)
  );
  addLinha(
    'Brita 0',
    `${britaM3.toFixed(3)} m³`,
    `${latasBrita} latas (18 L)`,
    custoProduto('Brita 0', 200),
    britaM3 * custoProduto('Brita 0', 200)
  );

  // Vergalhão (se houver)
  if (comprimentosVergalhao.length > 0) {
    const descricaoCortes = gruposVergalhao.map(g => `${g.qtd}x ${g.tamanho.toFixed(2)}m`).join(', ');
    addLinha(
      'Vergalhão CA-60 6mm',
      `${barrasVergalhao} barra(s) de 12 m`,
      `${comprimentosVergalhao.length} peças: ${descricaoCortes}`,
      custoProdutoPorId(26, 25.00),
      custoTotalVergalhao
    );
  }

  // Serviços gerais
  addLinha('Disco de Corte', '1 un', '', custoProduto('Disco de Corte', 10), custoProduto('Disco de Corte', 10));
  addLinha('ART', '1 un', '', custoProduto('ART', 28), custoProduto('ART', 28));
  addLinha('Plotagem', '1 un', '', custoProduto('Plotagem de Projeto', 10), custoProduto('Plotagem de Projeto', 10));
  addLinha('Viagem', '1 un', '', custoProduto('Viagem de Entrega', 50), custoProduto('Viagem de Entrega', 50));
  const ajudanteTotal = totalArea * custoProduto('Diária de Ajudante', 4.5);
  addLinha('Diária Ajudante', `${totalArea.toFixed(2)} m²`, '', custoProduto('Diária de Ajudante', 4.5), ajudanteTotal);
  const comissaoTotal = totalArea * custoProduto('Comissão', 1);
  addLinha('Comissão', `${totalArea.toFixed(2)} m²`, '', custoProduto('Comissão', 1), comissaoTotal);
  if (tiposEnchimento.has('EPS')) {
    const laudo = custoProduto('Laudo Técnico', 300);
    if (laudo > 0) addLinha('Laudo Técnico', '1 un', '', laudo, laudo);
  }

  LAJE.custoTotalDetalhamento = custoTotal;
  LAJE.areaTotalDetalhamento = totalArea;

  const margemInicial = 40;
  let precoVendaInicial = custoTotal * (1 + margemInicial / 100);
// Como o frete já vem marcado, aplica 6%
  precoVendaInicial *= 1.06;
  const precoM2Inicial = totalArea > 0 ? precoVendaInicial / totalArea : 0;

  const html = `
    <div class="bg-white rounded-xl border shadow-sm p-6">
      <h3 class="font-bold text-slate-800 mb-4 flex justify-between items-center">
        <span>Detalhamento de Custos e Materiais</span>
        <button onclick="imprimirDetalhamento()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 no-print">
          <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
        </button>
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left">Descrição</th>
              <th class="p-3 text-center">Quantidade</th>
              <th class="p-3 text-center">Composição</th>
              <th class="p-3 text-right">Valor Unit.</th>
              <th class="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${linhas.map(l => `
              <tr class="border-b">
                <td class="p-3 font-medium">${l.desc}</td>
                <td class="p-3 text-center">${l.qtd}</td>
                <td class="p-3 text-center text-xs text-slate-500">${l.composicao}</td>
                <td class="p-3 text-right">${l.unitario}</td>
                <td class="p-3 text-right">${l.total}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Custo Total</p>
          <p class="text-2xl font-bold text-slate-800" id="detalhe-custo-total">${formatMoney(custoTotal)}</p>
        </div>
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <label class="text-slate-500 text-sm block">Margem de Lucro (%)</label>
          <input type="number" id="detalhe-margem-lucro" value="40" min="0" max="200" step="0.1"
            class="w-24 text-center border rounded p-1 mt-1 mx-auto" onchange="recalcularDetalhamento()">
        </div>
        <div class="bg-white border border-slate-200 p-4 rounded-lg text-center flex flex-col items-center justify-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="detalhe-frete-check" class="w-5 h-5 accent-orange-600" onchange="recalcularDetalhamento()" checked>
            <span class="text-sm font-medium text-slate-700">Frete (6%)</span>
          </label>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Preço de Venda</p>
          <p class="text-2xl font-bold text-orange-600" id="detalhe-preco-venda">${formatMoney(precoVendaInicial)}</p>
          <p class="text-xs text-slate-500"><span id="detalhe-preco-m2">${formatMoney(precoM2Inicial)}</span> / m²</p>       
          <button onclick="enviarParaOrcamento()" class="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1 whitespace-nowrap">
            <i data-lucide="send" class="w-3 h-3"></i> Enviar para Orçamento
          </button>
        </div>        
      </div>      
      <p class="text-xs text-slate-400 mt-2">* Ajuste a margem de lucro ou marque o frete para recalcular o preço de venda automaticamente.</p>
    </div>
  `;

  document.getElementById('laje-detalhamento-resultado').innerHTML = html;
  document.getElementById('laje-detalhamento-resultado').classList.remove('hidden');
  showLoading(false);
  lucide.createIcons();
}





/*async function gerarDetalhamento() {
  const idOrc = document.getElementById('laje-detalhamento-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);
  showLoading(true);

  // 1. Buscar itens do orçamento
  const { data: itens, error } = await sb.from('laje_itens_orcamento').select('*').eq('id_orcamento', idOrc);
  if (error || !itens?.length) { showLoading(false); return showToast('Nenhum item.', true); }

  // 2. Garantir lista de produtos carregada
  await carregarProdutosLajeSilencioso();

  let totalVigotas = 0, totalArea = 0, totalEpsLinear = 0;
  const tamanhosVigota = [];
  const tiposEnchimento = new Set();
  const alturas = new Set();
  itens.forEach(i => {
    totalVigotas += Number(i.qtd_vigotas);
    totalArea += Number(i.area || (i.vao_menor * i.vao_maior));
    if (i.tipo_enchimento === 'EPS') totalEpsLinear += Number(i.metragem_eps);
    for (let j = 0; j < Number(i.qtd_vigotas); j++) tamanhosVigota.push(Number(i.tamanho_vigota));
    tiposEnchimento.add(i.tipo_enchimento);
    alturas.add(i.altura);
  });

  const metrosLinearesTrelica = tamanhosVigota.reduce((a, b) => a + b, 0);

  // ========== ALGORITMO DE CORTE ==========
  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhosVigota, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhosVigota, barra12m, 100);
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhosVigota, barra12m);
  } else {
    barras = binPackingFFD(tamanhosVigota, barra12m);
  }

  const numBarras = barras.length;
  const alturaModa = [...alturas].sort((a, b) => b - a)[0] || 8;
  const tipoPredominante = [...tiposEnchimento][0] || 'EPS';

  // Capeamento (apenas sobre as vigotas)
  const espessuraCapeamento = 0.02; // 2 cm fixo
  const larguraCapeamento = 0.12;   // 12 cm de largura
  const secaoCapeamento = larguraCapeamento * espessuraCapeamento;
  const volumeConcreto = metrosLinearesTrelica * secaoCapeamento;

  // Traço (rendimento linear de 48 m por traço)
  const volumePorTraco = 0.1152;
  const numTracos = Math.ceil(volumeConcreto / volumePorTraco);
  const metrosLinearesPorTraco = 48;
  const sacosCimento = Math.ceil(numTracos * 1.5);
  const areiaM3 = numTracos * (6.5 * 0.018);
  const britaM3 = numTracos * (5 * 0.018);
  const latasAreia = Math.round(areiaM3 / 0.018);
  const latasBrita = Math.round(britaM3 / 0.018);

  // ========== VERGALHÃO 6mm (ID 26) PARA VIGOTAS COM TAMANHO >= 3,40 m ==========
  // Coleta todos os comprimentos das vigotas que atendem à condição
  const comprimentosVergalhao = [];
  for (const item of itens) {
    const tamVigota = Number(item.tamanho_vigota);
    const qtdVigotas = Number(item.qtd_vigotas);
    if (tamVigota >= 3.40) {
      for (let i = 0; i < qtdVigotas; i++) {
        comprimentosVergalhao.push(tamVigota);
      }
    }
  }

  let barrasVergalhao = 0;
  let custoTotalVergalhao = 0;
  let gruposVergalhao = []; // para exibição

  if (comprimentosVergalhao.length > 0) {
    // Usa o mesmo algoritmo de corte selecionado pelo usuário
    let corteVergalhao;
    if (LAJE.algoritmoCorte === 'BFD') {
      corteVergalhao = binPackingBFD(comprimentosVergalhao, 12.0);
    } else if (LAJE.algoritmoCorte === 'RBF') {
      corteVergalhao = binPackingRBF(comprimentosVergalhao, 12.0, 100);
    } else if (LAJE.algoritmoCorte === 'DP') {
      corteVergalhao = binPackingDP(comprimentosVergalhao, 12.0);
    } else {
      corteVergalhao = binPackingFFD(comprimentosVergalhao, 12.0);
    }

    barrasVergalhao = corteVergalhao.length;

    // Agrupa os cortes iguais para exibição
    const gruposMap = new Map();
    corteVergalhao.forEach(barra => {
      barra.cortes.forEach(corte => {
        const key = corte.toFixed(2);
        gruposMap.set(key, (gruposMap.get(key) || 0) + 1);
      });
    });
    gruposVergalhao = Array.from(gruposMap.entries())
      .map(([tamanho, qtd]) => ({ tamanho: parseFloat(tamanho), qtd }))
      .sort((a, b) => b.tamanho - a.tamanho);

    const custoPorBarraVerg = custoProdutoPorId(26, 25.00);
    custoTotalVergalhao = barrasVergalhao * custoPorBarraVerg;
  }

  // Funções auxiliares
  function custoProduto(nomePadrao, padrao = 0) {
    const p = LAJE.produtosList.find(x => x.descricao === nomePadrao);
    return p ? Number(p.custo_unitario) : padrao;
  }

  function custoProdutoPorId(id, padrao = 0) {
    const p = LAJE.produtosList.find(x => x.id === id);
    return p ? Number(p.custo_unitario) : padrao;
  }

  const linhas = [];
  let custoTotal = 0;

  function addLinha(desc, qtd, composicao, vlrUnit, vlrTotal) {
    linhas.push({
      desc,
      qtd,
      composicao: composicao || '',
      unitario: formatMoney(vlrUnit),
      total: formatMoney(vlrTotal)
    });
    custoTotal += vlrTotal;
  }

  // Treliça
  const trelicaNome = `Treliça TG${alturaModa} 12m`;
  const custoTrelica = custoProduto(trelicaNome, alturaModa <= 8 ? 68 : (alturaModa <= 12 ? 92 : 105));
  addLinha('Treliça', `${numBarras} barras`, `${metrosLinearesTrelica.toFixed(2)} m lineares`, custoTrelica, numBarras * custoTrelica);

  // Enchimento – EPS
  if (tiposEnchimento.has('EPS')) {
    const placasEps = Math.ceil(totalEpsLinear);
    const epsNome = `EPS H${alturaModa} placa 50x100`;
    const custoEpsPlaca = custoProduto(epsNome, 11.90);
    addLinha(
      'EPS (isopor)',
      `${placasEps} placas`,
      `${totalEpsLinear.toFixed(2)} m lineares (equivale a ${placasEps} placas de 1,00×0,50 m)`,
      custoEpsPlaca,
      placasEps * custoEpsPlaca
    );
    const freteIsopor = custoProduto('Frete Isopor', 0);
    if (freteIsopor > 0) addLinha('Frete do isopor', '1 un', '', freteIsopor, freteIsopor);
  }

  // Enchimento – Lajota
  if (tiposEnchimento.has('LAJOTA_CERAMICA')) {
    const totalLajotas = Math.ceil(totalArea * 12);
    const custoLajota = custoProduto('Lajota Cerâmica', 1.7);
    addLinha('Lajota', `${totalLajotas} peças`, '', custoLajota, totalLajotas * custoLajota);
    const freteLajota = custoProduto('Frete Lajota', 50);
    addLinha('Frete da lajota', '1 un', '', freteLajota, freteLajota);
  }

  // Concreto
  addLinha(
    'Cimento',
    `${sacosCimento} sacos`,
    `${numTracos} traços (${metrosLinearesPorTraco.toFixed(0)} m lineares de capeamento por traço)`,
    custoProduto('Cimento CP II 50kg', 37),
    sacosCimento * custoProduto('Cimento CP II 50kg', 37)
  );
  addLinha(
    'Areia Grossa',
    `${areiaM3.toFixed(3)} m³`,
    `${latasAreia} latas (18 L)`,
    custoProduto('Areia Grossa', 200),
    areiaM3 * custoProduto('Areia Grossa', 200)
  );
  addLinha(
    'Brita 0',
    `${britaM3.toFixed(3)} m³`,
    `${latasBrita} latas (18 L)`,
    custoProduto('Brita 0', 200),
    britaM3 * custoProduto('Brita 0', 200)
  );

  // Vergalhão (se houver)
  if (comprimentosVergalhao.length > 0) {
    const descricaoCortes = gruposVergalhao.map(g => `${g.qtd}x ${g.tamanho.toFixed(2)}m`).join(', ');
    addLinha(
      'Vergalhão CA-60 6mm',
      `${barrasVergalhao} barra(s) de 12 m`,
      `${comprimentosVergalhao.length} peças: ${descricaoCortes}`,
      custoProdutoPorId(26, 25.00),
      custoTotalVergalhao
    );
  }

  // Serviços gerais
  addLinha('Disco de Corte', '1 un', '', custoProduto('Disco de Corte', 10), custoProduto('Disco de Corte', 10));
  addLinha('ART', '1 un', '', custoProduto('ART', 28), custoProduto('ART', 28));
  addLinha('Plotagem', '1 un', '', custoProduto('Plotagem de Projeto', 10), custoProduto('Plotagem de Projeto', 10));
  addLinha('Viagem', '1 un', '', custoProduto('Viagem de Entrega', 50), custoProduto('Viagem de Entrega', 50));
  const ajudanteTotal = totalArea * custoProduto('Diária de Ajudante', 4.5);
  addLinha('Diária Ajudante', `${totalArea.toFixed(2)} m²`, '', custoProduto('Diária de Ajudante', 4.5), ajudanteTotal);
  const comissaoTotal = totalArea * custoProduto('Comissão', 1);
  addLinha('Comissão', `${totalArea.toFixed(2)} m²`, '', custoProduto('Comissão', 1), comissaoTotal);
  if (tiposEnchimento.has('EPS')) {
    const laudo = custoProduto('Laudo Técnico', 300);
    if (laudo > 0) addLinha('Laudo Técnico', '1 un', '', laudo, laudo);
  }

  LAJE.custoTotalDetalhamento = custoTotal;
  LAJE.areaTotalDetalhamento = totalArea;

  const margemInicial = 20;
  const precoVendaInicial = custoTotal * (1 + margemInicial / 100);
  const precoM2Inicial = totalArea > 0 ? precoVendaInicial / totalArea : 0;

  const html = `
    <div class="bg-white rounded-xl border shadow-sm p-6">
      <h3 class="font-bold text-slate-800 mb-4 flex justify-between items-center">
        <span>Detalhamento de Custos e Materiais</span>
        <button onclick="imprimirDetalhamento()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 no-print">
          <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
        </button>
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left">Descrição</th>
              <th class="p-3 text-center">Quantidade</th>
              <th class="p-3 text-center">Composição</th>
              <th class="p-3 text-right">Valor Unit.</th>
              <th class="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${linhas.map(l => `
              <tr class="border-b">
                <td class="p-3 font-medium">${l.desc}</td>
                <td class="p-3 text-center">${l.qtd}</td>
                <td class="p-3 text-center text-xs text-slate-500">${l.composicao}</td>
                <td class="p-3 text-right">${l.unitario}</td>
                <td class="p-3 text-right">${l.total}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Custo Total</p>
          <p class="text-2xl font-bold text-slate-800" id="detalhe-custo-total">${formatMoney(custoTotal)}</p>
        </div>
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <label class="text-slate-500 text-sm block">Margem de Lucro (%)</label>
          <input type="number" id="detalhe-margem-lucro" value="20" min="0" max="200" step="0.1"
            class="w-24 text-center border rounded p-1 mt-1 mx-auto" onchange="recalcularDetalhamento()">
        </div>
        <div class="bg-white border border-slate-200 p-4 rounded-lg text-center flex flex-col items-center justify-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="detalhe-frete-check" class="w-5 h-5 accent-orange-600" onchange="recalcularDetalhamento()">
            <span class="text-sm font-medium text-slate-700">Frete (6%)</span>
          </label>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Preço de Venda</p>
          <p class="text-2xl font-bold text-orange-600" id="detalhe-preco-venda">${formatMoney(precoVendaInicial)}</p>
          <p class="text-xs text-slate-500"><span id="detalhe-preco-m2">${formatMoney(precoM2Inicial)}</span> / m²</p>       
          <button onclick="enviarParaOrcamento()" class="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1 whitespace-nowrap">
            <i data-lucide="send" class="w-3 h-3"></i> Enviar para Orçamento
          </button>
        </div>        
      </div>      
      <p class="text-xs text-slate-400 mt-2">* Ajuste a margem de lucro ou marque o frete para recalcular o preço de venda automaticamente.</p>
    </div>
  `;

  document.getElementById('laje-detalhamento-resultado').innerHTML = html;
  document.getElementById('laje-detalhamento-resultado').classList.remove('hidden');
  showLoading(false);
  lucide.createIcons();
}*/












function recalcularDetalhamento() {
  const margemInput = document.getElementById('detalhe-margem-lucro');
  const freteCheck = document.getElementById('detalhe-frete-check');
  if (!margemInput) return;

  const margem = parseFloat(margemInput.value) || 0;
  const custo = LAJE.custoTotalDetalhamento || 0;
  const area = LAJE.areaTotalDetalhamento || 1;

  let precoVenda = custo * (1 + margem / 100);
  if (freteCheck && freteCheck.checked) {
    precoVenda = precoVenda * 1.06;
  }

  const precoM2 = precoVenda / area;

  const pv = document.getElementById('detalhe-preco-venda');
  const pm = document.getElementById('detalhe-preco-m2');
  if (pv) pv.innerText = formatMoney(precoVenda);
  if (pm) pm.innerText = formatMoney(precoM2);
}


function binPackingRBF(tamanhos, comprimentoBarra = 12.0, iteracoes = 100) {
  if (tamanhos.length === 0) return [];
  
  let melhorBarras = null;
  let melhorSobraTotal = Infinity;
  let melhorNumBarras = Infinity;

  for (let iter = 0; iter < iteracoes; iter++) {
    // Embaralha aleatoriamente (Fisher-Yates)
    const copia = [...tamanhos];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    
    // Aplica BFD na ordem embaralhada
    const barras = binPackingBFD(copia, comprimentoBarra);
    const sobraTotal = barras.reduce((s, b) => s + b.sobra, 0);
    const numBarras = barras.length;

    // Critério de seleção: prioriza menor número de barras, depois menor sobra total
    if (numBarras < melhorNumBarras || (numBarras === melhorNumBarras && sobraTotal < melhorSobraTotal)) {
      melhorBarras = barras;
      melhorSobraTotal = sobraTotal;
      melhorNumBarras = numBarras;
    }
  }

  // Ordena as barras do melhor resultado por sobra crescente para exibição
  melhorBarras.sort((a, b) => a.sobra - b.sobra);
  return melhorBarras;
}


// ==================== CONFIGURAÇÃO DE CUSTOS ====================
const CUSTOS_EDITAVEIS = [
  { chave: 'custo_trelica_eps_h8', label: 'Treliça EPS H8 (barra 12m)' },
  { chave: 'custo_trelica_eps_h12', label: 'Treliça EPS H12 (barra 12m)' },
  { chave: 'custo_trelica_eps_h16', label: 'Treliça EPS H16 (barra 12m)' },
  { chave: 'custo_trelica_eps_h20', label: 'Treliça EPS H20 (barra 12m)' },
  { chave: 'custo_trelica_lajota_h8', label: 'Treliça Lajota H8 (barra 12m)' },
  { chave: 'custo_trelica_lajota_h12', label: 'Treliça Lajota H12 (barra 12m)' },
  { chave: 'custo_eps_h8_metro', label: 'EPS H8 (metro linear)' },
  { chave: 'custo_eps_h12_metro', label: 'EPS H12 (metro linear)' },
  { chave: 'custo_eps_h16_metro', label: 'EPS H16 (metro linear)' },
  { chave: 'custo_eps_h20_metro', label: 'EPS H20 (metro linear)' },
  { chave: 'custo_lajota_peca', label: 'Lajota Cerâmica (peça)' },
  { chave: 'custo_concreto_m3', label: 'Concreto (m³)' },
  { chave: 'custo_ajudante_m2', label: 'Diária Ajudante (por m²)' },
  { chave: 'custo_viagem', label: 'Viagem de Entrega' },
  { chave: 'custo_art', label: 'ART' },
  { chave: 'custo_plotagem', label: 'Plotagem de Projeto' },
  { chave: 'custo_comissao_m2', label: 'Comissão (por m²)' },
  { chave: 'custo_disco_corte', label: 'Disco de Corte' },
  { chave: 'custo_frete_lajota', label: 'Frete Lajota' },
  { chave: 'custo_frete_isopor', label: 'Frete Isopor' },
  { chave: 'custo_laudo', label: 'Laudo Técnico' },
  { chave: 'margem_lucro_laje', label: 'Margem de Lucro (%)' }
];

function abrirModalCustosMateriais() {
  const container = document.getElementById('custos-form-container');
  container.innerHTML = CUSTOS_EDITAVEIS.map(item => {
    const valorAtual = obterConfig(item.chave, 0);
    return `<div>
      <label class="block text-xs font-bold text-slate-500 mb-1">${item.label}</label>
      <input type="number" id="cfg-${item.chave}" value="${valorAtual}" step="0.01" class="w-full p-3 border rounded-lg text-sm">
    </div>`;
  }).join('');

  document.getElementById('modal-custos-materiais').classList.remove('hidden');
  lucide.createIcons();
}

function fecharModalCustosMateriais() {
  document.getElementById('modal-custos-materiais').classList.add('hidden');
}

async function salvarCustosMateriais() {
  showLoading(true);
  try {
    const updates = CUSTOS_EDITAVEIS.map(item => {
      const input = document.getElementById(`cfg-${item.chave}`);
      return { chave: item.chave, valor: input.value };
    });

    // Atualizar cada configuração no Supabase
    for (const { chave, valor } of updates) {
      await sb.from('configuracoes').upsert({ chave, valor });
    }

    // Recarregar configurações no STATE
    STATE.configLaje = {};
    const { data: configs } = await sb.from('configuracoes').select('*');
    if (configs) {
      configs.forEach(c => { STATE.configLaje[c.chave] = c.valor; });
    }

    fecharModalCustosMateriais();
    showToast('Custos atualizados com sucesso!');
    // Recarregar o detalhamento atual se houver um orçamento selecionado
    const idOrc = document.getElementById('laje-detalhamento-select')?.value;
    if (idOrc) gerarDetalhamento();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, true);
  }
  showLoading(false);
}

/* ======================================================== cloude ===========================*/

// ==================== ALGORITMO DP — CORTE ÓTIMO ====================
/**
 * binPackingDP — Programação Dinâmica para corte 1D
 * Garante o menor número de barras possível usando memoização.
 * Para cada barra, encontra a combinação de peças que maximiza
 * o uso sem ultrapassar 12m, priorizando o menor desperdício.
 * Ideal para lotes com poucos tamanhos distintos (caso típico de lajes).
 */
function binPackingDP(tamanhos, comprimentoBarra = 12.0, precisao = 100) {
  if (tamanhos.length === 0) return [];

  // Arredonda para inteiros escalados (evita problemas de float)
  const escala = precisao; // 1 unidade = 0.01m → precisão de 1cm
  const C = Math.round(comprimentoBarra * escala);
  const itens = tamanhos.map(t => Math.round(t * escala));

  // Conta quantas peças de cada tamanho temos
  const contagem = new Map();
  itens.forEach(t => contagem.set(t, (contagem.get(t) || 0) + 1));
  const tipos = [...contagem.keys()].sort((a, b) => b - a); // maiores primeiro

  // DP: para cada capacidade c (0..C), qual o máximo que conseguimos preencher
  // usando as peças disponíveis (sem repetir além do estoque)
  // Resultado: dp[c] = {usado, peçasUsadas[]}
  function melhorCombinacaoParaBarra(disponivel) {
    // disponivel: Map<tamanho, qtd restante>
    const dp = new Array(C + 1).fill(null);
    dp[0] = { usado: 0, pecas: [] };

    for (const [tam, qtd] of disponivel) {
      if (qtd <= 0) continue;
      // Itera de trás para frente para cada quantidade disponível deste tipo
      for (let q = 1; q <= qtd; q++) {
        // De C até tam (bounded knapsack, 1 item por vez)
        for (let c = C; c >= tam; c--) {
          if (dp[c - tam] !== null) {
            const novoUsado = dp[c - tam].usado + tam;
            if (novoUsado === c && (dp[c] === null || dp[c].usado < novoUsado)) {
              dp[c] = {
                usado: novoUsado,
                pecas: [...dp[c - tam].pecas, tam]
              };
            }
          }
        }
      }
    }

    // Encontra o melhor preenchimento (maior usado sem ultrapassar C)
    let melhor = dp[0];
    for (let c = C; c >= 0; c--) {
      if (dp[c] !== null && dp[c].usado > melhor.usado) {
        melhor = dp[c];
      }
    }
    return melhor;
  }

  // Knapsack bounded completo para maximizar uso de cada barra
  function knapsackBounded(disponivel) {
    // Cria array de todos os itens disponíveis
    const todosItens = [];
    for (const [tam, qtd] of disponivel) {
      for (let q = 0; q < qtd; q++) todosItens.push(tam);
    }

    // DP simples 0/1 com rastreamento
    const n = todosItens.length;
    // Para evitar explosão de memória, limitamos a 60 itens por barra
    const MAX_ITENS = 60;
    const itensUsados = todosItens.slice(0, MAX_ITENS);
    const m = itensUsados.length;

    // dp[j] = maior soma ≤ C usando subconjunto dos primeiros i itens
    const dp = new Int32Array(C + 1);
    const escolha = Array.from({ length: m }, () => new Uint8Array(C + 1));

    for (let i = 0; i < m; i++) {
      const tam = itensUsados[i];
      for (let c = C; c >= tam; c--) {
        if (dp[c - tam] + tam > dp[c]) {
          dp[c] = dp[c - tam] + tam;
          escolha[i][c] = 1;
        }
      }
    }

    // Reconstrói quais peças foram escolhidas
    const pecasEscolhidas = [];
    let c = C;
    for (let i = m - 1; i >= 0; i--) {
      if (escolha[i][c]) {
        pecasEscolhidas.push(itensUsados[i]);
        c -= itensUsados[i];
      }
    }

    return { usado: dp[C] > 0 ? dp[C] : dp.reduce((mx, v) => Math.max(mx, v), 0), pecas: pecasEscolhidas };
  }

  // Processo principal: preenche barras uma a uma
  const barras = [];
  const disponivel = new Map(contagem); // cópia mutável
  let totalRestante = itens.length;

  while (totalRestante > 0) {
    const resultado = knapsackBounded(disponivel);

    if (resultado.pecas.length === 0) {
      // Segurança: pega a menor peça restante
      for (const [tam, qtd] of disponivel) {
        if (qtd > 0) {
          resultado.pecas = [tam];
          resultado.usado = tam;
          break;
        }
      }
    }

    // Remove as peças usadas do estoque
    const contLocal = new Map();
    resultado.pecas.forEach(p => contLocal.set(p, (contLocal.get(p) || 0) + 1));
    for (const [tam, qtdUsada] of contLocal) {
      disponivel.set(tam, disponivel.get(tam) - qtdUsada);
      if (disponivel.get(tam) <= 0) disponivel.delete(tam);
      totalRestante -= qtdUsada;
    }

    const usadoReal = parseFloat((resultado.usado / escala).toFixed(3));
    const sobraReal = parseFloat((comprimentoBarra - usadoReal).toFixed(3));

    barras.push({
      cortes: resultado.pecas.map(p => parseFloat((p / escala).toFixed(3))).sort((a, b) => b - a),
      usado: usadoReal,
      sobra: sobraReal
    });
  }

  barras.sort((a, b) => a.sobra - b.sobra);
  return barras;
}


async function enviarParaOrcamento() {
  const idOrc = document.getElementById('laje-detalhamento-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);

  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  if (!orc) return showToast('Orçamento não encontrado.', true);

  const pmElem = document.getElementById('detalhe-preco-m2');
  if (!pmElem) return showToast('Gere o detalhamento primeiro.', true);

  // Extrai número do texto formatado (ex: "R$ 1.234,56")
  const precoM2 = parseFloat(
    pmElem.innerText.replace(/[^0-9,]/g, '').replace(',', '.')
  ) || 0;
  if (precoM2 <= 0) return showToast('Preço por m² inválido.', true);

  const areaTotal = LAJE.areaTotalDetalhamento || 0;
  if (areaTotal <= 0) return showToast('Área total inválida.', true);

  // Busca o produto fixo de ID 1138
  const { data: prod, error: prodErr } = await sb
    .from('produtos')
    .select('*')
    .eq('id', 1138)
    .single();
  if (prodErr || !prod) return showToast('Produto base (ID 1138) não encontrado.', true);

  const valorTotal = parseFloat((areaTotal * precoM2).toFixed(2));
  const dataISO = new Date().toISOString();
  const novoId = getNextId();   // já existe no sistema

  const logEntry = {
    id: novoId,
    tipo: 'orcamento',
    produto_nome: prod.nome,
    quantidade: areaTotal,
    data: dataISO,
    observacao: `Orçamento gerado a partir da laje #${idOrc}`,
    valor_total: valorTotal,
    cliente_nome: orc.cliente_nome,
    forma_pagamento: 'A Combinar',
    status: 'ABERTO',
    desconto: 0,
    status_financeiro: '$',
    endereco_entrega: '',
    status_entrega: '',
    qtd_entregue: 0,
    vencimento: dataISO,
    valor_pago: 0
  };

  // 👇 LOG COMPLETO NO CONSOLE (abra F12 antes de clicar)
  console.log('Payload enviado para logs:', JSON.stringify(logEntry, null, 2));

  try {
    const { error, data: inserted } = await sb.from('logs').insert([logEntry]).select();

    if (error) {
      console.error('Erro Supabase:', error);
      showToast('Erro ao criar orçamento: ' + error.message, true);
      return;
    }

    console.log('Sucesso:', inserted);
    showToast('Orçamento criado com sucesso!');
    await loadData();
    navigate('quotes');
  } catch (err) {
    console.error('Exceção ao inserir:', err);
    showToast('Erro ao criar orçamento: ' + err.message, true);
  }
}


/*function imprimirDetalhamento() {
  const resultado = document.getElementById('laje-detalhamento-resultado');
  if (!resultado || resultado.classList.contains('hidden')) {
    return showToast('Gere o detalhamento primeiro.', true);
  }

  const printArea = document.getElementById('print-area');
  if (!printArea) return;

  // Clona o conteúdo para não remover da tela
  printArea.innerHTML = resultado.innerHTML;

  // Aplica estilos de impressão inline para melhorar a aparência
  const estilo = document.createElement('style');
  estilo.textContent = `
    body { background: white; font-family: Arial, sans-serif; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f1f5f9; }
    .bg-slate-50, .bg-orange-50, .bg-white { background: #f9fafb !important; }
    .rounded-lg { border-radius: 8px; }
    .shadow-sm { box-shadow: none; }
    .p-4, .p-6 { padding: 12px; }
    .text-2xl { font-size: 1.25rem; }
    button { display: none; }
    #detalhe-margem-lucro { border: 1px solid #ccc; }
  `;
  printArea.appendChild(estilo);

  setTimeout(() => {
    window.print();
    limparAreaImpressao();
  }, 300);
}*/

function imprimirDetalhamento() {
  const resultado = document.getElementById('laje-detalhamento-resultado');
  if (!resultado || resultado.classList.contains('hidden')) {
    return showToast('Gere o detalhamento primeiro.', true);
  }

  // Captura os valores exibidos na tela (já com margem/frete aplicados)
  const custoTotalEl = document.getElementById('detalhe-custo-total');
  const precoVendaEl = document.getElementById('detalhe-preco-venda');
  const precoM2El    = document.getElementById('detalhe-preco-m2');
  const margemInput  = document.getElementById('detalhe-margem-lucro');
  const freteCheck   = document.getElementById('detalhe-frete-check');

  const custoTotal   = custoTotalEl ? custoTotalEl.innerText : '0,00';
  const precoVenda   = precoVendaEl ? precoVendaEl.innerText : '0,00';
  const precoM2      = precoM2El    ? precoM2El.innerText    : '0,00';
  const margemLucro  = margemInput  ? margemInput.value      : '20';
  const freteAtivo   = freteCheck   ? freteCheck.checked     : false;

  // Clona a tabela de materiais (remove botões e inputs)
  const tabela = resultado.querySelector('table');
  let tabelaHTML = '';
  if (tabela) {
    const cloneTabela = tabela.cloneNode(true);
    // Remove a coluna de "Composição" para economizar espaço na impressão (opcional – mantenha se quiser)
    // cloneTabela.querySelectorAll('th:nth-child(3), td:nth-child(3)').forEach(el => el.remove());
    tabelaHTML = cloneTabela.outerHTML;
  }

  const printArea = document.getElementById('print-area');
  if (!printArea) return;

  printArea.innerHTML = `
    <style>
      /* Reset e fonte compacta */
      * { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 1.3; }
      body { margin: 0; padding: 0; }
      .container { max-width: 100%; padding: 10mm; }
      h1 { font-size: 18px; margin: 0 0 8px 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td { padding: 5px 6px; border-bottom: 1px solid #ddd; text-align: left; }
      th { background: #f1f5f9; font-weight: bold; }
      .totais { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; }
      .card { flex: 1; padding: 10px; border-radius: 8px; background: #f9fafb; text-align: center; }
      .card.valor { background: #fff7ed; }
      .card h2 { font-size: 20px; margin: 4px 0; }
      .card p { margin: 0; color: #555; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
    <div class="container">
      <h1>Detalhamento de Custos e Materiais</h1>
      ${tabelaHTML}
      <div class="totais">
        <div class="card">
          <p>Custo Total</p>
          <h2>${custoTotal}</h2>
        </div>
        <div class="card">
          <p>Margem de Lucro</p>
          <h2>${margemLucro}%</h2>
          ${freteAtivo ? '<p style="font-size:10px; color:#ea580c;">Frete (6%) incluso</p>' : ''}
        </div>
        <div class="card valor">
          <p>Preço de Venda</p>
          <h2>${precoVenda}</h2>
          <p>${precoM2} / m²</p>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    window.print();
    limparAreaImpressao();
  }, 300);
}


/*==========================================================================================================================================*/

// ==================== ABA ENTREGAS ====================

// Carrega o <select> com orçamentos aprovados
async function carregarSelectOrcamentosEntregas() {
  const sel = document.getElementById('laje-entrega-select');
  if (!sel) return;
  const { data } = await sb.from('laje_orcamentos')
    .select('id, cliente_nome')
    .eq('status', 'APROVADO')
    .order('id', { ascending: false });
  sel.innerHTML = '<option value="">-- Selecione --</option>' +
    (data || []).map(o => `<option value="${o.id}">#${o.id} – ${o.cliente_nome}</option>`).join('');
  sel.onchange = () => carregarProgressoEntregas();
}


async function carregarProgressoEntregas() {
  const idOrc = document.getElementById('laje-entrega-select').value;
  if (!idOrc) {
    document.getElementById('laje-entrega-resumo').classList.add('hidden');
    return;
  }

  showLoading(true);

  // 1. Buscar os tamanhos e quantidades das vigotas do orçamento
  const { data: itens } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas').eq('id_orcamento', idOrc);

  // 2. Montar a lista plana de tamanhos para o algoritmo de corte
  const tamanhos = [];
  (itens || []).forEach(i => {
    for (let j = 0; j < Number(i.qtd_vigotas); j++) {
      tamanhos.push(Number(i.tamanho_vigota));
    }
  });

  // 3. Aplicar o algoritmo selecionado na aba Plano de Corte
  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhos, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhos, barra12m, 100);
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhos, barra12m);
  } else {
    barras = binPackingFFD(tamanhos, barra12m);
  }

  // 4. Extrair as peças reais do plano de corte (cada corte vira uma vigota individual)
  const pecasPlano = [];
  barras.forEach(barra => {
    barra.cortes.forEach(corte => {
      const t = corte.toFixed(2);
      const existente = pecasPlano.find(p => p.tamanho.toFixed(2) === t);
      if (existente) {
        existente.qtd++;
      } else {
        pecasPlano.push({ tamanho: corte, qtd: 1 });
      }
    });
  });

  // Ordena por tamanho decrescente
  pecasPlano.sort((a, b) => b.tamanho - a.tamanho);

  // 5. Calcular totais por tamanho com base no plano
  const totalPorTamanho = {};
  pecasPlano.forEach(p => {
    const t = p.tamanho.toFixed(2);
    totalPorTamanho[t] = p.qtd;
  });

  // 6. Entregas já realizadas
  const { data: entregas } = await sb.from('laje_entregas')
    .select('*').eq('id_orcamento', idOrc).order('data', { ascending: false });

  // Soma entregue por tamanho
  const entreguePorTamanho = {};
  let totalPecasEntregues = 0;
  (entregas || []).forEach(e => {
    const vigotas = e.vigotas_entregues || [];
    vigotas.forEach(v => {
      const t = Number(v.tamanho).toFixed(2);
      entreguePorTamanho[t] = (entreguePorTamanho[t] || 0) + Number(v.qtd);
      totalPecasEntregues += Number(v.qtd);
    });
  });

  // 7. Monta tabela de progresso
  const tbody = document.getElementById('laje-entrega-tbody');
  const tamanhosArr = Object.keys(totalPorTamanho).sort((a, b) => b - a);
  let totalGeral = 0, pendenteGeral = 0;
  tbody.innerHTML = tamanhosArr.map(t => {
    const total = totalPorTamanho[t] || 0;
    const entregue = entreguePorTamanho[t] || 0;
    const pendente = total - entregue;
    totalGeral += total;
    pendenteGeral += pendente;
    return `<tr class="border-b">
      <td class="p-3 font-medium">${t} m</td>
      <td class="p-3 text-center">${total}</td>
      <td class="p-3 text-center text-green-600">${entregue}</td>
      <td class="p-3 text-center ${pendente > 0 ? 'text-orange-600 font-bold' : 'text-green-600'}">${pendente}</td>
    </tr>`;
  }).join('');
  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td class="p-3">Total</td>
      <td class="p-3 text-center">${totalGeral}</td>
      <td class="p-3 text-center">${totalPecasEntregues}</td>
      <td class="p-3 text-center">${pendenteGeral}</td>
    </tr>
  `);

  // 8. Histórico de entregas (COM BOTÃO DE IMPRIMIR EM CADA LINHA)
  const histBody = document.getElementById('laje-entrega-historico-tbody');
  histBody.innerHTML = (entregas || []).map(e => {
    const vigotas = e.vigotas_entregues || [];
    const desc = vigotas.map(v => `${v.qtd}x ${Number(v.tamanho).toFixed(2)}m`).join(', ');
    const total = vigotas.reduce((s, v) => s + Number(v.qtd), 0);
    return `<tr class="border-b">
      <td class="p-3">${formatDate(e.data)}</td>
      <td class="p-3 text-xs">${desc || '-'}</td>
      <td class="p-3 text-center">${total}</td>
      <td class="p-3 text-center">
        <button onclick="imprimirEntregaHistorico(${e.id})" class="bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded text-xs hover:bg-slate-100 inline-flex items-center gap-1" title="Imprimir esta entrega">
          <i data-lucide="printer" class="w-3 h-3"></i> Imprimir
        </button>
      </td>
    </tr>`;
  }).join('');

  // 9. Atualiza o modal de entrega com as peças do plano
  LAJE.ultimasPecasPlano = pecasPlano;

  document.getElementById('laje-entrega-resumo').classList.remove('hidden');
  showLoading(false);
  lucide.createIcons();
}


/*async function carregarProgressoEntregas() {
  const idOrc = document.getElementById('laje-entrega-select').value;
  if (!idOrc) {
    document.getElementById('laje-entrega-resumo').classList.add('hidden');
    return;
  }

  showLoading(true);

  // 1. Buscar os tamanhos e quantidades das vigotas do orçamento
  const { data: itens } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas').eq('id_orcamento', idOrc);

  // 2. Montar a lista plana de tamanhos para o algoritmo de corte
  const tamanhos = [];
  (itens || []).forEach(i => {
    for (let j = 0; j < Number(i.qtd_vigotas); j++) {
      tamanhos.push(Number(i.tamanho_vigota));
    }
  });

  // 3. Aplicar o algoritmo selecionado na aba Plano de Corte
  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhos, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhos, barra12m, 100);
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhos, barra12m);
  } else {
    barras = binPackingFFD(tamanhos, barra12m);
  }

  // 4. Extrair as peças reais do plano de corte (cada corte vira uma vigota individual)
  const pecasPlano = []; // array de { tamanho, qtd }
  barras.forEach(barra => {
    barra.cortes.forEach(corte => {
      const t = corte.toFixed(2);
      const existente = pecasPlano.find(p => p.tamanho.toFixed(2) === t);
      if (existente) {
        existente.qtd++;
      } else {
        pecasPlano.push({ tamanho: corte, qtd: 1 });
      }
    });
  });

  // Ordena por tamanho decrescente
  pecasPlano.sort((a, b) => b.tamanho - a.tamanho);

  // 5. Calcular totais por tamanho com base no plano
  const totalPorTamanho = {};
  pecasPlano.forEach(p => {
    const t = p.tamanho.toFixed(2);
    totalPorTamanho[t] = p.qtd;
  });

  // 6. Entregas já realizadas
  const { data: entregas } = await sb.from('laje_entregas')
    .select('*').eq('id_orcamento', idOrc).order('data', { ascending: false });

  // Soma entregue por tamanho
  const entreguePorTamanho = {};
  let totalPecasEntregues = 0;
  (entregas || []).forEach(e => {
    const vigotas = e.vigotas_entregues || [];
    vigotas.forEach(v => {
      const t = Number(v.tamanho).toFixed(2);
      entreguePorTamanho[t] = (entreguePorTamanho[t] || 0) + Number(v.qtd);
      totalPecasEntregues += Number(v.qtd);
    });
  });

  // 7. Monta tabela de progresso
  const tbody = document.getElementById('laje-entrega-tbody');
  const tamanhosArr = Object.keys(totalPorTamanho).sort((a, b) => b - a);
  let totalGeral = 0, pendenteGeral = 0;
  tbody.innerHTML = tamanhosArr.map(t => {
    const total = totalPorTamanho[t] || 0;
    const entregue = entreguePorTamanho[t] || 0;
    const pendente = total - entregue;
    totalGeral += total;
    pendenteGeral += pendente;
    return `<tr class="border-b">
      <td class="p-3 font-medium">${t} m</td>
      <td class="p-3 text-center">${total}</td>
      <td class="p-3 text-center text-green-600">${entregue}</td>
      <td class="p-3 text-center ${pendente > 0 ? 'text-orange-600 font-bold' : 'text-green-600'}">${pendente}</td>
    </tr>`;
  }).join('');
  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td class="p-3">Total</td>
      <td class="p-3 text-center">${totalGeral}</td>
      <td class="p-3 text-center">${totalPecasEntregues}</td>
      <td class="p-3 text-center">${pendenteGeral}</td>
    </tr>
  `);

  // 8. Histórico de entregas
  const histBody = document.getElementById('laje-entrega-historico-tbody');
  histBody.innerHTML = (entregas || []).map(e => {
    const vigotas = e.vigotas_entregues || [];
    const desc = vigotas.map(v => `${v.qtd}x ${Number(v.tamanho).toFixed(2)}m`).join(', ');
    const total = vigotas.reduce((s, v) => s + Number(v.qtd), 0);
    return `<tr class="border-b">
      <td class="p-3">${formatDate(e.data)}</td>
      <td class="p-3 text-xs">${desc || '-'}</td>
      <td class="p-3 text-center">${total}</td>
    </tr>`;
  }).join('');

  // 9. Atualiza o modal de entrega com as peças do plano
  LAJE.ultimasPecasPlano = pecasPlano; // guarda para uso no modal

  document.getElementById('laje-entrega-resumo').classList.remove('hidden');
  showLoading(false);
}*/







// Abre o modal de registro de entrega
async function abrirModalEntregaLaje() {
  const idOrc = document.getElementById('laje-entrega-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);

  document.getElementById('entrega-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('entrega-obs').value = '';

  // 1. Totais por tamanho (já considerando o algoritmo de corte)
  const { data: itens } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas').eq('id_orcamento', idOrc);
  const tamanhos = [];
  (itens || []).forEach(i => {
    for (let j = 0; j < Number(i.qtd_vigotas); j++) {
      tamanhos.push(Number(i.tamanho_vigota));
    }
  });

  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhos, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhos, barra12m, 100);
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhos, barra12m);
  } else {
    barras = binPackingFFD(tamanhos, barra12m);
  }

  const pecasPlano = [];
  barras.forEach(barra => {
    barra.cortes.forEach(corte => {
      const t = corte.toFixed(2);
      const existente = pecasPlano.find(p => p.tamanho.toFixed(2) === t);
      if (existente) {
        existente.qtd++;
      } else {
        pecasPlano.push({ tamanho: corte, qtd: 1 });
      }
    });
  });
  pecasPlano.sort((a, b) => b.tamanho - a.tamanho);

  const totalPorTamanho = {};
  pecasPlano.forEach(p => {
    const t = p.tamanho.toFixed(2);
    totalPorTamanho[t] = p.qtd;
  });

  // 2. Entregas já realizadas
  const { data: entregas } = await sb.from('laje_entregas')
    .select('vigotas_entregues').eq('id_orcamento', idOrc);
  const entreguePorTamanho = {};
  (entregas || []).forEach(e => {
    (e.vigotas_entregues || []).forEach(v => {
      const t = Number(v.tamanho).toFixed(2);
      entreguePorTamanho[t] = (entreguePorTamanho[t] || 0) + Number(v.qtd);
    });
  });

  // 3. Montar inputs com valor pendente
  const container = document.getElementById('entrega-vigotas-container');
  container.innerHTML = Object.keys(totalPorTamanho).sort((a, b) => b - a).map(t => {
    const total = totalPorTamanho[t] || 0;
    const entregue = entreguePorTamanho[t] || 0;
    const pendente = total - entregue;
    return `<div class="flex items-center gap-2 mb-2">
      <span class="text-sm font-medium w-20">${t} m</span>
      <input type="number" id="ent-qtd-${t.replace('.', '_')}" value="${pendente}" min="0" max="${total}"
        class="w-20 p-2 border rounded text-sm text-center">
      <span class="text-xs text-slate-400">/ ${total} un ${pendente !== total ? `(já entregue: ${entregue})` : ''}</span>
    </div>`;
  }).join('');

  document.getElementById('modal-entrega-laje').classList.remove('hidden');
}

function fecharModalEntregaLaje() {
  document.getElementById('modal-entrega-laje').classList.add('hidden');
}

// Registra a entrega no banco
async function registrarEntregaLaje() {
  const idOrc = document.getElementById('laje-entrega-select').value;
  const data = document.getElementById('entrega-data').value;
  const obs = document.getElementById('entrega-obs').value;

  // Monta o array de vigotas entregues
  const container = document.getElementById('entrega-vigotas-container');
  const inputs = container.querySelectorAll('input[type=number]');
  const vigotas = [];
  let totalEntregue = 0;
  inputs.forEach(input => {
    const qtd = parseInt(input.value) || 0;
    if (qtd > 0) {
      const tamanho = parseFloat(input.id.replace('ent-qtd-', '').replace('_', '.'));
      vigotas.push({ tamanho, qtd });
      totalEntregue += qtd;
    }
  });

  if (totalEntregue === 0) return showToast('Informe pelo menos uma vigota.', true);
  if (!data) return showToast('Informe a data.', true);

  const { error } = await sb.from('laje_entregas').insert({
    id_orcamento: parseInt(idOrc),
    data: new Date(data).toISOString(),
    vigotas_entregues: vigotas,
    observacao: obs
  });

  if (error) return showToast('Erro ao registrar: ' + error.message, true);

  fecharModalEntregaLaje();
  showToast('Entrega registrada!');
  carregarProgressoEntregas();
}




function imprimirRegistroEntregaModal() {
  const idOrc = document.getElementById('laje-entrega-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);

  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  const cliente = orc ? orc.cliente_nome : 'Não informado';
  const dataEntrega = document.getElementById('entrega-data').value || new Date().toLocaleDateString('pt-BR');

  // Coleta as vigotas informadas no modal
  const container = document.getElementById('entrega-vigotas-container');
  const inputs = container.querySelectorAll('input[type=number]');
  const vigotas = [];
  let totalMetrosLineares = 0;

  inputs.forEach(input => {
    const qtd = parseInt(input.value) || 0;
    if (qtd > 0) {
      const tamanho = parseFloat(input.id.replace('ent-qtd-', '').replace('_', '.'));
      const metros = tamanho * qtd;
      totalMetrosLineares += metros;
      vigotas.push({ tamanho, qtd, metros });
    }
  });

  if (vigotas.length === 0) return showToast('Nenhuma vigota informada.', true);

  // Calcula m² (considerando capeamento padrão de 0,50m entre eixos)
  const larguraUtil = 0.50; // m² por metro linear (inter-eixo padrão)
  const totalM2 = totalMetrosLineares * larguraUtil;

  const linhas = vigotas.map(v => `
    <tr>
      <td style="padding:4px 8px; border:1px solid #000; text-align:center; font-weight:bold;">${v.qtd}x</td>
      <td style="padding:4px 8px; border:1px solid #000;">${v.tamanho.toFixed(2)} m</td>
      <td style="padding:4px 8px; border:1px solid #000; text-align:right;">${v.metros.toFixed(2)} m</td>
      <td style="padding:4px 8px; border:1px solid #000; text-align:center; font-size:16px;">☐</td>
    </tr>
  `).join('');

  const printArea = document.getElementById('print-area');
  printArea.innerHTML = `
    <div style="font-family:'Segoe UI', Arial, sans-serif; padding:10mm; max-width:190mm; margin:0 auto; background:#fff; font-size:12px;">
      <table width="100%" style="border-bottom:1px solid #ea580c; padding-bottom:5px; margin-bottom:10px;">
        <tr>
          <td width="45"><img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="height:28px;"></td>
          <td><strong style="color:#ea580c; font-size:15px;">RV BLOCOS E ESTRUTURAS</strong><br><span style="font-size:10px;">Controle de Entrega de Pré-Moldados</span></td>
          <td align="right" style="font-size:10px;">
            <strong>Orçamento #${idOrc}</strong><br>
            Cliente: ${cliente}<br>
            Data: ${dataEntrega}
          </td>
        </tr>
      </table>
      <p style="font-size:11px; margin-bottom:10px;">
        <strong>Total:</strong> ${vigotas.reduce((s,v) => s + v.qtd, 0)} peças | 
        <strong>Metros lineares:</strong> ${totalMetrosLineares.toFixed(2)} m | 
        <strong>Área equivalente:</strong> ${totalM2.toFixed(2)} m²
      </p>
      <table width="100%" style="border-collapse:collapse; margin-bottom:15px;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="padding:6px; border:1px solid #000; width:50px;">Qtd</th>
            <th style="padding:6px; border:1px solid #000;">Tamanho</th>
            <th style="padding:6px; border:1px solid #000;">Metros</th>
            <th style="padding:6px; border:1px solid #000; width:40px;">✔</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <div style="display:flex; justify-content:space-between; margin-top:40px;">
        <div style="text-align:center; width:45%;">
          <div style="border-top:1px solid #000; margin-bottom:5px;"></div>
          <span style="font-size:10px; font-weight:bold;">CONFERENTE RV BLOCOS</span>
          <p style="margin:10px 0 0 0; font-size:10px;">Data: ____ / ____ / ________</p>
        </div>
        <div style="text-align:center; width:45%;">
          <div style="border-top:1px solid #000; margin-bottom:5px;"></div>
          <span style="font-size:10px; font-weight:bold;">RECEBEDOR (CLIENTE)</span>
          <p style="margin:10px 0 0 0; font-size:10px;">Data: ____ / ____ / ________</p>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => { window.print(); limparAreaImpressao(); }, 300);
}

function imprimirBackupEntrega() {
  const idOrc = document.getElementById('laje-entrega-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);

  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  const cliente = orc ? orc.cliente_nome : 'Não informado';

  // Busca os itens do orçamento
  sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas')
    .eq('id_orcamento', idOrc)
    .then(({ data }) => {
      const totalPorTamanho = {};
      (data || []).forEach(i => {
        const t = Number(i.tamanho_vigota).toFixed(2);
        totalPorTamanho[t] = (totalPorTamanho[t] || 0) + Number(i.qtd_vigotas);
      });

      const tamanhos = Object.keys(totalPorTamanho).sort((a, b) => b - a);
      const linhas = tamanhos.map(t => `
        <tr>
          <td style="padding:5px; border:1px solid #000; text-align:center; font-weight:bold;">${totalPorTamanho[t]}x</td>
          <td style="padding:5px; border:1px solid #000;">${t} m</td>
          <td style="padding:5px; border:1px solid #000; text-align:right;">${(Number(t) * totalPorTamanho[t]).toFixed(2)} m</td>
          <td style="padding:5px; border:1px solid #000; min-width:80px;"></td>
        </tr>
      `).join('');

      const totalPecas = tamanhos.reduce((s, t) => s + totalPorTamanho[t], 0);
      const totalMetros = tamanhos.reduce((s, t) => s + Number(t) * totalPorTamanho[t], 0);

      const printArea = document.getElementById('print-area');
      printArea.innerHTML = `
        <div style="font-family:'Segoe UI', Arial, sans-serif; padding:10mm; max-width:190mm; margin:0 auto; background:#fff; font-size:12px;">
          <table width="100%" style="border-bottom:1px solid #ea580c; padding-bottom:5px; margin-bottom:10px;">
            <tr>
              <td width="45"><img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="height:28px;"></td>
              <td><strong style="color:#ea580c; font-size:15px;">RV BLOCOS E ESTRUTURAS</strong><br><span style="font-size:10px;">Lista de Peças para Entrega</span></td>
              <td align="right" style="font-size:10px;">
                <strong>Orçamento #${idOrc}</strong><br>
                Cliente: ${cliente}<br>
                Data: ${new Date().toLocaleDateString('pt-BR')}
              </td>
            </tr>
          </table>
          <p style="font-size:11px; margin-bottom:10px;">
            <strong>Total de peças:</strong> ${totalPecas} | 
            <strong>Metros lineares totais:</strong> ${totalMetros.toFixed(2)} m
          </p>
          <table width="100%" style="border-collapse:collapse; margin-bottom:15px;">
            <thead>
              <tr style="background:#e5e7eb;">
                <th style="padding:6px; border:1px solid #000; width:50px;">Qtd</th>
                <th style="padding:6px; border:1px solid #000;">Tamanho da Vigota</th>
                <th style="padding:6px; border:1px solid #000;">Metros Totais</th>
                <th style="padding:6px; border:1px solid #000; width:120px;">Qtd. Saindo (caneta)</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <p style="font-size:10px; color:#64748b;">* Preencha a última coluna a caneta com a quantidade que está sendo entregue nesta remessa.</p>
        </div>
      `;
      setTimeout(() => { window.print(); limparAreaImpressao(); }, 300);
    });
}



async function imprimirEntregaHistorico(idEntrega) {
  // Busca a entrega específica
  const { data: entrega, error } = await sb.from('laje_entregas')
    .select('*').eq('id', idEntrega).single();

  if (error || !entrega) return showToast('Entrega não encontrada.', true);

  const idOrc = entrega.id_orcamento;
  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  const cliente = orc ? orc.cliente_nome : 'Não informado';

  const vigotas = entrega.vigotas_entregues || [];
  const totalPecas = vigotas.reduce((s, v) => s + Number(v.qtd), 0);
  const totalMetrosLineares = vigotas.reduce((s, v) => s + (Number(v.tamanho) * Number(v.qtd)), 0);
  const larguraUtil = 0.50;
  const totalM2 = totalMetrosLineares * larguraUtil;

  const linhas = vigotas.map(v => `
    <tr>
      <td style="padding:4px 8px; border:1px solid #000; text-align:center; font-weight:bold;">${v.qtd}x</td>
      <td style="padding:4px 8px; border:1px solid #000;">${Number(v.tamanho).toFixed(2)} m</td>
      <td style="padding:4px 8px; border:1px solid #000; text-align:right;">${(Number(v.tamanho) * Number(v.qtd)).toFixed(2)} m</td>
      <td style="padding:4px 8px; border:1px solid #000; text-align:center; font-size:16px;">☐</td>
    </tr>
  `).join('');

  const printArea = document.getElementById('print-area');
  printArea.innerHTML = `
    <div style="font-family:'Segoe UI', Arial, sans-serif; padding:10mm; max-width:190mm; margin:0 auto; background:#fff; font-size:12px;">
      <table width="100%" style="border-bottom:1px solid #ea580c; padding-bottom:5px; margin-bottom:10px;">
        <tr>
          <td width="45"><img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="height:28px;"></td>
          <td><strong style="color:#ea580c; font-size:15px;">RV BLOCOS E ESTRUTURAS</strong><br><span style="font-size:10px;">Registro de Entrega</span></td>
          <td align="right" style="font-size:10px;">
            <strong>Orçamento #${idOrc}</strong><br>
            Cliente: ${cliente}<br>
            Data: ${formatDate(entrega.data)}
          </td>
        </tr>
      </table>
      <p style="font-size:11px; margin-bottom:10px;">
        <strong>Total de peças:</strong> ${totalPecas} | 
        <strong>Metros lineares:</strong> ${totalMetrosLineares.toFixed(2)} m | 
        <strong>Área equivalente:</strong> ${totalM2.toFixed(2)} m²
      </p>
      ${entrega.observacao ? `<p style="font-size:11px; margin-bottom:10px;"><strong>Obs:</strong> ${entrega.observacao}</p>` : ''}
      <table width="100%" style="border-collapse:collapse; margin-bottom:15px;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="padding:6px; border:1px solid #000; width:50px;">Qtd</th>
            <th style="padding:6px; border:1px solid #000;">Tamanho</th>
            <th style="padding:6px; border:1px solid #000;">Metros</th>
            <th style="padding:6px; border:1px solid #000; width:40px;">✔</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <div style="display:flex; justify-content:space-between; margin-top:40px;">
        <div style="text-align:center; width:45%;">
          <div style="border-top:1px solid #000; margin-bottom:5px;"></div>
          <span style="font-size:10px; font-weight:bold;">CONFERENTE RV BLOCOS</span>
          <p style="margin:10px 0 0 0; font-size:10px;">Data: ____ / ____ / ________</p>
        </div>
        <div style="text-align:center; width:45%;">
          <div style="border-top:1px solid #000; margin-bottom:5px;"></div>
          <span style="font-size:10px; font-weight:bold;">RECEBEDOR (CLIENTE)</span>
          <p style="margin:10px 0 0 0; font-size:10px;">Data: ____ / ____ / ________</p>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => { window.print(); limparAreaImpressao(); }, 300);
}


async function duplicarOrcamentoLaje(id) {
  if (!confirm('Deseja duplicar este orçamento?')) return;

  showLoading(true);
  try {
    // Busca o orçamento original
    const { data: orc, error: errOrc } = await sb.from('laje_orcamentos')
      .select('*').eq('id', id).single();
    if (errOrc || !orc) throw new Error('Orçamento original não encontrado.');

    // Busca os itens do orçamento original
    const { data: itens, error: errItens } = await sb.from('laje_itens_orcamento')
      .select('*').eq('id_orcamento', id);
    if (errItens) throw new Error('Erro ao buscar itens.');

    // Cria novo orçamento (sem ID, o banco gera automaticamente)
    const { data: novoOrc, error: errNovo } = await sb.from('laje_orcamentos')
      .insert({
        cliente_nome: orc.cliente_nome + ' (Cópia)',
        status: 'ABERTO',
        valor_total_estimado: orc.valor_total_estimado,
        area_total: orc.area_total
      })
      .select('id')
      .single();
    if (errNovo || !novoOrc) throw new Error('Erro ao criar novo orçamento.');

    // Duplica os itens, associando ao novo orçamento
    const novosItens = (itens || []).map(item => ({
      id_orcamento: novoOrc.id,
      comodo: item.comodo,
      vao_menor: item.vao_menor,
      vao_maior: item.vao_maior,
      tipo_enchimento: item.tipo_enchimento,
      altura: item.altura,
      qtd_vigotas: item.qtd_vigotas,
      tamanho_vigota: item.tamanho_vigota,
      metragem_eps: item.metragem_eps,
      area: item.area,
      valor_estimado: item.valor_estimado,
      largura_viga: item.largura_viga
    }));

    if (novosItens.length > 0) {
      const { error: errInsert } = await sb.from('laje_itens_orcamento').insert(novosItens);
      if (errInsert) throw new Error('Erro ao duplicar itens.');
    }

    showToast('Orçamento duplicado com sucesso!');
    carregarOrcamentosLaje();
  } catch (e) {
    showToast('Erro ao duplicar: ' + e.message, true);
  }
  showLoading(false);
}
