import { API } from '../api.js';

// 构建信息组件
class BuildInfo {
    static jobNames = [];
    static buildInfoMap = new Map();

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

        const html = Array.from(this.buildInfoMap.entries()).map(([jobName, builds]) => {
            const buildItems = builds.slice(0, 5).map(build => {
                const buildDate = new Date(build.created_at).toLocaleString('zh-CN');
                const buildPath = this.generateBuildPath(build);
                const downloadPath = this.generateDownloadPath(build);
                
                return `
                    <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400">
                        <div class="text-sm text-gray-600 space-y-1">
                            <div><span class="font-medium">构建日期:</span> ${buildDate}</div>
                            <div><span class="font-medium">构建人:</span> ${build.build_user}</div>
                            <div><span class="font-medium">构建路径:</span> 
                                <a href="${buildPath}" target="_blank" class="text-blue-600 hover:text-blue-800 break-all">
                                    ${this.truncateText(buildPath, 50)}
                                </a>
                            </div>
                            <div><span class="font-medium">包下载:</span> 
                                <a href="${downloadPath}" target="_blank" class="text-green-600 hover:text-green-800 break-all">
                                    ${this.truncateText(downloadPath, 50)}
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            const isExpanded = false; // 默认折叠状态
            const moreBuilds = builds.length > 5 ? `
                <div class="text-center py-2">
                    <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="BuildInfo.loadMoreBuilds('${jobName}')">
                        <i class="fas fa-chevron-down mr-1"></i>查看更多 (${builds.length - 5})
                    </button>
                </div>
            ` : '';

            return `
                <div class="bento-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold text-gray-800 flex items-center">
                            <i class="fas fa-cube mr-3 text-blue-500"></i>
                            ${jobName}
                        </h3>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <span>${builds.length} 个构建</span>
                            <button class="toggle-btn p-1 rounded hover:bg-gray-100" data-job="${jobName}">
                                <i class="fas fa-chevron-down transition-transform duration-200"></i>
                            </button>
                        </div>
                    </div>
                    <div class="build-content space-y-3" data-job="${jobName}" style="display: none;">
                        ${buildItems}
                        ${moreBuilds}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // 添加折叠/展开事件监听器
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jobName = e.currentTarget.dataset.job;
                this.toggleJobBuilds(jobName);
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
        // 从系统设置获取 base URL，这里暂时使用默认值
        const baseUrl = 'http://127.0.0.1:8080/job/';
        return `${baseUrl}${build.job_name}/${build.build_number}`;
    }

    static generateDownloadPath(build) {
        // 从系统设置获取 base URL，这里暂时使用默认值
        const baseUrl = 'http://127.0.0.1/build/';
        return `${baseUrl}${build.package_path}`;
    }

    static truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }
}

export { BuildInfo };
