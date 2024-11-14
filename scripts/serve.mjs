import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 10001;

http.createServer((req, res) => {
    // Print request information
    console.log(`Received request: ${req.method} ${req.url}`);

    const filePath = path.join(__dirname, '../dist/readtrail.user.js');

    // Force disable caching
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Read the file on each request
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error('Error reading file:', err);
            res.writeHead(500);
            res.end('Error reading script file');
            return;
        }
        res.writeHead(200);
        res.end(content);
    });
}).listen(PORT, () => {
    console.log(`Dev server running at http://localhost:10001/`);
    console.log('Install the dev script from dist/readtrail.dev.user.js');
});