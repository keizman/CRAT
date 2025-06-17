import { API } from '../api.js';

// 系统设置组件
class Settings {
    static currentSettings = {};

    static async loadSystemSettings() {
        try {
            const response = await API.getSystemSettings();
            this.currentSettings = response.data || {};
            console.log('Loaded system settings:', this.currentSettings); // 调试信息
            this.renderSystemSettings();
        } catch (error) {
            console.error('Failed to load system settings:', error);
        }
    }

    static renderSystemSettings() {
        // 设置表单字段值
        const projectNameInput = document.getElementById('projectName');
        const buildInfoUrlInput = document.getElementById('packageBuildInfoBaseUrl');
        const downloadUrlInput = document.getElementById('packageDownloadBaseUrl');
        const externalTestServerUrlInput = document.getElementById('externalTestServerUrl');

        if (projectNameInput && this.currentSettings.project_name) {
            projectNameInput.value = this.currentSettings.project_name.value || '';
        }

        if (buildInfoUrlInput && this.currentSettings.package_build_info_base_url) {
            buildInfoUrlInput.value = this.currentSettings.package_build_info_base_url.value || '';
        }

        if (downloadUrlInput && this.currentSettings.package_download_base_url) {
            downloadUrlInput.value = this.currentSettings.package_download_base_url.value || '';
        }

        if (externalTestServerUrlInput && this.currentSettings.external_test_server_url) {
            externalTestServerUrlInput.value = this.currentSettings.external_test_server_url.value || '';
        }
    }

    static async updateSystemSettings(settings) {
        try {
            await API.updateSystemSettings(settings);
            
            // 更新本地缓存
            Object.keys(settings).forEach(key => {
                if (!this.currentSettings[key]) {
                    this.currentSettings[key] = {};
                }
                this.currentSettings[key].value = settings[key];
            });

            return true;
        } catch (error) {
            console.error('Failed to update system settings:', error);
            throw error;
        }
    }

    static async getSetting(key) {
        try {
            const response = await API.getSystemSetting(key);
            return response.data;
        } catch (error) {
            console.error(`Failed to get setting ${key}:`, error);
            return null;
        }
    }

    static async updateSetting(key, value, description = '') {
        try {
            const response = await API.updateSystemSetting(key, value, description);
            
            // 更新本地缓存
            if (!this.currentSettings[key]) {
                this.currentSettings[key] = {};
            }
            this.currentSettings[key].value = value;
            if (description) {
                this.currentSettings[key].description = description;
            }

            return response.data;
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
            throw error;
        }
    }

    // 获取设置值的便捷方法
    static getSettingValue(key, defaultValue = '') {
        const value = this.currentSettings[key]?.value || defaultValue;
        console.log(`Getting setting ${key}:`, value); // 调试信息
        return value;
    }

    // 检查设置是否存在
    static hasSetting(key) {
        return this.currentSettings.hasOwnProperty(key);
    }

    // 获取所有设置的键
    static getSettingKeys() {
        return Object.keys(this.currentSettings);
    }

    // 重置设置到默认值
    static async resetToDefaults() {
        if (!confirm('确定要重置所有设置到默认值吗？此操作不可恢复。')) {
            return false;
        }

        const defaultSettings = {
            project_name: 'Autotest Platform',
            package_build_info_base_url: 'http://127.0.0.1:8080/job/',
            package_download_base_url: 'http://127.0.0.1/build/',
            external_test_server_url: 'http://192.168.1.118:59996'
        };

        try {
            await this.updateSystemSettings(defaultSettings);
            this.renderSystemSettings();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // 导出设置
    static exportSettings() {
        const settingsData = {
            exported_at: new Date().toISOString(),
            settings: this.currentSettings
        };

        const dataStr = JSON.stringify(settingsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `crat_settings_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 导入设置
    static async importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.settings) {
                        throw new Error('Invalid settings file format');
                    }

                    const settingsToUpdate = {};
                    Object.keys(data.settings).forEach(key => {
                        settingsToUpdate[key] = data.settings[key].value;
                    });

                    await this.updateSystemSettings(settingsToUpdate);
                    this.renderSystemSettings();
                    
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    // 验证设置值
    static validateSettings(settings) {
        const errors = [];

        // 验证 URL 格式
        const urlFields = ['package_build_info_base_url', 'package_download_base_url', 'external_test_server_url'];
        urlFields.forEach(field => {
            if (settings[field]) {
                try {
                    new URL(settings[field]);
                } catch (e) {
                    errors.push(`${field} 不是有效的 URL 格式`);
                }
            }
        });

        // 验证项目名称
        if (settings.project_name && settings.project_name.trim().length === 0) {
            errors.push('项目名称不能为空');
        }

        return errors;
    }
}

export { Settings };
