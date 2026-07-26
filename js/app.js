const DEFAULT_TASKS = [
      {id: crypto.randomUUID(), icon:"🎒", text:"학교 가방 정리하기", category:"생활습관", required:true, points:2},
      {id: crypto.randomUUID(), icon:"📚", text:"책 20분 읽기", category:"독서", required:true, points:2},
      {id: crypto.randomUUID(), icon:"✏️", text:"오늘 공부 끝내기", category:"학습", required:true, points:2},
      {id: crypto.randomUUID(), icon:"🪢", text:"줄넘기 또는 몸 움직이기", category:"운동", required:false, points:1},
      {id: crypto.randomUUID(), icon:"🧸", text:"내 물건 제자리 정리하기", category:"생활습관", required:true, points:2},
      {id: crypto.randomUUID(), icon:"🪥", text:"양치하고 잠자리 준비하기", category:"생활습관", required:true, points:2}
    ];
    const ICONS = ["🎒","📚","✏️","🧮","🪢","🧸","🪥","🧹","🎨","🎵","💬","⭐"];
    const CATEGORIES = ["독서","학습","운동","생활습관","창의·놀이"];
    const CATEGORY_ICONS = {"독서":"📚","학습":"✏️","운동":"🏃","생활습관":"🪥","창의·놀이":"🎨"};
    const MOM_PASSWORD = "1234";

    const DEFAULT_SHOP_DATA = {
      ice: {
        title:"🍦 아이스크림 가게",
        npc:"시원하고 달콤한 간식이 기다리고 있어!",
        items:[
          {icon:"🍦",name:"아이스크림 먹기",price:30},
          {icon:"🍧",name:"빙수 먹기",price:50},
          {icon:"🧃",name:"좋아하는 음료",price:20}
        ]
      },
      book: {
        title:"📚 포도마을 책방",
        npc:"새로운 이야기를 골라볼까?",
        items:[
          {icon:"📕",name:"새 책 한 권",price:100},
          {icon:"🏛️",name:"도서관 나들이",price:40},
          {icon:"🌙",name:"잠자리 책 2권",price:25}
        ]
      },
      gift: {
        title:"🎁 포도마을 선물가게",
        npc:"열심히 모은 포인트로 특별한 선물을 골라봐!",
        items:[
          {icon:"🧸",name:"작은 장난감",price:150},
          {icon:"🧱",name:"블록·레고",price:300},
          {icon:"✏️",name:"예쁜 학용품",price:80}
        ]
      },
      play: {
        title:"🎡 포도마을 놀이가게",
        npc:"신나는 경험도 포인트로 살 수 있단다!",
        items:[
          {icon:"🎮",name:"게임 30분",price:40},
          {icon:"🍿",name:"가족 영화 보기",price:120},
          {icon:"🎠",name:"키즈카페 가기",price:250}
        ]
      }
    };
    let shopData = JSON.parse(localStorage.getItem("dodam_shop_data") || "null") || JSON.parse(JSON.stringify(DEFAULT_SHOP_DATA));
    let pointAdjustments = JSON.parse(localStorage.getItem("dodam_point_adjustments") || "[]");
    let momUnlocked = false;
    let activeAdminShop = "ice";
    let shopAdminDirty = false;


    const $ = s => document.querySelector(s);
    const keyDate = (d=new Date()) => {
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
      return `${y}-${m}-${day}`;
    };
    const todayKey = keyDate();

    let tasks = JSON.parse(localStorage.getItem("dodam_tasks") || "null") || DEFAULT_TASKS;
    let purchases = JSON.parse(localStorage.getItem("dodam_purchases") || "[]");
    tasks = tasks.map(t=>({
      ...t,
      category: t.category || "생활습관",
      required: typeof t.required === "boolean" ? t.required : true,
      points: Number.isFinite(Number(t.points)) ? Math.max(0, Number(t.points)) : 2
    }));
    let records = JSON.parse(localStorage.getItem("dodam_records") || "{}");
    if(!records[todayKey]) records[todayKey] = {done:[], completed:false};

    function saveAll(){
      localStorage.setItem("dodam_tasks", JSON.stringify(tasks));
      localStorage.setItem("dodam_records", JSON.stringify(records));
    }

    function renderDate(){
      const d = new Date();
      const weekdays=["일요일","월요일","화요일","수요일","목요일","금요일","토요일"];
      $("#todayText").textContent = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${weekdays[d.getDay()]}`;
    }

    function renderTasks(){
      const box=$("#taskList");
      box.innerHTML="";
      if(tasks.length===0){
        box.innerHTML='<div class="empty">아직 할 일이 없어요.<br>할 일을 추가해 주세요.</div>';
        return;
      }
      const doneSet = new Set(records[todayKey].done);
      tasks.forEach(t=>{
        const row=document.createElement("div");
        row.className="task"+(doneSet.has(t.id)?" done":"");
        row.innerHTML=`
          <button class="check" aria-label="완료 체크">${doneSet.has(t.id)?"✓":""}</button>
          <div class="task-main">
            <div class="task-text">${escapeHtml(t.text)}</div>
            <div class="task-meta">
              <span class="badge">${CATEGORY_ICONS[t.category] || "📌"} ${escapeHtml(t.category)}</span>
              <span class="badge ${t.required ? "required" : "optional"}">${t.required ? "필수" : "선택"}</span>
              <span class="badge point">${t.points}점</span>
            </div>
          </div>
          <div class="task-icon">${t.icon}</div>`;
        row.querySelector(".check").onclick=()=>toggleTask(t.id);
        box.appendChild(row);
      });

      const earned = tasks
        .filter(t=>doneSet.has(t.id))
        .reduce((sum,t)=>sum+Number(t.points||0),0);
      const totalPoints = tasks.reduce((sum,t)=>sum+Number(t.points||0),0);
      const summary=document.createElement("div");
      summary.className="score-summary";
      summary.textContent=`오늘 획득 포인트 ${earned} / ${totalPoints}점`;
      box.appendChild(summary);
    }

    function renderGrapes(){
      const cluster=$("#cluster");
      cluster.querySelectorAll(".grape").forEach(el=>el.remove());
      const count=Math.min(Math.max(tasks.length,1),9);
      const doneCount=records[todayKey].done.filter(id=>tasks.some(t=>t.id===id)).length;
      for(let i=0;i<count;i++){
        const g=document.createElement("div");
        g.className=`grape g${i+1}`+(i<doneCount?" done":"");
        g.textContent=i<doneCount?"✓":"";
        cluster.appendChild(g);
      }
      const total=tasks.length;
      const pct=total?Math.round(doneCount/total*100):0;
      $("#progressText").textContent=`${doneCount} / ${total}`;
      $("#progressBar").style.width=pct+"%";
      const requiredTasks = tasks.filter(t=>t.required);
      const requiredDone = requiredTasks.filter(t=>records[todayKey].done.includes(t.id)).length;
      $("#cheer").textContent =
        requiredTasks.length && requiredDone===requiredTasks.length
          ? "🍇 필수 루틴을 모두 완성했어요!"
          : doneCount
            ? "좋아! 한 알씩 채우고 있어요."
            : "첫 번째 포도알부터 시작해 볼까요?";
    }

    function renderWeek(){
      const box=$("#weekView");
      box.innerHTML="";
      const names=["일","월","화","수","목","금","토"];
      const now=new Date();
      const start=new Date(now);
      start.setDate(now.getDate()-now.getDay());
      for(let i=0;i<7;i++){
        const d=new Date(start); d.setDate(start.getDate()+i);
        const k=keyDate(d);
        const complete=records[k]?.completed;
        const item=document.createElement("div");
        item.className="day"+(complete?" complete":"");
        item.innerHTML=`${names[d.getDay()]}<strong>${complete?"🍇":"○"}</strong>${d.getDate()}일`;
        box.appendChild(item);
      }
    }


    function getFarmStats(){
      let completedDays=0;
      let totalScore=0;

      Object.values(records).forEach(record=>{
        if(record?.completed) completedDays++;
        const doneIds=new Set(record?.done || []);
        totalScore += tasks
          .filter(t=>doneIds.has(t.id))
          .reduce((sum,t)=>sum+Number(t.points||0),0);
      });

      const spent = purchases.reduce((sum,p)=>sum+Number(p.price||0),0);
      const adjusted = pointAdjustments.reduce((sum,p)=>sum+Number(p.amount||0),0);
      return {
        completedDays,
        grapes: completedDays,
        totalScore,
        adjusted,
        earnedPoints: totalScore + Math.max(0, adjusted),
        spent: spent + Math.max(0, -adjusted),
        availablePoints: Math.max(0,totalScore + adjusted - spent)
      };
    }

    function getFarmLevel(grapes){
      if(grapes < 3) return {name:"새싹 농장",icon:"🌱",min:0,max:3,message:"첫 포도송이를 기다리고 있어요!"};
      if(grapes < 7) return {name:"어린 포도나무",icon:"🌿",min:3,max:7,message:"포도나무에 잎이 무성해졌어요!"};
      if(grapes < 15) return {name:"포도송이 농장",icon:"🍇",min:7,max:15,message:"달콤한 포도송이가 열리고 있어요!"};
      if(grapes < 30) return {name:"풍성한 포도밭",icon:"🌳",min:15,max:30,message:"농장이 점점 풍성해지고 있어요!"};
      return {name:"도담이 포도왕국",icon:"🏰",min:30,max:50,message:"도담이만의 멋진 포도왕국이에요!"};
    }

    function renderFarm(){
      const stats=getFarmStats();
      const level=getFarmLevel(stats.grapes);

      $("#completedDays").textContent=stats.completedDays+"일";
      $("#totalGrapes").textContent=stats.grapes+"송이";
      $("#totalScore").textContent=stats.totalScore+"점";
      $("#farmLevel").textContent=level.name;
      $("#levelIcon").textContent=level.icon;
      $("#farmMessage").textContent=level.message;

      const remaining=Math.max(0,level.max-stats.grapes);
      $("#nextGoalTitle").textContent=remaining ? "다음 단계까지" : "최고 단계 달성!";
      $("#nextGoalText").textContent=remaining ? `포도 ${remaining}송이를 더 모아보세요.` : "정말 멋진 농장이 완성됐어요!";
      const pct=Math.min(100,Math.max(0,(stats.grapes-level.min)/(level.max-level.min)*100));
      $("#farmProgressBar").style.width=pct+"%";

      $("#bunch1").style.display=stats.grapes>=1?"block":"none";
      $("#bunch2").style.display=stats.grapes>=2?"block":"none";
      $("#bunch3").style.display=stats.grapes>=3?"block":"none";

      const scale=0.72+Math.min(stats.grapes,30)/30*0.28;
      $("#vine").style.transform=`scale(${scale})`;
      $("#vine").style.opacity=stats.grapes===0?".45":"1";
    }


    function renderShop(shopKey){
      const shop=shopData[shopKey];
      if(!shop) return;
      const stats=getFarmStats();

      $("#shopDialogTitle").textContent=shop.title;
      $("#shopPointBalance").textContent=stats.availablePoints;
      $("#npcBubble").textContent=shop.npc;

      const box=$("#shopItems");
      box.innerHTML="";
      shop.items.forEach(item=>{
        const row=document.createElement("div");
        row.className="shop-item";
        const canBuy=stats.availablePoints>=item.price;
        row.innerHTML=`
          <div class="shop-item-icon">${item.icon}</div>
          <div>
            <div class="shop-item-name">${escapeHtml(item.name)}</div>
            <div class="shop-item-price">${item.price}점</div>
          </div>
          <button type="button" class="buy-btn" ${canBuy?"":"disabled"}>
            ${canBuy?"교환":"부족"}
          </button>`;
        row.querySelector(".buy-btn").onclick=()=>{
          const current=getFarmStats();
          if(current.availablePoints<item.price){
            toast("포인트가 조금 더 필요해요.");
            return;
          }
          if(confirm(`${item.icon} ${item.name}을(를) ${item.price}점에 교환할까요?`)){
            purchases.push({
              id:crypto.randomUUID(),
              shop:shopKey,
              name:item.name,
              icon:item.icon,
              price:item.price,
              date:new Date().toISOString()
            });
            saveAll();
            toast(`${item.icon} ${item.name} 교환 완료!`);
            renderShop(shopKey);
          }
        };
        box.appendChild(row);
      });

      $("#shopDialog").showModal();
    }


    function calculateStreak(){
      let streak=0;
      const d=new Date();
      for(let i=0;i<366;i++){
        const key=keyDate(d);
        if(records[key]?.completed) streak++;
        else if(i===0){ d.setDate(d.getDate()-1); continue; }
        else break;
        d.setDate(d.getDate()-1);
      }
      return streak;
    }

    function fmtDate(iso){
      const d=new Date(iso);
      return `${d.getMonth()+1}/${d.getDate()}`;
    }

    function renderMomDashboard(){
      if(!momUnlocked) return;
      const stats=getFarmStats();
      const done=records[todayKey]?.done || [];
      const todayPoints=tasks.reduce((sum,t)=>sum+(done.includes(t.id)?Number(t.points||0):0),0);
      const totalTasks=tasks.length;
      const pct=totalTasks ? Math.round(done.filter(id=>tasks.some(t=>t.id===id)).length/totalTasks*100) : 0;

      $("#momStreak").textContent=calculateStreak()+"일";
      $("#momEarned").textContent=stats.earnedPoints+"점";
      $("#momSpent").textContent=stats.spent+"점";
      $("#momBalance").textContent=stats.availablePoints+"점";
      $("#momTodayText").textContent=`${done.filter(id=>tasks.some(t=>t.id===id)).length} / ${totalTasks}개 완료`;
      $("#momTodayPct").textContent=pct+"%";
      $("#momTodayBar").style.width=pct+"%";

      const details=$("#momTodayDetails");
      details.innerHTML=tasks.map(t=>`
        <div class="mom-list-item">
          <div class="mom-list-main"><strong>${t.icon} ${escapeHtml(t.text)}</strong><small>${escapeHtml(t.category)} · ${t.points}점</small></div>
          <span>${done.includes(t.id)?"✅":"⬜"}</span>
        </div>`).join("");

      const catBox=$("#momCategoryStats");
      const last7=[];
      for(let i=0;i<7;i++){
        const d=new Date(); d.setDate(d.getDate()-i); last7.push(keyDate(d));
      }
      catBox.innerHTML=CATEGORIES.map(cat=>{
        const catTasks=tasks.filter(t=>t.category===cat);
        let possible=0,completed=0;
        last7.forEach(key=>{
          catTasks.forEach(t=>{
            possible++;
            if(records[key]?.done?.includes(t.id)) completed++;
          });
        });
        const cp=possible?Math.round(completed/possible*100):0;
        return `<div class="category-stat">
          <div class="category-stat-head"><span>${CATEGORY_ICONS[cat]||"⭐"} ${cat}</span><span>${cp}%</span></div>
          <div class="category-bar"><div style="width:${cp}%"></div></div>
        </div>`;
      }).join("");

      const ph=$("#purchaseHistory");
      const recentPurchases=[...purchases].reverse().slice(0,6);
      ph.innerHTML=recentPurchases.length ? recentPurchases.map(p=>`
        <div class="mom-list-item">
          <div class="mom-list-main"><strong>${p.icon||"🎁"} ${escapeHtml(p.name)}</strong><small>${fmtDate(p.date)} · ${escapeHtml(shopData[p.shop]?.title||"포도마을")}</small></div>
          <strong>-${p.price}점</strong>
        </div>`).join("") : `<div class="empty-state">아직 교환한 상품이 없어요.</div>`;

      const ah=$("#pointHistory");
      const recentAdjust=[...pointAdjustments].reverse().slice(0,6);
      ah.innerHTML=recentAdjust.length ? recentAdjust.map(a=>`
        <div class="mom-list-item">
          <div class="mom-list-main"><strong>${a.amount>0?"🎉":"➖"} ${escapeHtml(a.reason)}</strong><small>${fmtDate(a.date)}</small></div>
          <strong>${a.amount>0?"+":""}${a.amount}점</strong>
        </div>`).join("") : `<div class="empty-state">직접 지급하거나 차감한 내역이 없어요.</div>`;

      renderShopAdmin();
    }

    function renderShopAdmin(){
      const tabs=$("#shopAdminTabs");
      tabs.innerHTML=Object.entries(shopData).map(([key,shop])=>`
        <button type="button" class="shop-admin-tab ${key===activeAdminShop?"active":""}" data-admin-shop="${key}">
          ${shop.title.split(" ")[0]}
        </button>`).join("");
      tabs.querySelectorAll("button").forEach(btn=>{
        btn.onclick=()=>{
          if(shopAdminDirty && !confirm("저장하지 않은 변경사항이 있어요. 저장하지 않고 다른 가게로 이동할까요?")) return;
          shopAdminDirty=false;
          activeAdminShop=btn.dataset.adminShop;
          renderShopAdmin();
        };
      });

      const shop=shopData[activeAdminShop];
      const box=$("#shopAdminItems");
      box.innerHTML=shop.items.map((item,index)=>`
        <div class="shop-admin-item" data-index="${index}">
          <input class="admin-icon" maxlength="4" value="${escapeAttr(item.icon)}" aria-label="상품 아이콘">
          <input class="admin-name" maxlength="30" value="${escapeAttr(item.name)}" aria-label="상품명">
          <input class="admin-price" type="number" min="0" max="9999" value="${item.price}" aria-label="가격">
          <button type="button" class="mini-del admin-delete">삭제</button>
        </div>`).join("");

      box.querySelectorAll(".shop-admin-item").forEach(row=>{
        row.querySelectorAll("input").forEach(input=>{
          input.addEventListener("input",()=>{
            shopAdminDirty=true;
            const status=$("#shopSaveStatus");
            if(status){
              status.textContent="⚠️ 저장하지 않은 변경사항이 있어요.";
              status.style.color="var(--danger)";
              status.style.fontWeight="900";
            }
          });
        });
        row.querySelector(".admin-delete").onclick=()=>{
          const idx=Number(row.dataset.index);
          if(confirm("이 상품을 삭제할까요?")){
            shop.items.splice(idx,1);
            saveAll();
            shopAdminDirty=false;
            renderShopAdmin();
            toast("상품을 삭제했어요.");
          }
        };
      });

      const status=$("#shopSaveStatus");
      if(status && !shopAdminDirty){
        status.textContent="상품을 수정한 뒤 반드시 ‘변경사항 저장’을 눌러주세요.";
        status.style.color="";
        status.style.fontWeight="";
      }
    }

    function saveShopAdminChanges(){
      const shop=shopData[activeAdminShop];
      const rows=[...$("#shopAdminItems").querySelectorAll(".shop-admin-item")];
      shop.items=rows.map(row=>({
        icon:row.querySelector(".admin-icon").value.trim()||"🎁",
        name:row.querySelector(".admin-name").value.trim()||"새 상품",
        price:Math.max(0,Math.min(9999,Number(row.querySelector(".admin-price").value)||0))
      }));
      saveAll();
      shopAdminDirty=false;
      const status=$("#shopSaveStatus");
      if(status){
        status.textContent="✅ 저장되었습니다. 포도마을 상점에 바로 반영됐어요.";
        status.style.color="var(--green)";
        status.style.fontWeight="900";
      }
      toast("상점 상품을 저장했어요.");
    }

    function unlockMomMode(){
      if($("#momPassword").value!==MOM_PASSWORD){
        $("#momPasswordError").textContent="비밀번호가 맞지 않아요.";
        $("#momPassword").select();
        return;
      }
      momUnlocked=true;
      $("#momLock").hidden=true;
      $("#momDashboard").hidden=false;
      $("#momPasswordError").textContent="";
      $("#momPassword").value="";
      renderMomDashboard();
    }

    function lockMomMode(){
      momUnlocked=false;
      $("#momDashboard").hidden=true;
      $("#momLock").hidden=false;
      $("#momPassword").value="";
    }

    function switchView(viewId){
      document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===viewId));
      document.querySelectorAll(".nav-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===viewId));
      if(viewId==="farmView") renderFarm();
      if(viewId==="villageView"){
        const stats=getFarmStats();
        $("#npcBubble").textContent=`지금 사용할 수 있는 포인트는 ${stats.availablePoints}점이야!`;
      }
      if(viewId==="momView" && momUnlocked) renderMomDashboard();
      window.scrollTo({top:0,behavior:"smooth"});
    }

    function renderAll(){
      renderDate(); renderTasks(); renderGrapes(); renderWeek(); renderFarm(); if(momUnlocked) renderMomDashboard(); saveAll();
    }

    function toggleTask(id){
      const list=records[todayKey].done;
      const i=list.indexOf(id);
      if(i>=0) list.splice(i,1); else list.push(id);
      const wasCompleted=records[todayKey].completed;
      const requiredTasks = tasks.filter(t=>t.required);
      records[todayKey].completed = requiredTasks.length>0 && requiredTasks.every(t=>list.includes(t.id));
  
    document.querySelectorAll(".shop-building").forEach(btn=>{
      btn.addEventListener("click",()=>renderShop(btn.dataset.shop));
    });
    $("#closeShop").onclick=()=>$("#shopDialog").close();

    document.querySelectorAll(".nav-btn").forEach(btn=>{
      btn.onclick=()=>switchView(btn.dataset.view);
    });

    renderAll();
      if(records[todayKey].completed && !wasCompleted){
        celebrate();
        toast("오늘 포도송이를 완성했어요!");
      }
    }

    function openSettings(){
      $("#settingsTitle").textContent = "엄마 설정";
      $("#lockPanel").hidden = false;
      $("#editorPanel").hidden = true;
      $("#passwordInput").value = "";
      $("#passwordError").textContent = "";
      $("#settingsDialog").showModal();
      setTimeout(()=>$("#passwordInput").focus(),50);
    }

    function unlockSettings(){
      if($("#passwordInput").value !== MOM_PASSWORD){
        $("#passwordError").textContent = "비밀번호가 맞지 않아요.";
        $("#passwordInput").select();
        return;
      }
      $("#settingsTitle").textContent = "오늘 할 일 설정";
      $("#lockPanel").hidden = true;
      $("#editorPanel").hidden = false;
      renderEditor();
    }

    function renderEditor(){
      const box=$("#taskEditor");
      box.innerHTML="";
      tasks.forEach((t,index)=>{
        const card=document.createElement("div");
        card.className="editor-card";
        const iconOptions=ICONS.map(ic=>`<option value="${ic}" ${ic===t.icon?"selected":""}>${ic}</option>`).join("");
        const categoryOptions=CATEGORIES.map(cat=>`<option value="${cat}" ${cat===t.category?"selected":""}>${cat}</option>`).join("");
        card.innerHTML=`
          <div class="editor-grid">
            <label>아이콘</label>
            <select class="icon-select">${iconOptions}</select>

            <label>할 일</label>
            <input class="task-name" value="${escapeAttr(t.text)}" maxlength="30" />

            <label>카테고리</label>
            <select class="category-select">${categoryOptions}</select>

            <label>구분</label>
            <label class="required-check">
              <input class="required-input" type="checkbox" ${t.required?"checked":""}>
              필수 루틴
            </label>

            <label>포인트</label>
            <input class="points-input" type="number" min="0" max="20" step="1" value="${t.points}" />
          </div>
          <div class="editor-actions">
            <button type="button" class="mini-del">삭제</button>
          </div>`;
        card.querySelector(".mini-del").onclick=()=>{
          tasks.splice(index,1);
          renderEditor();
        };
        box.appendChild(card);
      });
    }

    $("#addTask").onclick=()=>{
      if(tasks.length>=9){ toast("포도알은 최대 9개까지 만들 수 있어요."); return; }
      tasks.push({id:crypto.randomUUID(),icon:"⭐",text:"새로운 할 일",category:"생활습관",required:true,points:2});
      renderEditor();
    };

    $("#saveSettings").onclick=()=>{
      const cards=[...document.querySelectorAll(".editor-card")];
      cards.forEach((card,i)=>{
        tasks[i].icon=card.querySelector(".icon-select").value;
        tasks[i].text=card.querySelector(".task-name").value.trim() || "할 일";
        tasks[i].category=card.querySelector(".category-select").value;
        tasks[i].required=card.querySelector(".required-input").checked;
        tasks[i].points=Math.max(0,Math.min(20,Number(card.querySelector(".points-input").value)||0));
      });
      records[todayKey].done = records[todayKey].done.filter(id=>tasks.some(t=>t.id===id));
      const requiredTasks = tasks.filter(t=>t.required);
      records[todayKey].completed = requiredTasks.length>0 && requiredTasks.every(t=>records[todayKey].done.includes(t.id));
      $("#settingsDialog").close();
      renderAll(); toast("루틴 설정을 저장했어요.");
    };

    $("#resetToday").onclick=()=>{
      const pw = prompt("오늘 체크를 초기화하려면 엄마 비밀번호 4자리를 입력해 주세요.");
      if(pw === null) return;
      if(pw !== MOM_PASSWORD){
        toast("비밀번호가 맞지 않아요.");
        return;
      }
      if(confirm("오늘 체크한 내용을 모두 지울까요?")){
        records[todayKey]={done:[],completed:false}; renderAll(); toast("오늘 체크를 초기화했어요.");
      }
    };

    function celebrate(){
      const wrap=$("#confetti");
      wrap.innerHTML="";
      const colors=["#7b4bb7","#f2b134","#5f9f55","#e86b7d","#6a9ee8"];
      for(let i=0;i<70;i++){
        const p=document.createElement("span");
        p.className="piece";
        p.style.left=Math.random()*100+"vw";
        p.style.background=colors[Math.floor(Math.random()*colors.length)];
        p.style.animationDelay=(Math.random()*.7)+"s";
        p.style.transform=`rotate(${Math.random()*360}deg)`;
        wrap.appendChild(p);
      }
      setTimeout(()=>wrap.innerHTML="",2600);
    }

    function toast(msg){
      const t=$("#toast"); t.textContent=msg; t.classList.add("show");
      setTimeout(()=>t.classList.remove("show"),1800);
    }

    function escapeHtml(s){
      return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
    }
    function escapeAttr(s){ return escapeHtml(s); }

    $("#openSettings").onclick=openSettings;
    $("#openSettings2").onclick=openSettings;
    $("#confirmPassword").onclick=unlockSettings;
    $("#passwordInput").addEventListener("keydown",e=>{
      if(e.key==="Enter") unlockSettings();
    });
    $("#cancelPassword").onclick=()=>$("#settingsDialog").close();
    $("#closeSettings").onclick=()=>$("#settingsDialog").close();
    $("#cancelSettings").onclick=()=>$("#settingsDialog").close();
    $("#settingsDialog").addEventListener("click",e=>{
      const r=$("#settingsDialog").getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) $("#settingsDialog").close();
    });


    document.querySelectorAll(".shop-building").forEach(btn=>{
      btn.addEventListener("click",()=>renderShop(btn.dataset.shop));
    });
    $("#closeShop").onclick=()=>$("#shopDialog").close();
    document.querySelectorAll(".nav-btn").forEach(btn=>{
      btn.onclick=()=>switchView(btn.dataset.view);
    });

    $("#unlockMom").onclick=unlockMomMode;
    $("#momPassword").addEventListener("keydown",e=>{ if(e.key==="Enter") unlockMomMode(); });
    $("#lockMom").onclick=lockMomMode;
    $("#momEditRoutines").onclick=openSettings;
    $("#applyPoint").onclick=()=>{
      const reason=$("#pointReason").value.trim()||"엄마 포인트 조정";
      let amount=Math.trunc(Number($("#pointAmount").value)||0);
      if(amount===0){ toast("지급하거나 차감할 점수를 입력해 주세요."); return; }
      const current=getFarmStats().availablePoints;
      if(amount<0) amount=-Math.min(current,Math.abs(amount));
      if(amount===0){ toast("차감할 수 있는 포인트가 없어요."); return; }
      pointAdjustments.push({id:crypto.randomUUID(),reason,amount,date:new Date().toISOString()});
      $("#pointReason").value="";
      $("#pointAmount").value="";
      saveAll(); renderAll(); toast(amount>0?`${amount}점을 지급했어요.`:`${Math.abs(amount)}점을 차감했어요.`);
    };
    $("#saveShopItems").onclick=saveShopAdminChanges;
    $("#addShopItem").onclick=()=>{
      if(shopAdminDirty) saveShopAdminChanges();
      shopData[activeAdminShop].items.push({icon:"🎁",name:"새 상품",price:50});
      saveAll();
      shopAdminDirty=false;
      renderShopAdmin();
      toast("새 상품을 추가했어요. 내용을 수정한 뒤 저장해 주세요.");
    };

    renderAll();
