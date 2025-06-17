// 导入API模块
import { API } from './api.js';

// 认证相关功能
export class Auth {
    static checkAuth() {
        const token = localStorage.getItem('crat_token');
        return !!token;
    }

    static async logout() {
        try {
            const token = localStorage.getItem('crat_token');
            if (token) {
                await API.post('/auth/logout', {});
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // 清除本地存储
            localStorage.removeItem('crat_token');
            localStorage.removeItem('crat_user_email');
            localStorage.removeItem('crat_is_admin');
            
            // 跳转到登录页
            window.location.href = '/login';
        }
    }

    static async refreshToken() {
        try {
            const response = await API.post('/auth/refresh', {});
            if (response.token) {
                localStorage.setItem('crat_token', response.token);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    static async getCurrentUser() {
        try {
            return await API.get('/auth/me');
        } catch (error) {
            console.error('Get current user failed:', error);
            return null;
        }
    }
}
