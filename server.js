import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PORT = 8000;
const ROOT = path.resolve('.');  // a raiz do projeto

const server = http.createServer(async (req, res) => {
    // se a rota for /, abrir index.html
    let filePath = req.url === '/' 
        ? path.join(ROOT, 'index.html')
        : path.join(ROOT, req.url);

    try {
        const data = await readFile(filePath);
        res.writeHead(200);
        res.end(data);
    } catch (err) {
        res.writeHead(404);
        res.end('Arquivo não encontrado (404)');
    }
});

server.listen(PORT, () => {
    console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});
