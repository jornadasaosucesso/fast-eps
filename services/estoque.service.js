import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// sobe um nível e entra em /data
const estoqueCSV = path.join(__dirname, '..', 'dados', 'estoque_movimentacoes.csv');


export function registrarMovimentoEstoque({
  pedido_id,
  insumo,
  quantidade,
  tipo,
  origem = 'EVENTO',
  usuario
}) {

  // GARANTIA: cria o arquivo se não existir
  if (!fs.existsSync(estoqueCSV)) {
    fs.writeFileSync(
      estoqueCSV,
      'mov_id,data_mov,pedido_id,insumo,quantidade,tipo,origem,usuario\n'
    );
  }

  const linha = [
    Date.now(),
    new Date().toISOString(),
    pedido_id,
    insumo,
    quantidade,
    tipo,
    origem,
    usuario
  ].join(',') + '\n';

  fs.appendFileSync(estoqueCSV, linha);
}
  