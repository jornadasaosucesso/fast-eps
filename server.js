import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- CONFIGURAÇÃO DE DIRETÓRIOS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// No Render, process.cwd() é a raiz.
const ROOT = process.cwd(); 

const PORT = process.env.PORT || 8000;

// Caminhos dos arquivos de dados

// Caminhos exatos conforme seu git ls-tree
const EVENTOS_CSV = path.join(ROOT, 'dados', 'eventos.csv');
const RECEITAS_JSON = path.join(ROOT, 'receitas_composicao.json'); // ESTAVA SEM O 'S' E FORA DA PASTA DADOS
const PUBLIC_DIR = path.join(ROOT, 'public');
const DADOS_DIR  = path.join(ROOT, 'dados');

const server = http.createServer(async (req, res) => {
    try {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);

        /* =========================
            API — REGISTRAR EVENTO
        ========================= */
        if (req.method === 'POST' && urlPath === '/api/evento') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                let evento;
                try {
                    evento = JSON.parse(body);
                } catch (err) {
                    res.writeHead(400);
                    return res.end('JSON inválido');
                }

                let { pedido_id, etapa, tipo_evento, descricao, usuario, custo = 0, receita = 0, meta = {} } = evento;

                if (tipo_evento === 'VENDA_REALIZADA' && receita > 0) {
                    const valorParcela = (Number(receita) / 3).toFixed(2);
                    meta.financeiro = {
                        regra: "3x_FIXA_NORMA_CASA",
                        valor_total: Number(receita).toFixed(2),
                        parcelas: [
                            { n: 1, valor: valorParcela, vencimento: "30_DIAS" },
                            { n: 2, valor: valorParcela, vencimento: "60_DIAS" },
                            { n: 3, valor: (receita - (valorParcela * 2)).toFixed(2), vencimento: "90_DIAS" }
                        ]
                    };
                }

                if (!fs.existsSync(DADOS_DIR)) fs.mkdirSync(DADOS_DIR, { recursive: true });

                if (!fs.existsSync(EVENTOS_CSV)) {
                    fs.writeFileSync(EVENTOS_CSV, 'evento_id,pedido_id,data_evento,etapa,tipo_evento,descricao,usuario,custo,receita,status_resultante,meta\n');
                }

                const linha = [
                    Date.now(),
                    pedido_id,
                    new Date().toISOString(),
                    etapa,
                    tipo_evento,
                    descricao ? descricao.replace(/,/g, ' ') : '',
                    usuario,
                    Number(custo).toFixed(2),
                    Number(receita).toFixed(2),
                    'EM_PRODUCAO',
                    JSON.stringify(meta).replace(/,/g, ';')
                ].join(',') + '\n';

                fs.appendFileSync(EVENTOS_CSV, linha);

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

        // Fallback para a pasta dados se não estiver na public
        if (!fs.existsSync(filePath) && urlPath.startsWith('/dados/')) {
            filePath = path.join(DADOS_DIR, path.basename(urlPath));
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': tipos[ext] || 'application/octet-stream' });
            return res.end(fs.readFileSync(filePath));
        }

        console.log(`[404] ${urlPath} -> ${filePath}`);
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