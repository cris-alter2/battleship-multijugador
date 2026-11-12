'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const LENGTHS = [5,4,3,2,2];
function createServer({sessionTimeout=120000,sweepInterval=5000}={}) {
 const users = new Map(), rooms = new Map(), queue = [];
 const fail = (s) => { throw new Error(s); };
 function roomFor(u) { return rooms.get(u.room); }
 function createRoom(u, scope) {
  let code; do { code=crypto.randomBytes(4).toString('hex').toUpperCase(); } while(rooms.has(code));
  const r={code,scope,players:[u.id],fleets:{},shots:{},turn:u.id,winner:null,reason:''}; rooms.set(code,r); u.room=code; return r;
 }
 function leave(u) {
  for(let i=queue.length-1;i>=0;i--) if(queue[i]===u.id) queue.splice(i,1);
  const r=roomFor(u); if(r) { if(r.players.length===1) rooms.delete(r.code); else if(!r.winner) {r.winner=r.players.find(id=>id!==u.id);r.reason='El rival abandonó la partida.';} }
  u.room=null;
 }
 function view(u) {
  const r=roomFor(u); if(!r) return {queued:queue.includes(u.id)};
  const enemy=r.players.find(id=>id!==u.id), ef=r.fleets[enemy], shots=r.shots[u.id]||[];
  return {code:r.code,scope:r.scope,name:u.name,opponent:users.get(enemy)?.name,opponentOnline:!!users.get(enemy)&&Date.now()-users.get(enemy).seen<20000,ready:!!r.fleets[u.id],enemyReady:!!ef,own:r.fleets[u.id]||null,incoming:r.shots[enemy]||[],shots,sunk:ef?ef.filter(ship=>ship.every(c=>shots.some(s=>s.cell===c))).flat():[],phase:r.winner?'ended':Object.keys(r.fleets).length===2?'battle':'deploy',myTurn:r.turn===u.id,winner:r.winner? r.winner===u.id?'you':'opponent':null,reason:r.reason};
 }
 function action(u,b) {
  const r=roomFor(u);
  if(b.action==='leave'){leave(u);return;}
  if(['create','queue','join'].includes(b.action)) {
   if(r&&!r.winner) fail('Abandona tu sala actual antes de entrar en otra.');
   const scope=b.scope==='lan'?'lan':'online';
   if(b.action==='join') {
    const target=rooms.get(String(b.code||'').trim().toUpperCase());
    if(!target||target.scope!==scope||target.players.length!==1||target.winner) fail('Sala no disponible en esta modalidad.');
    leave(u);target.players.push(u.id);u.room=target.code; return;
   }
   leave(u);
   if(b.action==='create'){createRoom(u,scope);return;}
   u.scope=scope;
   const index=queue.findIndex(id=>users.has(id)&&users.get(id).scope===scope&&Date.now()-users.get(id).seen<20000);
   if(index>=0){const other=users.get(queue.splice(index,1)[0]);const nr=createRoom(other,scope);nr.players.push(u.id);u.room=nr.code;}else queue.push(u.id);
   return;
  }
  if(!r||r.winner) fail('No hay una partida activa.');
  if(b.action==='deploy') {
   if(r.fleets[u.id]) fail('Tu despliegue ya está confirmado.');
   const fleet=b.fleet;
   if(!Array.isArray(fleet)||fleet.length!==5) fail('Debes colocar cinco barcos.');
   const used=new Set();
   fleet.forEach((ship,i)=>{
    if(!Array.isArray(ship)||ship.length!==LENGTHS[i]) fail('Longitud de barco incorrecta.');
    const cells=[...ship].sort((a,b)=>a-b);
    if(cells.some(c=>!Number.isInteger(c)||c<0||c>=100||used.has(c))) fail('Posición inválida o barcos superpuestos.');
    if(new Set(cells).size!==cells.length) fail('Casilla duplicada.');
    const horizontal=cells.every(c=>Math.floor(c/10)===Math.floor(cells[0]/10))&&cells.every((c,j)=>c===cells[0]+j);
    const vertical=cells.every((c,j)=>c===cells[0]+j*10);
    if(!horizontal&&!vertical) fail('Los barcos deben ser rectos y contiguos.');
    cells.forEach(c=>used.add(c));
   });
   r.fleets[u.id]=fleet.map(s=>s.slice());r.shots[u.id]=[];return;
  }
  if(b.action==='fire') {
   if(Object.keys(r.fleets).length!==2||r.turn!==u.id) fail('Espera tu turno y el despliegue rival.');
   const c=b.cell, shots=r.shots[u.id], enemy=r.players.find(id=>id!==u.id);
   if(!Number.isInteger(c)||c<0||c>=100||shots.some(s=>s.cell===c)) fail('Disparo inválido o repetido.');
   shots.push({cell:c,hit:r.fleets[enemy].some(s=>s.includes(c))});
   if(r.fleets[enemy].flat().every(c=>shots.some(s=>s.cell===c))){r.winner=u.id;r.reason='Todos los barcos rivales han sido hundidos.';}
   else r.turn=enemy;
   return;
  }
  fail('Acción desconocida.');
 }
 const timer=setInterval(()=>{const now=Date.now();for(const u of users.values())if(now-u.seen>sessionTimeout){leave(u);users.delete(u.id);}for(const [code,r] of rooms)if(r.players.every(id=>!users.has(id)||users.get(id).room!==code))rooms.delete(code);},sweepInterval);timer.unref();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')) {
   try {
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host) return send(403,{error:'Origen no permitido.'});
    if(req.method!=='POST')return send(405,{error:'Usa POST.'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000) return send(413,{error:'Petición demasiado grande.'});}
    const b=JSON.parse(raw||'{}');
    if(url.pathname==='/api/session') {
     if(users.size>=2000) return send(503,{error:'Servidor lleno.'});
     const token=crypto.randomBytes(32).toString('hex'), id=crypto.randomUUID();
     const u={id,token,name:String(b.name||'Capitán').trim().slice(0,24)||'Capitán',seen:Date.now(),room:null,last:0};users.set(id,u);return send(200,{token,id});
    }
    const u=users.get(b.id);if(!u||u.token!==req.headers.authorization?.replace(/^Bearer /,''))return send(401,{error:'Sesión caducada. Vuelve a conectar.'});
    u.seen=Date.now();
    if(url.pathname==='/api/action'){if(Date.now()-u.last<100)return send(429,{error:'Espera un instante.'});u.last=Date.now();action(u,b);}
    else if(url.pathname!=='/api/state')return send(404,{error:'Ruta inexistente.'});
    return send(200,view(u));
   }catch(e){return send(400,{error:e instanceof SyntaxError?'Datos inválidos.':e.message});}
  }
  const files={'/':'index.html','/multiplayer.js':'multiplayer.js','/multiplayer.css':'multiplayer.css'};
  if(!files[url.pathname]) {res.writeHead(404);return res.end('No encontrado');}
  const file=path.join(__dirname,'public',files[url.pathname]);
  res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');
  fs.createReadStream(file).on('error',()=>{res.statusCode=500;res.end('Archivo no disponible');}).pipe(res);
 });
 server.on('close',()=>clearInterval(timer));return server;
}
if(require.main===module){const port=Number(process.env.PORT)||3000;createServer().listen(port,'0.0.0.0',()=>console.log(`Battleship: http://localhost:${port} (LAN: usa la IP de este equipo)`));}
module.exports={createServer};
