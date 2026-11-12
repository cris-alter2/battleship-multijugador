(()=>{
 'use strict';
 const lengths=[5,4,3,2,2];let session=null,state={},fleet=[],vertical=false,busy=false,visible=false,poll=null,failures=0;
 try{session=JSON.parse(sessionStorage.getItem('naval.multiplayer.session'));}catch{}
 const panel=document.createElement('dialog');panel.id='mp';panel.innerHTML=`<header><div><small>ATLAS NAVAL · DOS CAPITANES</small><h2>Multijugador</h2></div><button id="mp-close" aria-label="Cerrar multijugador">Cerrar</button></header>
 <p>Batalla naval clásica · tablero 10 × 10 · cinco barcos · un disparo por turno, incluso al acertar.</p>
 <div id="mp-connect"><label>Tu nombre <input id="mp-name" maxlength="24" placeholder="Capitán"></label><button id="mp-connect-btn">Conectar</button></div>
 <div id="mp-lobby" hidden><label>Modalidad <select id="mp-scope"><option value="lan">Red local / Wi-Fi</option><option value="online">En línea / internet</option></select></label><p id="mp-help"></p><div class="mp-buttons"><button id="mp-queue">Buscar rival</button><button id="mp-create">Crear sala privada</button><label>Código de sala <input id="mp-code" maxlength="8" autocomplete="off"></label><button id="mp-join">Unirme</button></div></div>
 <p id="mp-status" role="status" aria-live="polite"></p><p id="mp-error" role="alert"></p>
 <div id="mp-match" hidden><div class="mp-buttons"><strong id="mp-room"></strong><button id="mp-copy">Copiar invitación</button></div><div id="mp-placement"><p id="mp-instruction"></p><div class="mp-buttons"><button id="mp-rotate">Orientación: horizontal</button><button id="mp-random">Colocar al azar</button><button id="mp-reset">Limpiar</button><button id="mp-ready">Confirmar flota</button></div></div><div class="mp-boards"><section><h3>Tu flota</h3><div id="mp-own" class="mp-grid" role="group" aria-label="Tablero propio"></div></section><section><h3>Aguas enemigas</h3><div id="mp-enemy" class="mp-grid" role="group" aria-label="Tablero rival"></div></section></div><p>■ Barco · × Impacto · • Agua · dorado: barco hundido</p></div>
 <button id="mp-leave" hidden>Abandonar / cancelar búsqueda</button><p class="mp-note">Si se pierde la conexión, vuelve en menos de 2 minutos. Las partidas viven en este servidor y se eliminan al reiniciarlo.</p>`;
 document.body.append(panel);
 const $=id=>panel.querySelector('#mp-'+id);
 const opener=document.createElement('button');opener.className='menu-btn';opener.type='button';opener.textContent='Multijugador · LAN e internet';document.getElementById('btnNew').after(opener);
 function error(s){$('error').textContent=s;}
 async function api(route,data={}){
  const response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({...data,id:session?.id}),signal:AbortSignal.timeout(8000)});
  const value=await response.json();if(!response.ok){if(response.status===401){session=null;sessionStorage.removeItem('naval.multiplayer.session');state={};render();}throw new Error(value.error||'Error del servidor.');}return value;
 }
 async function act(action,data={}){
  if(busy)return;busy=true;error('');render();
  try{state=await api('action',{action,scope:$('scope').value,...data});if(['leave','queue','create','join'].includes(action))fleet=[];failures=0;}
  catch(e){error(e.message);}finally{busy=false;render();}
 }
 async function refresh(){
  if(!visible||!session||busy)return;
  busy=true;
  try{const old=state.code;state=await api('state');if(old!==state.code)fleet=[];if(failures)error('');failures=0;}
  catch(e){failures++;error('Sin conexión: '+e.message+' Reintentando…');}finally{busy=false;render();}
 }
 function show(){visible=true;panel.showModal();if(location.protocol==='file:'){error('Inicia iniciar.bat y abre http://localhost:3000 para usar multijugador.');$('connect-btn').disabled=true;}render();refresh();clearInterval(poll);poll=setInterval(refresh,1200);}
 opener.onclick=show;
 function close(){if(state.code&&state.phase!=='ended'||state.queued){error('Abandona la partida o cancela la búsqueda antes de cerrar.');return;}visible=false;clearInterval(poll);panel.close();}
 $('close').onclick=close;panel.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('connect-btn').onclick=async()=>{if(busy)return;busy=true;error('');try{session=await api('session',{name:$('name').value});sessionStorage.setItem('naval.multiplayer.session',JSON.stringify(session));state={};}catch(e){error(e.message);}finally{busy=false;render();}};
 $('name').value=window.BSUsers?.current()?.display||'Capitán';
 function help(){$('help').textContent=$('scope').value==='lan'?'Ambos deben abrir la dirección IP del equipo servidor, por ejemplo http://192.168.1.20:3000, en la misma red.':'Ambos deben abrir la misma dirección pública HTTPS del servidor. Elegir esta opción no publica el servidor automáticamente.';}
 $('scope').onchange=help;help();
 $('queue').onclick=()=>act('queue');$('create').onclick=()=>act('create');$('join').onclick=()=>act('join',{code:$('code').value});
 $('leave').onclick=()=>{if(state.phase==='battle'&&!confirm('¿Abandonar y conceder la victoria al rival?'))return;act('leave');};
 $('copy').onclick=async()=>{const url=new URL(location.href);url.hash='';url.searchParams.set('room',state.code);url.searchParams.set('scope',state.scope);try{await navigator.clipboard.writeText(url.href);error('Invitación copiada. En LAN comparte la dirección IP del servidor, no localhost.');}catch{error('Comparte esta dirección: '+url.href);}};
 function canPlace(){return state.code&&!state.ready&&state.phase==='deploy'&&!busy;}
 function cellsAt(c,n,v){return Array.from({length:n},(_,i)=>c+i*(v?10:1));}
 function fits(cells,v){return cells.every(c=>c>=0&&c<100&&!fleet.flat().includes(c))&&(v||cells.every(c=>Math.floor(c/10)===Math.floor(cells[0]/10)));}
 function place(c){if(!canPlace()||fleet.length===5)return;const cells=cellsAt(c,lengths[fleet.length],vertical);if(!fits(cells,vertical))return error('El barco sale del tablero o se cruza con otro.');fleet.push(cells);error('');render();}
 $('rotate').onclick=()=>{vertical=!vertical;render();};$('reset').onclick=()=>{if(canPlace()){fleet=[];render();}};
 $('random').onclick=()=>{if(!canPlace())return;fleet=[];for(const n of lengths){const options=[];for(let c=0;c<100;c++)for(const v of [false,true]){const cells=cellsAt(c,n,v);if(fits(cells,v))options.push(cells);}fleet.push(options[Math.floor(Math.random()*options.length)]);}error('');render();};
 $('ready').onclick=()=>act('deploy',{fleet});
 // Build once: polling preserves keyboard focus on cells.
 for(const side of ['own','enemy'])for(let c=0;c<100;c++){const button=document.createElement('button');button.type='button';button.dataset.cell=c;button.onclick=()=>side==='own'?place(c):act('fire',{cell:c});$(side).append(button);}
 function board(side){const own=side==='own',ships=(state.own||fleet).flat(),shots=own?(state.incoming||[]):(state.shots||[]);for(const b of $(side).children){const c=Number(b.dataset.cell),shot=shots.find(s=>s.cell===c),ship=own&&ships.includes(c),sunk=!own&&state.sunk?.includes(c);b.className=[ship?'ship':'',shot?(shot.hit?'hit':'miss'):'',sunk?'sunk':''].join(' ');b.textContent=shot?(shot.hit?'×':'•'):ship?'■':'';b.setAttribute('aria-label',String.fromCharCode(65+Math.floor(c/10))+(c%10+1)+(shot?shot.hit?' impacto':' agua':ship?' barco':''));b.title=b.getAttribute('aria-label');b.disabled=own?(!canPlace()||fleet.length===5):busy||failures>0||state.phase!=='battle'||!state.myTurn||!!shot;}}
 function render(){
  $('connect').hidden=!!session;$('lobby').hidden=!session||!!state.code||!!state.queued;$('match').hidden=!state.code;$('leave').hidden=!state.code&&!state.queued;$('leave').disabled=busy;
  $('status').textContent=!session?'Conecta para buscar un rival.':state.queued?'Buscando un rival en esta modalidad…':!state.code?'Elige partida rápida o una sala privada.':state.phase==='ended'?(state.winner==='you'?'¡Victoria! ':'Derrota. ')+state.reason:state.phase==='battle'?(state.myTurn?'Tu turno: dispara en las aguas enemigas.':'Turno de '+state.opponent+'.')+(state.opponentOnline?'':' Rival desconectado: esperando su regreso…'):!state.opponent?'Sala creada. Comparte el código; puedes preparar tu flota.':!state.ready?'Rival: '+state.opponent+'. Coloca tu flota.':!state.enemyReady?'Flota confirmada. Esperando el despliegue rival…':'Comenzando…';
  $('room').textContent=state.code?'Sala '+state.code+' · '+(state.scope==='lan'?'Red local':'En línea'):'';
  $('placement').hidden=state.ready||state.phase==='ended';$('instruction').textContent=fleet.length<5?'Coloca el barco '+(fleet.length+1)+' de 5 ('+lengths[fleet.length]+' casillas). Haz clic en su primera casilla.':'Flota completa: confirma cuando estés listo.';
  $('rotate').textContent='Orientación: '+(vertical?'vertical':'horizontal');for(const id of ['rotate','reset','random'])$(id).disabled=!canPlace();$('ready').disabled=!canPlace()||fleet.length!==5;
  for(const id of ['queue','create','join','connect-btn'])$(id).disabled=busy||location.protocol==='file:';
  board('own');board('enemy');
 }
 const params=new URLSearchParams(location.search);if(params.has('room')){$('code').value=params.get('room').slice(0,8);$('scope').value=params.get('scope')==='lan'?'lan':'online';help();}
 window.addEventListener('beforeunload',e=>{if(state.code&&state.phase!=='ended'||state.queued){e.preventDefault();e.returnValue='';}});
 render();
})();
