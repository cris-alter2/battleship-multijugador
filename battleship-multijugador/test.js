const {test}=require('node:test');const assert=require('node:assert/strict');const {createServer}=require('./server');
test('Desconexión expira, reconexión conserva sala y el rival recibe victoria',async()=>{
 const server=createServer({sessionTimeout:500,sweepInterval:20});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 async function call(route,data={},u){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+u.token}:{})},body:JSON.stringify({...data,id:u?.id})});return {status:r.status,data:await r.json()};}
 try{const a=(await call('session',{name:'A'})).data,b=(await call('session',{name:'B'})).data;const room=(await call('action',{action:'create',scope:'lan'},a)).data;await call('action',{action:'join',scope:'lan',code:room.code},b);
 assert.equal((await call('state',{},a)).data.code,room.code);
 for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,100));assert.equal((await call('state',{},b)).status,200);}
 assert.equal((await call('state',{},b)).data.winner,'you');assert.equal((await call('state',{},a)).status,401);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('Emparejamiento, privacidad, turnos, victoria, salas y abandono',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function call(route,data={},u){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+u.token}:{})},body:JSON.stringify({...data,id:u?.id})});return {status:r.status,data:await r.json()};}
 const session=async(name)=>(await call('session',{name})).data;
 const act=async(u,action,data={})=>{await new Promise(r=>setTimeout(r,110));return call('action',{action,...data},u);};
 const state=async(u)=>(await call('state',{},u)).data;
 try{
  const a=await session('A'),b=await session('B'),c=await session('C');
  assert.equal((await call('state',{}, {...a,token:'wrong'})).status,401);
  assert.equal((await act(a,'queue',{scope:'lan'})).data.queued,true);
  assert.equal((await act(c,'queue',{scope:'online'})).data.queued,true);
  const match=await act(b,'queue',{scope:'lan'});assert.ok(match.data.code);assert.equal((await state(a)).code,match.data.code);assert.equal((await state(c)).queued,true);
  const fleet=[[0,1,2,3,4],[10,11,12,13],[20,21,22],[30,31],[40,41]];
  assert.equal((await act(a,'fire',{cell:0})).status,400);
  assert.equal((await act(a,'deploy',{fleet:[[0,1,2,3,4],[0,1,2,3],[20,21,22],[30,31],[40,41]]})).status,400);
  assert.equal((await act(a,'deploy',{fleet:[[8,9,10,11,12],...fleet.slice(1)]})).status,400);
  assert.equal((await act(a,'deploy',{fleet})).status,200);
  const hidden=await state(b);assert.equal(hidden.own,null);assert.equal(hidden.enemyReady,true);assert.deepEqual(hidden.sunk,[]);assert.equal(JSON.stringify(hidden).includes('fleets'),false);
  await act(b,'deploy',{fleet});assert.equal((await state(a)).phase,'battle');
  assert.equal((await act(b,'fire',{cell:0})).status,400);
  assert.equal((await act(a,'fire',{cell:100})).status,400);
  await act(a,'fire',{cell:0});assert.equal((await state(b)).incoming[0].hit,true);
  assert.equal((await act(a,'fire',{cell:1})).status,400);
  await act(b,'fire',{cell:99});assert.equal((await act(a,'fire',{cell:0})).status,400);
  let miss=98;for(const cell of fleet.flat().slice(1)){await act(a,'fire',{cell});if(cell!==41)await act(b,'fire',{cell:miss--});}
  assert.equal((await state(a)).winner,'you');assert.equal((await state(b)).winner,'opponent');assert.equal((await act(b,'fire',{cell:80})).status,400);
  await act(a,'leave');await act(b,'leave');await act(c,'leave');
  const room=(await act(a,'create',{scope:'online'})).data;
  assert.equal((await act(b,'join',{scope:'lan',code:room.code})).status,400);
  assert.equal((await act(b,'join',{scope:'online',code:room.code})).status,200);
  assert.equal((await act(c,'join',{scope:'online',code:room.code})).status,400);
  await act(a,'leave');assert.equal((await state(b)).winner,'you');
  const index=await fetch(base);assert.equal(index.status,200);assert.ok((await index.text()).includes('/multiplayer.js'));
  const forbidden=await fetch(base+'/server.js');assert.equal(forbidden.status,404);
  const origin=await fetch(base+'/api/session',{method:'POST',headers:{Origin:'http://evil.example'},body:'{}'});assert.equal(origin.status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
