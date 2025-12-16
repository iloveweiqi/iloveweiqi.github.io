// assets/js/config.js

const SUPABASE_URL = 'https://supabase-sgf.iloveweiqi.workers.dev';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjam9kcWtwd2VpamJrcm9manVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODgyNjYsImV4cCI6MjA4MDQ2NDI2Nn0.GCodvYBkBEoWXw1CDfAnGSkuSxadYTKPijDRZdAVe5g';

if (window.supabase) {
    window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase connected.");
}

// --- 国际化 (i18n) 配置 ---
const translations = {
    zh: {
        site_name: "爱围棋",
        login: "登录 / 注册",
        settings: "设置",
        admin: "后台",
        nav_home: "首页",
        nav_library: "棋谱库",
        
        // 首页 & 库
        hero_title: "🔥 本日推荐",
        latest_title: "📚 最新录入",
        view_all: "查看全部棋谱 >",
        search_placeholder: "搜索棋手、赛事...",
        search_btn: "搜索",
        loading: "加载中...",
        no_data: "暂无数据",
        enter_game: "进入详情 / 猜局 / 试下",
        
        // 详情页
        view_mode: "浏览",
        guess_mode: "猜局",
        try_mode: "试下",
        download_sgf: "📥 下载 SGF",
        add_fav: "⭐ 加入收藏",
        comment_none: "暂无解说...",
        step_label: "手数",
        btn_prev: "上一手",
        btn_next: "下一手",
        
        // 库页面
        total_games: "全部棋谱",
        page_prev: "上一页",
        page_next: "下一页"
    },
    en: {
        site_name: "iWeiQi",
        login: "Login / Sign up",
        settings: "Settings",
        admin: "Admin",
        nav_home: "Home",
        nav_library: "Library",
        
        hero_title: "🔥 Featured Game",
        latest_title: "📚 Latest Games",
        view_all: "View All >",
        search_placeholder: "Search player, event...",
        search_btn: "Search",
        loading: "Loading...",
        no_data: "No Data Found",
        enter_game: "Enter Game",
        
        view_mode: "View",
        guess_mode: "Guess",
        try_mode: "Try",
        download_sgf: "📥 Download SGF",
        add_fav: "⭐ Favorite",
        comment_none: "No comments...",
        step_label: "Step",
        btn_prev: "Prev",
        btn_next: "Next",
        
        total_games: "All Games",
        page_prev: "Prev",
        page_next: "Next"
    }
};

// 获取当前语言 (默认中文)
function getLang() {
    return localStorage.getItem('app_lang') || 'zh';
}

// 获取翻译文本 helper
function t(key) {
    const lang = getLang();
    return translations[lang][key] || key;
}

// 切换语言
function toggleLang() {
    const current = getLang();
    const next = current === 'zh' ? 'en' : 'zh';
    localStorage.setItem('app_lang', next);
    location.reload(); // 简单粗暴，刷新页面应用语言
}

// 应用语言到页面 DOM
function applyLanguage() {
    const lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            // 如果是 input 且有 placeholder
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = translations[lang][key];
            } else {
                el.innerText = translations[lang][key];
            }
        }
    });
    // 更新页面标题
    const siteName = translations[lang]['site_name'];
    if (document.title.includes('爱围棋') || document.title.includes('iWeiQi')) {
        // 简单替换后缀
        // document.title = ... 视具体页面需求
    }
}

// --- Header 渲染 (含语言切换 & 导航) ---
async function renderHeaderAuth(targetId, rootPath = '') {
    const container = document.getElementById(targetId);
    if(!container) return;

    // 1. 语言切换按钮
    const langLabel = getLang() === 'zh' ? 'EN' : '中';
    let html = `<button class="nav-btn" onclick="toggleLang()" style="margin-right:10px; font-weight:bold;">${langLabel}</button>`;

    // 2. Auth 状态
    const { data: { user } } = await window.sbClient.auth.getUser();

    if (user) {
        let displayName = user.email.split('@')[0];
        const { data: profile } = await window.sbClient.from('profiles').select('username, is_admin').eq('id', user.id).single();
        if (profile && profile.username) displayName = profile.username;

        html += `
            <span style="font-weight:bold; color:#2c3e50; margin-right:10px; font-size:0.9rem;">👤 ${displayName}</span>
            <button class="nav-btn" onclick="location.href='${rootPath}user.html'">${t('settings')}</button>
        `;
        if (profile && profile.is_admin) {
            html += `<button class="nav-btn" style="background:#2c3e50; color:#fff; margin-left:5px;" onclick="location.href='${rootPath}admin.html'">${t('admin')}</button>`;
        }
    } else {
        html += `<button class="nav-btn" onclick="location.href='${rootPath}login.html'">${t('login')}</button>`;
    }
    
    container.innerHTML = html;
    
    // 执行一次页面翻译
    applyLanguage();
}
