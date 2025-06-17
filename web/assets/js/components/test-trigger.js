import { API } from '../api.js';

// 测试触发组件
class TestTrigger {
    static testItems = [];
    static expandedItems = new Set();

    static async loadTestItems() {
        try {
            const response = await API.getTestItems();
            this.testItems = response.data || [];
            this.renderTestItems();
        } catch (error) {
            console.error('Failed to load test items:', error);
            this.renderError('加载测试项失败');
        }
    }

    static async createTestItem(name) {
        const testItem = {
            name: name,
            description: `${name} 自动化测试`,
            associated_job_name: '',
            notification_enabled: true
        };

        await API.createTestItem(testItem);
    }

    static renderTestItems() {
        const container = document.getElementById('testItemList');
        
        if (this.testItems.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-play-circle text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-600 mb-2">暂无测试项</h3>
                    <p class="text-gray-500">请添加测试项以开始自动化测试</p>
                </div>
            `;
            return;
        }

        const html = this.testItems.map(item => {
            const isExpanded = this.expandedItems.has(item.id);
            
            return `
                <div class="bento-card rounded-2xl p-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4 flex-1">
                            <div class="flex items-center space-x-3">
                                <button class="toggle-btn p-2 rounded-lg hover:bg-gray-100" data-item-id="${item.id}">
                                    <i class="fas fa-chevron-right transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}"></i>
                                </button>
                                <h3 class="text-lg font-bold text-gray-800">${item.name}</h3>
                            </div>
                            
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-gray-500">Version:</span>
                                <select class="version-select px-3 py-1 border border-gray-200 rounded-lg text-sm" data-item-id="${item.id}">
                                    <option value="">选择版本...</option>
                                </select>
                            </div>
                              <button class="trigger-btn px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm" data-item-id="${item.id}">
                                <i class="fas fa-play mr-1"></i>触发测试
                            </button>
                            
                            <button class="associate-build-btn px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm" data-item-id="${item.id}">
                                关联构建
                            </button>
                            
                            <button class="associate-notification-btn px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all duration-200 text-sm" data-item-id="${item.id}">
                                关联通知
                            </button>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            ${window.app.isAdmin ? `
                                <button class="delete-btn p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200" data-item-id="${item.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                      <div class="test-history mt-4 ${isExpanded ? '' : 'hidden'}" data-item-id="${item.id}">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-medium text-gray-700">
                                <i class="fas fa-history mr-2"></i>Execute History
                            </h4>
                            <button class="clear-history-btn text-sm text-gray-500 hover:text-red-600" data-item-id="${item.id}">
                                清理历史
                            </button>
                        </div>
                        
                        <!-- Tab Navigation -->
                        <div class="flex border-b border-gray-200 mb-4">
                            <button class="history-tab px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600" data-item-id="${item.id}" data-tab="test">
                                普通测试
                            </button>
                            <button class="history-tab px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700" data-item-id="${item.id}" data-tab="deploy">
                                部署测试
                            </button>
                        </div>
                        
                        <div class="history-content bg-gray-50 rounded-lg p-4" data-item-id="${item.id}">
                            <div class="text-center text-gray-500">
                                <i class="fas fa-spinner fa-spin"></i> 加载中...
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
        this.attachEventListeners();
        this.loadVersionsForAllItems();
    }

    static attachEventListeners() {
        const container = document.getElementById('testItemList');

        // 折叠/展开
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                this.toggleItemExpansion(itemId);
            });
        });

        // 触发测试
        container.querySelectorAll('.trigger-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                this.triggerTest(itemId);
            });        });

        // 关联构建
        container.querySelectorAll('.associate-build-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                this.showAssociateBuildDialog(itemId);
            });
        });

        // 关联通知
        container.querySelectorAll('.associate-notification-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                this.showAssociateNotificationDialog(itemId);
            });
        });

        // 删除测试项
        if (window.app.isAdmin) {
            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.currentTarget.dataset.itemId);
                    this.deleteTestItem(itemId);
                });
            });
        }

        // 清理历史
        container.querySelectorAll('.clear-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                this.clearTestHistory(itemId);
            });
        });

        // Tab切换
        container.querySelectorAll('.history-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                const tab = e.currentTarget.dataset.tab;
                this.switchHistoryTab(itemId, tab);
            });
        });
    }

    static async loadVersionsForAllItems() {
        for (const item of this.testItems) {
            await this.loadVersionsForItem(item.id, item.associated_job_name);
        }
    }

    static async loadVersionsForItem(itemId, jobName) {
        const select = document.querySelector(`.version-select[data-item-id="${itemId}"]`);
        if (!select || !jobName) return;

        try {
            const response = await API.getBuildsByJobName(jobName);
            const builds = response.data || [];
            
            select.innerHTML = '<option value="">选择版本...</option>' + 
                builds.map(build => 
                    `<option value="${build.id}">${build.job_name}_${build.build_number}</option>`
                ).join('');
                
            // 默认选择最新版本
            if (builds.length > 0) {
                select.value = builds[0].id;
            }
        } catch (error) {
            console.error(`Failed to load versions for item ${itemId}:`, error);
        }
    }    static toggleItemExpansion(itemId) {
        const historyDiv = document.querySelector(`.test-history[data-item-id="${itemId}"]`);
        const toggleIcon = document.querySelector(`.toggle-btn[data-item-id="${itemId}"] i`);
        
        if (this.expandedItems.has(itemId)) {
            this.expandedItems.delete(itemId);
            historyDiv.classList.add('hidden');
            toggleIcon.classList.remove('rotate-90');
        } else {
            this.expandedItems.add(itemId);
            historyDiv.classList.remove('hidden');
            toggleIcon.classList.add('rotate-90');
            
            // 默认加载普通测试历史
            this.loadTestHistory(itemId);
        }
    }    static async loadTestHistory(itemId) {
        const historyContent = document.querySelector(`.history-content[data-item-id="${itemId}"]`);
        
        try {
            const response = await API.getDeployTestRuns(itemId, { limit: 10 });
            const runs = response.data || [];
            
            if (runs.length === 0) {
                historyContent.innerHTML = `
                    <div class="text-center text-gray-500 py-4">
                        <i class="fas fa-history text-2xl mb-2"></i>
                        <p>暂无执行历史</p>
                    </div>
                `;
                return;
            }

            const html = runs.map(run => {
                const startTime = new Date(run.started_at).toLocaleString('zh-CN');
                const statusIcon = this.getDeployTestStatusIcon(run.status);
                const statusColor = this.getDeployTestStatusColor(run.status);
                
                return `
                    <div class="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div class="flex items-center space-x-3">
                            <i class="fas ${statusIcon} ${statusColor}"></i>
                            <span class="text-sm text-gray-600">${startTime}</span>
                            <span class="text-sm text-gray-800">${run.triggered_by}</span>
                            <span class="px-2 py-1 rounded-full text-xs ${statusColor}">${run.status}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${run.report_url ? `
                                <a href="${run.report_url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                                    <i class="fas fa-external-link-alt mr-1"></i>Report
                                </a>
                            ` : ''}
                            <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="TestTrigger.showDeployTestDetails(${run.id})">
                                <i class="fas fa-info-circle mr-1"></i>详情
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            historyContent.innerHTML = html;
        } catch (error) {
            console.error(`Failed to load test history for item ${itemId}:`, error);
            historyContent.innerHTML = `
                <div class="text-center text-red-500 py-4">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载历史失败</p>
                </div>
            `;
        }
    }static async triggerTest(itemId) {
        const select = document.querySelector(`.version-select[data-item-id="${itemId}"]`);
        const buildInfoId = select.value;
        
        if (!buildInfoId) {
            alert('请先选择一个版本');
            return;
        }

        const button = document.querySelector(`.trigger-btn[data-item-id="${itemId}"]`);
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>触发中...';
            
            await API.triggerDeployTest(itemId, parseInt(buildInfoId));
            
            alert('测试已触发，请查看执行历史');
            
            // 如果历史记录是展开的，刷新它
            if (this.expandedItems.has(itemId)) {
                this.loadDeployTestHistory(itemId);
            }
        } catch (error) {
            alert('触发失败: ' + error.message);
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    static async triggerDeployTest(itemId) {
        const select = document.querySelector(`.version-select[data-item-id="${itemId}"]`);
        const buildInfoId = select.value;
        
        if (!buildInfoId) {
            alert('请先选择一个版本');
            return;
        }

        if (!confirm('确定要触发部署测试吗？这会下载包文件并执行完整的部署测试流程。')) {
            return;
        }

        const button = document.querySelector(`.deploy-test-btn[data-item-id="${itemId}"]`);
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>部署中...';
            
            await API.triggerDeployTest(itemId, parseInt(buildInfoId));
            
            alert('部署测试已触发，请查看执行历史');
            
            // 如果历史记录是展开的，刷新它
            if (this.expandedItems.has(itemId)) {
                this.loadDeployTestHistory(itemId);
            }
        } catch (error) {
            alert('触发失败: ' + error.message);
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    static showAssociateBuildDialog(itemId) {
        const item = this.testItems.find(t => t.id === itemId);
        const jobName = prompt('请输入要关联的 Job 名称:', item.associated_job_name || '');
        
        if (jobName !== null) {
            this.updateTestItem(itemId, { associated_job_name: jobName });
        }
    }

    static showAssociateNotificationDialog(itemId) {
        const item = this.testItems.find(t => t.id === itemId);
        const enabled = confirm(`当前通知状态: ${item.notification_enabled ? '已启用' : '已禁用'}\n\n是否要切换通知状态?`);
        
        if (enabled !== null) {
            this.updateTestItem(itemId, { notification_enabled: !item.notification_enabled });
        }
    }

    static async updateTestItem(itemId, updates) {
        try {
            await API.updateTestItem(itemId, updates);
            await this.loadTestItems(); // 重新加载列表
        } catch (error) {
            alert('更新失败: ' + error.message);
        }
    }

    static async deleteTestItem(itemId) {
        const item = this.testItems.find(t => t.id === itemId);
        if (!confirm(`确定要删除测试项 "${item.name}" 吗？此操作不可恢复。`)) {
            return;
        }

        try {
            await API.deleteTestItem(itemId);
            await this.loadTestItems(); // 重新加载列表
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    static clearTestHistory(itemId) {
        if (!confirm('确定要清理此测试项的执行历史吗？')) {
            return;
        }
        
        // 这里可以实现清理历史的功能
        alert('清理历史功能暂未实现');
    }

    static switchHistoryTab(itemId, tab) {
        // 更新tab样式
        const tabs = document.querySelectorAll(`.history-tab[data-item-id="${itemId}"]`);
        tabs.forEach(t => {
            if (t.dataset.tab === tab) {
                t.className = 'history-tab px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600';
            } else {
                t.className = 'history-tab px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700';
            }
        });

        // 加载对应的历史记录
        if (tab === 'test') {
            this.loadTestHistory(itemId);
        } else if (tab === 'deploy') {
            this.loadDeployTestHistory(itemId);
        }
    }

    static async loadDeployTestHistory(itemId) {
        const historyContent = document.querySelector(`.history-content[data-item-id="${itemId}"]`);
        
        try {
            historyContent.innerHTML = `
                <div class="text-center text-gray-500">
                    <i class="fas fa-spinner fa-spin"></i> 加载中...
                </div>
            `;

            const response = await API.getDeployTestRuns(itemId);
            const runs = response.data || [];

            if (runs.length === 0) {
                historyContent.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-rocket text-3xl mb-2"></i>
                        <p>暂无部署测试历史</p>
                    </div>
                `;
                return;
            }

            const html = runs.map(run => {
                const statusIcon = this.getDeployTestStatusIcon(run.status);
                const statusColor = this.getDeployTestStatusColor(run.status);
                
                return `
                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2 ${statusColor}">
                        <div class="flex items-center space-x-3">
                            <i class="fas ${statusIcon}"></i>
                            <div>
                                <div class="font-medium">${run.build_info ? run.build_info.job_name + ' #' + run.build_info.build_number : 'Unknown Build'}</div>
                                <div class="text-sm text-gray-600">
                                    触发者: ${run.triggered_by} | 
                                    开始: ${new Date(run.started_at).toLocaleString()}
                                    ${run.finished_at ? ' | 结束: ' + new Date(run.finished_at).toLocaleString() : ''}
                                </div>
                                ${run.error_message ? `<div class="text-sm text-red-600 mt-1">${run.error_message}</div>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-1 text-xs rounded-full ${statusColor}">${run.status}</span>
                            <button class="deploy-details-btn text-blue-600 hover:text-blue-800" data-run-id="${run.id}">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            ${run.report_url ? `
                                <a href="${run.report_url}" target="_blank" class="text-green-600 hover:text-green-800">
                                    <i class="fas fa-external-link-alt mr-1"></i>Report
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            historyContent.innerHTML = html;

            // 添加详情按钮事件监听
            historyContent.querySelectorAll('.deploy-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const runId = parseInt(e.currentTarget.dataset.runId);
                    this.showDeployTestDetails(runId);
                });
            });

        } catch (error) {
            console.error(`Failed to load deploy test history for item ${itemId}:`, error);
            historyContent.innerHTML = `
                <div class="text-center text-red-500 py-4">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载历史失败</p>
                </div>
            `;
        }
    }

    static getDeployTestStatusIcon(status) {
        const icons = {
            'PENDING': 'fa-clock',
            'DOWNLOADING': 'fa-download',
            'DOWNLOADED': 'fa-check-circle',
            'DEPLOYING': 'fa-cog fa-spin',
            'TESTING': 'fa-flask',
            'MONITORING': 'fa-eye',
            'COMPLETED': 'fa-check-circle',
            'FAILED': 'fa-times-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    static getDeployTestStatusColor(status) {
        const colors = {
            'PENDING': 'text-yellow-600 bg-yellow-50',
            'DOWNLOADING': 'text-blue-600 bg-blue-50',
            'DOWNLOADED': 'text-blue-600 bg-blue-50',
            'DEPLOYING': 'text-orange-600 bg-orange-50',
            'TESTING': 'text-purple-600 bg-purple-50',
            'MONITORING': 'text-indigo-600 bg-indigo-50',
            'COMPLETED': 'text-green-600 bg-green-50',
            'FAILED': 'text-red-600 bg-red-50'
        };
        return colors[status] || 'text-gray-600 bg-gray-50';
    }

    static async showDeployTestDetails(runId) {
        try {
            const response = await API.getDeployTestRun(runId);
            const run = response.data;

            let stepsHtml = '';
            if (run.steps && run.steps.length > 0) {
                stepsHtml = run.steps.map(step => {
                    const icon = this.getDeployTestStatusIcon(step.status);
                    const color = this.getDeployTestStatusColor(step.status);
                    
                    return `
                        <div class="border-l-4 border-gray-200 pl-4 py-2">
                            <div class="flex items-center space-x-2">
                                <i class="fas ${icon} ${color}"></i>
                                <span class="font-medium">${step.name}</span>
                                <span class="px-2 py-1 text-xs rounded-full ${color}">${step.status}</span>
                            </div>
                            ${step.details ? `<div class="text-sm text-gray-600 mt-1">${step.details}</div>` : ''}
                            ${step.error ? `<div class="text-sm text-red-600 mt-1">${step.error}</div>` : ''}
                            <div class="text-xs text-gray-500 mt-1">
                                开始: ${new Date(step.start_time).toLocaleString()}
                                ${step.end_time ? ' | 结束: ' + new Date(step.end_time).toLocaleString() : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                stepsHtml = '<div class="text-gray-500">暂无步骤详情</div>';
            }

            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold">部署测试详情</h3>
                            <button class="close-modal text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">测试项</label>
                                    <div class="text-sm text-gray-900">${run.test_item ? run.test_item.name : 'Unknown'}</div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">构建信息</label>
                                    <div class="text-sm text-gray-900">${run.build_info ? run.build_info.job_name + ' #' + run.build_info.build_number : 'Unknown'}</div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">状态</label>
                                    <span class="px-2 py-1 text-xs rounded-full ${this.getDeployTestStatusColor(run.status)}">${run.status}</span>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Task ID</label>
                                    <div class="text-sm text-gray-900">${run.task_id || 'N/A'}</div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">下载路径</label>
                                    <div class="text-sm text-gray-900">${run.download_path || 'N/A'}</div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">报告URL</label>
                                    <div class="text-sm text-gray-900">
                                        ${run.report_url ? `<a href="${run.report_url}" target="_blank" class="text-blue-600 hover:text-blue-800">${run.report_url}</a>` : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">执行步骤</label>
                                <div class="space-y-2">
                                    ${stepsHtml}
                                </div>
                            </div>
                            
                            ${run.error_message ? `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">错误信息</label>
                                    <div class="text-sm text-red-600 bg-red-50 p-3 rounded-lg">${run.error_message}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // 添加关闭事件
            document.querySelector('.close-modal').addEventListener('click', () => {
                document.querySelector('.fixed.inset-0').remove();
            });

        } catch (error) {
            alert('加载详情失败: ' + error.message);
        }
    }

    static getStatusClass(status) {
        switch (status) {
            case 'SUCCESS':
                return 'text-green-600';
            case 'FAILED':
                return 'text-red-600';
            case 'RUNNING':
                return 'text-blue-600';
            case 'PENDING':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    }

    static getStatusIcon(status) {
        switch (status) {
            case 'SUCCESS':
                return 'fa-check-circle';
            case 'FAILED':
                return 'fa-times-circle';
            case 'RUNNING':
                return 'fa-spinner fa-spin';
            case 'PENDING':
                return 'fa-clock';
            default:
                return 'fa-question-circle';
        }
    }

    static renderError(message) {
        const container = document.getElementById('testItemList');
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i>
                <p class="text-gray-600">${message}</p>
            </div>
        `;
    }
}

export { TestTrigger };
