// 导入依赖模块
import { Auth } from './auth.js';
import { BuildInfo } from './components/build-info.js';
import { TestTrigger } from './components/test-trigger.js';
import { Settings } from './components/settings.js';

// 主应用逻辑
class CRATApp {
    constructor() {
        this.currentTab = 'core';
        this.currentSidebar = 'buildInfo';
        this.isAdmin = localStorage.getItem('crat_is_admin') === 'true';
        this.userEmail = localStorage.getItem('crat_user_email');
        
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
        
        // 初始化事件监听器
        this.initEventListeners();
        
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
    }

    initEventListeners() {
        // 标签页切换
        document.getElementById('coreTab').addEventListener('click', () => this.switchTab('core'));
        document.getElementById('settingTab').addEventListener('click', () => this.switchTab('setting'));

        // 侧边栏导航
        document.getElementById('buildInfoBtn').addEventListener('click', () => this.switchSidebar('buildInfo'));
        document.getElementById('triggerTestBtn').addEventListener('click', () => this.switchSidebar('triggerTest'));
        document.getElementById('systemSettingBtn').addEventListener('click', () => this.switchSidebar('systemSetting'));
        document.getElementById('smtpSettingBtn').addEventListener('click', () => this.switchSidebar('smtpSetting'));

        // 登出按钮
        document.getElementById('logoutButton').addEventListener('click', () => Auth.logout());

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
            this.switchSidebar('buildInfo');
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
            case 'buildInfo':
                document.getElementById('buildInfoBtn').classList.add('sidebar-active');
                document.getElementById('buildInfoBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('buildInfoContent').classList.remove('hidden');
                break;
            case 'triggerTest':
                document.getElementById('triggerTestBtn').classList.add('sidebar-active');
                document.getElementById('triggerTestBtn').classList.remove('text-gray-600', 'hover:bg-gray-50');
                document.getElementById('triggerTestContent').classList.remove('hidden');
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

            // 添加到jobNames数组中
            BuildInfo.jobNames.push(jobName);
            
            jobNameInput.value = '';
            await BuildInfo.loadBuildInfoList();
            this.showSuccess('Job 名称已添加到显示列表');
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
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CRATApp();
});
