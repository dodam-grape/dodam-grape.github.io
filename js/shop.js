(() => {
  "use strict";

  const STORAGE_KEY = "dodam_shop_data_v4";
  const LEGACY_KEY = "dodam_shop_data";

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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(data) {
    const base = clone(DEFAULT_SHOP_DATA);
    if (!data || typeof data !== "object") return base;

    for (const [shopKey, defaultShop] of Object.entries(base)) {
      const incoming = data[shopKey];
      if (!incoming || typeof incoming !== "object") continue;

      defaultShop.title = String(incoming.title || defaultShop.title);
      defaultShop.npc = String(incoming.npc || defaultShop.npc);

      if (Array.isArray(incoming.items)) {
        defaultShop.items = incoming.items.map((item, index) => ({
          icon: String(item?.icon || "🎁"),
          name: String(item?.name || `상품 ${index + 1}`),
          price: Math.max(0, Math.min(9999, Number(item?.price) || 0)),
          enabled: item?.enabled !== false
        }));
      }
    }

    return base;
  }

  function migrateLegacy() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return;

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;

    try {
      const migrated = normalize(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch (error) {
      console.warn("상점 데이터 이전 실패:", error);
    }
  }

  function getData() {
    migrateLegacy();

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const initial = clone(DEFAULT_SHOP_DATA);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return normalize(JSON.parse(saved));
    } catch (error) {
      console.warn("상점 데이터 불러오기 실패:", error);
      return clone(DEFAULT_SHOP_DATA);
    }
  }

  function saveData(data) {
    try {
      const normalized = normalize(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

      const verify = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!verify) throw new Error("저장 검증 실패");

      return { ok: true, data: normalize(verify) };
    } catch (error) {
      console.error("상점 데이터 저장 실패:", error);
      return { ok: false, error };
    }
  }

  function reset() {
    const data = clone(DEFAULT_SHOP_DATA);
    saveData(data);
    notifyUpdated();
    return data;
  }

  function notifyUpdated() {
    window.dispatchEvent(new CustomEvent("dodam-shop-updated"));
  }

  window.ShopStore = {
    getData,
    saveData,
    reset,
    notifyUpdated
  };
})();
