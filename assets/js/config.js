// Supabase 配置
const SUPABASE_URL = 'https://vcjodqkpweijbkrofjuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjam9kcWtwd2VpamJrcm9manVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODgyNjYsImV4cCI6MjA4MDQ2NDI2Nn0.GCodvYBkBEoWXw1CDfAnGSkuSxadYTKPijDRZdAVe5g';

// 初始化客户端 (挂载到 window 对象，方便全局调用)
if (window.supabase) {
    window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase connected.");
} else {
    console.error("Supabase JS SDK not loaded! Check your HTML script tags.");
}
