import { firebaseConfig } from "./firebase-config.js";

  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

  import {
    getDatabase, ref, set, update, get, onValue, remove,
    serverTimestamp, onDisconnect
  } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

  import {
    getAuth, signInAnonymously, GoogleAuthProvider,
    signInWithPopup, signOut, onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

  const $ = id => document.getElementById(id);

  const configured =
    firebaseConfig?.apiKey &&
    !firebaseConfig.apiKey.startsWith("INCOLLA_");

  let app=null, db=null, auth=null;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  let meRef=null, activeParticipantRoom=null, activeParticipantNick="", activeParticipantStatus="away", activeParticipantBreakEnd=null;
  let participantStop=null, participantMetaStop=null, participantConnectionStop=null;
  let roomsStop=null, teacherPeopleStop=null, teacherMetaStop=null;
  let activeTeacherRoom=null, activeTeacherMeta=null, activeTeacherPeople={}, roomsCache={};
  let participantTimerInterval=null, teacherTimerInterval=null, teacherStatsInterval=null, roomsRenderInterval=null;
  let serverTimeOffsetMs=0;
  function setConnection(text,state="ok"){
    const badge=$("connBadge");
    if(!badge)return;
    badge.innerHTML=`<span class="connection-dot ${state}"></span><span>${text}</span>`;
  }


  function initFirebase(){
    if(!configured){
      setConnection("configurazione richiesta","warn");
      return false;
    }
    if(!app){
      app=initializeApp(firebaseConfig);
      db=getDatabase(app);
      auth=getAuth(app);
      setConnection("pronto");
      onValue(ref(db,".info/serverTimeOffset"),snap=>{
        serverTimeOffsetMs=Number(snap.val())||0;
      });
    }
    return true;
  }

  function normRoom(s){return (s||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,24)}
  function normNick(s){return (s||"").trim().replace(/[.#$\[\]/]/g,"").slice(0,32)}
  function roomLink(room){return `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`}
  function serverNow(){return Date.now()+serverTimeOffsetMs}
  function stopInterval(id){if(id)clearInterval(id);return null}
  function fmtCountdown(ms){const t=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(t/60).toString().padStart(2,"0")}:${(t%60).toString().padStart(2,"0")}`}
  function fmtDateTime(ts){if(!ts||typeof ts!=="number")return "—";return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(ts))}
  function fmtDuration(ms){if(ms==null||!Number.isFinite(ms)||ms<0)return "—";const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h>0?`${h}h ${m}m ${sec}s`:`${m}m ${sec}s`}
  function roomStatus(meta){if(!meta)return "—";if(meta.archived===true)return "Archiviata";if(meta.breakEndsAt&&meta.breakEndsAt>serverNow())return "In pausa";return "Attiva"}
  function roomStatusClass(meta){if(meta?.archived)return "archived";if(meta?.breakEndsAt&&meta.breakEndsAt>serverNow())return "pause";return "on"}

  async function ensureAnonymous(){
    if(!initFirebase())return null;
    if(auth.currentUser?.isAnonymous)return auth.currentUser;
    if(auth.currentUser&&!auth.currentUser.isAnonymous)await signOut(auth);
    const cred=await signInAnonymously(auth);
    setConnection("connesso");
    return cred.user;
  }

  function switchMode(mode){
    const participant=mode==="participant";
    $("splashScreen").classList.add("hidden");
    $("modeBar").classList.remove("hidden");
    $("participantMode").classList.toggle("hidden",!participant);
    $("teacherMode").classList.toggle("hidden",participant);
    $("modeLabel").textContent=participant?"Modalità partecipante":"Area docente";
  }

  function showSplash(){
    $("participantMode").classList.add("hidden");
    $("teacherMode").classList.add("hidden");
    $("modeBar").classList.add("hidden");
    $("splashScreen").classList.remove("hidden");
  }

  $("splashParticipantBtn").onclick=()=>switchMode("participant");
  $("splashTeacherBtn").onclick=()=>switchMode("teacher");
  $("homeBtn").onclick=()=>showSplash();

  const q=new URLSearchParams(location.search),linkedRoom=normRoom(q.get("room"));
  if(linkedRoom){
    $("room").value=linkedRoom;
    switchMode("participant");
    $("modeBar").classList.add("hidden");
  }

  const savedRoom=localStorage.getItem("presence_room"),savedNick=localStorage.getItem("presence_nick");
  if(savedRoom&&!$("room").value)$("room").value=savedRoom;
  if(savedNick)$("nick").value=savedNick;

  async function armDisconnect(){
    if(!meRef)return;
    try{
      const current=(await get(meRef)).val();
      await onDisconnect(meRef).set({
        nick:activeParticipantNick,
        status:"away",
        updatedAt:serverTimestamp(),
        joinedAt:current?.joinedAt||serverNow()
      });
    }catch(err){console.warn("onDisconnect:",err)}
  }

  $("joinBtn").onclick=async()=>{
    try{
      const room=normRoom($("room").value),nick=normNick($("nick").value);
      if(!room||!nick){alert("Inserisci stanza e nickname.");return}

      const user=await ensureAnonymous();
      if(!user)return;

      const meta=(await get(ref(db,`rooms/${room}/meta`))).val();
      if(!meta||meta.archived===true||meta.isOpen!==true){
        alert("La stanza non esiste oppure non è disponibile.");
        return;
      }

      const existing=(await get(ref(db,`rooms/${room}/participants/${user.uid}`))).val();
      const joinedAt=existing?.joinedAt||serverNow();

      activeParticipantRoom=room;
      activeParticipantNick=nick;
      localStorage.setItem("presence_room",room);
      localStorage.setItem("presence_nick",nick);

      meRef=ref(db,`rooms/${room}/participants/${user.uid}`);

      await set(meRef,{
        nick,
        status:"present",
        updatedAt:serverTimestamp(),
        joinedAt
      });

      $("joinCard").classList.add("hidden");
      $("participantCard").classList.remove("hidden");
      $("hello").textContent=`Ciao, ${nick}`;
      $("myRoom").textContent=`Stanza ${room}`;
      $("participantRoomTitle").textContent=meta.title||"";

      if(participantStop)participantStop();
      participantStop=onValue(meRef,snap=>{
        const v=snap.val(),present=v?.status==="present";
        activeParticipantStatus=present?"present":"away";
        if(v?.nick){
          activeParticipantNick=v.nick;
          $("hello").textContent=`Ciao, ${v.nick}`;
        }
        $("myDot").className="dot"+(present?" on":"");
        $("myStatus").textContent=present?"Presente":"Assente";
        $("presentBtn").classList.toggle("hidden",present);
        $("awayBtn").classList.toggle("hidden",!present);
        renderParticipantTimer(activeParticipantBreakEnd);
      });

      if(participantConnectionStop)participantConnectionStop();
      participantConnectionStop=onValue(ref(db,".info/connected"),async snap=>{
        const connected=snap.val()===true;
        setConnection(connected?"connesso":"riconnessione...",connected?"ok":"warn");
        if(connected&&meRef)await armDisconnect();
      });

      if(participantMetaStop)participantMetaStop();
      participantMetaStop=onValue(ref(db,`rooms/${room}/meta`),snap=>{
        const m=snap.val();
        const disabled=!m||m.archived===true||m.isOpen!==true;
        $("presentBtn").disabled=disabled;
        $("awayBtn").disabled=disabled;
        $("renameBtn").disabled=disabled;
        if(m)$("participantRoomTitle").textContent=m.title||"";
        activeParticipantBreakEnd=m?.breakEndsAt||null;
        renderParticipantTimer(activeParticipantBreakEnd);
        if(disabled)$("participantTimerNote").textContent="La stanza è stata archiviata dal docente.";
      });
    }catch(err){
      console.error(err);
      alert(`Errore: ${err.message}`);
    }
  };

  async function setStatus(status){
    if(!meRef)return;
    const old=(await get(meRef)).val()||{};
    await set(meRef,{
      nick:activeParticipantNick,
      status,
      updatedAt:serverTimestamp(),
      joinedAt:old.joinedAt||serverNow()
    });
    await armDisconnect();
  }

  $("presentBtn").onclick=()=>setStatus("present");
  $("awayBtn").onclick=()=>setStatus("away");

  $("renameBtn").onclick=()=>{
    $("renameInput").value=activeParticipantNick;
    $("renameBox").classList.remove("hidden");
    $("renameInput").focus();
  };
  $("cancelRenameBtn").onclick=()=>$("renameBox").classList.add("hidden");
  $("saveRenameBtn").onclick=async()=>{
    const nick=normNick($("renameInput").value);
    if(!nick){alert("Inserisci un nickname valido.");return}
    const old=(await get(meRef)).val()||{};
    activeParticipantNick=nick;
    localStorage.setItem("presence_nick",nick);
    $("nick").value=nick;
    await set(meRef,{...old,nick,updatedAt:serverTimestamp()});
    await armDisconnect();
    $("renameBox").classList.add("hidden");
  };

  function renderParticipantTimer(end){
    participantTimerInterval=stopInterval(participantTimerInterval);

    const graceMs=10*60*1000;
    const endTime=Number(end)||0;
    const now=serverNow();

    if(
      !endTime ||
      activeParticipantStatus==="present" ||
      now>endTime+graceMs
    ){
      $("participantTimerBox").classList.add("hidden");
      return;
    }

    $("participantTimerBox").classList.remove("hidden");

    const tick=()=>{
      const current=serverNow();
      const rem=endTime-current;

      if(
        activeParticipantStatus==="present" ||
        current>endTime+graceMs
      ){
        $("participantTimerBox").classList.add("hidden");
        participantTimerInterval=stopInterval(participantTimerInterval);
        return;
      }

      if(rem>0){
        $("participantTimerLabel").textContent="La pausa termina tra";
        $("participantTimer").classList.remove("ended");
        $("participantTimer").textContent=fmtCountdown(rem);
        $("participantTimerNote").textContent="Quando rientri, premi “Sono presente”.";
      }else{
        $("participantTimerLabel").textContent="";
        $("participantTimer").classList.add("ended");
        $("participantTimer").textContent="Pausa terminata";
        $("participantTimerNote").textContent="Segnala il tuo rientro.";
      }
    };

    tick();
    participantTimerInterval=setInterval(tick,250);
  }

  $("teacherLoginBtn").onclick=async()=>{
    try{
      if(!initFirebase())return;
      $("teacherAuthError").classList.add("hidden");
      $("teacherAuthError").textContent="";
      if(auth.currentUser)await signOut(auth);
      await signInWithPopup(auth,googleProvider);
    }catch(err){
      console.error("Google login error:",err);
      if(err.code==="auth/popup-closed-by-user")return;
      $("teacherAuthError").textContent=`Accesso con Google non riuscito: ${err.message}`;
      $("teacherAuthError").classList.remove("hidden");
    }
  };

  async function authorizeTeacher(user){
    if(!user||user.isAnonymous)return false;
    try{
      const snap=await get(ref(db,`teachers/${user.uid}`));
      const teacher=snap.val();
      return teacher?.enabled===true;
    }catch(err){
      console.error("Teacher authorization error:",err);
      return false;
    }
  }

  if(initFirebase()){
    onAuthStateChanged(auth,async user=>{
      if(!user||user.isAnonymous){
        $("teacherLoginCard").classList.remove("hidden");
        $("teacherWorkspace").classList.add("hidden");
        stopTeacherListeners();
        return;
      }

      setConnection("verifica accesso...","warn");
      const authorized=await authorizeTeacher(user);

      if(!authorized){
        stopTeacherListeners();
        $("teacherWorkspace").classList.add("hidden");
        $("teacherLoginCard").classList.remove("hidden");
        $("teacherAuthError").textContent=`Account Google autenticato (${user.email||user.uid}), ma non autorizzato come docente.`;
        $("teacherAuthError").classList.remove("hidden");
        setConnection("accesso negato","warn");
        return;
      }

      switchMode("teacher");
      $("modeBar").classList.add("hidden");
      $("teacherAuthError").classList.add("hidden");
      $("teacherLoginCard").classList.add("hidden");
      $("teacherWorkspace").classList.remove("hidden");
      $("teacherIdentity").textContent=`Docente: ${user.displayName||user.email||user.uid}`;
      setConnection("docente connesso");
      startRoomsList();
    });
  }

  $("teacherLogoutBtn").onclick=async()=>{
    if(auth)await signOut(auth);
    activeTeacherRoom=null;
    clearSelectedRoom();
    showSplash();
  };

  function stopTeacherListeners(){
    if(roomsStop){roomsStop();roomsStop=null}
    if(teacherPeopleStop){teacherPeopleStop();teacherPeopleStop=null}
    if(teacherMetaStop){teacherMetaStop();teacherMetaStop=null}
    teacherStatsInterval=stopInterval(teacherStatsInterval);
    roomsRenderInterval=stopInterval(roomsRenderInterval);
  }

  function startRoomsList(){
    if(roomsStop)roomsStop();
    roomsStop=onValue(
      ref(db,"rooms"),
      snap=>{
        roomsCache=snap.val()||{};
        renderRoomsList(roomsCache);
      },
      err=>{
        console.error("rooms listener:",err);
        $("teacherAuthError").textContent="Autorizzazione docente valida, ma le Security Rules non consentono la lettura delle stanze.";
        $("teacherAuthError").classList.remove("hidden");
      }
    );
    roomsRenderInterval=stopInterval(roomsRenderInterval);
    roomsRenderInterval=setInterval(()=>renderRoomsList(roomsCache),1000);
  }

  function renderRoomsList(rooms){
    const entries=Object.entries(rooms).sort((a,b)=>(b[1]?.meta?.createdAt||0)-(a[1]?.meta?.createdAt||0));
    $("roomsList").innerHTML="";
    if(!entries.length){
      $("roomsList").innerHTML='<div class="mutedbox">Nessuna stanza creata.</div>';
      return;
    }
    for(const [code,data] of entries){
      const people=Object.values(data.participants||{});
      const present=people.filter(p=>p.status==="present").length;
      const meta=data.meta||{};
      const el=document.createElement("div");
      el.className="roomitem"+(activeTeacherRoom===code?" selected":"");
      el.dataset.code=code;
      const status=roomStatus(meta);
      const statusClass=roomStatusClass(meta);
      const statusIcon=status==="Attiva"?"●":status==="In pausa"?"Ⅱ":"▣";
      el.innerHTML=`<div><div class="name"></div><div class="roomtitle small"></div><div class="small room-count"></div></div><span class="room-status-icon ${statusClass}" title="${status}" aria-label="${status}">${statusIcon}</span>`;
      el.querySelector(".name").textContent=code;
      el.querySelector(".roomtitle").textContent=meta.title||"";
      el.querySelector(".room-count").textContent=`${present}/${people.length} presenti`;
      el.onclick=()=>watchRoom(code);
      $("roomsList").appendChild(el);
    }
  }

  $("createRoomBtn").onclick=async()=>{
    try{
      if(!auth?.currentUser||auth.currentUser.isAnonymous)return;
      const room=normRoom($("newRoomCode").value);
      const title=$("newRoomTitle").value.trim().slice(0,80);
      if(!room){alert("Inserisci il codice stanza.");return}
      const existing=(await get(ref(db,`rooms/${room}/meta`))).val();
      if(existing&&!confirm(`La stanza ${room} esiste già. Vuoi selezionarla?`))return;
      if(!existing){
        await set(ref(db,`rooms/${room}/meta`),{
          isOpen:true,
          archived:false,
          title,
          createdAt:serverTimestamp(),
          updatedAt:serverTimestamp(),
          createdBy:auth.currentUser.uid,
          totalPausedMs:0,
          breakStartedAt:null,
          breakEndsAt:null
        });
      }
      await watchRoom(room);
      $("newRoomCode").value="";
      $("newRoomTitle").value="";
    }catch(err){
      console.error(err);
      alert(`Impossibile creare la stanza: ${err.message}`);
    }
  };

  function clearSelectedRoom(){
    activeTeacherRoom=null;
    activeTeacherMeta=null;
    activeTeacherPeople={};
    $("noRoomSelected").classList.remove("hidden");
    $("roomControlContent").classList.add("hidden");
    $("participantsPlaceholder").classList.remove("hidden");
    $("participantsContent").classList.add("hidden");
    if(teacherPeopleStop)teacherPeopleStop();
    if(teacherMetaStop)teacherMetaStop();
    teacherStatsInterval=stopInterval(teacherStatsInterval);
  }

  async function watchRoom(room){
    activeTeacherRoom=room;
    renderRoomsList(roomsCache);
    $("noRoomSelected").classList.add("hidden");
    $("roomControlContent").classList.remove("hidden");
    $("participantsPlaceholder").classList.add("hidden");
    $("participantsContent").classList.remove("hidden");
    $("selectedRoomCode").textContent=`Codice stanza: ${room}`;
    $("shareLink").value=roomLink(room);

    if(teacherPeopleStop)teacherPeopleStop();
    teacherPeopleStop=onValue(ref(db,`rooms/${room}/participants`),snap=>{
      activeTeacherPeople=snap.val()||{};
      renderPeople(activeTeacherPeople);
      maybePersistFirstEntry();
      renderTeacherStats();
    });

    if(teacherMetaStop)teacherMetaStop();
    teacherMetaStop=onValue(ref(db,`rooms/${room}/meta`),snap=>{
      activeTeacherMeta=snap.val()||{};
      $("selectedRoomTitle").value=activeTeacherMeta.title||"";
      renderTeacherTimer(activeTeacherMeta.breakEndsAt||null);
      maybePersistFirstEntry();
      renderTeacherStats();
    });

    teacherStatsInterval=stopInterval(teacherStatsInterval);
    teacherStatsInterval=setInterval(renderTeacherStats,1000);
  }

  async function maybePersistFirstEntry(){
    if(!activeTeacherRoom||!activeTeacherMeta||activeTeacherMeta.firstEntryAt)return;
    const times=Object.values(activeTeacherPeople||{}).map(p=>Number(p.joinedAt)).filter(Number.isFinite);
    if(!times.length)return;
    const first=Math.min(...times);
    try{
      await update(ref(db,`rooms/${activeTeacherRoom}/meta`),{firstEntryAt:first});
    }catch(err){console.warn("firstEntryAt:",err)}
  }

  function renderPeople(obj){
    const vals=Object.values(obj||{}).sort((a,b)=>(b.status==="present")-(a.status==="present")||(a.nick||"").localeCompare(b.nick||""));
    const present=vals.filter(v=>v.status==="present").length;
    $("presentCount").textContent=present;
    $("totalCount").textContent=vals.length;
    $("allBackNotice").classList.toggle("hidden",!(vals.length>0&&present===vals.length));
    $("peopleList").innerHTML="";
    for(const p of vals){
      const el=document.createElement("div");
      el.className="person";
      el.innerHTML=`<div><div class="name"></div><div class="small">Ultimo aggiornamento: ${fmtDateTime(p.updatedAt)}</div></div><span class="pill ${p.status==="present"?"on":"off"}">${p.status==="present"?"Presente":"Assente"}</span>`;
      el.querySelector(".name").textContent=p.nick||"Senza nome";
      $("peopleList").appendChild(el);
    }
  }

  function effectivePauseMs(meta,now){
    let total=Number(meta?.totalPausedMs)||0;
    if(meta?.breakStartedAt){
      const end=Math.min(now,Number(meta.breakEndsAt)||now);
      if(end>meta.breakStartedAt)total+=end-meta.breakStartedAt;
    }
    return Math.max(0,total);
  }

  function roomEndTime(meta,now){return meta?.archivedAt||now}

  function renderTeacherStats(){
    if(!activeTeacherRoom||!activeTeacherMeta)return;
    const now=serverNow(),meta=activeTeacherMeta,created=Number(meta.createdAt)||null;
    const people=Object.values(activeTeacherPeople||{});
    const firstEntry=people.map(p=>Number(p.joinedAt)||Infinity).reduce((a,b)=>Math.min(a,b),Infinity);
    const end=roomEndTime(meta,now);
    const total=created?Math.max(0,end-created):null;
    const pause=created?Math.min(total,effectivePauseMs(meta,end)):null;
    const active=total==null?null:Math.max(0,total-pause);
    const storedFirst=Number(meta.firstEntryAt);

    $("statCreatedAt").textContent=fmtDateTime(created);
    $("statFirstEntry").textContent=Number.isFinite(storedFirst)&&storedFirst>0?fmtDateTime(storedFirst):(Number.isFinite(firstEntry)?fmtDateTime(firstEntry):"—");
    $("statTotalTime").textContent=fmtDuration(total);
    $("statPauseTime").textContent=fmtDuration(pause);
    $("statActiveTime").textContent=fmtDuration(active);
    $("statRoomStatus").textContent=roomStatus(meta);

    const archived=meta.archived===true;
    $("archiveRoomBtn").disabled=archived;
    $("saveRoomTitleBtn").disabled=false;
    $("startBreakBtn").disabled=archived;
    $("endBreakBtn").disabled=archived||!meta.breakStartedAt;
  }

  async function settlePause(room,meta){
    if(!meta?.breakStartedAt)return Number(meta?.totalPausedMs)||0;
    const now=serverNow();
    const effectiveEnd=Math.min(now,Number(meta.breakEndsAt)||now);
    const elapsed=Math.max(0,effectiveEnd-Number(meta.breakStartedAt));
    const total=(Number(meta.totalPausedMs)||0)+elapsed;
    await update(ref(db,`rooms/${room}/meta`),{
      totalPausedMs:total,
      breakStartedAt:null,
      breakEndsAt:effectiveEnd,
      updatedAt:serverTimestamp()
    });
    return total;
  }

  $("saveRoomTitleBtn").onclick=async()=>{
    if(!activeTeacherRoom)return;
    const title=$("selectedRoomTitle").value.trim().slice(0,80);
    await update(ref(db,`rooms/${activeTeacherRoom}/meta`),{title,updatedAt:serverTimestamp()});
  };

  $("archiveRoomBtn").onclick=async()=>{
    if(!activeTeacherRoom)return;
    if(!confirm(`Archiviare la stanza ${activeTeacherRoom}? I partecipanti non potranno più usarla.`))return;
    await settlePause(activeTeacherRoom,activeTeacherMeta);
    await update(ref(db,`rooms/${activeTeacherRoom}/meta`),{
      archived:true,
      isOpen:false,
      archivedAt:serverTimestamp(),
      breakStartedAt:null,
      breakEndsAt:null,
      updatedAt:serverTimestamp()
    });
  };

  $("startBreakBtn").onclick=async()=>{
    const room=activeTeacherRoom;
    if(!room||activeTeacherMeta?.archived)return;

    await settlePause(room,activeTeacherMeta);

    const mins=Math.max(1,Math.min(90,Number($("breakMinutes").value)||15));
    const start=serverNow(),end=start+mins*60000;
    const people=activeTeacherPeople||{},updates={};

    for(const uid of Object.keys(people)){
      updates[`rooms/${room}/participants/${uid}/status`]="away";
      updates[`rooms/${room}/participants/${uid}/updatedAt`]=start;
    }

    updates[`rooms/${room}/meta/breakStartedAt`]=start;
    updates[`rooms/${room}/meta/breakEndsAt`]=end;
    updates[`rooms/${room}/meta/isOpen`]=true;
    updates[`rooms/${room}/meta/updatedAt`]=start;

    await update(ref(db),updates);
  };

  $("endBreakBtn").onclick=async()=>{
    if(!activeTeacherRoom)return;
    await settlePause(activeTeacherRoom,activeTeacherMeta);
  };

  function renderTeacherTimer(end){
    teacherTimerInterval=stopInterval(teacherTimerInterval);
    if(!end){
      $("teacherTimerBox").classList.add("hidden");
      return;
    }
    $("teacherTimerBox").classList.remove("hidden");
    const tick=()=>{
      const rem=end-serverNow();
      $("teacherTimer").textContent=fmtCountdown(rem);
      $("teacherTimerNote").textContent=rem>0?"Rientro in corso.":"Pausa terminata.";
    };
    tick();
    teacherTimerInterval=setInterval(tick,250);
  }

  $("resetBtn").onclick=async()=>{
    if(!activeTeacherRoom)return;
    if(confirm(`Cancellare tutti i partecipanti registrati nella stanza ${activeTeacherRoom}?`)){
      await remove(ref(db,`rooms/${activeTeacherRoom}/participants`));
    }
  };

  $("copyLinkBtn").onclick=async()=>{
    const text=$("shareLink").value;
    if(!text)return;
    await navigator.clipboard.writeText(text);
    const old=$("copyLinkBtn").textContent;
    $("copyLinkBtn").textContent="Copiato";
    setTimeout(()=>$("copyLinkBtn").textContent=old,1200);
  };

  if(!configured)setConnection("configurazione richiesta","warn");
