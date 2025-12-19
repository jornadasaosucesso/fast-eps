// utils/registrarEvento.js
import fs from "fs";
import path from "path";
import { STATUS_POR_ETAPA } from "./enums.js";

const BASE_PATH = path.resolve("dados");

function agora() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function gerarId() {
  return Date.now();
}

// ==============================
// FUNÇÃO PRINCIPAL (exportada)
// ==============================
export function registrarEvento({
  pedido_id,
  etapa,
  tipo_evento,
  descricao,
  usuario = "sistema",
  custo = 0,
  receita = 0
}) {
  if (!pedido_id || !etapa || !tipo_evento) {
    throw new Error("pedido_id, etapa e tipo_evento são obrigatórios");
  }

  const eventoId = gerarId();
  const dataEvento = agora();
  const statusResultante = STATUS_POR_ETAPA[etapa] || "DESCONHECIDO";

  // 1️⃣ TIMELINE
  const linhaTimeline = [
    eventoId,
    pedido_id,
    dataEvento,
    etapa,
    tipo_evento,
    descricao,
    usuario,
    custo,
    receita,
    statusResultante
  ].join(",") + "\n";

  fs.appendFileSync(
    path.join(BASE_PATH, "timeline_eventos.csv"),
    linhaTimeline
  );

  // 2️⃣ STATUS DO PEDIDO
  atualizarStatusPedido(pedido_id, statusResultante);

  // 3️⃣ FINANCEIRO
  if (custo > 0) {
    registrarFinanceiro({
      pedido_id,
      descricao,
      categoria: "CUSTO_PRODUCAO",
      tipo: "SAIDA",
      valor: custo
    });
  }

  if (receita > 0) {
    registrarFinanceiro({
      pedido_id,
      descricao,
      categoria: "VENDAS",
      tipo: "ENTRADA",
      valor: receita
    });
  }

  return {
    evento_id: eventoId,
    status: statusResultante
  };
}

// ==============================
// FUNÇÕES AUXILIARES (NÃO exporta)
// ==============================
function atualizarStatusPedido(pedido_id, novoStatus) {
  const arquivo = path.join(BASE_PATH, "pedidos.csv");

  if (!fs.existsSync(arquivo)) return;

  const linhas = fs.readFileSync(arquivo, "utf-8").split("\n");
  const header = linhas.shift();

  const novasLinhas = linhas.map(linha => {
    if (!linha) return linha;

    const col = linha.split(",");
    if (col[0] === pedido_id) {
      col[7] = novoStatus; // coluna status_atual
      return col.join(",");
    }
    return linha;
  });

  fs.writeFileSync(arquivo, [header, ...novasLinhas].join("\n"));
}

function registrarFinanceiro({
  pedido_id,
  descricao,
  categoria,
  tipo,
  valor
}) {
  const linha = [
    Date.now(),
    pedido_id,
    agora(),
    descricao,
    categoria,
    tipo,
    valor,
    "REALIZADO"
  ].join(",") + "\n";

  fs.appendFileSync(
    path.join(BASE_PATH, "financeiro_movimentacoes.csv"),
    linha
  );
}
