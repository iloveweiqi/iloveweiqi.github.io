// assets/js/config.js

const SUPABASE_URL = 'https://vcjodqkpweijbkrofjuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjam9kcWtwd2VpamJrcm9manVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODgyNjYsImV4cCI6MjA4MDQ2NDI2Nn0.GCodvYBkBEoWXw1CDfAnGSkuSxadYTKPijDRZdAVe5g';

// 初始化并挂载到 window
if (window.supabase) {
    window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase connected.");
}

// 公共：检查登录状态并渲染 Header 的通用函数
// targetId: Header中用于显示用户信息的容器ID
async function renderHeaderAuth(targetId) {
    const container = document.getElementById(targetId);
    if(!container) return;

    // 1. 获取当前 Auth 用户
    const { data: { user } } = await window.sbClient.auth.getUser();

    if (user) {
        // 2. 获取 Profile 中的 username
        let displayName = user.email.split('@')[0]; // 默认
        const { data: profile } = await window.sbClient
            .from('profiles')
            .select('username, is_admin')
            .eq('id', user.id)
            .single();
        
        if (profile && profile.username) {
            displayName = profile.username;
        }

        // 3. 渲染“用户名”和“设置”
        let html = `
            <span style="font-weight:bold; color:#2c3e50; margin-right:10px; font-size:0.9rem;">👤 ${displayName}</span>
            <button class="nav-btn" onclick="location.href='user.html'">设置</button>
        `;
        
        // 如果是管理员，多显示一个后台入口
        if (profile && profile.is_admin) {
            html += `<button class="nav-btn" style="background:#2c3e50; color:#fff; margin-left:5px;" onclick="location.href='admin.html'">后台</button>`;
        }
        
        container.innerHTML = html;
    } else {
        // 4. 未登录
        container.innerHTML = `<button class="nav-btn" onclick="location.href='login.html'">登录 / 注册</button>`;
    }
}
