import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pega o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;
const ROOT = __dirname;

// Caminhos dos arquivos
const EVENTOS_CSV = path.join(ROOT, 'dados', 'eventos.csv');
const RECEITAS_JSON = path.join(ROOT, 'dados', 'receita_composicao.json');

const server = http.createServer(async (req, res) => {
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

            // --- 1. LÓGICA FINANCEIRA (3 PARCELAS — NORMA DA CASA) ---
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

            // --- 2. LÓGICA DE RECEITA (O QUE DEVERIA SER GASTO) ---
            if (tipo_evento === 'PRODUÇÃO_INICIADA') {
                try {
                    if (fs.existsSync(RECEITAS_JSON)) {
                        const receitasBase = JSON.parse(fs.readFileSync(RECEITAS_JSON, 'utf8'));
                        
                        // Tenta descobrir o modelo pela descrição (ex: "65G" ou "50G")
                        let modelo = "painel_p10_50g"; // padrão
                        if (descricao.toUpperCase().includes("65G")) modelo = "painel_p10_65g";
                        
                        if (receitasBase[modelo]) {
                            meta.receita_teorica = {
                                codigo: modelo,
                                itens: receitasBase[modelo].itens,
                                perda_esperada: receitasBase[modelo].fator_perda
                            };
                        }
                    }
                } catch (e) { console.error("Erro ao ler receita:", e); }
            }

            // --- 3. GRAVAÇÃO NO CSV ---
            if (!fs.existsSync(path.join(ROOT, 'dados'))) fs.mkdirSync(path.join(ROOT, 'dados'), { recursive: true });

            if (!fs.existsSync(EVENTOS_CSV)) {
                fs.writeFileSync(EVENTOS_CSV, 'evento_id,pedido_id,data_evento,etapa,tipo_evento,descricao,usuario,custo,receita,status_resultante,meta\n');
            }

            const linha = [
                Date.now(),
                pedido_id,
                new Date().toISOString(),
                etapa,
                tipo_evento,
                descricao.replace(/,/g, ' '),
                usuario,
                Number(custo).toFixed(2),
                Number(receita).toFixed(2),
                'EM_PRODUCAO',
                JSON.stringify(meta).replace(/,/g, ';') // O ';' evita que o CSV quebre com o JSON
            ].join(',') + '\n';

            fs.appendFileSync(EVENTOS_CSV, linha);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: true }));
        });
        return;
    }

/* =========================
        SERVIR ARQUIVOS ESTÁTICOS (CORRIGIDO)
    ========================= */
    const PUBLIC_DIR = path.join(ROOT, 'public');
    const DADOS_DIR  = path.join(ROOT, 'dados');

    const tipos = {
        '.html': 'text/html; charset=utf-8',
        '.js':   'application/javascript; charset=utf-8',
        '.css':  'text/css; charset=utf-8',
        '.csv':  'text/csv; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png':  'image/png',
        '.jpg':  'image/jpeg'
    };

    let filePath;

    // 1. Regra para HTML e Raiz
    if (urlPath === '/' || urlPath.endsWith('.html')) {
        filePath = urlPath === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, path.basename(urlPath));
    } 
    // 2. Regra para pasta de Dados (CSV/JSON)
    else if (urlPath.startsWith('/dados/')) {
        filePath = path.join(DADOS_DIR, path.basename(urlPath));
    } 
    // 3. Regra para Imagens
    else if (urlPath.startsWith('/imagens/')) {
        filePath = path.join(PUBLIC_DIR, 'imagens', path.basename(urlPath));
    } 
    // 4. Regra Geral (CSS, JS, Favicon, etc) - BUSCA NA PUBLIC
    else {
        filePath = path.join(PUBLIC_DIR, path.basename(urlPath));
    }

    // Tenta servir o arquivo se ele existir
    if (filePath && fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': tipos[ext] || 'application/octet-stream' });
        return res.end(fs.readFileSync(filePath));
    }

    // Se falhar tudo
    console.log(`Log: 404 em ${urlPath} (Tentou: ${filePath})`);
    res.writeHead(404);
    res.end('Arquivo não encontrado');
  });

server.listen(PORT, () => {
    console.log(`🔥 Servidor FAST EPS rodando em http://localhost:${PORT}`);
});