import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.cwd(); 
const PORT = process.env.PORT || 8000;

const EVENTOS_CSV = path.join(ROOT, 'dados', 'eventos.csv');
const EQUIPE_CSV = path.join(ROOT, 'dados', 'equipe.csv');
const DADOS_DIR  = path.join(ROOT, 'dados');
const PUBLIC_DIR = path.join(ROOT, 'public');

const server = http.createServer(async (req, res) => {
    try {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);

/* =========================
    API — REGISTRAR EVENTO (Expandida para Equipe Real)
========================= */
if (req.method === 'POST' && urlPath === '/api/eventos') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        let ev;
        try {
            ev = JSON.parse(body);
        } catch (err) {
            res.writeHead(400);
            return res.end('JSON inválido');
        }

        if (!fs.existsSync(DADOS_DIR)) fs.mkdirSync(DADOS_DIR, { recursive: true });

        // Garante cabeçalho com 26 campos (incluindo nomes dos responsáveis)
        if (!fs.existsSync(EVENTOS_CSV)) {
            const cabecalho = [
                'evento_id', 'pedido_id', 'data_evento', 'etapa', 'tipo_evento','desc_placa', 'qtde_placa', 
                'descricao', 'usuario', 'custo', 'receita', 'status_resultante',
                'data_entrega', 'p1_valor', 'p1_venc', 'p2_valor', 'p2_venc', 
                'p3_valor', 'p3_venc', 'cliente_nome', 
                'hh_teorico', 'corte', 'solda', 'acabamento',
                'resp_corte', 'resp_solda', 'resp_acab', 'resp_conferencia' // <--- NOVAS COLUNAS
            ].join(',') + '\n';
            fs.writeFileSync(EVENTOS_CSV, cabecalho);
        }

        // MONTAGEM DA LINHA - Agora aceitando nomes reais conforme o seu PDF
        const campos = [
            Date.now(),                                 // 0: evento_id
            ev.pedido_id,                               // 1: pedido_id
            new Date().toISOString(),                   // 2: data_evento
            ev.etapa || 'PRODUCAO',                     // 3: etapa
            ev.tipo_evento,                             // 4: tipo_evento
            (ev.desc_placa || '').replace(/,/g, ' '), // desc_placa
            ev.qtde_placa || 0,                       // qtde_placa
            (ev.descricao || 'Avanco automatico').replace(/,/g, ' '), // 5: desc
         
            ev.usuario || 'gestor',                     // 6: usuario
            Number(ev.custo || 0).toFixed(2),           // 7: custo
            Number(ev.receita || 0).toFixed(2),         // 8: receita
            ev.status_resultante || '',                 // 9: status
            ev.data_entrega || '',                      // 10: entrega
            '', '', '', '', '', '',                     // 11-16: parcelas
            (ev.cliente_nome || '').replace(/,/g, ' '), // 17: cliente
            ev.hh_teorico || 0,                         // 18: hh
            ev.corte || 0,                              // 19: num_op_corte
            ev.solda || 0,                              // 20: num_op_solda
            ev.acabamento || 0,                         // 21: num_op_acab
            (ev.responsavel_corte || 'Filipe'),         // 22: NOME Real [cite: 3]
            (ev.responsavel_solda || 'Equipe'),         // 23: NOME Real
            (ev.responsavel_acabamento || 'Elton'),    // 24: NOME Real [cite: 3]
            (ev.conferencia_final || 'Sergio')          // 25: NOME Real 
        ];

        fs.appendFileSync(EVENTOS_CSV, campos.join(',') + '\n');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: true }));
    });
    return;
}

/* =========================
            SERVIR ARQUIVOS ESTÁTICOS
        ========================= */
        const tipos = {
            '.html': 'text/html; charset=utf-8',
            '.js':   'application/javascript; charset=utf-8',
            '.css':  'text/css; charset=utf-8',
            '.csv':  'text/csv; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png':  'image/png',
            '.jpg':  'image/jpeg',
            '.ico':  'image/x-icon'
        };

        let filePath = (urlPath === '/') 
            ? path.join(PUBLIC_DIR, 'index.html')
            : path.join(PUBLIC_DIR, urlPath);

        if (!fs.existsSync(filePath) && urlPath.startsWith('/dados/')) {
            filePath = path.join(DADOS_DIR, path.basename(urlPath));
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': tipos[ext] || 'application/octet-stream' });
            return res.end(fs.readFileSync(filePath));
        }

        res.writeHead(404);
        res.end('Arquivo nao encontrado');

    } catch (error) {
        console.error("ERRO NO SERVIDOR:", error);
        res.writeHead(500);
        res.end("Erro interno no servidor");
    }
});

server.listen(PORT, () => {
    console.log(`🚀 FAST EPS ONLINE | Porta: ${PORT}`);
});