(() => {
  // =========================
  // nav高さをCSS変数に反映
  // =========================
  function syncLayoutVars() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const h = Math.ceil(nav.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--navH", `${h}px`);
  }

  function stabilizeFirstPaint() {
    syncLayoutVars();
    requestAnimationFrame(syncLayoutVars);
    setTimeout(syncLayoutVars, 120);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      syncLayoutVars();
      updateActiveByScroll(); // ★ リサイズ後にactive再計算
    }, 100);
  });

  // =========================
  // Fade + nav active
  //  - fade: IntersectionObserver
  //  - nav active: scroll position (ズレ防止)
  // =========================
  let slides = [];
  let idx = 0;

  function setActiveLink(id) {
    document
      .querySelectorAll(".links a")
      .forEach((a) => a.classList.remove("active"));
    const current = document.querySelector(
      `.links a[href="#${CSS.escape(id)}"]`
    );
    if (current) current.classList.add("active");
  }

  function getNavOffsetPx() {
    const cs = getComputedStyle(document.documentElement);
    const navH = parseFloat(cs.getPropertyValue("--navH")) || 0;
    const navPad = parseFloat(cs.getPropertyValue("--navPad")) || 0;
    return navH + navPad;
  }

  function setScene(id) {
    document.documentElement.dataset.scene = id || "top";
  }

  function updateActiveByScroll() {
    if (!slides.length) return;

    const offset = getNavOffsetPx() + 2; // ちょい余裕
    let best = slides[0];
    let bestTop = -Infinity;

    for (const s of slides) {
      const rect = s.getBoundingClientRect();
      // nav下端より上に来たスライドの中で、一番下（=今見ている）を採用
      if (rect.top <= offset && rect.top > bestTop) {
        bestTop = rect.top;
        best = s;
      }
    }

    if (best && best.id) {
      setActiveLink(best.id);
      setScene(best.id);
      const newIdx = slides.indexOf(best);
      if (newIdx >= 0) idx = newIdx;
    }
  }

  function setupFadeAndNav() {
    slides = [...document.querySelectorAll(".slide")];
    if (slides.length === 0) return;

    setScene(slides[0].id);

    // まずは表示を保証（JS死んでも真っ白にならない構成）
    document.body.classList.add("fx");
    slides[0].classList.add("is-active");
    if (slides[0].id) setActiveLink(slides[0].id);

    // navクリックは scrollIntoView に統一（挙動が安定）
    document.querySelectorAll(".links a[href^='#']").forEach((a) => {
      a.addEventListener("click", (e) => {
        const hash = a.getAttribute("href");
        const id = hash ? hash.slice(1) : "";
        const target = id ? document.getElementById(id) : null;
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });

        // クリック直後に一旦反映（スクロール中にscroll判定で追従）
        setActiveLink(id);
        setScene(id);
      });
    });

    // キーボードナビ（Lightbox中は無効）
    function go(i) {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      slides[idx].scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("keydown", (e) => {
      if (document.body.classList.contains("lightbox-open")) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") go(idx + 1);
      if (e.key === "ArrowUp" || e.key === "PageUp") go(idx - 1);
    });

    // ---- fade (IntersectionObserver)
    if (!("IntersectionObserver" in window)) {
      // 古い環境の保険：全部表示
      slides.forEach((s) => s.classList.add("is-active"));
      document.body.classList.add("fx-ready");
      updateActiveByScroll();
      return;
    }

    const fadeObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-active");
          else entry.target.classList.remove("is-active");
        }
      },
      {
        root: null,
        threshold: [0.01, 0.08, 0.15, 0.25],
        rootMargin: "-10% 0px -10% 0px",
      }
    );

    slides.forEach((s) => fadeObserver.observe(s));

    // ★ 準備完了してからフェード有効化
    document.body.classList.add("fx-ready");

    // ---- nav active (scroll position)
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          updateActiveByScroll();
        });
      },
      { passive: true }
    );

    // 初回
    updateActiveByScroll();
  }

  // =========================
  // Build only: slide-in/out
  // =========================
  (function setupBuildSlideInOut() {
    const build = document.getElementById("build");
    if (!build) return;

    if (!("IntersectionObserver" in window)) {
      build.classList.add("is-inview");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) build.classList.add("is-inview");
          else build.classList.remove("is-inview");
        }
      },
      {
        root: null,
        threshold: 0.25,
        rootMargin: "-15% 0px -25% 0px",
      }
    );

    io.observe(build);
  })();

  // =========================
  // Accordion (Research + Intern 共通)
  // =========================
  // function setupAccordion() {
  //   const items = [...document.querySelectorAll("[data-acc]")];
  //   if (items.length === 0) return;

  //   function closeItem(item) {
  //     item.classList.remove("is-open");
  //     const panel = item.querySelector("[data-acc-panel]");
  //     if (panel) panel.style.maxHeight = "0px";
  //   }

  //   function openItem(item) {
  //     item.classList.add("is-open");
  //     const panel = item.querySelector("[data-acc-panel]");
  //     if (!panel) return;
  //     panel.style.maxHeight = panel.scrollHeight + "px";
  //   }

  //   items.forEach((item) => {
  //     const btn = item.querySelector("[data-acc-btn]");
  //     const panel = item.querySelector("[data-acc-panel]");
  //     if (!btn || !panel) return;

  //     panel.style.maxHeight = "0px";

  //     btn.addEventListener("click", () => {
  //       const isOpen = item.classList.contains("is-open");
  //       items.forEach(closeItem);
  //       if (!isOpen) openItem(item);
  //     });
  //   });

  //   window.addEventListener("resize", () => {
  //     items.forEach((item) => {
  //       if (!item.classList.contains("is-open")) return;
  //       const panel = item.querySelector("[data-acc-panel]");
  //       if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
  //     });
  //   });
  // }

  function setupAccordion() {
    const items = [...document.querySelectorAll("[data-acc]")];
    if (items.length === 0) return;

    function closeItem(item) {
      item.classList.remove("is-open");
      const panel = item.querySelector("[data-acc-panel]");
      if (panel) panel.style.maxHeight = "0px";
    }

    function openItem(item) {
      item.classList.add("is-open");
      const panel = item.querySelector("[data-acc-panel]");
      if (!panel) return;
      panel.style.maxHeight = panel.scrollHeight + "px";
    }

    // ★ 初期状態は必ず全閉じ（HTMLに is-open が残ってても潰す）
    items.forEach(closeItem);

    // ★ 開いてるものだけ高さ再計算する関数
    function refreshOpenPanels() {
      items.forEach((item) => {
        if (!item.classList.contains("is-open")) return;
        const panel = item.querySelector("[data-acc-panel]");
        if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
      });
    }

    items.forEach((item) => {
      const btn = item.querySelector("[data-acc-btn]");
      const panel = item.querySelector("[data-acc-panel]");
      if (!btn || !panel) return;

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach(closeItem);
        if (!isOpen) openItem(item);
      });

      // ★ 画像ロードや details toggle は「開いてる時だけ」反映されるようにする
      panel.querySelectorAll("details").forEach((d) => {
        d.addEventListener("toggle", refreshOpenPanels);
      });

      panel.querySelectorAll("img").forEach((img) => {
        img.addEventListener("load", refreshOpenPanels);
      });
    });

    window.addEventListener("resize", () => {
      requestAnimationFrame(refreshOpenPanels);
    });
  }

  function refreshOpenPanel(panel) {
    const item = panel.closest("[data-acc]");
    if (!item || !item.classList.contains("is-open")) return;
    panel.style.maxHeight = panel.scrollHeight + "px";
  }
  // details を開閉したら、親のアコーディオンパネル高さを更新して切れないようにする
  // document.querySelectorAll("[data-acc-panel] details").forEach((d) => {
  //   d.addEventListener("toggle", () => {
  //     const panel = d.closest("[data-acc-panel]");
  //     if (!panel) return;
  //     refreshOpenPanel(panel);
  //   });
  // });

  // // 画像の読み込みで高さが変わる場合もあるので、読み込み後に再計算
  // document.querySelectorAll("[data-acc-panel] img").forEach((img) => {
  //   img.addEventListener("load", () => {
  //     const panel = img.closest("[data-acc-panel]");
  //     if (!panel) return;
  //     panel.style.maxHeight = panel.scrollHeight + "px";
  //   });
  // });

  // // 画面幅変更でも高さが変わるので保険
  // window.addEventListener("resize", () => {
  //   document.querySelectorAll("[data-acc-panel]").forEach((panel) => {
  //     // inline maxHeight が入っている＝開いている前提で更新
  //     if (panel.style.maxHeight)
  //       panel.style.maxHeight = panel.scrollHeight + "px";
  //   });
  // });

  // =========================
  // Lightbox
  // =========================
  function setupLightbox() {
    const modal = document.getElementById("lightbox");
    if (!modal) return;

    const imgEl = modal.querySelector(".lightbox-img");
    const captionEl = modal.querySelector(".lightbox-caption");
    const counterEl = modal.querySelector(".lightbox-counter");

    const btnPrev = modal.querySelector("[data-prev]");
    const btnNext = modal.querySelector("[data-next]");
    const closeEls = modal.querySelectorAll("[data-close]");

    const galleries = new Map();
    const thumbs = [
      ...document.querySelectorAll("img[data-lightbox][data-gallery]"),
    ];

    thumbs.forEach((img) => {
      const g = img.dataset.gallery;
      if (!g) return;

      const src = img.dataset.full || img.getAttribute("src");
      const alt = img.getAttribute("alt") || "";

      if (!galleries.has(g)) galleries.set(g, []);
      galleries.get(g).push({ src, alt });
    });

    let currentGallery = null;
    let currentIndex = 0;

    function render() {
      const list = galleries.get(currentGallery) || [];
      const item = list[currentIndex];
      if (!item) return;

      imgEl.src = item.src;
      imgEl.alt = item.alt || "";
      if (captionEl) captionEl.textContent = item.alt || "";
      if (counterEl)
        counterEl.textContent = `${currentIndex + 1} / ${list.length}`;

      const disabled = list.length <= 1;
      if (btnPrev) btnPrev.style.opacity = disabled ? "0.35" : "1";
      if (btnNext) btnNext.style.opacity = disabled ? "0.35" : "1";
    }

    function openLightbox(galleryName, index) {
      const list = galleries.get(galleryName) || [];
      if (list.length === 0) return;

      currentGallery = galleryName;
      currentIndex = Math.max(0, Math.min(list.length - 1, index));

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");

      render();
    }

    function closeLightbox() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
    }

    function move(dir) {
      const list = galleries.get(currentGallery) || [];
      if (list.length <= 1) return;
      currentIndex = (currentIndex + dir + list.length) % list.length;
      render();
    }

    thumbs.forEach((img) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => {
        const g = img.dataset.gallery;
        const list = galleries.get(g) || [];
        if (list.length === 0) return;

        const src = img.dataset.full || img.getAttribute("src");
        const index = Math.max(
          0,
          list.findIndex((x) => x.src === src)
        );
        openLightbox(g, index);
      });
    });

    closeEls.forEach((el) => el.addEventListener("click", closeLightbox));
    if (btnPrev) btnPrev.addEventListener("click", () => move(-1));
    if (btnNext) btnNext.addEventListener("click", () => move(+1));

    window.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(+1);
    });
  }

  // =========================
  // init
  // =========================
  window.addEventListener("DOMContentLoaded", () => {
    stabilizeFirstPaint();
    setupFadeAndNav();
    setupAccordion();
    setupLightbox();
  });

  window.addEventListener("load", () => {
    stabilizeFirstPaint();
    updateActiveByScroll();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      syncLayoutVars();
      updateActiveByScroll();
    });
  }
})();
