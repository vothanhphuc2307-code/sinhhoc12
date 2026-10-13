'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const apiTest = require('./api/test');
const apiSubmit = require('./api/submit');
const apiHistory = require('./api/history');
const apiAdaptive = require('./api/adaptive');
const apiSources = require('./api/sources');
const apiHealth = require('./api/health');
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8', '.png':'image/png', '.ico':'image/x-icon' };
function resAdapter(res) {
  return {
    setHeader: (k,v) => res.setHeader(k,v),
    status(code) { res.statusCode=code; return this; },
    json(obj) { res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return this; }
  };
}
const server = http.createServer((req,res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  req.query = Object.fromEntries(url.searchParams.entries());
  if (url.pathname === '/api/test') return apiTest(req, resAdapter(res));
  if (url.pathname === '/api/submit') {
    let body=''; req.on('data',chunk=>{ body+=chunk; if(body.length>1e6) req.destroy(); });
    req.on('end',()=>{ try { req.body=body ? JSON.parse(body) : {}; } catch { req.body={}; } apiSubmit(req,resAdapter(res)); });
    return;
  }
  if (url.pathname === '/api/history') return apiHistory(req,resAdapter(res));
  if (url.pathname === '/api/sources') return apiSources(req,resAdapter(res));
  if (url.pathname === '/api/health') return apiHealth(req,resAdapter(res));
  if (url.pathname === '/api/adaptive') {
    let body=''; req.on('data',chunk=>{ body+=chunk; if(body.length>1e6) req.destroy(); });
    req.on('end',()=>{ try { req.body=body ? JSON.parse(body) : {}; } catch { req.body={}; } apiAdaptive(req,resAdapter(res)); });
    return;
  }
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  if (!['/index.html','/styles.css','/app.js'].includes(pathname)) { res.statusCode=404; res.end('Not found'); return; }
  const file = path.join(ROOT, pathname.slice(1));
  fs.readFile(file,(err,data)=>{
    if(err){res.statusCode=404;res.end('Not found');return;}
    res.statusCode=200;res.setHeader('Content-Type',MIME[path.extname(file)] || 'application/octet-stream');res.end(data);
  });
});
server.listen(PORT,()=>console.log(`Sinh 12 diagnostic app is running at http://localhost:${PORT}`));
