/* ===== 설정 ===== */
const RATE = 10000;
const COIN_UNIT = 1_000_000;

// 이미지 파일명 설정 (같은 폴더에 이미지를 넣어주세요)
const PERF_COIN_SRC = "coin-large.png"; // 퍼포먼스용 큰 코인
const RIGHT_COIN_SRC = "coin-small.png"; // 우측 골드코인 보기용 작은 코인

// 퍼포먼스 오버레이 (코인 던지기 애니메이션)
const coinFxOverlay = document.getElementById("coinFxOverlay");
const coinFxImg = document.getElementById("coinFxImg");

function playCoinFx(addN){
  const target = document.getElementById("coinImg");
  if(!coinFxOverlay || !coinFxImg || !target) return;
  
  coinFxImg.src = PERF_COIN_SRC;
  coinFxOverlay.style.display = "flex";

  // 목표 위치(우측 작은 코인) 계산
  const targetRect = target.getBoundingClientRect();
  const tx = targetRect.left + targetRect.width / 2;
  const ty = targetRect.top + targetRect.height / 2;

  // 화면 중앙 기준 좌표 계산
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const moveX = tx - cx;
  const moveY = ty - cy;

  // 기존 애니메이션 취소
  if(coinFxImg.getAnimations) {
    coinFxImg.getAnimations().forEach(a => a.cancel());
  }

  // 동전 던지기 애니메이션 (아래에서 위로 솟구치며 회전하다가 목표로 빨려들어감)
  const anim = coinFxImg.animate([
    { transform: `translate(0px, 40vh) scale(0.3) rotateX(0deg) rotateY(0deg)`, opacity: 0, offset: 0 },
    { transform: `translate(0px, 30vh) scale(0.6) rotateX(180deg) rotateY(0deg)`, opacity: 1, offset: 0.1 },
    { transform: `translate(${moveX * 0.2}px, -30vh) scale(1.2) rotateX(720deg) rotateY(360deg)`, opacity: 1, offset: 0.6 },
    { transform: `translate(${moveX}px, ${moveY}px) scale(0.1) rotateX(1080deg) rotateY(720deg)`, opacity: 0.8, offset: 0.95 },
    { transform: `translate(${moveX}px, ${moveY}px) scale(0.1) rotateX(1080deg) rotateY(720deg)`, opacity: 0, offset: 1 }
  ], {
    duration: 2200,
    easing: 'ease-in-out',
    fill: 'forwards'
  });

  anim.onfinish = () => {
    coinFxOverlay.style.display = "none";
  };
}

const cats = [
  { key:"me",       label:"나",       color:"#2563eb" },
  { key:"family",   label:"가족",     color:"#4f7dff" },
  { key:"nation",   label:"나라",     color:"#7c3aed" },
  { key:"neighbor", label:"이웃",     color:"#06b6d4" },
  { key:"special",  label:"특별기도",  color:"#f59e0b" },
  { key:"vow",      label:"작정기도",  color:"#ef4444" },
];

// --- 추가된 부분 시작 (커스텀 라벨 불러오기) ---
const CUSTOM_LABELS_KEY = "pb_custom_labels_v1";
try {
  const customLabels = JSON.parse(localStorage.getItem(CUSTOM_LABELS_KEY)) || {};
  cats.forEach(c => {
    if (customLabels[c.key]) c.label = customLabels[c.key];
  });
} catch(e) {}
// --- 추가된 부분 끝 ---

const YEAR = new Date().getFullYear();
const STORAGE_KEY = `prayer_bank_${YEAR}_v1`;
const LEGACY_KEY = "prayer_bank_stable_coin_v1";

/* ===== 상태 ===== */
let state = load() || {
  activeKey: "me",
  total: 0,
  minsByCat: Object.fromEntries(cats.map(c => [c.key, 0])),
  amtByCat: Object.fromEntries(cats.map(c => [c.key, 0])),
};
let pending = 0;

/* ===== 엘리먼트 ===== */
const tabsEl = document.getElementById("tabs");
const totalEl = document.getElementById("totalAmount");
const sideTotalEl = document.getElementById("sideTotal");
const activeInfoEl = document.getElementById("activeInfo");
const minsEl = document.getElementById("mins");
const catListEl = document.getElementById("catList");
const breakHintEl = document.getElementById("breakHint");

const coinImgEl = document.getElementById("coinImg");
const coinCountEl = document.getElementById("coinCount");

const modalEl = document.getElementById("modal");
const donutSvg = document.getElementById("donutSvg");
const donutTotalEl = document.getElementById("donutTotal");
const centerAmtEl = document.getElementById("centerAmt");
const centerLblEl = document.getElementById("centerLbl");
const legendEl = document.getElementById("legend");
const selectedMetaEl = document.getElementById("selectedMeta");
const resetDonutBtn = document.getElementById("resetDonut");

const toastEl = document.getElementById("toast");
const toastSubEl = document.getElementById("toastSub");
const fireWrap = document.getElementById("fireWrap");

/* 날짜 */
document.getElementById("today").textContent =
  new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" });

/* ===== 코인 이미지: 안전한 방식 (URL + 실패시 짧은 SVG fallback) ===== */
const RIGHT_COIN_FALLBACK = RIGHT_COIN_SRC;
coinImgEl.src = RIGHT_COIN_SRC;
coinImgEl.onerror = () => { coinImgEl.src = RIGHT_COIN_FALLBACK; };


/* ===== 백업(저장) / 복구 ===== */
const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const restoreFile = document.getElementById("restoreFile");

function buildBackupPayload(){
  const date = new Date();
  return {
    app: "PrayerBank",
    version: 2,
    year: YEAR,
    savedAt: date.toISOString(),
    storageKey: STORAGE_KEY,
    state: state,
    pbch: PBCH_load(),
    pbchHistory: PBCH_loadHistory()
  };
}

function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 6000);
}

if(backupBtn){
  backupBtn.addEventListener("click", () => {
    const y = YEAR;
    const date = new Date().toISOString().slice(0,10);
    downloadJson(`prayerbank_all_${y}_${date}.json`, buildBackupPayload());
  });
}

if(restoreBtn && restoreFile){
  restoreBtn.addEventListener("click", () => restoreFile.click());

  restoreFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);

        if(!data || data.app !== "PrayerBank"){
          alert("올바른 기도통장 백업 파일이 아닙니다.");
          return;
        }

        if(!confirm("이 파일로 현재 기록을 덮어써서 복구할까요?")) return;

        if(data.state) {
          state = data.state;
          state.activeKey = state.activeKey || "me";
          state.total = Number(state.total || 0);
          state.minsByCat = state.minsByCat || Object.fromEntries(cats.map(c => [c.key, 0]));
          state.amtByCat  = state.amtByCat  || Object.fromEntries(cats.map(c => [c.key, 0]));
          for(const c of cats){
            if(state.minsByCat[c.key] == null) state.minsByCat[c.key] = 0;
            if(state.amtByCat[c.key] == null) state.amtByCat[c.key] = 0;
          }
          save();
        }
        
        if(data.pbch) PBCH_save(data.pbch);
        if(data.pbchHistory) PBCH_saveHistory(data.pbchHistory);

        pending = 0;
        minsEl.textContent = "0";
        prevCoins = null;

        render();
        if(typeof PBCH_renderAll === "function") PBCH_renderAll();
        
        alert("복구가 완료되었습니다.");
      }catch(err){
        alert("파일을 불러올 수 없습니다. (JSON 형식 오류)");
      }finally{
        restoreFile.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  });
}


/* ===== 유틸 ===== */
const won = (n) => "₩" + Math.round(n).toLocaleString("ko-KR");
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);

    // ✅ 연도키가 비었으면: 이전 버전(legacy) 값이 있으면 가져와서 저장
    const legacy = localStorage.getItem(LEGACY_KEY);
    if(legacy){
      localStorage.setItem(STORAGE_KEY, legacy);
      return JSON.parse(legacy);
    }
    return null;
  }catch(e){
    return null;
  }
}
function activeCat(){ return cats.find(c => c.key === state.activeKey) || cats[0]; }

/* 큰 금액 fit */
function fitAmount(){
  const digits = totalEl.textContent.replace(/[^\d]/g,'').length;
  if(digits >= 10) totalEl.classList.add("shrink");
  else totalEl.classList.remove("shrink");
}

/* ===== 탭 ===== */
function renderTabs(){
  tabsEl.innerHTML = "";
  cats.forEach(c => {
    const b = document.createElement("button");
    b.className = "tab" + (c.key === state.activeKey ? " active" : "");
    b.textContent = c.label;
    b.onclick = () => {
      state.activeKey = c.key;
      pending = 0;
      minsEl.textContent = "0";
      save();
      render();
    };
    tabsEl.appendChild(b);
  });
}

/* ===== 헤더 ===== */
function renderHeader(){
  totalEl.textContent = won(state.total);
  sideTotalEl.textContent = won(state.total);
  activeInfoEl.textContent = activeCat().label;
  fitAmount();
}

/* ===== 축하(토스트 3초 + 아래→위 폭죽) ===== */
function showToast(addN){
  toastSubEl.textContent = `골드코인 +${addN}`;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=>toastEl.classList.remove("show"), 3000); // ✅ 3초
}

/* 아래에서 위로 “폭죽” */
function fireUp(){
  const colors = ["#2563eb","#4f7dff","#f59e0b","#22c55e","#ef4444","#a855f7"];
  const baseX = 50 + (Math.random()*20 - 10); // 중앙 근처
  for(let i=0;i<28;i++){
    const p = document.createElement("div");
    p.className = "spark";
    p.style.left = (baseX + (Math.random()*40 - 20)) + "vw";
    p.style.top  = (92 + Math.random()*8) + "vh"; // ✅ 아래에서 시작
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (820 + Math.random()*420) + "ms";
    p.style.width = (7 + Math.random()*8) + "px";
    p.style.height = (10 + Math.random()*10) + "px";
    fireWrap.appendChild(p);
    p.addEventListener("animationend", ()=> p.remove());
  }
}

function celebrateCoin(addN){
  // 코인 퍼포먼스: 배경/폭죽/메세지 없이 "코인만" 크게 덤블링
  playCoinFx(addN);
}


/* ===== 코인 ===== */
let prevCoins = null;
function renderCoins(){
  const coins = Math.floor(state.total / COIN_UNIT);
  coinCountEl.textContent = `×${coins}`;

  // prevCoins는 "현재 코인 수"와 항상 동기화 (내렸다가 다시 올려도 재현 가능)
  if(prevCoins === null) prevCoins = coins;

  if(coins > prevCoins){
    celebrateCoin(coins - prevCoins);
  }
  // 증가/감소 모두 반영
  prevCoins = coins;
}


/* ===== 카테고리 리스트 ===== */
function renderCatList(){
  let maxKey=null, maxAmt=-1;
  for(const c of cats){
    const amt = state.amtByCat[c.key] || 0;
    if(amt > maxAmt){ maxAmt = amt; maxKey = c.key; }
  }
  const maxCat = cats.find(x => x.key === maxKey);
  breakHintEl.textContent = maxCat && maxAmt > 0 ? `${maxCat.label} 가장 큼` : "—";

  catListEl.innerHTML = "";
  const total = state.total || 0;

  for(const c of cats){
    const mins = state.minsByCat[c.key] || 0;
    const amt  = state.amtByCat[c.key] || 0;
    const pct  = total > 0 ? (amt/total)*100 : 0;

    const item = document.createElement("div");
    item.className = "catItem";
    item.onclick = () => {
      state.activeKey = c.key;
      pending = 0;
      minsEl.textContent = "0";
      save();
      render();
      closeModal();
    };

    const left = document.createElement("div");
    left.className = "catLeft";

    const name = document.createElement("div");
    name.className = "catName";
    name.textContent = c.label;

    const sub = document.createElement("div");
    sub.className = "catSub";
    sub.textContent = `${mins.toLocaleString("ko-KR")}분 · ${pct.toFixed(0)}%`;

    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    bar.appendChild(fill);

    left.appendChild(name);
    left.appendChild(sub);
    left.appendChild(bar);

    const right = document.createElement("div");
    right.className = "catRight";
    right.textContent = won(amt);

    item.appendChild(left);
    item.appendChild(right);
    catListEl.appendChild(item);
  }
}

/* ===== 도넛 ===== */
let selectedKey = null;

function polarToCartesian(cx, cy, r, angleDeg){
  const a = (angleDeg - 90) * Math.PI / 180.0;
  return { x: cx + (r * Math.cos(a)), y: cy + (r * Math.sin(a)) };
}
function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle){
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter   = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, startAngle);
  const endInner   = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = (endAngle - startAngle) <= 180 ? 0 : 1;

  return [
    "M", startOuter.x, startOuter.y,
    "A", rOuter, rOuter, 0, largeArc, 0, endOuter.x, endOuter.y,
    "L", startInner.x, startInner.y,
    "A", rInner, rInner, 0, largeArc, 1, endInner.x, endInner.y,
    "Z"
  ].join(" ");
}

function clearSelectionUI(){
  selectedKey = null;
  selectedMetaEl.textContent = "● 전체";
  centerLblEl.textContent = "전체";
  // legend 선택표시 제거
  legendEl.querySelectorAll(".legendItem").forEach(el => el.classList.remove("selected"));
  // donut 하이라이트 원복
  donutSvg.querySelectorAll("path").forEach(p => p.setAttribute("opacity", "0.92"));
}

function renderDonut(){
  donutSvg.innerHTML = "";
  legendEl.innerHTML = "";

  const total = state.total || 0;
  donutTotalEl.textContent = won(total);

  const cx=130, cy=130, rOuter=110, rInner=74;

  // base ring
  const base = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  base.setAttribute("cx", cx);
  base.setAttribute("cy", cy);
  base.setAttribute("r", (rOuter+rInner)/2);
  base.setAttribute("fill", "none");
  base.setAttribute("stroke", "rgba(16,24,40,.10)");
  base.setAttribute("stroke-width", (rOuter-rInner));
  donutSvg.appendChild(base);

  centerAmtEl.textContent = won(total);
  centerLblEl.textContent = "전체";

  if(total > 0){
    const values = cats.map(c => ({
      ...c,
      amt: state.amtByCat[c.key] || 0,
      pct: (state.amtByCat[c.key] || 0) / total
    })).filter(d => d.amt > 0);

    let angle = 0;
    values.forEach(d => {
      const sweep = d.pct * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", donutArcPath(cx,cy,rOuter,rInner,start,end));
      path.setAttribute("fill", d.color);
      path.setAttribute("data-key", d.key);
      path.setAttribute("opacity", "0.92");
      path.style.cursor = "pointer";
      path.addEventListener("click", () => selectDonut(d.key));
      donutSvg.appendChild(path);
    });
  }

  // legend
  cats.forEach(c => {
    const amt = state.amtByCat[c.key] || 0;
    const mins = state.minsByCat[c.key] || 0;
    const pct = total > 0 ? (amt/total)*100 : 0;

    const row = document.createElement("div");
    row.className = "legendItem";
    row.onclick = () => selectDonut(c.key);

    const left = document.createElement("div");
    left.className = "legendL";

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = c.color;

    const nameWrap = document.createElement("div");
    nameWrap.style.minWidth = "0";

    const name = document.createElement("div");
    name.className = "legendName";
    name.textContent = c.label;

    // ✅ 퍼센트/분은 선택시에만 보이게
    const hint = document.createElement("div");
    hint.className = "legendHint";
    hint.textContent = `${mins.toLocaleString("ko-KR")}분 · ${pct.toFixed(0)}%`;

    nameWrap.appendChild(name);
    nameWrap.appendChild(hint);

    left.appendChild(sw);
    left.appendChild(nameWrap);

    const right = document.createElement("div");
    right.className = "legendAmt";
    right.textContent = won(amt);

    row.appendChild(left);
    row.appendChild(right);
    legendEl.appendChild(row);
  });

  clearSelectionUI();
}

function selectDonut(key){
  const total = state.total || 0;
  const c = cats.find(x => x.key === key);
  if(!c){ clearSelectionUI(); centerAmtEl.textContent = won(state.total || 0); return; }
  const amt = state.amtByCat[key] || 0;
  const pct = total > 0 ? (amt/total)*100 : 0;

  selectedKey = key;
  selectedMetaEl.textContent = c ? `● ${c.label}` : "● 선택";
  centerAmtEl.textContent = won(amt);
  centerLblEl.textContent = c ? `${c.label} · ${pct.toFixed(0)}%` : "선택";

  // legend selected 표시
  legendEl.querySelectorAll(".legendItem").forEach(el => el.classList.remove("selected"));
  const idx = cats.findIndex(x => x.key === key);
  const row = legendEl.children[idx];
  if(row) row.classList.add("selected");

  // donut highlight (data-key 기준으로 안정적으로)
  donutSvg.querySelectorAll("path").forEach(p => p.setAttribute("opacity", "0.25"));
  donutSvg.querySelectorAll("path").forEach(p => {
    if(p.getAttribute("data-key") === key) p.setAttribute("opacity", "0.92");
  });
}

/* ===== 모달 ===== */
function openModal(){ renderDonut(); modalEl.classList.add("show"); }
function closeModal(){ modalEl.classList.remove("show"); }

document.getElementById("openChart").onclick = openModal;
document.getElementById("closeModal").onclick = closeModal;
modalEl.addEventListener("click", (e)=>{ if(e.target === modalEl) closeModal(); });

// ✅ “전체” 버튼 = 선택 초기화
resetDonutBtn.onclick = () => {
  centerAmtEl.textContent = won(state.total || 0);
  clearSelectionUI();
};

/* ===== 분 +/- ===== */
document.getElementById("minus").onclick = () => {
  pending = Math.max(0, pending - 1);
  minsEl.textContent = String(pending);
};
document.getElementById("plus").onclick = () => {
  pending += 1;
  minsEl.textContent = String(pending);
};
document.getElementById("add").onclick = () => {
  if(pending <= 0) return;
  const a = activeCat();
  const addAmt = pending * RATE;

  state.minsByCat[a.key] += pending;
  state.amtByCat[a.key] += addAmt;
  state.total += addAmt;

  pending = 0;
  minsEl.textContent = "0";
  save();
  render();
};


/* ===== 관리자 모드 (F1 토글 / 모바일 5번 탭) ===== */
const adminTrigger = document.getElementById("adminTrigger");
let adminTapCount = 0;
let adminTapTimer = null;

if(adminTrigger){
  adminTrigger.addEventListener("click", (e) => {
    e.preventDefault();
    adminTapCount++;
    clearTimeout(adminTapTimer);
    if(adminTapCount >= 5) {
      setAdmin(!adminOpen);
      adminTapCount = 0;
    } else {
      adminTapTimer = setTimeout(() => { adminTapCount = 0; }, 1000);
    }
  });
}

const adminPanel = document.getElementById("adminPanel");
const adminClose = document.getElementById("adminClose");
const adminMinus = document.getElementById("adminMinus");
const adminPlus  = document.getElementById("adminPlus");
const adminReset = document.getElementById("adminReset");
const adminResetText = document.getElementById("adminResetText");

let adminOpen = false;
function setAdmin(open){
  if(!adminPanel) return;
  adminOpen = open;
  adminPanel.style.display = open ? "block" : "none";
  if(open && adminResetText) adminResetText.value = "";
}

// F1은 브라우저 도움말이 뜰 수 있어서 기본동작 막고 토글
document.addEventListener("keydown", (e) => {
  if(e.key === "F1"){
    e.preventDefault();
    setAdmin(!adminOpen);
  }
});

if(adminClose) adminClose.onclick = () => setAdmin(false);

// 선택된 카테고리의 분/금액/총액을 함께 보정 (0 아래로는 내려가지 않음)
function adjustMinutes(delta){
  const a = activeCat();
  if(!a) return;

  const curMins = state.minsByCat[a.key] || 0;
  const nextMins = Math.max(0, curMins + delta);
  const appliedDelta = nextMins - curMins; // 실제로 적용된 변화량

  if(appliedDelta === 0) return;

  state.minsByCat[a.key] = nextMins;

  const deltaAmt = appliedDelta * RATE;
  state.amtByCat[a.key] = Math.max(0, (state.amtByCat[a.key] || 0) + deltaAmt);
  state.total = Math.max(0, state.total + deltaAmt);

  save();
  render();
}

if(adminMinus) adminMinus.onclick = () => adjustMinutes(-1);
if(adminPlus)  adminPlus.onclick  = () => adjustMinutes(+1);

// --- 추가된 부분 시작 (이름 변경 기능) ---
const adminRenameBtn = document.getElementById("adminRenameBtn");
if(adminRenameBtn) {
  adminRenameBtn.onclick = () => {
    const a = activeCat(); // 현재 선택된 탭 확인
    if(!a) return;

    // 이름 입력창 띄우기
    const newName = prompt(`'${a.label}' 항목의 새 이름을 입력하세요.\n(최대 6글자, 화면 깨짐 방지)`, a.label);
    if(newName === null) return; // 취소 누름

    const trimmed = newName.trim();
    if(trimmed === "") {
      alert("이름을 비워둘 수 없습니다.");
      return;
    }
    if(trimmed.length > 6) {
      alert("화면 글자가 깨질 수 있어 6글자 이내로 적어주세요!");
      return;
    }

    // 이름 변경 적용 및 저장
    a.label = trimmed;
    try {
      const customLabels = JSON.parse(localStorage.getItem(CUSTOM_LABELS_KEY)) || {};
      customLabels[a.key] = trimmed;
      localStorage.setItem(CUSTOM_LABELS_KEY, JSON.stringify(customLabels));
    } catch(e) {}

    render(); // 화면 새로고침
    alert(`'${trimmed}'(으)로 이름이 변경되었습니다.`);
    setAdmin(false); // 관리자 창 닫기
  };
}
// --- 추가된 부분 끝 ---

// 초기화: RESET 입력 + confirm 2중 안전장치
if(adminReset) adminReset.onclick = () => {
  const txt = (adminResetText?.value || "").trim().toUpperCase();
  if(txt !== "RESET"){
    alert("초기화를 하려면 RESET을 정확히 입력하세요.");
    return;
  }
  if(!confirm("정말 초기화할까요? (이 기기 저장 기록이 모두 삭제됩니다)")) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PBCH_KEY);
  localStorage.removeItem(PBCH_HISTORY_KEY);
  localStorage.removeItem(CUSTOM_LABELS_KEY); // 커스텀 라벨도 초기화

  state = {
    activeKey: "me",
    total: 0,
    minsByCat: Object.fromEntries(cats.map(c => [c.key, 0])),
    amtByCat: Object.fromEntries(cats.map(c => [c.key, 0])),
  };
  pending = 0;
  prevCoins = null;

  save();
  
  // 리셋 후 페이지 새로고침하여 기본 라벨로 완벽 복귀
  window.location.reload();
};


/* ===== 렌더 ===== */
function render(){
  renderTabs();
  renderHeader();
  renderCoins();
  renderCatList();
}

/* ===== PB Challenges (작정기도) ===== */
const PBCH_KEY = "PB_CHALLENGES_V1";
const PBCH_HISTORY_KEY = "pbch_history_v1";

function PBCH_todayStr(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function PBCH_dateToInt(s){ // YYYY-MM-DD -> int days since epoch
  const [y,m,d] = s.split("-").map(Number);
  return Math.floor(Date.UTC(y,m-1,d)/86400000);
}
function PBCH_intToStr(i){
  const d = new Date(i*86400000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function PBCH_fmtDateInt(dateInt){
  const s = PBCH_intToStr(dateInt); // YYYY-MM-DD
  const [y,m,d] = s.split("-");
  return `${y}.${m}.${d}`;
}
function PBCH_fmtDate(dateInt){
  // alias (kept for template readability)
  return PBCH_fmtDateInt(dateInt);
}

function PBCH_uid(){
  return "c_" + Math.random().toString(36).slice(2,10) + "_" + Date.now().toString(36);
}
function PBCH_load(){
  try{
    const raw = localStorage.getItem(PBCH_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr;
  }catch(e){ return []; }
}
function PBCH_save(arr){
  localStorage.setItem(PBCH_KEY, JSON.stringify(arr));
}
function PBCH_norm(ch){
  ch = ch || {};
  // normalize progress
  ch.progress = Array.isArray(ch.progress) ? ch.progress : [];
  ch.progress = Array.from(new Set(ch.progress.filter(Boolean))).sort();

  // normalize target days
  ch.targetDays = Math.max(1, Number(ch.targetDays||40));

  // sanitize title (prevent placeholders like ○○○ / ... / ooo)
  const rawTitle = String(ch.title ?? "").trim();
  const looksPlaceholder = !rawTitle || /^[oO○●∙·\.\s_-]+$/.test(rawTitle);
  if(looksPlaceholder){
    ch.title = (ch.targetDays===1) ? "1일 기도" : `${ch.targetDays}일 작정기도`;
  }else{
    ch.title = rawTitle;
  }

  // normalize start date
  ch.start = ch.start || PBCH_todayStr();
  ch.startInt = (typeof ch.startInt === "number") ? ch.startInt : (PBCH_dateToInt(ch.start) || PBCH_dateToInt(PBCH_todayStr()));

  // clamp progress to targetDays to avoid 2/1 같은 현상
  if(ch.progress.length > ch.targetDays){
    ch.progress = ch.progress.slice(0, ch.targetDays);
  }

  // auto-archive when completed
  ch.archived = !!ch.archived || (ch.progress.length >= ch.targetDays);

  return ch;
}
function PBCH_stats(ch){
  const prog = ch.progress || [];
  const done = prog.length;

  // streak: consecutive ending today
  const today = PBCH_todayStr();
  const set = new Set(prog);
  const progInts = prog.map(PBCH_dateToInt).filter(Boolean).sort((a,b)=>a-b);
  const completeInt = (progInts.length >= ch.targetDays) ? progInts[ch.targetDays-1] : null;
  const completeStr = completeInt ? PBCH_fmtDateInt(completeInt) : null;
  let streak = 0;
  let cur = PBCH_dateToInt(today);
  while(set.has(PBCH_intToStr(cur))){
    streak++; cur--;
  }

  const isToday = set.has(today);
  const completed = done >= ch.targetDays;

  // missed: days since start (to today) that are not marked done
  const startInt = (typeof ch.startInt === 'number') ? ch.startInt : PBCH_dateToInt(ch.start || today);
  const todayInt = PBCH_dateToInt(today);
  const elapsed = (todayInt >= startInt) ? (todayInt - startInt + 1) : 0;
  const missed = Math.max(0, elapsed - done);

  // ETA: assume you can mark 1/day (including today if not yet checked)
  let etaInt = todayInt;
  if(!completed){
    const remaining = Math.max(0, ch.targetDays - done);
    let daysNeeded = remaining;
    if(todayInt >= startInt && !isToday) daysNeeded = Math.max(0, remaining - 1);
    etaInt = todayInt + daysNeeded;
  }
  const etaStr = completed ? (PBCH_fmtDateInt(todayInt) + ' (완료)') : PBCH_fmtDateInt(etaInt);

  const pct = Math.max(0, Math.min(100, Math.round((done / ch.targetDays) * 100)));
  return {done, pct, streak, isToday, completed, missed, etaStr, startInt, todayInt, completeStr};
}
function PBCH_lastNDates(n){
  const today = PBCH_dateToInt(PBCH_todayStr());
  const out = [];
  for(let i=n-1;i>=0;i--){
    out.push(PBCH_intToStr(today - i));
  }
  return out;
}

function PBCH_openModal(){
  const back = document.getElementById("pbchModalBack");
  const modal = document.getElementById("pbchModal");
  if(!back || !modal) return;

  // defaults
  const title = document.getElementById("pbchTitleInput");
  const days = document.getElementById("pbchDaysInput");
  const start = document.getElementById("pbchStartInput");
  title.value = "";
  days.value = "";
  start.value = PBCH_todayStr();

  // reset chips
  document.querySelectorAll(".pbchChip").forEach(b=>b.classList.remove("on"));

  back.style.display = "block";
  modal.style.display = "block";
}
function PBCH_closeModal(){
  const back = document.getElementById("pbchModalBack");
  const modal = document.getElementById("pbchModal");
  if(back) back.style.display = "none";
  if(modal) modal.style.display = "none";
}

function PBCH_createFromModal(){
  const title = (document.getElementById("pbchTitleInput")?.value || "").trim();
  const daysInput = document.getElementById("pbchDaysInput")?.value;
  const start = document.getElementById("pbchStartInput")?.value || PBCH_todayStr();

  const days = Math.max(1, Math.min(3650, Number(daysInput||0)));
  const targetDays = days || 40;

  const ch = PBCH_norm({
    id: PBCH_uid(),
    title: title || `${targetDays}일 작정기도`,
    targetDays,
    start,
    progress: [],
    archived: false,
    createdAt: Date.now()
  });

  const arr = PBCH_load().map(PBCH_norm);
  arr.unshift(ch);
  PBCH_save(arr);
  PBCH_closeModal();
  PBCH_renderAll();
}

function PBCH_toggleToday(id){
  const today = PBCH_todayStr();
  const arr = PBCH_load().map(PBCH_norm);
  const ch = arr.find(x=>x.id===id);
  if(!ch) return;

  // completed/archived items are read-only (prevent 2/1 같은 이상현상)
  const st0 = PBCH_stats(ch);
  if(ch.archived || st0.completed){
    PBCH_toast("이미 완료된 작정기도예요.", "완료된 항목은 기록에서 확인할 수 있어요.");
    return;
  }

  const set = new Set(ch.progress || []);
  if(set.has(today)) set.delete(today);
  else {
    // prevent going over targetDays
    if(set.size >= ch.targetDays) return;
    set.add(today);
  }
  ch.progress = Array.from(set).sort();

  const st = PBCH_stats(ch);
  if(st.completed) ch.archived = true;

  PBCH_save(arr);
  PBCH_renderAll();
}

function PBCH_delete(id){
  const arr = PBCH_load().map(PBCH_norm).filter(x=>x.id!==id);
  PBCH_save(arr);
  PBCH_renderAll();
}
function PBCH_restart(id){
  // Reset the same challenge (do NOT create a duplicate).
  const list = PBCH_load().map(PBCH_norm);
  const it = list.find(x => x.id === id);
  if(!it) return;

  // Save a snapshot to History before resetting
  PBCH_saveSnapshotById(id);

  it.start = PBCH_todayStr();
  it.startInt = PBCH_dateToInt(it.start);
  it.progress = [];
  it.archived = false;

  PBCH_save(list);
  PBCH_renderAll();
}

function PBCH_itemHTML(ch){
  const st = PBCH_stats(ch);
  const last7 = PBCH_lastNDates(7);
  const dots = last7.map(d=>{
    const on = (ch.progress||[]).includes(d);
    const cls = ["pbchDot", on?"on":"", d===PBCH_todayStr()?"today":""].filter(Boolean).join(" ");
    return `<span class="${cls}" title="${d}"></span>`;
  }).join("");

  const meta = `진행 ${st.done}/${ch.targetDays}`;
  const btnLabel = st.isToday ? "오늘 완료됨" : "오늘 체크";
  const btnCls = "pbchCheckBtn" + (st.isToday ? " on" : "");

  return `
    <div class="pbchItem">
      <div class="pbchTop">
        <div>
          <div class="pbchName">${PBCH_escape(ch.title)}${st.completed && st.completeStr ? `<span class="pbchDoneDate">${st.completeStr}</span>` : ``}</div>
          <div class="pbchMeta">${meta}</div>
        </div>
        <div class="pbchActions">
          <button class="${btnCls}" data-act="toggle" data-id="${ch.id}">${btnLabel}</button>
        </div>
      </div>

      <div class="pbchProg">
        <div class="pbchBar"><i style="width:${st.pct}%"></i></div>
        <div style="min-width:64px; text-align:right; font-weight:950;">${st.done}/${ch.targetDays}</div>
      </div>

      <div class="pbchFooter">
        <div class="pbchBadges">
          <span class="pbchBadge pbchBadgeNum"><span class="pbchDot g"></span><b>${st.done}</b></span>
          <span class="pbchBadge pbchBadgeNum"><span class="pbchDot r"></span><b>${st.missed}</b></span>
          <button class="pbchGear" data-act="gear" data-id="${ch.id}" title="수정" aria-label="수정">⚙</button>
        </div>
        <div class="pbchInfo">
          <span class="pbchInfoItem" title="시작일">🗓 <b>${PBCH_fmtDate(ch.startInt)}</b></span>
          <span class="pbchInfoItem" title="목표">🎯 <b>${ch.targetDays}</b></span>
          <span class="pbchInfoItem" title="완료예상">⏳ <b>${st.etaStr}</b></span>
        </div>
      </div>
    </div>
  `;
}

function PBCH_escape(s){
  return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function PBCH_renderAll(){
  const list = document.getElementById("pbchList");
  const doneList = document.getElementById("pbchDoneList");
  const doneLabel = document.getElementById("pbchDoneLabel");
  if(!list) return;

  const arr = PBCH_load().map(PBCH_norm);
  const active = arr.filter(x=>!x.archived);

  // Main screen shows ONLY active items (완료는 기록에서만 확인)
  if(active.length===0){
    list.innerHTML = `<div class="pbchEmpty">아직 작정/특별기도가 없어요.<br/>오른쪽의 <b>＋ 추가</b>를 눌러 시작해보세요.</div>`;
  }else{
    list.innerHTML = active.map(PBCH_itemHTML).join("");
  }

  // Hide completed section on main UI
  if(doneLabel) doneLabel.style.display = "none";
  if(doneList){ doneList.style.display="none"; doneList.innerHTML=""; }
}

/* ===== PBCH Helpers ===== */
function PBCH_toast(t, s){
  alert(t + (s ? "\n" + s : ""));
}

/* ===== PBCH History (Snapshots) ===== */
function PBCH_loadHistory(){
  try{
    const raw = localStorage.getItem(PBCH_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function PBCH_saveHistory(arr){
  try{ localStorage.setItem(PBCH_HISTORY_KEY, JSON.stringify(arr)); }catch(e){}
}
function PBCH_makeSnapshot(ch){
  const st = PBCH_stats(ch);
  return {
    snapId: PBCH_uid(),
    chId: ch.id,
    title: ch.title || "작정기도",
    targetDays: ch.targetDays,
    startInt: ch.startInt,
    progress: (ch.progress||[]).slice(),
    done: st.done,
    missed: st.missed,
    completeInt: st.completeInt || null,
    savedAt: new Date().toISOString()
  };
}
function PBCH_saveSnapshotById(id){
  const list = PBCH_load().map(PBCH_norm);
  const ch = list.find(c=>c.id===id);
  if(!ch) return;
  const h = PBCH_loadHistory();
  h.unshift(PBCH_makeSnapshot(ch));
  // keep last 200
  if(h.length>200) h.length=200;
  PBCH_saveHistory(h);
  PBCH_toast("기록에 저장했어요", ch.title || "작정기도");
}

/* ===== PBCH Gear Sheet ===== */
let PBCH_currentGearId = null;
const pbchSheetBack = document.getElementById("pbchSheetBack");
const pbchSheetClose = document.getElementById("pbchSheetClose");
const pbchSheetTitle = document.getElementById("pbchSheetTitle");
const pbchSheetEdit = document.getElementById("pbchSheetEdit");
const pbchSheetRestart = document.getElementById("pbchSheetRestart");
const pbchSheetDelete = document.getElementById("pbchSheetDelete");
const pbchSheetSaveSnap = document.getElementById("pbchSheetSaveSnap");
const pbchSheetOpenHub = document.getElementById("pbchSheetOpenHub");

function PBCH_openGear(id){
  PBCH_currentGearId = id;
  const ch = PBCH_load().map(PBCH_norm).find(c=>c.id===id);
  if(pbchSheetTitle) pbchSheetTitle.textContent = "관리";
  if(pbchSheetBack){ pbchSheetBack.style.display="flex"; }
}
function PBCH_closeGear(){
  PBCH_currentGearId = null;
  if(pbchSheetBack){ pbchSheetBack.style.display="none"; }
}
pbchSheetClose?.addEventListener("click", PBCH_closeGear);
pbchSheetBack?.addEventListener("click", (e)=>{ if(e.target===pbchSheetBack) PBCH_closeGear(); });

// Challenge card action delegation
(function(){
  const listEl = document.getElementById("pbchList");
  if(!listEl) return;
  listEl.addEventListener("click", (e)=>{
    const el = e.target.closest("[data-act]");
    if(!el) return;
    const act = el.getAttribute("data-act");
    const id = el.getAttribute("data-id");
    if(act==="gear" && id){ PBCH_openGear(id); }
  });
})();

pbchSheetEdit?.addEventListener("click", ()=>{ if(!PBCH_currentGearId) return; PBCH_editPrompt(PBCH_currentGearId); PBCH_closeGear(); });
pbchSheetRestart?.addEventListener("click", ()=>{ if(!PBCH_currentGearId) return; if(confirm("이 작정을 오늘부터 새로 시작할까요? (기록은 초기화됩니다)")){ PBCH_restart(PBCH_currentGearId); } PBCH_closeGear(); });
pbchSheetDelete?.addEventListener("click", ()=>{ if(!PBCH_currentGearId) return; if(confirm("정말 삭제할까요? (되돌릴 수 없어요)")){ PBCH_delete(PBCH_currentGearId); } PBCH_closeGear(); });
pbchSheetSaveSnap?.addEventListener("click", ()=>{ if(!PBCH_currentGearId) return; PBCH_saveSnapshotById(PBCH_currentGearId); PBCH_closeGear(); });
pbchSheetOpenHub?.addEventListener("click", ()=>{ PBCH_closeGear(); window.PB_openRecords(); });

/* ===== Records Excel Modal Logic ===== */
(function(){
  const recBack = document.getElementById("pbRecBack");
  const recClose = document.getElementById("pbRecClose");
  const recTbody = document.getElementById("pbRecTbody");
  const recEmpty = document.getElementById("pbRecEmpty");
  const hubBtn = document.getElementById("pbchHubBtn"); // record icon button

  function recRow(ch){
    const st = PBCH_stats(ch);
    const start = PBCH_fmtDateInt((typeof ch.startInt==='number') ? ch.startInt : PBCH_dateToInt(ch.start||PBCH_todayStr()));
    const end = st.completeStr ? st.completeStr : (ch.end ? PBCH_fmtDate(ch.end) : "");
    const status = st.completed ? '<span class="pbRecPill">완료</span>' : '<span class="pbRecPill" style="border-color:rgba(16,24,40,.18);background:#f5f5f5;color:rgba(16,24,40,.75);">진행중</span>';
    return `<tr>
      <td style="text-align:left;">${PBCH_escape(ch.title||"작정기도")}</td>
      <td>${start}</td>
      <td>${end}</td>
      <td>${(ch.targetDays||0)}일</td>
      <td>${status}</td>
    </tr>`;
  }

  function renderRecords(){
    const arr = PBCH_load().map(PBCH_norm);
    const done = arr.filter(x=>x.archived);
    if(!done.length){
      recTbody.innerHTML = "";
      recEmpty.style.display = "block";
    }else{
      recEmpty.style.display = "none";
      // most recent first: by complete date int if available
      done.sort((a,b)=>{
        const ca = (PBCH_stats(a).completeStr ? PBCH_dateToInt(PBCH_stats(a).completeStr) : 0);
        const cb = (PBCH_stats(b).completeStr ? PBCH_dateToInt(PBCH_stats(b).completeStr) : 0);
        return cb - ca;
      });
      recTbody.innerHTML = done.map(recRow).join("");
    }
  }

  function openRecords(){
    if(!recBack) return;
    renderRecords();
    recBack.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
  function closeRecords(){
    if(!recBack) return;
    recBack.style.display = "none";
    document.body.style.overflow = "";
  }

  // Hook record icon to records (not hub)
  if(hubBtn){
    hubBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      openRecords();
    });
  }

  recClose?.addEventListener("click", closeRecords);
  recBack?.addEventListener("click", (e)=>{ if(e.target===recBack) closeRecords(); });

  // ESC close (capture), only when records modal open
  document.addEventListener("keydown", (e)=>{
    if(e.key!=="Escape") return;
    if(recBack && recBack.style.display==="flex"){
      e.preventDefault();
      e.stopPropagation();
      closeRecords();
    }
  }, true);

  // expose for debugging
  window.PB_openRecords = openRecords;
})();

function PBCH_bind(){
  const addBtn = document.getElementById("pbchAddBtn");
  const back = document.getElementById("pbchModalBack");
  const cancel = document.getElementById("pbchCancelBtn");
  const create = document.getElementById("pbchCreateBtn");
  const presetRow = document.getElementById("pbchPresetRow");
  const daysInput = document.getElementById("pbchDaysInput");

  addBtn?.addEventListener("click", PBCH_openModal);
  back?.addEventListener("click", PBCH_closeModal);
  cancel?.addEventListener("click", PBCH_closeModal);
  create?.addEventListener("click", PBCH_createFromModal);

  presetRow?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".pbchChip");
    if(!btn) return;
    document.querySelectorAll(".pbchChip").forEach(b=>b.classList.remove("on"));
    btn.classList.add("on");
    const v = btn.getAttribute("data-days");
    if(daysInput) daysInput.value = v;
  });

  window.PBCH_editPrompt = function(id){
    const list = PBCH_load().map(PBCH_norm);
    const ch = list.find(c => c.id === id);
    if(!ch) return;
    const cur = (ch.progress||[]).slice().sort().join(", ");
    const val = prompt(
      "완료한 날짜를 입력하세요 (YYYY-MM-DD, 콤마/공백/줄바꿈 구분)\n예: 2026-02-28, 2026-03-01\n\n※ 입력한 날짜 기준으로 '수행한 날'이 계산됩니다.\n(빠진 날은 시작일부터 오늘까지에서 자동 계산)",
      cur
    );
    if(val === null) return;
    const raw = val.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const ok = raw.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    ch.progress = Array.from(new Set(ok)).sort();
    PBCH_save(list);
    PBCH_renderAll();
  }

  document.addEventListener("click", (e)=>{
    const el = e.target.closest("[data-act]");
    if(!el) return;
    const act = el.getAttribute("data-act");
    const id = el.getAttribute("data-id");
    if(!id) return;
    if(act==="gear") { PBCH_openGear(id); return; }
    if(act==="edit") { PBCH_editPrompt(id); return; }
    if(act==="toggle") PBCH_toggleToday(id);
    if(act==="delete") PBCH_delete(id);
    if(act==="restart") PBCH_restart(id);
  });
}

/* Guard: Completed (archived) challenges cannot be toggled again */
(function(){
  const _toggle = window.PBCH_toggleToday;
  if(typeof _toggle !== "function") return;
  window.PBCH_toggleToday = function(id){
    const arr = PBCH_load().map(PBCH_norm);
    const ch = arr.find(x=>x.id===id);
    if(!ch) return;
    if(ch.archived) return; // do nothing once completed/archived
    _toggle(id);
  };
})();

/* init */
PBCH_bind();
PBCH_renderAll();
render();
