const DB_Path = "https://raw.githubusercontent.com/MainRoute-Core/Clogs/output/blogs.json";
const Logs_Path = "https://raw.githubusercontent.com/MainRoute-Core/Clogs/main/Logs/";

let indexData = [];
let activeFilters = { ct: [], tg: null, q: "", author: null, srt: null, bm: false };

let currentPage = 1;
const postsPerPage = 6;

const postCache = new Map();
const prefetchPromises = new Map();

let currentArticleId = null;
let searchDebounceTimer = null;

window.addEventListener('popstate', processUrlParamsAndRoute);
window.addEventListener('scroll', handleScrollProgress);

async function initializeClogReader() {
    try {
        const response = await fetch(DB_Path);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        let data = await response.json();
        indexData = Array.isArray(data) ? data : (data.blogs || []);
        indexData = indexData.filter(item => item.Status === "Pub");
        setupEventListeners();
        processUrlParamsAndRoute();
    } catch (err) {
        document.getElementById('publication-grid').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
            <h2 class="txt-mrc txt-center font-bold" style="font-size: 3rem;">Database Connection Failed</h2>
            <p class="txt-muted txt-center txt-xlg">Could not load logs from <strong>Database</strong>.</p>
        </div>`;
    }
}

function setupEventListeners() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            activeFilters.srt = e.target.value;
            currentPage = 1;
            document.getElementById('sort-wrapper').classList.remove('expanded');
            updateUrlState();
        });
    }
}

function processUrlParamsAndRoute() {
    const params = new URLSearchParams(window.location.search);
    const logId = params.get('log');
    activeFilters.q = params.get('q') || "";
    activeFilters.tg = params.get('tg') || null;
    activeFilters.author = params.get('author') || null;
    activeFilters.srt = params.get('srt') || null;
    activeFilters.bm = params.get('bm') === 'true';

    const ctParam = params.get('ct');
    activeFilters.ct = ctParam ? ctParam.split(',').filter(Boolean) : [];
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.value = activeFilters.q;
    const searchWrapper = document.getElementById('search-wrapper');
    if (activeFilters.q && searchWrapper) searchWrapper.classList.add('expanded');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        if (activeFilters.srt) {
            sortSelect.value = activeFilters.srt;
        } else {
            sortSelect.selectedIndex = 0;
        }
    }
    if (logId) {
        loadAndRenderFullPost(logId);
    } else {
        showListView();
    }
}

function updateUrlState() {
    const url = new URL(window.location);
    url.searchParams.delete('log');
    if (activeFilters.ct.length > 0) url.searchParams.set('ct', activeFilters.ct.join(','));
    else url.searchParams.delete('ct');
    if (activeFilters.tg) url.searchParams.set('tg', activeFilters.tg);
    else url.searchParams.delete('tg');
    if (activeFilters.author) url.searchParams.set('author', activeFilters.author);
    else url.searchParams.delete('author');
    if (activeFilters.q) url.searchParams.set('q', activeFilters.q);
    else url.searchParams.delete('q');
    if (activeFilters.srt) url.searchParams.set('srt', activeFilters.srt);
    else url.searchParams.delete('srt');
    if (activeFilters.bm) url.searchParams.set('bm', 'true');
    else url.searchParams.delete('bm');
    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
}

function showListView() {
    document.getElementById('main-reader-pane').classList.remove('active');
    document.getElementById('main-layout-wrapper').style.display = 'block';
    buildCategorySidebar();
    renderPostList();
}

function getBookmarks() {
    try {
        return JSON.parse(localStorage.getItem('mrc_bookmarks')) || [];
    } catch (e) {
        return [];
    }
}

function saveBookmarks(arr) {
    localStorage.setItem('mrc_bookmarks', JSON.stringify(arr));
}

function toggleCurrentBookmark() {
    if (!currentArticleId) return;
    const bookmarks = getBookmarks();
    const idx = bookmarks.indexOf(currentArticleId);
    const btn = document.getElementById('reader-bookmark-btn');
    const txt = document.getElementById('bookmark-text');
    if (idx > -1) {
        bookmarks.splice(idx, 1);
        if (btn) btn.classList.remove('bookmarked');
        if (txt) txt.innerText = 'Bookmark';
    } else {
        bookmarks.push(currentArticleId);
        if (btn) btn.classList.add('bookmarked');
        if (txt) txt.innerText = 'Bookmarked';
    }
    saveBookmarks(bookmarks);
    buildCategorySidebar();
}

function updateBookmarkButtonUI(articleId) {
    const bookmarks = getBookmarks();
    const btn = document.getElementById('reader-bookmark-btn');
    const txt = document.getElementById('bookmark-text');
    if (!btn || !txt) return;
    if (bookmarks.includes(articleId)) {
        btn.classList.add('bookmarked');
        txt.innerText = 'Bookmarked';
    } else {
        btn.classList.remove('bookmarked');
        txt.innerText = 'Bookmark';
    }
}

async function prefetchPost(articleId) {
    if (postCache.has(articleId) || prefetchPromises.has(articleId)) return;
    const dbEntry = indexData.find(item => item.Article === articleId);
    if (!dbEntry) return;
    const basePath = Logs_Path.endsWith('/') ? Logs_Path : Logs_Path + '/';
    const postUrl = basePath + dbEntry.Url;
    const promise = fetch(postUrl)
        .then(res => {
            if (!res.ok) throw new Error("Prefetch response error");
            return res.json();
        })
        .then(data => {
            postCache.set(articleId, data);
            prefetchPromises.delete(articleId);
            updateReadingTimeOnCard(articleId, data);
        })
        .catch(() => {
            prefetchPromises.delete(articleId);
        });
    prefetchPromises.set(articleId, promise);
}

function updateReadingTimeOnCard(articleId, data) {
    const words = (data.Data || "").trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.round(words / 200));
    const elements = document.querySelectorAll(`[data-article="${articleId}"] .card-meta span:first-child`);
}

function buildCategorySidebar() {
    const categoriesMap = {};
    indexData.forEach(item => {
        (item.Cat || []).forEach(c => { if (c) categoriesMap[c] = (categoriesMap[c] || 0) + 1; });
    });
    const catList = document.getElementById('category-filter-list');
    catList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const bookmarksCount = getBookmarks().length;
    const bLi = document.createElement('li');
    bLi.className = `cat-item ${activeFilters.bm ? 'active' : ''}`;
    bLi.onclick = () => {
        activeFilters.bm = !activeFilters.bm;
        if (activeFilters.bm) {
            activeFilters.ct = [];
        }
        currentPage = 1;
        updateUrlState();
    };
    bLi.innerHTML = `
    <div class="flex items-center">
        <span class="cat-checkbox">${activeFilters.bm ? '<svg class="icon" style="width:10px;height:10px;fill:var(--mrc);"><use href="/src/global.svg#icon-heart"></use></svg>' : '<svg class="icon" style="width:10px;height:10px;"><use href="/src/global.svg#icon-heart"></use></svg>'}</span>
        <span style="font-weight: 700; color: #fff;">Your Bookmarks</span>
    </div>
    <span class="cat-count" style="background: rgba(244, 66, 52, 0.2); color: var(--mrc);">${bookmarksCount}</span>
    `;
    fragment.appendChild(bLi);
    const hr = document.createElement('hr');
    fragment.appendChild(hr);
    Object.keys(categoriesMap).sort().forEach(cat => {
        const isActive = activeFilters.ct.includes(cat);
        const li = document.createElement('li');
        li.className = `cat-item ${isActive ? 'active' : ''}`;
        li.onclick = () => {
            activeFilters.bm = false;
            toggleCategoryFilter(cat);
        };
        li.innerHTML = `
        <div class="flex items-center">
            <span class="cat-checkbox">${isActive ? '<svg class="icon" style="width:10px;height:10px;"><use href="/src/global.svg#icon-check"></use></svg>' : ''}</span>
            <span>${cat}</span>
        </div>
        <span class="cat-count">${categoriesMap[cat]}</span>
        `;
        fragment.appendChild(li);
    });
    catList.appendChild(fragment);
}

function renderPostList() {
    const grid = document.getElementById('publication-grid');
    grid.innerHTML = "";
    let filtered = indexData.filter(item => {
        if (activeFilters.bm) {
            const bookmarks = getBookmarks();
            if (!bookmarks.includes(item.Article)) return false;
        }
        if (activeFilters.ct.length > 0 && (!item.Cat || !activeFilters.ct.some(selected => item.Cat.includes(selected)))) return false;
        if (activeFilters.tg && (!item.Tags || !item.Tags.includes(activeFilters.tg))) return false;
        if (activeFilters.author && item.Author !== activeFilters.author) return false;
        if (activeFilters.q) {
            const query = activeFilters.q.toLowerCase();
            const inTitle = item.Name && item.Name.toLowerCase().includes(query);
            const inDesc = item.Desc && item.Desc.toLowerCase().includes(query);
            if (!inTitle && !inDesc) return false;
        }
        return true;
    });

    if (activeFilters.srt) {
        filtered.sort((a, b) => {
            if (activeFilters.srt.startsWith('Name')) {
                const nameA = (a.Name || "").toLowerCase();
                const nameB = (b.Name || "").toLowerCase();
                if (nameA < nameB) return activeFilters.srt === 'NameA' ? -1 : 1;
                if (nameA > nameB) return activeFilters.srt === 'NameA' ? 1 : -1;
                return 0;
            } else if (activeFilters.srt.startsWith('Date')) {
                const dateA = new Date(a.Date).getTime() || 0;
                const dateB = new Date(b.Date).getTime() || 0;
                return activeFilters.srt === 'DateA' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });
    }

    const clearBtn = document.getElementById('clear-filters-btn');
    if (activeFilters.ct.length > 0 || activeFilters.tg || activeFilters.q || activeFilters.author || activeFilters.bm) {
        let filterText = [];
        if (activeFilters.q) filterText.push(`Query:"${activeFilters.q}"`);
        if (activeFilters.ct.length > 0) filterText.push(`Category:"${activeFilters.ct.join(', ')}"`);
        if (activeFilters.tg) filterText.push(`#${activeFilters.tg}`);
        if (activeFilters.author) filterText.push(`Author:"@${activeFilters.author}"`);
        if (activeFilters.bm) filterText.push(`Your Bookmarks`);
        document.getElementById('results-count').innerHTML = `<span class="txt-main font-bold">[${filtered.length}]</span> Logs Found For <span class="txt-main">${filterText.join(', ')}</span>`;
        if (clearBtn) clearBtn.style.display = 'inline-flex';
    } else {
        document.getElementById('results-count').innerHTML = `Initialized Logs <span class="txt-main">[${filtered.length}]</span>`;
        if (clearBtn) clearBtn.style.display = 'none';
    }
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1;text-align: center;padding: 4rem 1rem;border: 1px dashed var(--text-main);border-radius: 1rem;background: var(--glass-bg);"><p class="txt-main txt-lg">No logs match the current clearance level.</p></div>`;
        document.getElementById('load-more-container').style.display = 'none';
        return;
    }

    const sliced = filtered.slice(0, currentPage * postsPerPage);
    const fragment = document.createDocumentFragment();
    sliced.forEach(item => {
        const card = document.createElement('article');
        card.className = "glass-panel post-card";
        card.setAttribute('data-article', item.Article);
        card.addEventListener('mouseenter', () => prefetchPost(item.Article));
        const bannerImg = item.Img || '/src/Log_404.png';
        const catHtml = (item.Cat || []).map(c => `<span class="badge-cat">${c}</span>`).join('');
        const tagHtml = (item.Tags || []).map(t => `<button class="tag-btn" onclick="clickFilter('tg', '${t}', event)">#${t}</button>`).join('');
        let metadataTimeStr = item.Date || 'Classified Date';
        if (postCache.has(item.Article)) {
            const cachedData = postCache.get(item.Article);
            const words = (cachedData.Data || "").trim().split(/\s+/).length;
            const readTime = Math.max(1, Math.round(words / 200));
            metadataTimeStr += ` • ${readTime} min read`;
        }

        card.innerHTML = `
        <div class="card-img-wrap" onclick="openPost('${item.Article}')">
            <img src="${bannerImg}" alt="${item.Name}" loading="lazy" onerror="this.src='/src/Log_404.png'">
            <div class="card-badges">${catHtml}</div>
        </div>
        <div class="card-body">
            <div class="card-meta">
                <span>${metadataTimeStr}</span>
                <span class="card-author" onclick="clickFilter('author', '${item.Author}', event)">@${item.Author || 'Unknown'}</span>
            </div>
            <h2 class="card-title" onclick="openPost('${item.Article}')">${item.Name}</h2>
            <p class="card-desc">${item.Desc || ''}</p>
            <div class="card-tags">${tagHtml}</div>
        </div>`;
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    const loadMoreContainer = document.getElementById('load-more-container');
    if (filtered.length > sliced.length) {
        loadMoreContainer.style.display = 'flex';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

function loadNextPage() {
    currentPage++;
    renderPostList();
}

function toggleCategoryFilter(cat) {
    const idx = activeFilters.ct.indexOf(cat);
    if (idx > -1) activeFilters.ct.splice(idx, 1);
    else activeFilters.ct.push(cat);
    currentPage = 1;
    updateUrlState();
}

function clickFilter(type, value, event) {
    if (event) event.stopPropagation();
    activeFilters[type] = value;
    activeFilters.bm = false;
    currentPage = 1;
    updateUrlState();
}

function clearFiltersAndHome() {
    activeFilters = { ct: [], tg: null, q: "", author: null, srt: null, bm: false };
    currentPage = 1;
    const searchWrapper = document.getElementById('search-wrapper');
    if (searchWrapper) searchWrapper.classList.remove('expanded');
    const sortWrapper = document.getElementById('sort-wrapper');
    if (sortWrapper) sortWrapper.classList.remove('expanded');
    window.history.pushState({}, '', new URL(window.location.pathname, window.location.origin));
    processUrlParamsAndRoute();
}

function toggleSort() {
    const wrapper = document.getElementById('sort-wrapper');
    if (wrapper) wrapper.classList.toggle('expanded');
}

function clearSort() {
    activeFilters.srt = null;
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.selectedIndex = 0;
    const wrapper = document.getElementById('sort-wrapper');
    if (wrapper) wrapper.classList.remove('expanded');
    currentPage = 1;
    updateUrlState();
}

function toggleSearch() {
    const wrapper = document.getElementById('search-wrapper');
    const input = document.getElementById('search-bar');
    if (!wrapper.classList.contains('expanded')) {
        wrapper.classList.add('expanded');
        input.focus();
    } else if (input.value.trim() === '') {
        wrapper.classList.remove('expanded');
    }
}

function closeSearchIfEmpty() {
    const wrapper = document.getElementById('search-wrapper');
    const input = document.getElementById('search-bar');
    if (input.value.trim() === '') wrapper.classList.remove('expanded');
}

function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    const searchBar = document.getElementById('search-bar');
    if (!searchBar) return;
    searchDebounceTimer = setTimeout(() => {
        activeFilters.q = searchBar.value;
        currentPage = 1;
        updateUrlState();
    }, 300);
}

function clearSearch() {
    const searchInput = document.getElementById('search-bar');
    if (searchInput) searchInput.value = '';
    activeFilters.q = "";
    const searchWrapper = document.getElementById('search-wrapper');
    if (searchWrapper) searchWrapper.classList.remove('expanded');
    currentPage = 1;
    updateUrlState();
}

function toggleMobileCategories() {
    if (window.innerWidth < 900) {
        document.getElementById('category-filter-list').classList.toggle('show');
        document.getElementById('sidebar-header').classList.toggle('open');
    }
}

function openPost(articleId) {
    const url = new URL(window.location);
    url.searchParams.set('log', articleId);
    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitReaderView() {
    const url = new URL(window.location);
    url.searchParams.delete('log');
    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
}

function generateTableOfContents() {
    const tocContainer = document.getElementById('reader-toc-container');
    const tocList = document.getElementById('reader-toc');
    if (!tocContainer || !tocList) return;
    tocList.innerHTML = '';
    const bodyContainer = document.getElementById('full-body');
    const headings = bodyContainer.querySelectorAll('h2, h3');
    if (headings.length === 0) {
        tocContainer.style.display = 'none';
        return;
    }

    tocContainer.style.display = 'block';
    const ul = document.createElement('ul');
    ul.className = 'toc-list';
    headings.forEach((heading, index) => {
        if (!heading.id) {
            const rawText = heading.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '');
            heading.id = `${index}_${rawText}`;
        }
        const anchor = document.createElement('a');
        anchor.href = `#${heading.id}`;
        anchor.className = `toc-link ${heading.tagName.toLowerCase() === 'h3' ? 'toc-depth-3' : ''}`;
        anchor.innerText = heading.innerText;
        anchor.onclick = (e) => {
            e.preventDefault();
            const headerOffset = 90;
            const elementPosition = heading.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        };
        const li = document.createElement('li');
        li.appendChild(anchor);
        ul.appendChild(li);
    });
    tocList.appendChild(ul);
}

function toggleToC() {
    const toc = document.getElementById('reader-toc');
    const icon = document.getElementById('toc-toggle-icon');
    if (!toc) return;
    if (toc.style.maxHeight === '0px' || !toc.style.maxHeight) {
        toc.style.maxHeight = toc.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        toc.style.maxHeight = '0px';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

function handleScrollProgress() {
    const progress = document.getElementById('scroll-progress');
    if (!progress) return;
    const readerPane = document.getElementById('main-reader-pane');
    if (!readerPane || !readerPane.classList.contains('active')) {
        progress.style.width = '0%';
        return;
    }

    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    progress.style.width = scrolled + '%';
}

function shareCurrentPost() {
    if (!currentArticleId) return;
    const dbEntry = indexData.find(item => item.Article === currentArticleId);
    const shareTitle = dbEntry ? dbEntry.Name : "MainRoute Core Clog";
    const shareUrl = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            url: shareUrl
        }).catch(() => { });
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            const btn = document.querySelector('#full-meta-block button[onclick="shareCurrentPost()"]');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = `<svg class="icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Copied!</span>`;
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            }
        });
    }
}

async function loadAndRenderFullPost(logId) {
    document.getElementById('main-layout-wrapper').style.display = 'none';
    document.getElementById('main-reader-pane').classList.add('active');
    currentArticleId = logId;
    if (logId === '404') {
        render404Page();
        return;
    }
    const dbEntry = indexData.find(item => item.Article === logId);
    if (!dbEntry) {
        trigger404Redirect();
        return;
    }
    updateBookmarkButtonUI(logId);
    let postData = null;
    if (postCache.has(logId)) {
        postData = postCache.get(logId);
    } else {
        const basePath = Logs_Path.endsWith('/') ? Logs_Path : Logs_Path + '/';
        const postUrl = basePath + dbEntry.Url;
        try {
            const response = await fetch(postUrl);
            if (!response.ok) throw new Error("Log not found.");
            postData = await response.json();
            postCache.set(logId, postData);
        } catch (err) {
            trigger404Redirect();
            return;
        }
    }
    const banner = document.getElementById('full-img');
    const imgSrc = postData.Img || dbEntry.Img;
    if (imgSrc) { banner.src = imgSrc; banner.style.display = 'block'; }
    else { banner.style.display = 'none'; }
    document.getElementById('full-title').innerText = postData.Title || dbEntry.Name;
    document.getElementById('full-date').innerText = postData.Date || dbEntry.Date || 'Classified';
    document.getElementById('full-author').innerText = `@${postData.Author}` || `@${dbEntry.Author}` || "Unknown";
    document.getElementById('full-author').onclick = () => { clickFilter('author', postData.Author || dbEntry.Author); exitReaderView(); };
    document.getElementById('full-meta-block').style.display = 'block';
    const words = (postData.Data || "").trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.round(words / 200));
    document.getElementById('full-reading-time').innerText = `${readTime} min read`;
    const catBadges = (postData.Categories || dbEntry.Cat || []).map(c => `<span class="badge-cat" style="position:static;">${c}</span>`).join('');
    const tagBadges = (postData.Tags || dbEntry.Tags || []).map(t => `<button class="tag-btn" onclick="clickFilter('tg', '${t}'); exitReaderView();">#${t}</button>`).join('');
    document.getElementById('full-tags').innerHTML = `<div class="flex flex-wrap gap-1">${catBadges}</div><div class="flex flex-wrap gap-1">${tagBadges}</div>`;
    const bodyContainer = document.getElementById('full-body');
    if (window.marked) bodyContainer.innerHTML = marked.parse(postData.Data || "");
    else bodyContainer.innerHTML = `<p class="txt-mrc">Parsing Engine Offline.</p><pre>${postData.Data}</pre>`;
    generateTableOfContents();
    handleScrollProgress();
}

function trigger404Redirect() {
    const url = new URL(window.location);
    url.searchParams.set('log', '404');
    window.history.pushState({}, '', url);
    render404Page();
}

async function render404Page() {
    document.getElementById('full-img').style.display = 'none';
    document.getElementById('full-meta-block').style.display = 'none';
    const bodyContainer = document.getElementById('full-body');
    bodyContainer.innerHTML = `
        <div class="reader-404">
            <div class="error font-black txt-mrc flex items-center justify-center">
                <span>5</span>
                <span>2</span>
                <img class="trytryagain" src="/src/144.png" alt="Not Found">
            </div>
            <h3 class="txt-main font-bold" style="font-size: 2rem;">Couldn't Initialize Log..</h3>
            <p class="txt-muted" style="margin: 1rem 0 2rem;">The requested log packet does not exist/load in the MainRoute Core Clog index.</p>
            <button style="pointer-events: auto;" class="btn btn-prim" onclick="clearFiltersAndHome()">Return to Index</button>
        </div>`;
}

initializeClogReader();