// 서울 지하철 대시보드 서버 (Render 배포용, 추가 패키지 없음)
// - /            : index.html 제공
// - /api/subway : 실시간 도착정보 API 대신 호출
// - /openapi    : 혼잡도(일반 오픈API) 대신 호출
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

const ROUTES = {
  '/api/subway': 'http://swopenapi.seoul.go.kr/api/subway',
  '/openapi': 'http://openapi.seoul.go.kr:8088'
};
const STATIC = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/photo.jpg': ['photo.jpg', 'image/jpeg'], '/photo.png': ['photo.png', 'image/png'] };

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const prefix = Object.keys(ROUTES).find(p => req.url.startsWith(p + '/'));
  if (prefix) {
    try {
      const r = await fetch(ROUTES[prefix] + req.url.slice(prefix.length), { signal: AbortSignal.timeout(8000) });
      const body = Buffer.from(await r.arrayBuffer());
      res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json; charset=utf-8' });
      return res.end(body);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ errorMessage: { code: 'PROXY-502', message: '프록시 오류: ' + e.message } }));
    }
  }

  const s = STATIC[req.url.split('?')[0]];
  if (!s) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, s[0]), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': s[1] });
    res.end(data);
  });
}).listen(PORT, () => console.log('서버 실행 중, 포트 ' + PORT));
