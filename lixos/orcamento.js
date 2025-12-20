<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Orçamento — FAST EPS</title>

<style>
:root{
  --bg:#0b0b0b;
  --card:#121212;
  --accent:#00e5ff;
  --danger:#ff3d77;
  --warn:#ffcc00;
  --muted:#bfcbd0;
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:Inter,system-ui,Arial;
  background:var(--bg);
  color:#fff;
  padding:12px;
}
.wrap{
  max-width:1200px;
  margin:auto;
  display:grid;
  gap:12px;
}
h1{
  color:var(--accent);
  margin:0 0 4px;
  font-size:22px;
}
.card{
  background:var(--card);
  padding:12px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.05);
}
label{
  font-size:12px;
  color:var(--muted);
}
input,select,button{
  width:100%;
  padding:9px;
  border-radius:8px;
  border:1px solid rgba(255,255,255,.08);
  background:#0b0b0b;
  color:#fff;
  font-size:14px;
}
.row{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
  gap:8px;
}
.btn{
  background:var(--accent);
  color:#000;
  font-weight:700;
  border:none;
  cursor:pointer;
}
.summary{
  background:#071214;
  padding:10px;
  border-radius:8px;
}
.muted{color:var(--muted)}
#boxCompras{
  display:none;
  margin-top:10px;
  background:#160a0d;
  border-left:4px solid var(--danger);
}
#boxCompras strong{
  color:#ff9aa9;
}
ul{margin:6px 0 0 18px;padding:0}
@media(max-width:768px){
  h1{font-size:18px}
}
</style>
</head>

<body>
<div class="wrap">

<h1>Orçamento — FAST EPS</h1>

<div class="card">
  <label>Cliente</label>
  <input id="cliente" placeholder="Nome do cliente">

  <div class="row" style="margin-top:8px">
    <div>
      <label>Tipo de Placa</label>
      <select id="produto">
        <option value="">Selecione</option>
        <option value="painel_p10_50g">Placa Interna (50G)</option>
        <option value="painel_p10_65g">Placa Externa (65G)</option>
      </select>
    </div>
    <div>
      <label>Quantidade</label>
      <input id="quantidade" type="number" min="1">
    </div>
  </div>

  <div class="row" style="margin-top:8px">
    <div>
      <label>Área total (m²)</label>
      <input id="area" type="number" placeholder="ex: 120">
    </div>
    <div>
      <label>Espessura</label>
      <select disabled>
        <option>10 cm (P10)</option>
      </select>
    </div>
  </div>

  <div class="row" style="margin-top:10px">
    <button class="btn" onclick="calcularOrcamento()">Simular capacidade</button>
  </div>
</div>

<div class="card">
  <strong>Resumo Operacional</strong>
  <div id="resumo" class="summary" style="margin-top:8px">—</div>

  <div id="boxCompras" class="summary">
    <strong>⚠️ Insumos a comprar</strong>
    <div id="listaCompras" class="muted"></div>
  </div>
</div>

</div>

<script>
/* ===== CONSTANTES ===== */
const AREA_POR_PLACA = 2.0;

/* ===== RECEITAS ===== */
const receitas={
  painel_p10_50g:{
    nome:'Placa Interna 50G',
    fator_perda:0.07,
    itens:{eps:15,tela:1.1,cimento:48,areia:18,aditivo:0.02,conectores:0.8}
  },
  painel_p10_65g:{
    nome:'Placa Externa 65G',
    fator_perda:0.08,
    itens:{eps:15,tela:1.1,cimento:50,areia:19,aditivo:0.022,conectores:1}
  }
};

/* ===== ESTOQUE ===== */
const estoque={
  eps:500,
  tela:1500,
  cimento:2000,
  areia:3000,
  aditivo:80,
  conectores:800
};

/* ===== CAPACIDADE ===== */
function capacidadePlacas(produto){
  const r=receitas[produto];
  let max=Infinity,gargalo='';
  for(const k in r.itens){
    const consumo=r.itens[k]*(1+r.fator_perda);
    const disp=estoque[k]||0;
    const placas=Math.floor(disp/consumo);
    if(placas<max){max=placas;gargalo=k;}
  }
  return {max,gargalo};
}

/* ===== COMPRAS NECESSÁRIAS ===== */
function calcularComprasNecessarias(produto, faltantes){
  const r=receitas[produto];
  const lista={};
  for(const k in r.itens){
    const consumo=r.itens[k]*(1+r.fator_perda)*faltantes;
    const disp=estoque[k]||0;
    if(consumo>disp){
      lista[k]=consumo-disp;
    }
  }
  return lista;
}

/* ===== FUNÇÃO PRINCIPAL ===== */
function calcularOrcamento(){
  const cliente=document.getElementById('cliente').value||'—';
  const produto=document.getElementById('produto').value;
  const qtd=Number(document.getElementById('quantidade').value)||0;
  const area=Number(document.getElementById('area').value)||0;
  const resumo=document.getElementById('resumo');
  const boxCompras=document.getElementById('boxCompras');
  const listaCompras=document.getElementById('listaCompras');

  boxCompras.style.display='none';

  if(!produto||!qtd){
    resumo.innerHTML='Preencha tipo de placa e quantidade.';
    return;
  }

  const areaCoberta=qtd*AREA_POR_PLACA;
  if(area>0 && areaCoberta<area){
    alert(`🚫 ${qtd} placas cobrem apenas ${areaCoberta} m².\nAjuste os dados.`);
    return;
  }

  const cap=capacidadePlacas(produto);
  let status='🟢 OK para venda';
  if(cap.max<qtd) status='🔴 Estoque insuficiente';
  else if(cap.max<qtd*1.2) status='🟡 Atenção ao estoque';

  resumo.innerHTML=`
    <div><b>Cliente:</b> ${cliente}</div>
    <div><b>Produto:</b> ${receitas[produto].nome}</div>
    <div><b>Área:</b> ${area||'-'} m²</div>
    <div><b>Placas:</b> ${qtd}</div>
    <hr>
    <div><b>Capacidade:</b> ${cap.max} placas</div>
    <div><b>Status:</b> ${status}</div>
    <div class="muted">Gargalo: ${cap.gargalo}</div>
  `;

  if(cap.max<qtd){
    const faltantes=qtd-cap.max;
    const compras=calcularComprasNecessarias(produto,faltantes);
    let html=`Para produzir <b>+${faltantes}</b> placas:<ul>`;
    for(const k in compras){
      html+=`<li>${k}: ${compras[k].toFixed(2)}</li>`;
    }
    html+='</ul>';
    listaCompras.innerHTML=html;
    boxCompras.style.display='block';
  }
}
</script>
</body>
</html>
