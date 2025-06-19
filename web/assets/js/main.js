// 导入依赖模块
import { Auth } from './auth.js';
import { API } from './api.js';
import { BuildInfo } from './components/build-info.js';
import { TestTrigger } from './components/test-trigger.js';
import { Settings } from './components/settings.js';
import { ParameterSets } from './components/parameter-sets.js';

// 主应用逻辑
class CRATApp {
    constructor() {
        this.currentTab = 'core';
        this.currentSidebar = 'buildInfo';
        this.isAdmin = localStorage.getItem('crat_is_admin') === 'true';
        this.userEmail = localStorage.getItem('crat_user_email');
        
        // 路由映射
        this.routes = {
            '/': { tab: 'core', sidebar: 'buildInfo' },
            '/builds': { tab: 'core', sidebar: 'buildInfo' },
            '/tests': { tab: 'core', sidebar: 'triggerTest' },
            '/parameter-sets': { tab: 'core', sidebar: 'parameterSets' },
            '/settings': { tab: 'setting', sidebar: 'systemSetting' },
            '/settings/smtp': { tab: 'setting', sidebar: 'smtpSetting' }
        };
        
        this.init();
    }

    init() {
        // 检查认证状态
        if (!Auth.checkAuth()) {
            window.location.href = '/login';
            return;
        }

        // 初始化用户界面
        this.initUserInterface();
        
        // 初始化路由
        this.initRouting();
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 根据当前路由设置初始状态
        this.handleRoute();
        
        // 加载初始数据
        this.loadInitialData();
    }

    initUserInterface() {
        // 设置用户信息
        document.getElementById('userEmail').textContent = this.userEmail;
        document.getElementById('userRole').textContent = this.isAdmin ? 'Admin' : 'User';
        
        // 根据用户权限显示/隐藏管理员功能
        const adminElements = document.querySelectorAll('[id*="adminOnly"]');
        adminElements.forEach(el => {
            if (this.isAdmin) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });

        // 将isAdmin状态保存到window.app供其他组件使用
        window.app = window.app || {};
        window.app.isAdmin = this.isAdmin;
        
        // Make TestTrigger available globally for BuildInfo communication
        window.TestTrigger = TestTrigger;
    }

    initRouting() {
        // 监听浏览器前进后退
        window.addEventListener('popstate', () => this.handleRoute());
    }

    handleRoute() {
        const path = window.location.pathname;
        const route = this.routes[path];
        
        if (route) {
            this.currentTab = route.tab;
            this.currentSidebar = route.sidebar;
            this.switchTab(route.tab);
            this.switchSidebar(route.sidebar);
        } else {
            // 默认路由到首页
            this.navigateTo('/builds');
        }
    }

    navigateTo(path) {
        if (window.location.pathname !== path) {
            history.pushState(null, '', path);
        }
        this.handleRoute();
    }

    initEventListeners() {
        // 标签页切换 - 保留路由功能
        document.getElementById('coreTab').addEventListener('click', () => {
            this.switchTab('core');
            // 根据当前侧边栏选择合适的路由
            if (this.currentSidebar === 'triggerTest') {
                this.navigateTo('/tests');
            } else if (this.currentSidebar === 'buildInfo') {
                this.navigateTo('/builds');
            } else if (this.currentSidebar === 'parameterSets') {
                this.navigateTo('/parameter-sets');
            } else {
                // 默认到triggerTest
                this.navigateTo('/tests');
            }
        });
        
        document.getElementById('settingTab').addEventListener('click', () => {
            this.switchTab('setting');
            // Setting标签默认显示系统设置
            this.navigateTo('/settings');
        });

        // 侧边栏导航 - 保留路由功能
        document.getElementById('triggerTestBtn').addEventListener('click', () => {
            this.switchSidebar('triggerTest');
            this.navigateTo('/tests');
        });
        
        document.getElementById('buildInfoBtn').addEventListener('click', () => {
            this.switchSidebar('buildInfo');
            this.navigateTo('/builds');
        });

        document.getElementById('parameterSetsBtn').addEventListener('click', () => {
            this.switchSidebar('parameterSets');
            this.navigateTo('/parameter-sets');
        });
        
        document.getElementById('systemSettingBtn').addEventListener('click', () => {
            this.switchSidebar('systemSetting');
            this.navigateTo('/settings');
        });
        
        document.getElementById('smtpSettingBtn').addEventListener('click', () => {
            this.switchSidebar('smtpSetting');
            this.navigateTo('/settings/smtp');
        });

        // 登出按钮
        document.getElementById('logoutButton').addEventListener('click', () => Auth.logout());

        // 刷新按钮事件
        document.getElementById('refreshBuildInfoBtn').addEventListener('click', () => this.refreshBuildInfo());
        document.getElementById('refreshTriggerTestBtn').addEventListener('click', () => this.refreshTriggerTest());
        document.getElementById('refreshParameterSetsBtn').addEventListener('click', () => this.refreshParameterSets());

        // Build Info 相关事件
        document.getElementById('addJobBtn').addEventListener('click', () => this.addJobName());

        // Test Item 相关事件
        if (this.isAdmin) {
            document.getElementById('addTestBtn').addEventListener('click', () => this.addTestItem());
        }

        // Settings 相关事件
        document.getElementById('systemSettingsForm').addEventListener('submit', (e) => this.saveSystemSettings(e));
    }

    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // 首先加载系统设置
            await Settings.loadSystemSettings();
            
            // 更新平台名称显示
            this.updatePlatformName();
            
            // 然后加载构建信息（需要使用系统设置中的URL）
            await BuildInfo.loadJobNames();
            await BuildInfo.loadBuildInfoList();
            
            // 加载测试项
            await TestTrigger.loadTestItems();
            
            // 加载参数集
            await ParameterSets.loadParameterSets();
            
            // 初始化组件
            ParameterSets.init();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('加载数据失败，请刷新页面重试');
        } finally {
            this.showLoading(false);
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // 更新标签按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
            btn.classList.add('text-gray-600', 'hover:text-gray-900');
        });

        if (tab === 'core') {
            document.getElementById('coreTab').classList.add('bg-white', 'text-gray-900', 'shadow-sm');
            document.getElementById('coreTab').classList.remove('text-gray-600', 'hover:text-gray-900');

            // 显示 Core 侧边栏
            document.getElementById('coreSidebar').classList.remove('hidden');
            document.getElementById('settingSidebar').classList.add('hidden');

            // 默认显示第一个内容
            if (!this.currentSidebar || this.currentSidebar === 'systemSetting' || this.currentSidebar === 'smtpSetting') {
                this.switchSidebar('triggerTest');
            }
        } else if (tab === 'setting') {
            document.getElementById('settingTab').classList.add('bg-white', 'text-gray-900', 'shadow-sm');
            document.getElementById('settingTab').classList.remove('text-gray-600', 'hover:text-gray-900');

            // 显示 Setting 侧边栏
            document.getElementById('coreSidebar').classList.add('hidden');
            document.getElementById('settingSidebar').classList.remove('hidden');

            // 默认显示系统设置
            this.switchSidebar('systemSetting');
        }
    }

    switchSidebar(sidebar) {
        this.currentSidebar = sidebar;
        
        // 更新侧边栏按钮状态
        document.querySelectorAll('.sidebar-item').forEach(btn => {
            btn.classList.remove('sidebar-active');
            btn.classList.add('text-gray-600', 'hover:bg-gray-50');
        });

        // 隐藏所有内容区域
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });

        // 显示对应的内容区域和激活侧边栏按钮
        switch (sidebar) {
            case 'triggerTest':
                document.getElementById('triggerTestBtn').classList.add('sidebar-active');
                document.getElementById('triggerTestBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('triggerTestContent').classList.remove('hidden');
                break;
            case 'buildInfo':
                document.getElementById('buildInfoBtn').classList.add('sidebar-active');
                document.getElementById('buildInfoBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('buildInfoContent').classList.remove('hidden');
                break;
            case 'parameterSets':
                document.getElementById('parameterSetsBtn').classList.add('sidebar-active');
                document.getElementById('parameterSetsBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('parameterSetsContent').classList.remove('hidden');
                break;
            case 'systemSetting':
                document.getElementById('systemSettingBtn').classList.add('sidebar-active');
                document.getElementById('systemSettingBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('systemSettingContent').classList.remove('hidden');
                break;
            case 'smtpSetting':
                document.getElementById('smtpSettingBtn').classList.add('sidebar-active');
                document.getElementById('smtpSettingBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('smtpSettingContent').classList.remove('hidden');
                break;
        }
    }

    async addJobName() {
        const jobNameInput = document.getElementById('newJobName');
        const jobName = jobNameInput.value.trim();
        
        if (!jobName) {
            this.showError('请输入 Job 名称');
            return;
        }

        try {
            // 检查是否已经存在该Job名称
            if (BuildInfo.jobNames.includes(jobName)) {
                this.showError('该 Job 名称已存在');
                return;
            }

            // 调用API添加Job名称
            await API.addJobName(jobName);
            
            jobNameInput.value = '';
            
            // 重新加载Job名称列表和构建信息
            await BuildInfo.loadJobNames();
            await BuildInfo.loadBuildInfoList();
            this.showSuccess('Job 名称已成功添加');
        } catch (error) {
            this.showError('添加失败：' + error.message);
        }
    }

    async addTestItem() {
        const testNameInput = document.getElementById('newTestName');
        const testName = testNameInput.value.trim();
        
        if (!testName) {
            this.showError('请输入测试项名称');
            return;
        }

        try {
            await TestTrigger.createTestItem(testName);
            testNameInput.value = '';
            await TestTrigger.loadTestItems();
            this.showSuccess('测试项已创建');
        } catch (error) {
            this.showError('创建失败：' + error.message);
        }
    }

    async saveSystemSettings(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const settings = {};
            
            for (let [key, value] of formData.entries()) {
                settings[key] = value;
            }

            await Settings.updateSystemSettings(settings);
            
            // 如果项目名称发生改变，更新顶部显示
            if (settings.project_name) {
                this.updatePlatformName();
            }
            
            // 如果URL配置发生改变，重新加载构建信息以使用新的URL
            if (settings.package_build_info_base_url || settings.package_download_base_url) {
                await BuildInfo.loadBuildInfoList();
            }
            
            this.showSuccess('系统设置已保存');
        } catch (error) {
            this.showError('保存失败：' + error.message);
        }
    }

    updatePlatformName() {
        const platformNameElement = document.querySelector('h1.gradient-text');
        if (platformNameElement) {
            const projectName = Settings.getSettingValue('project_name', 'CRAT Platform');
            platformNameElement.textContent = projectName;
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        // 简单的错误提示，可以使用更好的通知组件
        alert('错误: ' + message);
    }

    showSuccess(message) {
        // 简单的成功提示，可以使用更好的通知组件
        alert('成功: ' + message);
        console.log('成功: ' + message);
    }

    // 刷新方法
    async refreshBuildInfo() {
        const button = document.getElementById('refreshBuildInfoBtn');
        const icon = button.querySelector('i');
        
        // 添加旋转动画
        icon.classList.add('fa-spin');
        button.disabled = true;
        
        try {
            await BuildInfo.loadJobNames();
            await BuildInfo.loadBuildInfoList();
            // Remove success hint for refresh button
        } catch (error) {
            console.error('Failed to refresh build info:', error);
            this.showError('刷新构建信息失败: ' + error.message);
        } finally {
            icon.classList.remove('fa-spin');
            button.disabled = false;
        }
    }

    async refreshTriggerTest() {
        const button = document.getElementById('refreshTriggerTestBtn');
        const icon = button.querySelector('i');
        
        // 添加旋转动画
        icon.classList.add('fa-spin');
        button.disabled = true;
        
        try {
            await TestTrigger.loadTestItems();
            // Remove success hint for refresh button
        } catch (error) {
            console.error('Failed to refresh test items:', error);
            this.showError('刷新测试项失败: ' + error.message);
        } finally {
            icon.classList.remove('fa-spin');
            button.disabled = false;
        }
    }

    async refreshParameterSets() {
        const button = document.getElementById('refreshParameterSetsBtn');
        const icon = button.querySelector('i');
        
        // 添加旋转动画
        icon.classList.add('fa-spin');
        button.disabled = true;
        
        try {
            await ParameterSets.loadParameterSets();
            // Remove success hint for refresh button
        } catch (error) {
            console.error('Failed to refresh parameter sets:', error);
            this.showError('刷新参数集失败: ' + error.message);
        } finally {
            icon.classList.remove('fa-spin');
            button.disabled = false;
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CRATApp();
});
