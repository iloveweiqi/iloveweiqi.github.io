const SUPABASE_URL = 'https://vcjodqkpweijbkrofjuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjam9kcWtwd2VpamJrcm9manVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODgyNjYsImV4cCI6MjA4MDQ2NDI2Nn0.GCodvYBkBEoWXw1CDfAnGSkuSxadYTKPijDRZdAVe5g';

if (window.supabase) {
    window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase connected.");
}

// 渲染 Header 用户状态 (支持相对路径跳转)
// rootPath: 如果是在 game/ 目录下，传 '../'，否则传 ''
async function renderHeaderAuth(targetId, rootPath = '') {
    const container = document.getElementById(targetId);
    if(!container) return;

    const { data: { user } } = await window.sbClient.auth.getUser();

    if (user) {
        let displayName = user.email.split('@')[0];
        const { data: profile } = await window.sbClient.from('profiles').select('username, is_admin').eq('id', user.id).single();
        if (profile && profile.username) displayName = profile.username;

        let html = `
            <span style="font-weight:bold; color:#2c3e50; margin-right:10px; font-size:0.9rem;">👤 ${displayName}</span>
            <button class="nav-btn" onclick="location.href='${rootPath}user.html'">设置</button>
        `;
        if (profile && profile.is_admin) {
            html += `<button class="nav-btn" style="background:#2c3e50; color:#fff; margin-left:5px;" onclick="location.href='${rootPath}admin.html'">后台</button>`;
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = `<button class="nav-btn" onclick="location.href='${rootPath}login.html'">登录 / 注册</button>`;
    }
}
