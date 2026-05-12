
(function () {
    window.addEventListener('load', () => {
        setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 2000);
    });
    document.getElementById('year').textContent = new Date().getFullYear();

    const FALLBACK_FAVICON = "/src/favicon.ico";
    const DEFAULT_COUNTDOWN = 15;
    const ROUTES = {
        mrc: "https://mramzanch.blogspot.com",
        pb: "https://github.com/Pro-Bandey",
        mrd: "https://mainroute-core.github.io/mrd/",
        chatgpt: "https://chatgpt.com/",
        google: "https://www.google.com/",
        yt: "https://www.youtube.com/",
        insta: "https://www.instagram.com/",
        fb: "https://www.facebook.com/",
        wa: "https://wa.me/",
        tele: "https://t.me/",
        linkedin: "https://www.linkedin.com/",
        x: "https://x.com/",
        git: "https://github.com/MainRoute-Core"
    };

    const state = {
        destination: "",
        countdown: DEFAULT_COUNTDOWN,
        paused: false,
        timer: null
    };

    const els = {
        routeTitle: document.getElementById("routeTitle"),
        routeDesc: document.getElementById("routeDesc"),
        domainBox: document.getElementById("domainBox"),
        urlBox: document.getElementById("urlBox"),
        favicon: document.getElementById("siteFavicon"),
        countdownValue: document.getElementById("countdownValue"),
        pauseBtn: document.getElementById("pauseBtn"),
        phishBadge: document.getElementById("phishBadge"),
        phishNotes: document.getElementById("phishNotes"),
        qrBox: document.getElementById("qrBox"),
        openSameBtn: document.getElementById("openSameBtn"),
        openNewBtn: document.getElementById("openNewBtn"),
        shareBtn: document.getElementById("shareBtn"),
        shareOverlay: document.getElementById("shareOverlay"),
        closeShareBtn: document.getElementById("closeShareBtn"),
        sharePreview: document.getElementById("sharePreview"),
        copyShareBtn: document.getElementById("copyShareBtn"),
        statusDot: document.getElementById("statusDot"),
        statusText: document.getElementById("statusText"),
        // Share Links
        fbShare: document.getElementById("fbShare"),
        xShare: document.getElementById("xShare"),
        linkedinShare: document.getElementById("linkedinShare"),
        waShare: document.getElementById("waShare"),
        teleShare: document.getElementById("teleShare"),
        emailShare: document.getElementById("emailShare")
    };
    function normalizeUrl(input) {
        const raw = String(input || "").trim();
        if (!raw) return "";
        try { return new URL(raw).href; } catch (_) {
            try { return new URL("https://" + raw).href; } catch (__) { return ""; }
        }
    }
    function getRouteFromParams() {
        const params = new URLSearchParams(window.location.search);
        const id = (params.get("id") || "").trim();
        const direct = (params.get("url") || "").trim(); // Using url as requested
        if (id && ROUTES[id]) return ROUTES[id];
        if (direct) return normalizeUrl(direct);
        return "";
    }
    function getDomainParts(url) {
        try {
            const host = new URL(url).hostname;
            const parts = host.split(".");
            if (parts.length <= 2) return { host, sub: "", root: host };
            const root = parts.slice(-2).join(".");
            const sub = parts.slice(0, -2).join(".") + ".";
            return { host, sub, root };
        } catch { return { host: "", sub: "", root: "" }; }
    }
    function renderHighlightedDomain(url) {
        const { host, sub, root } = getDomainParts(url);
        if (!host) return "Invalid URL";
        if (!sub) return `<span class="domain-highlight"><span class="rootdomain">${escapeHtml(host)}</span></span>`;
        return `<span class="rootdomain txt-mrc font-bold uppercase">${escapeHtml(root)}</span>`;
    }
    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, match => {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
    function phishingCheck(url) {
        const notes = [];
        let score = 0;
        try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase();
            const full = (u.href).toLowerCase();
            if (u.protocol !== "https:" && host !== "localhost") { score += 2; notes.push("Not using secure HTTPS protocol."); }
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { score += 3; notes.push("Uses an IP address instead of a domain name."); }
            if (host.includes("xn--")) { score += 2; notes.push("Contains punycode characters (often used in spoofing)."); }
            if ((host.match(/-/g) || []).length >= 3) { score += 1; notes.push("Excessive hyphens in the domain."); }

            const suspiciousWords = ["login", "signin", "verify", "secure", "update", "wallet", "bank", "free", "gift", "unlock"];
            if (suspiciousWords.some(word => full.includes(word))) { score += 1; notes.push("Contains words typical in phishing pages."); }
            if (host.length > 35) { score += 1; notes.push("Domain is unusually long."); }
        } catch {
            score += 4; notes.push("URL could not be safely parsed.");
        }

        if (score >= 4) return { level: "high", label: "High Risk Pattern", class: "badge-high", notes };
        if (score >= 2) return { level: "medium", label: "Needs Review", class: "badge-medium", notes };
        return { level: "low", label: "Looks Safe", class: "badge-low", notes };
    }
    function setPhishUI(result) {
        els.phishBadge.className = `badge ${result.class} items-center txt-sm font-bold gap-1`;
        els.phishBadge.innerHTML = `<svg class="icon" style="width: 14px;"><use href="/src/global.svg#icon-shield"></use></svg> <span>${result.label}</span>`;
        els.phishNotes.innerHTML = result.notes.length ? result.notes.map(n => `• ${escapeHtml(n)}`).join("<br>") : "No strong phishing signals detected by heuristic scan.";
    }
    function setFavicon(url) {
        try {
            const host = new URL(url).hostname;
            els.favicon.onerror = () => { els.favicon.onerror = null; els.favicon.src = FALLBACK_FAVICON; };
            els.favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
        } catch { els.favicon.src = FALLBACK_FAVICON; }
    }
    function renderNativeQR(url) {
        els.qrBox.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=10&data=${encodeURIComponent(url)}&color=f44234&bgcolor=ffffff" oncontextmenu="event.stopImmediatePropagation();" ondragstart="event.stopImmediatePropagation();" onclick="window.open(this.src, '_blank');" alt="QR Code" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'text-muted\\'>QR Unavailable</span>'">`;
    }
    function updateShareLinks(url) {
        const encoded = encodeURIComponent(url);
        const title = encodeURIComponent("Redirecting via MainRoute Core");
        const body = encodeURIComponent(`Open this secure link: ${url}`);

        els.sharePreview.textContent = url;
        els.fbShare.href = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
        els.xShare.href = `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent("Open this link")}`;
        els.linkedinShare.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
        els.waShare.href = `https://wa.me/?text=${body}`;
        els.teleShare.href = `https://t.me/share/url?url=${encoded}&text=${encodeURIComponent("Open this link")}`;
        els.emailShare.href = `mailto:?subject=${title}&body=${body}`;
    }

    function safeOpen(url, newTab) {
        if (!url) return;
        if (newTab) window.open(url, "_blank", "noopener,noreferrer");
        else location.href = url;
    }
    function renderPage(url) {
        state.destination = url;
        if (!url) {
            els.routeTitle.innerHTML = `Route Not Found <span class="blinking f">&bull;</span>`;
            els.routeTitle.style.color = "var(--mrc) !important"
            els.routeDesc.textContent = "No valid destination. Missing ?id= or ?url= parameters.";
            els.domainBox.textContent = "N/A";
            els.urlBox.textContent = "Invalid or missing route";
            els.statusDot.style.background = "#f87171";
            els.statusDot.style.boxShadow = "0 0 10px #f87171";
            els.statusText.textContent = "Gateway Error";
            setPhishUI({ level: "high", label: "Invalid Route", class: "badge-high", notes: ["Cannot parse destination parameters."] });
            els.countdownValue.textContent = "0";
            els.pauseBtn.disabled = true; els.openSameBtn.disabled = true; els.openNewBtn.disabled = true; els.shareBtn.disabled = true;
            return;
        }
        const parsed = new URL(url);
        els.domainBox.innerHTML = renderHighlightedDomain(url);
        els.urlBox.textContent = url;
        document.title = `Redirecting to ${parsed.hostname} | MRC Gateway`;
        setFavicon(url);
        setPhishUI(phishingCheck(url));
        renderNativeQR(url);
        updateShareLinks(url);
        history.replaceState({}, "", `${window.location.pathname}?url=${encodeURIComponent(url)}`);
        state.countdown = DEFAULT_COUNTDOWN;
        state.paused = false;
        els.countdownValue.textContent = state.countdown;

        clearInterval(state.timer);
        state.timer = setInterval(() => {
            if (state.paused) return;
            state.countdown -= 1;
            els.countdownValue.textContent = state.countdown;

            if (state.countdown <= 0) {
                clearInterval(state.timer);
                safeOpen(state.destination, false);
            }
        }, 1000);
    }
    els.pauseBtn.addEventListener("click", () => {
        state.paused = !state.paused;
        els.pauseBtn.innerHTML = state.paused ? `<svg class="icon"><use href="/src/global.svg#icon-play"></use></svg>` : `<svg class="icon"><use href="/src/global.svg#icon-pause"></use></svg>`;
        els.pauseBtn.classList.toggle("btn-primary", state.paused);
        els.pauseBtn.classList.toggle("btn-outline", !state.paused);
    });
    els.openSameBtn.addEventListener("click", () => safeOpen(state.destination, false));
    els.openNewBtn.addEventListener("click", () => safeOpen(state.destination, true));
    els.shareBtn.addEventListener("click", () => els.shareOverlay.classList.add('active'));
    els.closeShareBtn.addEventListener("click", () => els.shareOverlay.classList.remove('active'));
    els.shareOverlay.addEventListener("click", (e) => { if (e.target === els.shareOverlay) els.shareOverlay.classList.remove('active'); });
    els.copyShareBtn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(state.destination); els.copyShareBtn.innerText = `Copied!`;
            setTimeout(() => els.copyShareBtn.innerHTML = `<svg class="icon" style="width: 2rem; heght:2rem;"><use href="/src/global.svg#icon-copy"></use></svg>`, 1500);
        } catch { }
    });
    renderPage(getRouteFromParams());
})();