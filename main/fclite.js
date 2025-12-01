function initialize_fc_lite() {
  // User Configuration
  UserConfig = {
    private_api_url: UserConfig?.private_api_url || "",
    page_turning_number: UserConfig?.page_turning_number || 24,
    error_img:
      UserConfig?.error_img ||
      "https://fastly.jsdelivr.net/gh/willow-god/Friend-Circle-Lite/static/favicon.ico",
  };

  const root = document.getElementById("friend-circle-lite-root");
  if (!root) return;

  // --- 1. Inject Styles (Updated for Top Layer) ---
  const styleId = "fc-lite-multiselect-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .fcl-filter-wrapper { 
        display: inline-block; 
        margin-bottom: 15px; 
        font-family: sans-serif; 
      }
      .fcl-dropdown-btn { 
        padding: 8px 12px; 
        border: 1px solid #ccc; 
        border-radius: 4px; 
        background: #fff; 
        cursor: pointer; 
        min-width: 120px; 
        text-align: left; 
        display: flex; 
        justify-content: space-between; 
        align-items: center;
        user-select: none;
      }
      .fcl-dropdown-content {
        display: none; 
        /* Key Change: Fixed positioning to escape container overflow */
        position: fixed; 
        background-color: #f9f9f9; 
        min-width: 200px; 
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); 
        /* Key Change: Very high Z-Index to stay on top */
        z-index: 99999; 
        max-height: 300px; 
        overflow-y: auto; 
        border-radius: 4px; 
        padding: 5px; 
        border: 1px solid #eee;
      }
      .fcl-dropdown-content.show { display: block; }
      .fcl-checkbox-item { display: block; padding: 5px 10px; cursor: pointer; user-select: none; color: #333; font-size: 14px;}
      .fcl-checkbox-item:hover { background-color: #f1f1f1; }
      .fcl-checkbox-item input { margin-right: 8px; }
      .fcl-arrow { font-size: 10px; margin-left: 10px; }
    `;
    document.head.appendChild(style);
  }

  // Clear previous content
  root.innerHTML = "";

  // Create Filter Container
  const filterContainer = document.createElement("div");
  filterContainer.id = "filter-container";
  filterContainer.className = "fcl-filter-wrapper";

  // Create Custom Dropdown UI
  const dropdownBtn = document.createElement("div");
  dropdownBtn.className = "fcl-dropdown-btn";
  dropdownBtn.innerHTML = `<span>筛选作者 (全部)</span> <span class="fcl-arrow">▼</span>`;

  const dropdownContent = document.createElement("div");
  dropdownContent.className = "fcl-dropdown-content";
  dropdownContent.id = "fcl-dropdown-list";

  // Note: We append dropdownContent to body or root, but here we keep it in flow
  // The CSS 'position: fixed' handles the visual breakout.
  filterContainer.appendChild(dropdownBtn);
  filterContainer.appendChild(dropdownContent);
  root.appendChild(filterContainer);

  // --- Toggle Dropdown Logic (Updated for Positioning) ---
  dropdownBtn.onclick = (e) => {
    e.stopPropagation();

    // Check if it is currently visible before toggling
    const isVisible = dropdownContent.classList.contains("show");

    // Close all other instances if any exist (optional safety)
    document
      .querySelectorAll(".fcl-dropdown-content")
      .forEach((el) => el.classList.remove("show"));

    if (!isVisible) {
      // Calculate position dynamically
      const rect = dropdownBtn.getBoundingClientRect();

      dropdownContent.style.top = rect.bottom + 5 + "px"; // 5px gap
      dropdownContent.style.left = rect.left + "px";
      // Optional: Match width to button if button is wide, or keep min-width
      // dropdownContent.style.width = rect.width + "px";

      dropdownContent.classList.add("show");
    }
  };

  // Close dropdown when clicking outside OR scrolling
  const closeDropdown = (e) => {
    // If click is inside the dropdown or button, do nothing
    if (
      e.type === "click" &&
      (filterContainer.contains(e.target) || dropdownContent.contains(e.target))
    ) {
      return;
    }
    dropdownContent.classList.remove("show");
  };

  window.addEventListener("click", closeDropdown);
  window.addEventListener("scroll", closeDropdown, true); // Capture phase to catch all scrolls
  window.addEventListener("resize", closeDropdown);

  const container = document.createElement("div");
  container.className = "articles-container";
  container.id = "articles-container";
  root.appendChild(container);

  const loadMoreBtn = document.createElement("button");
  loadMoreBtn.id = "load-more-btn";
  loadMoreBtn.innerText = "再来亿点";
  root.appendChild(loadMoreBtn);

  const statsContainer = document.createElement("div");
  statsContainer.id = "stats-container";
  root.appendChild(statsContainer);

  let start = 0;
  let allArticles = [];
  let currentFilteredArticles = [];
  let selectedAuthors = new Set();

  function loadInitialData() {
    const cacheKey = "friend-circle-lite-cache";
    const cacheTimeKey = "friend-circle-lite-cache-time";
    const cacheTime = localStorage.getItem(cacheTimeKey);
    const now = new Date().getTime();

    if (cacheTime && now - cacheTime < 30 * 60 * 1000) {
      const cachedData = JSON.parse(localStorage.getItem(cacheKey));
      if (cachedData) {
        processArticles(cachedData);
        return;
      }
    }

    fetch(`${UserConfig.private_api_url}all.json`)
      .then((response) => response.json())
      .then((data) => {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, now.toString());
        processArticles(data);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
      });
  }

  function createArticleCard(article) {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("div");
    title.className = "card-title";
    title.innerText = article.title;
    title.onclick = () => window.open(article.link, "_blank");
    card.appendChild(title);

    const author = document.createElement("div");
    author.className = "card-author";
    const authorImg = document.createElement("img");
    authorImg.className = "no-lightbox";
    authorImg.src = article.avatar || UserConfig.error_img;
    authorImg.onerror = () => (authorImg.src = UserConfig.error_img);
    author.appendChild(authorImg);
    author.appendChild(document.createTextNode(article.author));
    card.appendChild(author);

    author.onclick = () => {
      showAuthorArticles(article.author, article.avatar, article.link);
    };

    const date = document.createElement("div");
    date.className = "card-date";
    date.innerText = "🗓️" + article.created.substring(0, 10);
    card.appendChild(date);

    const bgImg = document.createElement("img");
    bgImg.className = "card-bg no-lightbox";
    bgImg.src = article.avatar || UserConfig.error_img;
    bgImg.onerror = () => (bgImg.src = UserConfig.error_img);
    card.appendChild(bgImg);

    return card;
  }

  function loadMoreArticles() {
    const nextStart = start;
    const nextEnd = start + UserConfig.page_turning_number;
    const nextArticles = currentFilteredArticles.slice(nextStart, nextEnd);

    if (nextArticles.length === 0) {
      loadMoreBtn.style.display = "none";
      return;
    }
    nextArticles.forEach((article) => {
      const card = createArticleCard(article);
      container.appendChild(card);
    });

    start = nextEnd;
    if (start >= currentFilteredArticles.length) {
      loadMoreBtn.style.display = "none";
    }
  }

  function renderArticles(articleToRender) {
    container.innerHTML = "";
    articleToRender.forEach((article) => {
      const card = createArticleCard(article);
      container.appendChild(card);
    });
  }

  function applyFilters() {
    let filtered = allArticles;

    if (selectedAuthors.size > 0) {
      filtered = filtered.filter((a) => selectedAuthors.has(a.author));
      dropdownBtn.querySelector(
        "span"
      ).innerText = `已选 ${selectedAuthors.size} 位作者`;
    } else {
      dropdownBtn.querySelector("span").innerText = `筛选作者 (全部)`;
    }

    start = 0;
    currentFilteredArticles = filtered;
    const articlesToShow = filtered.slice(0, UserConfig.page_turning_number);
    renderArticles(articlesToShow);
    start = articlesToShow.length;
    loadMoreBtn.style.display =
      filtered.length > UserConfig.page_turning_number ? "block" : "none";
  }

  function processArticles(data) {
    allArticles = data.article_data;

    const uniqueAuthors = [...new Set(allArticles.map((data) => data.author))];
    dropdownContent.innerHTML = "";

    uniqueAuthors.forEach((author) => {
      const label = document.createElement("label");
      label.className = "fcl-checkbox-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = author;

      // Stop propagation so clicking a checkbox doesn't trigger the window-click-close event
      checkbox.addEventListener("click", (e) => e.stopPropagation());

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedAuthors.add(author);
        } else {
          selectedAuthors.delete(author);
        }
        applyFilters();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + author));

      // Stop propagation on label click too
      label.addEventListener("click", (e) => e.stopPropagation());

      dropdownContent.appendChild(label);
    });

    currentFilteredArticles = [...allArticles];

    const stats = data.statistical_data;
    statsContainer.innerHTML = `
            <div>Powered by: <a href="https://github.com/willow-god/Friend-Circle-Lite" target="_blank">FriendCircleLite</a><br></div>
            <div>Designed By: <a href="https://www.liushen.fun/" target="_blank">LiuShen</a><br></div>
            <div>订阅:${stats.friends_num}   活跃:${stats.active_num}   总文章数:${stats.article_num}<br></div>
            <div>更新时间:${stats.last_updated_time}</div>
        `;

    container.innerHTML = "";
    const initialArticles = currentFilteredArticles.slice(
      0,
      UserConfig.page_turning_number
    );
    initialArticles.forEach((article) =>
      container.appendChild(createArticleCard(article))
    );
    start = initialArticles.length;
    loadMoreBtn.style.display =
      currentFilteredArticles.length > UserConfig.page_turning_number
        ? "block"
        : "none";
  }

  function showAuthorArticles(author, avatar, link) {
    if (!document.getElementById("fclite-modal")) {
      const modal = document.createElement("div");
      modal.id = "modal";
      modal.className = "modal";
      modal.innerHTML = `
            <div class="modal-content">
                <img id="modal-author-avatar" src="" alt="">
                <a id="modal-author-name-link"></a>
                <div id="modal-articles-container"></div>
                <img id="modal-bg" src="" alt="">
            </div>
            `;
      root.appendChild(modal);
    }

    const modal = document.getElementById("modal");
    const modalArticlesContainer = document.getElementById(
      "modal-articles-container"
    );
    const modalAuthorAvatar = document.getElementById("modal-author-avatar");
    const modalAuthorNameLink = document.getElementById(
      "modal-author-name-link"
    );
    const modalBg = document.getElementById("modal-bg");

    modalArticlesContainer.innerHTML = "";
    modalAuthorAvatar.src = avatar || UserConfig.error_img;
    modalAuthorAvatar.onerror = () =>
      (modalAuthorAvatar.src = UserConfig.error_img);
    modalBg.src = avatar || UserConfig.error_img;
    modalBg.onerror = () => (modalBg.src = UserConfig.error_img);
    modalAuthorNameLink.innerText = author;
    modalAuthorNameLink.href = new URL(link).origin;

    const authorArticles = allArticles.filter(
      (article) => article.author === author
    );

    authorArticles.slice(0, 4).forEach((article) => {
      const articleDiv = document.createElement("div");
      articleDiv.className = "modal-article";

      const title = document.createElement("a");
      title.className = "modal-article-title";
      title.innerText = article.title;
      title.href = article.link;
      title.target = "_blank";
      articleDiv.appendChild(title);

      const date = document.createElement("div");
      date.className = "modal-article-date";
      date.innerText = "📅" + article.created.substring(0, 10);
      articleDiv.appendChild(date);

      modalArticlesContainer.appendChild(articleDiv);
    });

    modal.style.display = "block";
    setTimeout(() => {
      modal.classList.add("modal-open");
    }, 10);
  }

  function hideModal() {
    const modal = document.getElementById("modal");
    modal.classList.remove("modal-open");
    modal.addEventListener(
      "transitionend",
      () => {
        modal.style.display = "none";
        root.removeChild(modal);
      },
      { once: true }
    );
  }

  loadInitialData();
  loadMoreBtn.addEventListener("click", loadMoreArticles);

  window.onclick = function (event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
      hideModal();
    }
  };
}

function whenDOMReady() {
  initialize_fc_lite();
}

whenDOMReady();
document.addEventListener("pjax:complete", initialize_fc_lite);
