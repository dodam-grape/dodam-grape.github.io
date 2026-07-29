
(() => {
  "use strict";

  const BUNCHES_PER_TREE = 7;
  const TREES_PER_FARM = 4;
  const BUNCHES_PER_FARM = BUNCHES_PER_TREE * TREES_PER_FARM;

  function getGrowthStats(grapes){
    const safe = Math.max(0, Number(grapes) || 0);
    const completedTrees = Math.floor(safe / BUNCHES_PER_TREE);
    const completedFarms = Math.floor(safe / BUNCHES_PER_FARM);
    const currentTreeNumber = safe === 0 ? 1 : Math.ceil(safe / BUNCHES_PER_TREE);
    const bunchesOnCurrentTree = safe === 0 ? 0 : ((safe - 1) % BUNCHES_PER_TREE) + 1;

    return {
      grapes:safe,
      completedTrees,
      completedFarms,
      currentTreeNumber,
      bunchesOnCurrentTree
    };
  }

  function ensureSevenBunches(){
    const vine=document.querySelector("#vine");
    if(!vine) return;

    vine.querySelectorAll(".bunch").forEach(el=>el.remove());

    for(let i=1;i<=BUNCHES_PER_TREE;i++){
      const bunch=document.createElement("div");
      bunch.className=`bunch p${i}`;
      bunch.id=`bunch${i}`;
      bunch.textContent="🍇";
      vine.appendChild(bunch);
    }
  }

  function ensureGrowthGuide(){
    if(document.querySelector("#farmGrowthGuide")) return;

    const statsBox=document.querySelector(".farm-stats");
    if(!statsBox) return;

    const guide=document.createElement("section");
    guide.className="farm-growth-guide";
    guide.id="farmGrowthGuide";
    guide.innerHTML=`
      <div class="farm-growth-title">
        <span>🌱 도담이 농장 성장지도</span>
        <small id="growthCurrentLabel">첫 번째 나무를 키우는 중</small>
      </div>
      <div class="farm-growth-cards">
        <div class="farm-growth-card">
          <div class="growth-icon">🍇</div>
          <strong id="growthTreeBunches">0 / 7송이</strong>
          <span>현재 포도나무</span>
        </div>
        <div class="farm-growth-card">
          <div class="growth-icon">🌳</div>
          <strong id="growthTrees">0그루</strong>
          <span>완성한 포도나무</span>
        </div>
        <div class="farm-growth-card">
          <div class="growth-icon">🏡</div>
          <strong id="growthFarms">0개</strong>
          <span>완성한 포도농장</span>
        </div>
      </div>
      <div class="farm-rule">
        루틴을 하루 완성하면 포도 1송이 · 포도 7송이가 모이면 나무 1그루 ·
        나무 4그루가 모이면 포도농장 1개가 완성돼요.
      </div>`;
    statsBox.insertAdjacentElement("afterend",guide);
  }

  function growthLevel(g){
    if(g.grapes < 7){
      return {name:"첫 포도나무",icon:"🌱",message:`첫 번째 나무에 포도가 ${g.bunchesOnCurrentTree}송이 열렸어요!`};
    }
    if(g.grapes < 28){
      return {name:"포도밭 만들기",icon:"🌳",message:`포도나무 ${g.completedTrees}그루를 완성했어요!`};
    }
    if(g.grapes < 56){
      return {name:"첫 포도농장",icon:"🏡",message:"도담이의 첫 포도농장이 완성됐어요!"};
    }
    if(g.grapes < 84){
      return {name:"풍성한 포도농장",icon:"🚜",message:`포도농장 ${g.completedFarms}개를 가꾸고 있어요!`};
    }
    return {name:"도담이 포도왕국",icon:"🏰",message:"꾸준함으로 멋진 포도왕국을 만들었어요!"};
  }

  function renderFarmV41(){
    const stats=getFarmStats();
    const growth=getGrowthStats(stats.grapes);
    const level=growthLevel(growth);

    ensureSevenBunches();
    ensureGrowthGuide();

    document.querySelector("#completedDays").textContent=stats.completedDays+"일";
    document.querySelector("#totalGrapes").textContent=stats.grapes+"송이";
    document.querySelector("#totalScore").textContent=stats.totalScore+"점";
    document.querySelector("#farmLevel").textContent=level.name;
    document.querySelector("#levelIcon").textContent=level.icon;
    document.querySelector("#farmMessage").textContent=level.message;

    for(let i=1;i<=BUNCHES_PER_TREE;i++){
      const bunch=document.querySelector(`#bunch${i}`);
      if(bunch) bunch.style.display=growth.bunchesOnCurrentTree>=i?"block":"none";
    }

    const currentProgress=growth.bunchesOnCurrentTree;
    const remainingToTree=BUNCHES_PER_TREE-currentProgress;

    if(currentProgress===BUNCHES_PER_TREE){
      const completesFarm=(growth.completedTrees % TREES_PER_FARM)===0;
      document.querySelector("#nextGoalTitle").textContent=
        completesFarm ? "🎉 농장 완성!" : `🌳 ${growth.completedTrees}번째 나무 완성!`;
      document.querySelector("#nextGoalText").textContent=
        completesFarm
          ? `포도농장 ${growth.completedFarms}개를 완성했어요. 다음 송이부터 새 농장이 시작돼요.`
          : "다음 포도 1송이부터 새로운 나무가 자라기 시작해요.";
    }else{
      document.querySelector("#nextGoalTitle").textContent=`${growth.currentTreeNumber}번째 나무 완성까지`;
      document.querySelector("#nextGoalText").textContent=`포도 ${remainingToTree}송이를 더 모아보세요.`;
    }

    document.querySelector("#farmProgressBar").style.width=
      Math.min(100,(currentProgress/BUNCHES_PER_TREE)*100)+"%";

    document.querySelector("#growthCurrentLabel").textContent=
      `${growth.currentTreeNumber}번째 나무를 키우는 중`;
    document.querySelector("#growthTreeBunches").textContent=
      `${growth.bunchesOnCurrentTree} / ${BUNCHES_PER_TREE}송이`;
    document.querySelector("#growthTrees").textContent=
      `${growth.completedTrees}그루`;
    document.querySelector("#growthFarms").textContent=
      `${growth.completedFarms}개`;

    const scale=0.78+Math.min(currentProgress,BUNCHES_PER_TREE)/BUNCHES_PER_TREE*0.22;
    const vine=document.querySelector("#vine");
    vine.style.transform=`scale(${scale})`;
    vine.style.opacity=stats.grapes===0?".45":"1";
  }

  window.getFarmGrowthStats=getGrowthStats;
  window.renderFarm=renderFarmV41;

  ensureSevenBunches();
  ensureGrowthGuide();
  renderFarmV41();
})();
