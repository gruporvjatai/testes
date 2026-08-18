// =================================================================
// MÓDULO PDV / VENDAS - RV BLOCOS
// =================================================================

// Estado interno do PDV
let CART = [];
let CURRENT_QUOTE_ID = null;

// =================================================================
// RENDER PRINCIPAL - chamado por navigate('pos')
// =================================================================
function renderPDV() {
    const container = document.getElementById('view-pos');
    if (!container) return;

    container.innerHTML = `
    <div class="flex flex-col gap-6 h-[calc(100vh-100px)]">
        <!-- Cabeçalho -->
        <div class="bg-white rounded-xl shadow-sm border p-6 flex justify-between items-center shrink-0">
            <h3 class="font-bold text-slate-700 text-lg flex gap-2 items-center">
                <i data-lucide="shopping-cart"></i> PDV - Caixa
            </h3>
            <button onclick="abrirHistoricoVendas()" class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition">
                <i data-lucide="history"></i> Ver Vendas Efetuadas
            </button>
        </div>

        <!-- Área principal: grid de produtos + carrinho -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            <!-- Coluna de produtos -->
            <div class="lg:col-span-2 flex flex-col gap-4 h-full">
                <div class="bg-white rounded-xl shadow-sm border p-4 flex gap-4">
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-3 top-2.5 text-slate-400 w-5 h-5"></i>
                        <input type="text" id="pos-search" placeholder="Buscar produto..." 
                               class="w-full p-2 border rounded pl-10 outline-none focus:ring-2 focus:ring-orange-500"
                               onkeyup="filtrarProdutosPDV()">
                    </div>
                </div>
                <div id="pos-products-grid" class="bg-white rounded-xl shadow-sm border p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1 content-start">
                </div>
            </div>

            <!-- Coluna do carrinho -->
            <div class="bg-white p-0 rounded-xl border shadow-lg flex flex-col h-full overflow-hidden border-t-4 border-t-slate-800">
                <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
                    <div class="font-bold text-slate-700 flex gap-2 items-center">
                        <i data-lucide="shopping-cart"></i> ITENS 
                        <span id="edit-mode-indicator" class="hidden text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded ml-2">EDITANDO</span>
                    </div>
                    <button onclick="limparCarrinho()" class="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 px-2 py-1 rounded bg-white">LIMPAR</button>
                </div>
                <div id="pos-cart-items" class="flex-1 space-y-2 overflow-y-auto p-4 bg-white"></div>
                <div class="bg-slate-50 p-4 border-t space-y-3 shadow-inner">
                    <div class="space-y-2">
                        <div class="flex gap-2">
                            <select id="pos-client" class="w-full p-2 border rounded text-sm bg-white focus:border-orange-500">
                                <option value="">Consumidor Final</option>
                            </select>
                            <button onclick="navigate('clients')" class="p-2 bg-slate-200 rounded hover:bg-slate-300"><i data-lucide="plus"></i></button>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <input type="checkbox" id="pos-custom-address-check" class="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500" onchange="toggleEnderecoEntrega()">
                            <label for="pos-custom-address-check" class="text-xs font-bold text-slate-600 cursor-pointer select-none">Adicionar Endereço de Entrega</label>
                        </div>
                        <div id="pos-custom-address-container" class="hidden transition-all duration-300">
                            <textarea id="pos-custom-address" rows="2" placeholder="Digite o endereço completo da obra / ponto de referência..." class="w-full p-2 border rounded-lg text-xs bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none resize-none shadow-inner"></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <select id="pos-payment" class="w-full p-2 border rounded text-sm bg-white">
                                <option>Dinheiro</option>
                                <option>PIX</option>
                                <option>Cartão Crédito</option>
                                <option>Cartão Débito</option>
                                <option>Boleto 5 dias</option>
                                <option>Boleto 10 dias</option>
                                <option>Boleto 15 dias</option>
                                <option>PIX 7 dias</option>
                                <option>Carteira</option>
                            </select>
                            <div class="flex rounded border bg-white overflow-hidden">
                                <select id="pos-discount-type" class="bg-slate-100 text-xs px-1 border-r font-bold focus:outline-none" onchange="atualizarCarrinho()">
                                    <option value="%">%</option><option value="$">R$</option>
                                </select>
                                <input type="number" id="pos-discount" value="0" class="w-full p-2 text-sm focus:outline-none" placeholder="Desc." onchange="atualizarCarrinho()">
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-between items-end border-t border-slate-300 pt-3">
                        <div class="text-xs text-slate-500">Itens: <span id="cart-count">0</span></div>
                        <div class="text-right">
                            <div class="text-xs text-slate-500">Total a Pagar</div>
                            <div id="pos-total-display" class="text-2xl font-bold text-slate-800 leading-none">R$ 0,00</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2">
                        <button onclick="salvarOrcamento()" class="btn-action bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm"><i data-lucide="save"></i> Salvar Orç.</button>
                        <button onclick="finalizarVenda()" class="btn-action bg-green-600 hover:bg-green-700 text-white py-3 text-sm shadow-lg shadow-green-200"><i data-lucide="check-circle"></i> Vender</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // Preenche lista de clientes e produtos
    preencherSelectClientes();
    filtrarProdutosPDV();
    atualizarCarrinho();
    lucide.createIcons();
}

// =================================================================
// CLIENTES
// =================================================================
function preencherSelectClientes() {
    const select = document.getElementById('pos-client');
    if (!select) return;
    select.innerHTML = '<option value="">Consumidor Final</option>' +
        (STATE.clients || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// =================================================================
// PRODUTOS
// =================================================================
function filtrarProdutosPDV() {
    const termo = (document.getElementById('pos-search')?.value || '').toLowerCase();
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const produtos = (STATE.products || []).slice().sort((a, b) => Number(a.id) - Number(b.id));
    const filtrados = produtos.filter(p => p.name.toLowerCase().includes(termo));

    grid.innerHTML = filtrados.map(p => `
        <button onclick="adicionarAoCarrinho('${p.id}')" 
                class="p-3 border rounded-lg text-left hover:shadow-md transition flex flex-col justify-between h-24 bg-white hover:border-orange-400">
            <h4 class="font-bold text-sm leading-tight text-slate-700 line-clamp-2">${p.name}</h4>
            <div class="flex justify-between items-end w-full">
                <span class="text-green-700 font-bold">${formatMoney(p.price)}</span>
                <span class="text-[10px] px-2 py-0.5 rounded ${p.available <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'} font-bold">
                    Disp: ${p.available}
                </span>
            </div>
        </button>
    `).join('');
}

// =================================================================
// CARRINHO
// =================================================================
function adicionarAoCarrinho(id) {
    const p = STATE.products.find(x => String(x.id) === String(id));
    if (!p) return showToast("Produto não encontrado.", true);

    const existente = CART.find(x => String(x.prodId) === String(p.id));
    if (existente) {
        existente.qty++;
        existente.total = existente.qty * existente.price;
    } else {
        CART.push({ prodId: p.id, name: p.name, price: p.price, qty: 1, total: p.price });
    }
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const box = document.getElementById('pos-cart-items');
    const indicador = document.getElementById('edit-mode-indicator');
    if (indicador) indicador.style.display = CURRENT_QUOTE_ID ? 'inline-block' : 'none';

    if (!CART.length) {
        box.innerHTML = '<p class="text-center text-slate-400 mt-10 text-sm">Vazio</p>';
        document.getElementById('pos-total-display').innerText = formatMoney(0);
        document.getElementById('cart-count').innerText = '0';
        return;
    }

    const totais = calcularTotais();

    box.innerHTML = CART.map((i, idx) => `
        <div class="bg-slate-50 p-3 rounded border border-slate-200 mb-2">
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-bold text-slate-700">${i.name}</span>
                <button onclick="removerDoCarrinho(${idx})" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" width="16"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <label class="text-slate-500">Qtd</label>
                    <input type="number" value="${i.qty}" onchange="alterarItemCarrinho(${idx}, 'qty', this.value)" class="w-full p-1 border rounded text-center">
                </div>
                <div>
                    <label class="text-slate-500">Valor</label>
                    <input type="number" step="0.01" value="${i.price}" onchange="alterarItemCarrinho(${idx}, 'price', this.value)" class="w-full p-1 border rounded text-center">
                </div>
            </div>
            <div class="text-right font-bold text-slate-700 mt-1 border-t pt-1 border-slate-200">Total: ${formatMoney(i.total)}</div>
        </div>
    `).join('');

    document.getElementById('pos-total-display').innerText = formatMoney(totais.total);
    document.getElementById('cart-count').innerText = CART.length;
    lucide.createIcons();
}

function alterarItemCarrinho(idx, campo, valor) {
    const item = CART[idx];
    if (campo === 'qty') item.qty = parseFloat(valor) || 1;
    else if (campo === 'price') item.price = parseFloat(valor) || 0;
    item.total = item.qty * item.price;
    atualizarCarrinho();
}

function removerDoCarrinho(idx) {
    CART.splice(idx, 1);
    atualizarCarrinho();
}

function limparCarrinho() {
    CART = [];
    CURRENT_QUOTE_ID = null;
    document.getElementById('pos-discount').value = 0;
    document.getElementById('pos-custom-address-check').checked = false;
    document.getElementById('pos-custom-address-container').classList.add('hidden');
    document.getElementById('pos-custom-address').value = '';
    atualizarCarrinho();
}

function calcularTotais() {
    const sub = CART.reduce((a, b) => a + (b.qty * b.price), 0);
    const tipo = document.getElementById('pos-discount-type').value;
    const val = parseFloat(document.getElementById('pos-discount').value) || 0;
    const disc = (tipo === '%') ? (sub * (val / 100)) : val;
    return { sub, disc, total: Math.max(0, sub - disc) };
}

function toggleEnderecoEntrega() {
    const check = document.getElementById('pos-custom-address-check').checked;
    const container = document.getElementById('pos-custom-address-container');
    if (check) {
        container.classList.remove('hidden');
        document.getElementById('pos-custom-address').focus();
    } else {
        container.classList.add('hidden');
        document.getElementById('pos-custom-address').value = '';
    }
}

// =================================================================
// FINALIZAÇÃO
// =================================================================
async function finalizarVenda(isProntaEntrega = false) {
    if (!CART.length) return showToast("Vazio!", true);

    const invalidos = CART.filter(i => !i.prodId);
    if (invalidos.length) {
        showToast("Itens inválidos removidos.", true);
        CART = CART.filter(i => i.prodId);
        atualizarCarrinho();
        if (!CART.length) return;
    }

    showLoading(true);

    try {
        const totais = calcularTotais();
        const cliId = document.getElementById('pos-client').value;
        const cliente = STATE.clients.find(c => String(c.id) === String(cliId));
        const nomeCliente = cliente ? cliente.name : 'Consumidor Final';
        const pagamento = document.getElementById('pos-payment').value;
        const enderecoEntrega = document.getElementById('pos-custom-address-check').checked 
                                ? document.getElementById('pos-custom-address').value : '';

        let vencimento = new Date();
        if (pagamento.includes("5")) vencimento.setDate(vencimento.getDate() + 5);
        else if (pagamento.includes("10")) vencimento.setDate(vencimento.getDate() + 10);
        else if (pagamento.includes("15")) vencimento.setDate(vencimento.getDate() + 15);

        const timestamp = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
        const novoId = CURRENT_QUOTE_ID || getNextId(STATE.logs, STATE.quotes);
        const subtotalBruto = CART.reduce((a, i) => a + i.total, 0);
        const fator = subtotalBruto > 0 ? (totais.total / subtotalBruto) : 1;

        let logsParaInserir = [];

        for (let item of CART) {
            if (!item.prodId) continue;

            const { data: fresh } = await sb.from('produtos').select('estoque_fisico, estoque_comprometido').eq('id', item.prodId).single();
            let physical = Number(fresh.estoque_fisico) || 0;
            let committed = Number(fresh.estoque_comprometido) || 0;
            let update = {};

            if (isProntaEntrega) {
                update = { estoque_fisico: Math.max(0, physical - Number(item.qty)) };
            } else {
                update = { estoque_comprometido: committed + Number(item.qty) };
            }

            await sb.from('produtos').update(update).eq('id', item.prodId);

            const statusEntrega = isProntaEntrega ? 'ENTREGUE' : 'PENDENTE';
            const qtdEntregue = isProntaEntrega ? item.qty : 0;

            logsParaInserir.push({
                id: novoId, tipo: 'venda', produto_nome: item.name, quantidade: item.qty,
                data: timestamp, observacao: isProntaEntrega ? 'Pronta Entrega PDV' : 'Venda PDV',
                valor_total: (item.total * fator),
                cliente_nome: nomeCliente, forma_pagamento: pagamento, status: 'ATIVO',
                status_entrega: statusEntrega, qtd_entregue: qtdEntregue, desconto: totais.disc,
                status_financeiro: 'A RECEBER', vencimento: vencimento.toISOString(),
                valor_pago: 0, endereco_entrega: enderecoEntrega
            });

            if (isProntaEntrega) {
                logsParaInserir.push({
                    id: getNextId(STATE.logs) + Math.floor(Math.random() * 1000),
                    tipo: 'entrega', produto_nome: item.name, quantidade: item.qty,
                    data: timestamp, observacao: 'Retirado na hora. Ref Venda #' + novoId,
                    valor_total: 0, cliente_nome: nomeCliente, forma_pagamento: '', status: 'ATIVO',
                    status_entrega: 'ENTREGUE', qtd_entregue: item.qty, desconto: 0,
                    status_financeiro: '', vencimento: timestamp, valor_pago: 0, endereco_entrega: ''
                });
            }
        }

        if (CURRENT_QUOTE_ID) {
            await sb.from('logs').delete().eq('id', CURRENT_QUOTE_ID).eq('tipo', 'orcamento');
        }

        await sb.from('logs').insert(logsParaInserir);

        limparCarrinho();
        showToast(isProntaEntrega ? "Pronta Entrega!" : "Venda registrada!");
        await loadData();
        if (isProntaEntrega) navigate('pos');
        else navigate('expedition');
    } catch (e) {
        showLoading(false);
        showToast("Erro: " + e.message, true);
    }
}

// =================================================================
// ORÇAMENTOS
// =================================================================
async function salvarOrcamento() {
    if (!CART.length) return showToast("Vazio!", true);
    showLoading(true);

    try {
        const totais = calcularTotais();
        const cliId = document.getElementById('pos-client').value;
        const nomeCliente = STATE.clients.find(c => c.id == cliId)?.name || "Consumidor Final";
        const enderecoEntrega = document.getElementById('pos-custom-address-check').checked 
                                ? document.getElementById('pos-custom-address').value : '';
        const data = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
        const budgetId = CURRENT_QUOTE_ID || getNextId(STATE.logs, STATE.quotes);

        if (CURRENT_QUOTE_ID) await sb.from('logs').delete().eq('id', CURRENT_QUOTE_ID).eq('tipo', 'orcamento');

        const quotes = CART.map(item => ({
            id: budgetId, tipo: 'orcamento', produto_nome: item.name, quantidade: item.qty,
            data: data, observacao: '', valor_total: item.total, cliente_nome: nomeCliente,
            forma_pagamento: document.getElementById('pos-payment').value, status: 'ABERTO',
            desconto: totais.disc, status_financeiro: document.getElementById('pos-discount-type').value,
            endereco_entrega: enderecoEntrega, status_entrega: '', qtd_entregue: 0, vencimento: data, valor_pago: 0
        }));

        await sb.from('logs').insert(quotes);

        limparCarrinho();
        showToast("Orçamento salvo!");
        await loadData();
        navigate('quotes');
    } catch (e) {
        showLoading(false);
        showToast("Erro: " + e.message, true);
    }
}

// =================================================================
// CARREGAR ORÇAMENTO
// =================================================================
function carregarOrcamentoNoCarrinho(id) {
    const q = STATE.quotes.find(x => x.id == id);
    if (!q) return;

    CART = q.items.map(item => {
        const prod = STATE.products.find(p => String(p.name).trim().toLowerCase() === String(item.name).trim().toLowerCase());
        return { prodId: prod ? prod.id : null, name: item.name, price: item.price, qty: item.qty, total: item.total };
    });

    CURRENT_QUOTE_ID = q.id;

    const select = document.getElementById('pos-client');
    const cliente = STATE.clients.find(c => String(c.name).trim() === String(q.clientName).trim());
    if (cliente) select.value = cliente.id;

    document.getElementById('pos-payment').value = q.paymentMethod || 'Dinheiro';
    document.getElementById('pos-discount-type').value = q.discountType || '$';
    document.getElementById('pos-discount').value = q.discount || 0;

    if (q.deliveryAddress) {
        document.getElementById('pos-custom-address-check').checked = true;
        document.getElementById('pos-custom-address-container').classList.remove('hidden');
        document.getElementById('pos-custom-address').value = q.deliveryAddress;
    }

    navigate('pos');
    atualizarCarrinho();
    showToast(`Editando Orçamento #${q.id}`);
}

// =================================================================
// HISTÓRICO DE VENDAS (MODAL)
// =================================================================
function abrirHistoricoVendas() {
    const modal = document.getElementById('pos-history-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderizarHistoricoVendas();
}

function fecharHistoricoVendas() {
    document.getElementById('pos-history-modal').classList.add('hidden');
}

function renderizarHistoricoVendas() {
    const tbody = document.getElementById('pos-recent-history-modal');
    if (!tbody) return;

    const salesMap = {};
    (STATE.logs || []).filter(l => l.type === 'venda' && l.status !== 'CANCELADO').forEach(l => {
        if (!salesMap[l.id]) salesMap[l.id] = { id: l.id, date: l.date, client: l.clientName, valorFinal: 0 };
        salesMap[l.id].valorFinal += l.totalValue;
    });
    let sales = Object.values(salesMap).sort((a, b) => b.id - a.id);

    const termo = document.getElementById('pos-hist-search')?.value.toLowerCase() || '';
    const dt1 = document.getElementById('pos-hist-start')?.value;
    const dt2 = document.getElementById('pos-hist-end')?.value;
    if (termo) sales = sales.filter(s => (s.client && s.client.toLowerCase().includes(termo)) || String(s.id).includes(termo));
    if (dt1) sales = sales.filter(s => (s.date || '').split('T')[0] >= dt1);
    if (dt2) sales = sales.filter(s => (s.date || '').split('T')[0] <= dt2);

    if (!sales.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Nenhuma venda encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = sales.map(s => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 text-xs font-bold text-slate-500">#${s.id}<br><span class="text-[10px] font-normal">${formatDate(s.date)}</span></td>
            <td class="p-3 text-xs font-bold text-slate-700 max-w-[120px] truncate">${s.client}</td>
            <td class="p-3 text-sm font-bold text-green-700 text-right">${formatMoney(s.valorFinal)}</td>
            <td class="p-3 flex gap-1 justify-center">
                <button onclick="downloadSalePDF('${s.id}')" class="text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 p-2 rounded shadow-sm"><i data-lucide="file-down" width="14"></i></button>
                <button onclick="reprintSale('${s.id}')" class="text-slate-600 hover:text-orange-600 bg-white border border-slate-200 p-2 rounded shadow-sm"><i data-lucide="printer" width="14"></i></button>
                <button onclick="duplicateSaleToQuote('${s.id}')" class="text-amber-500 hover:text-amber-700 bg-white border border-amber-200 p-2 rounded shadow-sm"><i data-lucide="copy" width="14"></i></button>
                <button onclick="estornarVenda('${s.id}')" class="text-red-500 hover:text-red-700 bg-white border border-red-200 p-2 rounded shadow-sm"><i data-lucide="rotate-ccw" width="14"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// =================================================================
// REGISTRO NO NAVEGADOR
// =================================================================
// As funções serão chamadas pelo navigate do app.js
// Quando o usuário clicar em "PDV/Vendas", a função renderPDV() será invocada.
