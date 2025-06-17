import { API } from '../api.js';

// 测试触发组件
class TestTrigger {
    static testItems = [];
    static expandedItems = new Set();

    static async loadTestItems() {
        try {
            const response = await API.getTestItems();
            this.testItems = (response.data || []).sort((a, b) => a.name.localeCompare(b.name));
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

    //     <button class="history-tab px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600" data-item-id="${item.id}" data-tab="test">
    //     普通测试
    // </button>

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
                                <div class="relative">
                                    <input type="text" 
                                           class="version-search px-3 py-1 border border-gray-200 rounded-lg text-sm w-64" 
                                           data-item-id="${item.id}"
                                           placeholder="搜索或选择版本..."
                                           autocomplete="off">
                                    <div class="version-dropdown absolute top-full left-0 min-w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden z-50 whitespace-nowrap" 
                                         data-item-id="${item.id}">
                                    </div>
                                    <input type="hidden" class="version-value" data-item-id="${item.id}" value="">
                                </div>
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

        // 版本搜索功能
        container.querySelectorAll('.version-search').forEach(input => {
            const itemId = parseInt(input.dataset.itemId);
            
            input.addEventListener('focus', (e) => {
                this.showVersionDropdown(itemId);
            });
            
            input.addEventListener('input', (e) => {
                this.filterVersions(itemId, e.target.value);
            });
            
            input.addEventListener('blur', (e) => {
                // 延迟隐藏下拉框，以便点击选项
                setTimeout(() => {
                    this.hideVersionDropdown(itemId);
                }, 200);
            });
        });
    }

    static async loadVersionsForAllItems() {
        for (const item of this.testItems) {
            await this.loadVersionsForItem(item.id, item.associated_job_name);
        }
    }

    static async loadVersionsForItem(itemId, jobName) {
        const dropdown = document.querySelector(`.version-dropdown[data-item-id="${itemId}"]`);
        const input = document.querySelector(`.version-search[data-item-id="${itemId}"]`);
        const hiddenInput = document.querySelector(`.version-value[data-item-id="${itemId}"]`);
        
        if (!dropdown || !input || !jobName) return;

        try {
            const response = await API.getBuildsByJobName(jobName);
            const builds = response.data || [];
            
            // 存储构建数据以供搜索使用
            this.buildData = this.buildData || {};
            this.buildData[itemId] = builds;
            
            this.renderVersionDropdown(itemId, builds);
                
            // 默认选择最新版本
            if (builds.length > 0) {
                const latestBuild = builds[0];
                // Format time as 20250615-12:43
                const buildTime = new Date(latestBuild.created_at);
                const year = buildTime.getFullYear();
                const month = String(buildTime.getMonth() + 1).padStart(2, '0');
                const day = String(buildTime.getDate()).padStart(2, '0');
                const hours = String(buildTime.getHours()).padStart(2, '0');
                const minutes = String(buildTime.getMinutes()).padStart(2, '0');
                const formattedTime = `${year}${month}${day}-${hours}:${minutes}`;
                
                const displayText = `${latestBuild.job_name} #${latestBuild.build_number} - ${latestBuild.build_user} ${formattedTime}`;
                input.value = displayText;
                hiddenInput.value = latestBuild.id;
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
            
            // 默认加载部署测试历史
            this.loadDeployTestHistory(itemId);
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
                                <button class="preview-btn text-purple-600 hover:text-purple-800 text-sm ml-2" data-report-url="${run.report_url}">
                                    <i class="fas fa-eye mr-1"></i>Preview
                                </button>
                            ` : ''}
                            <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="TestTrigger.showDeployTestDetails(${run.id})">
                                <i class="fas fa-info-circle mr-1"></i>详情
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            historyContent.innerHTML = html;

            // 添加Preview按钮事件监听
            historyContent.querySelectorAll('.preview-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const reportUrl = e.currentTarget.dataset.reportUrl;
                    this.showReportPreview(reportUrl);
                });
            });

        } catch (error) {
            console.error(`Failed to load test history for item ${itemId}:`, error);
            historyContent.innerHTML = `
                <div class="text-center text-red-500 py-4">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载历史失败</p>
                </div>
            `;
        }
    }

    static renderVersionDropdown(itemId, builds) {
        const dropdown = document.querySelector(`.version-dropdown[data-item-id="${itemId}"]`);
        if (!dropdown) return;
        
        const html = builds.map((build, index) => {
            // Format time as 20250615-12:43
            const buildTime = new Date(build.created_at);
            const year = buildTime.getFullYear();
            const month = String(buildTime.getMonth() + 1).padStart(2, '0');
            const day = String(buildTime.getDate()).padStart(2, '0');
            const hours = String(buildTime.getHours()).padStart(2, '0');
            const minutes = String(buildTime.getMinutes()).padStart(2, '0');
            const formattedTime = `${year}${month}${day}-${hours}:${minutes}`;
            
            const displayText = `${build.job_name} #${build.build_number} - ${build.build_user} ${formattedTime}`;
            const isEven = index % 2 === 0;
            
            // Generate build path in same format as build info page
            const baseUrl = 'http://192.168.1.199:8080/job/'; // This should match build info page base URL
            const buildPath = `${baseUrl}${build.job_name}/${build.build_number}`;
            
            // Create full display text with build path
            const fullDisplayText = `${build.job_name} #${build.build_number} - ${build.build_user} ${formattedTime} - 构建路径: ${buildPath}`;
            
            return `
                <div class="version-option px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${isEven ? 'bg-gray-50' : 'bg-white'}" 
                     data-value="${build.id}" 
                     data-display="${displayText}"
                     data-item-id="${itemId}">
                    <div class="font-medium text-sm whitespace-nowrap">
                        ${fullDisplayText}
                    </div>
                </div>
            `;
        }).join('');
        
        dropdown.innerHTML = html;
        
        // 添加点击事件
        dropdown.querySelectorAll('.version-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectVersion(itemId, e.currentTarget.dataset.value, e.currentTarget.dataset.display);
            });
        });
    }

    static showVersionDropdown(itemId) {
        const dropdown = document.querySelector(`.version-dropdown[data-item-id="${itemId}"]`);
        if (dropdown) {
            dropdown.classList.remove('hidden');
        }
    }

    static hideVersionDropdown(itemId) {
        const dropdown = document.querySelector(`.version-dropdown[data-item-id="${itemId}"]`);
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    static filterVersions(itemId, searchText) {
        const dropdown = document.querySelector(`.version-dropdown[data-item-id="${itemId}"]`);
        if (!dropdown || !this.buildData || !this.buildData[itemId]) return;
        
        const builds = this.buildData[itemId];
        const filteredBuilds = builds.filter(build => {
            const searchLower = searchText.toLowerCase();
            return build.job_name.toLowerCase().includes(searchLower) ||
                   build.build_number.toString().includes(searchLower) ||
                   build.build_user.toLowerCase().includes(searchLower) ||
                   (build.package_path && build.package_path.toLowerCase().includes(searchLower));
        });
        
        this.renderVersionDropdown(itemId, filteredBuilds);
        this.showVersionDropdown(itemId);
    }

    static selectVersion(itemId, buildId, displayText) {
        const input = document.querySelector(`.version-search[data-item-id="${itemId}"]`);
        const hiddenInput = document.querySelector(`.version-value[data-item-id="${itemId}"]`);
        
        if (input && hiddenInput) {
            input.value = displayText;
            hiddenInput.value = buildId;
            this.hideVersionDropdown(itemId);
        }
    }

    static async triggerTest(itemId) {
        const hiddenInput = document.querySelector(`.version-value[data-item-id="${itemId}"]`);
        const buildInfoId = hiddenInput.value;
        
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

    static async showAssociateBuildDialog(itemId) {
        const item = this.testItems.find(t => t.id === itemId);
        
        try {
            // 获取所有可用的 job names
            const response = await API.getJobNames();
            const jobNames = response.data || [];
            
            if (jobNames.length === 0) {
                alert('暂无可用的构建作业，请先确保有构建信息数据');
                return;
            }
            
            // 创建选择对话框
            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="associate-build-modal">
                    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold">关联构建作业</h3>
                            <button class="close-modal text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">选择构建作业</label>
                            <select class="job-select w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">请选择作业...</option>
                                ${jobNames.map(jobName => 
                                    `<option value="${jobName}" ${jobName === item.associated_job_name ? 'selected' : ''}>${jobName}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="flex justify-end space-x-3">
                            <button class="cancel-btn px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                取消
                            </button>
                            <button class="confirm-btn px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                确认关联
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = document.getElementById('associate-build-modal');
            const jobSelect = modal.querySelector('.job-select');
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const closeBtn = modal.querySelector('.close-modal');
            
            // 关闭模态框
            const closeModal = () => {
                modal.remove();
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            // 确认关联
            confirmBtn.addEventListener('click', async () => {
                const selectedJobName = jobSelect.value;
                if (!selectedJobName) {
                    alert('请选择一个构建作业');
                    return;
                }
                
                try {
                    await this.updateTestItem(itemId, { associated_job_name: selectedJobName });
                    closeModal();
                } catch (error) {
                    alert('关联失败: ' + error.message);
                }
            });
            
        } catch (error) {
            console.error('Failed to load job names:', error);
            alert('加载构建作业列表失败: ' + error.message);
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

    static async clearTestHistory(itemId) {
        const item = this.testItems.find(t => t.id === itemId);
        const itemName = item ? item.name : `ID: ${itemId}`;
        
        const confirmMessage = `确定要清理测试项 "${itemName}" 的执行历史吗？\n\n此操作将会：\n- 删除所有部署测试运行记录\n- 删除所有执行步骤详情\n- 此操作不可恢复\n\n请确认是否继续？`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await API.clearDeployTestHistory(itemId);
            
            // 显示成功消息
            const deletedCount = response.deleted_count || 0;
            const successMessage = `成功清理了 ${deletedCount} 条执行历史记录`;
            
            if (window.app) {
                window.app.showSuccess(successMessage);
            } else {
                alert(`成功: ${successMessage}`);
            }
            
            // 如果历史记录是展开的，重新加载它以显示空状态
            if (this.expandedItems.has(itemId)) {
                this.loadDeployTestHistory(itemId);
            }
        } catch (error) {
            console.error('Failed to clear test history:', error);
            const errorMessage = error.message || '未知错误';
            
            const failureMessage = `清理执行历史失败：${errorMessage}`;
            if (window.app) {
                window.app.showError(failureMessage);
            } else {
                alert(`错误: ${failureMessage}`);
            }
        }
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
                                <button class="preview-btn text-purple-600 hover:text-purple-800 ml-2" data-report-url="${run.report_url}">
                                    <i class="fas fa-eye mr-1"></i>Preview
                                </button>
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

            // 添加Preview按钮事件监听
            historyContent.querySelectorAll('.preview-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const reportUrl = e.currentTarget.dataset.reportUrl;
                    this.showReportPreview(reportUrl);
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

    static async showReportPreview(reportUrl) {
        try {
            // 显示加载中的模态框
            const loadingModalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="report-preview-modal">
                    <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold">测试报告预览</h3>
                            <button class="close-modal text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="text-center py-8">
                            <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i>
                            <p class="text-gray-600">正在加载报告内容...</p>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', loadingModalHtml);

            // 获取报告内容
            const response = await fetch(reportUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const htmlContent = await response.text();
            
            // 创建一个临时DOM来解析HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // 查找data-id="summary"的元素
            const summaryElement = doc.querySelector('[data-id="summary"]');
            
            let summaryContent = '';
            if (summaryElement) {
                summaryContent = summaryElement.outerHTML;
            } else {
                summaryContent = '<div class="text-yellow-600 bg-yellow-50 p-4 rounded-lg"><i class="fas fa-exclamation-triangle mr-2"></i>未找到summary部分，可能报告格式已更新</div>';
            }

            // 更新模态框内容
            const modal = document.getElementById('report-preview-modal');
            const modalContent = modal.querySelector('.bg-white');
            modalContent.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold">测试报告预览</h3>
                    <div class="flex items-center space-x-3">
                        <a href="${reportUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-external-link-alt mr-1"></i>查看完整报告
                        </a>
                        <button class="close-modal text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="border-t pt-4">
                    <div class="report-summary-content">
                        ${summaryContent}
                    </div>
                </div>
            `;

            // 重新绑定关闭事件
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.remove();
            });

        } catch (error) {
            // 更新为错误状态
            const modal = document.getElementById('report-preview-modal');
            if (modal) {
                const modalContent = modal.querySelector('.bg-white');
                modalContent.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold">测试报告预览</h3>
                        <button class="close-modal text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="text-center py-8">
                        <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-4"></i>
                        <p class="text-red-600 mb-4">加载报告失败</p>
                        <p class="text-gray-600 text-sm mb-4">${error.message}</p>
                        <a href="${reportUrl}" target="_blank" class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            <i class="fas fa-external-link-alt mr-2"></i>直接访问报告
                        </a>
                    </div>
                `;

                // 重新绑定关闭事件
                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.remove();
                });
            } else {
                alert('加载报告预览失败: ' + error.message);
            }
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
