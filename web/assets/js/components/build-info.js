import { API } from '../api.js';
import { Settings } from './settings.js';

// 构建信息组件
class BuildInfo {
    static jobNames = [];
    static buildInfoMap = new Map();
    static selectedVersion = null; // Global selected version
    static lastSyncTime = null; // Last sync time for 24h sync logic

    static async loadJobNames() {
        try {
            const response = await API.getJobNames();
            this.jobNames = response.data || [];
        } catch (error) {
            console.error('Failed to load job names:', error);
            this.jobNames = [];
        }
    }

    static async loadBuildInfoList() {
        try {
            const container = document.getElementById('buildInfoList');
            container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';

            // 如果没有Job名称，直接渲染空状态
            if (!this.jobNames || this.jobNames.length === 0) {
                this.buildInfoMap.clear();
                this.renderBuildInfoList();
                return;
            }

            // 为每个已知的 Job 名称加载构建信息
            const buildInfoPromises = this.jobNames.map(async (jobName) => {
                try {
                    const response = await API.getBuildsByJobName(jobName);
                    return {
                        jobName,
                        builds: response.data || []
                    };
                } catch (error) {
                    console.error(`Failed to load builds for ${jobName}:`, error);
                    return {
                        jobName,
                        builds: []
                    };
                }
            });

            const results = await Promise.all(buildInfoPromises);
            
            // 存储到 map 中
            this.buildInfoMap.clear();
            results.forEach(result => {
                this.buildInfoMap.set(result.jobName, result.builds);
            });

            this.renderBuildInfoList();

            // Initialize selected version with latest build if needed
            this.initializeSelectedVersion();
        } catch (error) {
            console.error('Failed to load build info list:', error);
            const container = document.getElementById('buildInfoList');
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i>
                    <p class="text-gray-600">加载构建信息失败</p>
                </div>
            `;
        }
    }

    static initializeSelectedVersion() {
        // Check if we need to sync (24h logic)
        const now = Date.now();
        const lastSync = localStorage.getItem('crat_last_version_sync');
        const shouldSync = !lastSync || (now - parseInt(lastSync)) > 24 * 60 * 60 * 1000;

        if (shouldSync || !this.selectedVersion) {
            // Find the latest build across all jobs ordered by create_time
            let latestBuild = null;
            let latestTime = 0;

            for (const [jobName, builds] of this.buildInfoMap) {
                if (builds.length > 0) {
                    const buildTime = new Date(builds[0].created_at).getTime();
                    if (buildTime > latestTime) {
                        latestTime = buildTime;
                        latestBuild = builds[0];
                    }
                }
            }

            if (latestBuild && shouldSync) {
                this.selectedVersion = latestBuild;
                localStorage.setItem('crat_selected_version', JSON.stringify(latestBuild));
                localStorage.setItem('crat_last_version_sync', now.toString());
                console.log('Auto-selected latest build:', latestBuild.job_name, '#' + latestBuild.build_number);

                // Notify test trigger component about the global version change
                if (window.TestTrigger) {
                    window.TestTrigger.onGlobalVersionChanged(latestBuild);
                }
            } else if (!this.selectedVersion) {
                // Load from localStorage if available
                const stored = localStorage.getItem('crat_selected_version');
                if (stored) {
                    try {
                        this.selectedVersion = JSON.parse(stored);
                        // Notify test trigger component
                        if (window.TestTrigger) {
                            window.TestTrigger.onGlobalVersionChanged(this.selectedVersion);
                        }
                    } catch (e) {
                        this.selectedVersion = latestBuild;
                        if (latestBuild && window.TestTrigger) {
                            window.TestTrigger.onGlobalVersionChanged(latestBuild);
                        }
                    }
                } else {
                    this.selectedVersion = latestBuild;
                    if (latestBuild && window.TestTrigger) {
                        window.TestTrigger.onGlobalVersionChanged(latestBuild);
                    }
                }
            }
        } else {
            // Load from localStorage
            const stored = localStorage.getItem('crat_selected_version');
            if (stored) {
                try {
                    this.selectedVersion = JSON.parse(stored);
                    // Notify test trigger component
                    if (window.TestTrigger) {
                        window.TestTrigger.onGlobalVersionChanged(this.selectedVersion);
                    }
                } catch (e) {
                    console.error('Failed to parse stored version:', e);
                }
            }
        }
    }

    static selectVersion(build) {
        this.selectedVersion = build;
        localStorage.setItem('crat_selected_version', JSON.stringify(build));

        // Update UI to reflect selection
        this.updateSelectionDisplay();

        // Notify test trigger component about the version change
        if (window.TestTrigger) {
            window.TestTrigger.onGlobalVersionChanged(build);
        }

        // Show success message
        if (window.app && window.app.showSuccess) {
            window.app.showSuccess(`已选择版本: ${build.job_name} #${build.build_number}`);
        } else {
            alert(`已选择版本: ${build.job_name} #${build.build_number}`);
        }
    }

    static updateSelectionDisplay() {
        // Update selection indicators on all build cards
        document.querySelectorAll('.select-version-btn').forEach(btn => {
            const buildId = parseInt(btn.dataset.buildId);
            if (this.selectedVersion && buildId === this.selectedVersion.id) {
                btn.innerHTML = '<i class="fas fa-check mr-1"></i>已选择';
                btn.className = btn.className.replace('bg-blue-500 hover:bg-blue-600', 'bg-green-500 hover:bg-green-600');
            } else {
                btn.innerHTML = '<i class="fas fa-mouse-pointer mr-1"></i>选择版本';
                btn.className = btn.className.replace('bg-green-500 hover:bg-green-600', 'bg-blue-500 hover:bg-blue-600');
            }
        });
    }

    static renderBuildInfoList() {
        const container = document.getElementById('buildInfoList');
        
        if (this.buildInfoMap.size === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-cube text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-600 mb-2">暂无构建信息</h3>
                    <p class="text-gray-500">请先添加 Job 名称或等待 Jenkins 推送构建数据</p>
                </div>
            `;
            return;
        }

        const jobEntries = Array.from(this.buildInfoMap.entries());
        
        // 创建两列布局的HTML
        let html = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
        
        jobEntries.forEach(([jobName, builds]) => {
            const buildItems = builds.slice(0, 5).map(build => {
                const buildDate = new Date(build.created_at).toLocaleString('zh-CN');
                const buildPath = this.generateBuildPath(build);
                const downloadPath = this.generateDownloadPath(build);
                
                const isSelected = this.selectedVersion && this.selectedVersion.id === build.id;
                
                return `
                    <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400 relative">
                        <div class="space-y-3">
                            <!-- 版本选择按钮和基本信息行 -->
                            <div class="flex items-start justify-between">
                                <div class="flex flex-wrap gap-2">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        <i class="fas fa-calendar-alt mr-1"></i>
                                        ${buildDate}
                                    </span>
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <i class="fas fa-user mr-1"></i>
                                        ${build.build_user}
                                    </span>
                                </div>
                                <button class="select-version-btn px-3 py-1 text-xs font-medium text-white rounded-lg transition-all duration-200 ${isSelected ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}" 
                                        data-build-id="${build.id}"
                                        data-build-data='${JSON.stringify(build).replace(/'/g, "&#39;")}'>
                                    <i class="fas ${isSelected ? 'fa-check' : 'fa-mouse-pointer'} mr-1"></i>${isSelected ? '已选择' : '选择版本'}
                                </button>
                            </div>
                            
                            <!-- 链接信息块 -->
                            <div class="space-y-2">
                                <div class="bg-white rounded-md p-3 border border-gray-200">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">构建路径</span>
                                        <a href="${buildPath}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                                            <i class="fas fa-external-link-alt mr-1"></i>查看构建
                                        </a>
                                    </div>
                                    <div class="mt-1 text-sm text-gray-700 break-all">${buildPath}</div>
                                </div>
                                
                                <div class="bg-white rounded-md p-3 border border-gray-200">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">包下载</span>
                                        <a href="${downloadPath}" target="_blank" class="text-green-600 hover:text-green-800 text-sm">
                                            <i class="fas fa-download mr-1"></i>下载包
                                        </a>
                                    </div>
                                    <div class="mt-1 text-sm text-gray-700 break-all">${downloadPath}</div>
                                </div>
                            </div>
                            
                            <!-- 管理员操作按钮 -->
                            ${window.app && window.app.isAdmin ? `
                                <div class="flex justify-end mt-3 pt-3 border-t border-gray-200">
                                    <button 
                                        class="delete-build-btn inline-flex items-center px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                                        data-build-id="${build.id}"
                                        data-job-name="${build.job_name}"
                                        data-build-number="${build.build_number}"
                                        title="删除构建信息 ${build.job_name} #${build.build_number}"
                                    >
                                        <i class="fas fa-trash mr-1"></i>删除
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            const isExpanded = true; // 默认展开状态
            const moreBuilds = builds.length > 5 ? `
                <div class="text-center py-2">
                    <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="BuildInfo.loadMoreBuilds('${jobName}')">
                        <i class="fas fa-chevron-down mr-1"></i>查看更多 (${builds.length - 5})
                    </button>
                </div>
            ` : '';

            html += `
                <div class="bento-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold text-gray-800 flex items-center">
                            <i class="fas fa-cube mr-3 text-blue-500"></i>
                            ${jobName}
                        </h3>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <span>${builds.length} 个构建</span>
                            ${window.app && window.app.isAdmin ? `
                                <button class="delete-job-btn p-1 rounded hover:bg-red-50 text-red-500" data-job="${jobName}" title="删除Job: ${jobName}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                            <button class="toggle-btn p-1 rounded hover:bg-gray-100" data-job="${jobName}">
                                <i class="fas fa-chevron-down transition-transform duration-200" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
                            </button>
                        </div>
                    </div>
                    <div class="build-content space-y-3" data-job="${jobName}" style="display: ${isExpanded ? 'block' : 'none'};">
                        ${buildItems}
                        ${moreBuilds}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;

        // 添加折叠/展开事件监听器
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jobName = e.currentTarget.dataset.job;
                this.toggleJobBuilds(jobName);
            });
        });

        // 添加删除按钮事件监听器
        container.querySelectorAll('.delete-build-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const buildId = parseInt(e.currentTarget.dataset.buildId);
                const jobName = e.currentTarget.dataset.jobName;
                const buildNumber = parseInt(e.currentTarget.dataset.buildNumber);
                this.deleteBuildInfo(buildId, jobName, buildNumber);
            });
        });

        // 添加删除Job按钮事件监听器
        container.querySelectorAll('.delete-job-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const jobName = e.currentTarget.dataset.job;
                this.deleteJobName(jobName);
            });
        });

        // 添加版本选择按钮事件监听器
        container.querySelectorAll('.select-version-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    const buildData = JSON.parse(e.currentTarget.dataset.buildData.replace(/&#39;/g, "'"));
                    this.selectVersion(buildData);
                } catch (error) {
                    console.error('Failed to parse build data:', error);
                }
            });
        });
    }

    static toggleJobBuilds(jobName) {
        const content = document.querySelector(`.build-content[data-job="${jobName}"]`);
        const toggleIcon = document.querySelector(`.toggle-btn[data-job="${jobName}"] i`);
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    }

    static async loadMoreBuilds(jobName) {
        // 这里可以实现分页加载更多构建信息
        console.log('Loading more builds for:', jobName);
    }

    static generateBuildPath(build) {
        // 从系统设置获取 base URL
        const baseUrl = Settings.getSettingValue('package_build_info_base_url', 'http://127.0.0.1:8080/job/');
        console.log('Build path base URL:', baseUrl); // 调试信息
        return `${baseUrl}${build.job_name}/${build.build_number}`;
    }

    static generateDownloadPath(build) {
        // 从系统设置获取 base URL
        const baseUrl = Settings.getSettingValue('package_download_base_url', 'http://127.0.0.1/build/');
        console.log('Download path base URL:', baseUrl); // 调试信息
        return `${baseUrl}${build.package_path}`;
    }

    static truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    static async deleteBuildInfo(buildId, jobName = '', buildNumber = '') {
        // 增强的确认对话框
        const buildDisplayName = jobName && buildNumber ? `${jobName} #${buildNumber}` : `ID: ${buildId}`;
        const confirmMessage = `确定要删除构建信息 ${buildDisplayName} 吗？\n\n此操作将会：\n- 从数据库彻底删除此构建记录\n- 删除相关的部署测试运行记录\n- 此操作不可恢复\n\n请确认是否继续？`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            console.log(`正在删除构建信息 ${buildDisplayName} (ID: ${buildId})...`);
            
            // 调用API删除构建信息
            const response = await API.deleteBuildInfo(buildId);
            console.log('删除API响应:', response);
            
            // 重新加载构建信息列表
            await this.loadBuildInfoList();
            
            // 显示成功消息
            const successMessage = `构建信息 ${buildDisplayName} 已成功删除`;
            if (window.app) {
                window.app.showSuccess(successMessage);
            } else {
                alert(`成功: ${successMessage}`);
            }
        } catch (error) {
            console.error('Failed to delete build info:', error);
            const errorMessage = error.message || '未知错误';
            
            const failureMessage = `删除构建信息 ${buildDisplayName} 失败：${errorMessage}`;
            if (window.app) {
                window.app.showError(failureMessage);
            } else {
                alert(`错误: ${failureMessage}`);
            }
        }
    }

    static async deleteJobName(jobName) {
        const confirmMessage = `确定要删除Job名称 "${jobName}" 吗？\n\n此操作将会：\n- 从系统中删除此Job名称配置\n- 删除与此Job相关的所有构建信息\n- 删除相关的部署测试运行记录\n- 此操作不可恢复\n\n请确认是否继续？`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            console.log(`正在删除Job名称: ${jobName}...`);
            
            // 调用API删除Job名称
            const response = await API.deleteJobName(jobName);
            console.log('删除Job API响应:', response);
            
            // 重新加载Job名称和构建信息列表
            await this.loadJobNames();
            await this.loadBuildInfoList();
            
            // 显示成功消息
            const successMessage = `Job名称 "${jobName}" 及其相关构建信息已成功删除`;
            if (window.app) {
                window.app.showSuccess(successMessage);
            } else {
                alert(`成功: ${successMessage}`);
            }
        } catch (error) {
            console.error('Failed to delete job name:', error);
            const errorMessage = error.message || '未知错误';
            
            const failureMessage = `删除Job名称 "${jobName}" 失败：${errorMessage}`;
            if (window.app) {
                window.app.showError(failureMessage);
            } else {
                alert(`错误: ${failureMessage}`);
            }
        }
    }
}

export { BuildInfo };
