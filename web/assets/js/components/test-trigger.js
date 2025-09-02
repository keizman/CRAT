import { API } from '../api.js';
import { BuildInfo } from './build-info.js';

// 测试触发组件
class TestTrigger {
    static testItems = [];
    static expandedItems = new Set();
    static jobVersions = new Map(); // job_name -> selected_build_info from BuildInfo
    static processingCount = 0; // 当前正在处理的测试数量（从后端获取）

    // Load expanded state from localStorage
    static loadExpandedState() {
        try {
            const saved = localStorage.getItem('testTrigger.expandedItems');
            if (saved) {
                const expandedArray = JSON.parse(saved);
                this.expandedItems = new Set(expandedArray);
            }
        } catch (error) {
            console.warn('Failed to load expanded state:', error);
            this.expandedItems = new Set();
        }
    }

    // Save expanded state to localStorage
    static saveExpandedState() {
        try {
            localStorage.setItem('testTrigger.expandedItems', JSON.stringify(Array.from(this.expandedItems)));
        } catch (error) {
            console.warn('Failed to save expanded state:', error);
        }
    }

    static async loadTestItems() {
        try {
            console.log('Loading test items...');
            
            // Load expanded state first
            this.loadExpandedState();
            
            const response = await API.getTestItems();
            const newTestItems = (response.data || []).sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`Loaded ${newTestItems.length} test items:`, newTestItems.map(item => item.name));
            
            this.testItems = newTestItems;
            
            // 从后端获取当前处理数量
            await this.loadProcessingCount();
            
            this.renderTestItems();
            this.updateProcessingIndicator();
            
            // 重新加载已展开项目的历史记录 - 使用延迟确保DOM已渲染
            setTimeout(() => {
                this.expandedItems.forEach(itemId => {
                    this.loadDeployTestHistory(itemId);
                });
            }, 100);
            
            console.log('Test items loaded and rendered successfully');
        } catch (error) {
            console.error('Failed to load test items:', error);
            this.renderError('加载测试项失败');
        }
    }

    // 从后端获取当前处理数量
    static async loadProcessingCount() {
        try {
            const response = await API.getProcessingCount();
            this.processingCount = response.data.count || 0;
            console.log(`Processing count loaded from backend: ${this.processingCount}`);
        } catch (error) {
            console.warn('Failed to load processing count:', error);
            this.processingCount = 0;
        }
    }

    // Update processing indicator UI
    static updateProcessingIndicator() {
        const countElement = document.getElementById('processingCount');
        const iconElement = document.getElementById('processingIcon');
        const spinnerElement = document.getElementById('processingSpinner');
        
        if (!countElement || !iconElement || !spinnerElement) {
            console.warn('Processing indicator elements not found:', {
                countElement: !!countElement,
                iconElement: !!iconElement,
                spinnerElement: !!spinnerElement
            });
            return;
        }
        
        console.log('Updating processing indicator:', this.processingCount);
        countElement.textContent = this.processingCount;
        
        if (this.processingCount === 0) {
            // Green color, no spinner
            iconElement.className = 'w-4 h-4 rounded-full bg-green-500 flex items-center justify-center';
            spinnerElement.classList.add('hidden');
        } else {
            // Yellow color with spinner
            iconElement.className = 'w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center';
            spinnerElement.classList.remove('hidden');
        }
    }

    // Handler for job version changes from BuildInfo
    static onJobVersionsChanged(jobVersions) {
        this.jobVersions = jobVersions;
        console.log('Job versions changed:', Array.from(jobVersions.entries()).map(([job, version]) => `${job}: #${version.build_number}`));
        // Re-render to show only items with associated versions
        this.renderTestItems();
    }

    static onJobVersionChanged(jobName, version) {
        this.jobVersions.set(jobName, version);
        console.log(`Job version changed for ${jobName}:`, version ? `#${version.build_number}` : 'null');
        // Re-render to update specific item
        this.renderTestItems();
    }

    static getItemVersion(item) {
        if (!item.associated_job_name) {
            return null; // Item not associated with any job
        }
        return this.jobVersions.get(item.associated_job_name) || null;
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
            const itemVersion = this.getItemVersion(item);
            
            // Generate version info based on item's associated job version
            let versionInfoHtml = '';
            let canTrigger = false;
            
            if (!item.associated_job_name) {
                // Item not associated with any job
                versionInfoHtml = `
                    <div class="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                        <div class="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                            <i class="fas fa-info-circle text-gray-500 text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-700">未关联构建</div>
                            <div class="text-xs text-gray-500">此测试项未关联到任何构建任务，请先关联构建</div>
                        </div>
                    </div>
                `;
                canTrigger = false;
            } else if (itemVersion) {
                const buildTime = new Date(itemVersion.created_at);
                const year = buildTime.getFullYear();
                const month = String(buildTime.getMonth() + 1).padStart(2, '0');
                const day = String(buildTime.getDate()).padStart(2, '0');
                const hours = String(buildTime.getHours()).padStart(2, '0');
                const minutes = String(buildTime.getMinutes()).padStart(2, '0');
                const formattedTime = `${year}${month}${day}-${hours}:${minutes}`;
                
                canTrigger = true;
                
                versionInfoHtml = `
                    <div class="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <div class="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <i class="fas fa-check-circle text-green-600 text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <span class="text-sm font-medium text-gray-700">当前测试版本: </span>
                            <span class="text-sm text-green-700 font-medium">
                                ${itemVersion.job_name} #${itemVersion.build_number} - ${itemVersion.build_user} ${formattedTime}${itemVersion.package_path ? ` - ${itemVersion.package_path}` : ''}
                            </span>
                        </div>
                    </div>
                `;
            } else {
                versionInfoHtml = `
                    <div class="flex items-center space-x-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200">
                        <div class="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                            <i class="fas fa-exclamation-triangle text-yellow-600 text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-700">待选择版本</div>
                            <div class="text-xs text-yellow-700">请先在构建信息页面为 ${item.associated_job_name} 选择一个版本</div>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="bento-card rounded-2xl p-6">
                    <div class="space-y-4">
                        <!-- 测试项头部信息 -->
                        <div class="flex items-start justify-between">
                            <div class="flex items-center space-x-3">
                                <button class="toggle-btn p-2 rounded-lg hover:bg-gray-100" data-item-id="${item.id}">
                                    <i class="fas fa-chevron-right transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}"></i>
                                </button>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-800">${item.name}</h3>
                                    ${item.description ? `<p class="text-sm text-gray-600 mt-1">${item.description}</p>` : ''}
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-2">
                                ${window.app && window.app.isAdmin ? `
                                    <button class="edit-description-btn p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200" data-item-id="${item.id}" title="编辑描述">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-btn p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200" data-item-id="${item.id}" title="删除">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- 配置和版本信息区域 -->
                        <div class="space-y-3">
                            <!-- 参数配置 -->
                            <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                                <div class="flex items-center space-x-3">
                                    <div class="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                                        <i class="fas fa-cogs text-blue-600 text-sm"></i>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="text-sm font-medium text-gray-700">参数配置:</span>
                                        <div class="parameter-display text-sm text-blue-700 font-medium cursor-pointer hover:bg-white hover:bg-opacity-50 px-3 py-1 rounded-md border border-transparent hover:border-blue-200 transition-all duration-200" data-item-id="${item.id}">
                                            <span class="truncate block" title="默认参数">默认参数</span>
                                        </div>
                                        <select class="parameter-select px-3 py-1 border border-blue-200 rounded-md text-sm w-48 bg-white hidden" 
                                                data-item-id="${item.id}">
                                            <option value="">默认参数</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 版本信息 -->
                            ${versionInfoHtml}
                            
                            <!-- 操作按钮区域 -->
                            <div class="flex flex-wrap items-center gap-2 pt-2">
                                <button class="trigger-btn px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg ${!canTrigger ? 'opacity-50 cursor-not-allowed' : ''}" 
                                        data-item-id="${item.id}" ${!canTrigger ? 'disabled' : ''}>
                                    <i class="fas fa-play mr-1"></i>触发测试
                                </button>
                                <button class="associate-build-btn px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg" data-item-id="${item.id}">
                                    <i class="fas fa-link mr-1"></i>关联构建
                                </button>
                                <button class="associate-notification-btn px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg" data-item-id="${item.id}">
                                    <i class="fas fa-bell mr-1"></i>关联通知
                                </button>
                            </div>
                        </div>
                        
                        <!-- 执行历史区域 -->
                        <div class="test-history ${isExpanded ? '' : 'hidden'}" data-item-id="${item.id}">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-semibold text-gray-700 flex items-center">
                                    <i class="fas fa-history mr-2 text-blue-500"></i>执行历史
                                </h4>
                                <button class="clear-history-btn text-sm text-gray-500 hover:text-red-600" data-item-id="${item.id}">
                                    <i class="fas fa-trash-alt mr-1"></i>清理历史
                                </button>
                            </div>
                            
                            <div class="flex border-b border-gray-200 mb-4">
                                <button class="history-tab px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent" data-item-id="${item.id}" data-tab="deploy">
                                    <i class="fas fa-rocket mr-1"></i>部署测试
                                </button>
                            </div>
                            
                            <div class="history-content bg-gray-50 rounded-lg p-4" data-item-id="${item.id}">
                                <div class="text-center text-gray-500">
                                    <i class="fas fa-spinner fa-spin"></i> 加载中...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
        this.attachEventListeners();
        this.loadParameterSetsForAllItems();
        
        // Load history for expanded items - 使用延迟确保DOM已渲染
        setTimeout(() => {
            this.expandedItems.forEach(itemId => {
                this.loadDeployTestHistory(itemId);
            });
        }, 50);
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
            });
        });

        // 参数显示点击切换
        container.querySelectorAll('.parameter-display').forEach(display => {
            display.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                this.toggleParameterSelect(itemId);
            });
        });

        // 参数集选择变化
        container.querySelectorAll('.parameter-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const itemId = parseInt(e.currentTarget.dataset.itemId);
                const parameterSetId = e.target.value;
                this.bindParameterSet(itemId, parameterSetId);
            });
            
            // 点击外部时隐藏选择框
            select.addEventListener('blur', (e) => {
                setTimeout(() => {
                    const itemId = parseInt(e.currentTarget.dataset.itemId);
                    const display = document.querySelector(`.parameter-display[data-item-id="${itemId}"]`);
                    if (display && !select.classList.contains('hidden')) {
                        display.classList.remove('hidden');
                        select.classList.add('hidden');
                    }
                }, 200);
            });
        });

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

        // 编辑描述
        if (window.app && window.app.isAdmin) {
            container.querySelectorAll('.edit-description-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.currentTarget.dataset.itemId);
                    this.showEditDescriptionDialog(itemId);
                });
            });
        }

        // 删除测试项
        if (window.app && window.app.isAdmin) {
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



    static async loadParameterSetsForAllItems() {
        try {
            const response = await API.getParameterSets();
            const parameterSets = response.data || [];
            
            // 为每个测试项加载参数集选项
            for (const item of this.testItems) {
                this.loadParameterSetsForItem(item.id, parameterSets);
            }
        } catch (error) {
            console.error('Failed to load parameter sets:', error);
        }
    }

    static loadParameterSetsForItem(itemId, parameterSets) {
        const select = document.querySelector(`.parameter-select[data-item-id="${itemId}"]`);
        const display = document.querySelector(`.parameter-display[data-item-id="${itemId}"] span`);
        if (!select || !display) return;

        const item = this.testItems.find(t => t.id === itemId);
        if (!item) return;

        // 清空现有选项但保留默认选项
        select.innerHTML = '<option value="">默认参数</option>';
        
        let selectedParamName = '默认参数';
        
        // 添加参数集选项
        parameterSets.forEach(paramSet => {
            const option = document.createElement('option');
            option.value = paramSet.id;
            option.textContent = paramSet.name + (paramSet.description ? ` - ${paramSet.description}` : '');
            if (paramSet.id === item.associated_parameter_set_id) {
                option.selected = true;
                selectedParamName = paramSet.name + (paramSet.description ? ` - ${paramSet.description}` : '');
            }
            select.appendChild(option);
        });
        
        // 更新显示的参数名称
        display.textContent = selectedParamName;
        display.title = selectedParamName;
    }

    static toggleParameterSelect(itemId) {
        const display = document.querySelector(`.parameter-display[data-item-id="${itemId}"]`);
        const select = document.querySelector(`.parameter-select[data-item-id="${itemId}"]`);
        
        if (display && select) {
            if (select.classList.contains('hidden')) {
                display.classList.add('hidden');
                select.classList.remove('hidden');
                select.focus();
            } else {
                display.classList.remove('hidden');
                select.classList.add('hidden');
            }
        }
    }

    static async bindParameterSet(itemId, parameterSetId) {
        try {
            const updateData = {
                associated_parameter_set_id: parameterSetId ? parseInt(parameterSetId) : null
            };
            
            await API.updateTestItem(itemId, updateData);
            
            // 更新本地数据
            const itemIndex = this.testItems.findIndex(t => t.id === itemId);
            if (itemIndex !== -1) {
                this.testItems[itemIndex].associated_parameter_set_id = updateData.associated_parameter_set_id;
            }
            
            // 更新显示
            this.updateParameterDisplay(itemId, parameterSetId);
            
            // 隐藏选择框，显示文本
            this.toggleParameterSelect(itemId);
            
            // 显示成功消息
            if (window.app) {
                window.app.showSuccess('参数集绑定成功');
            } else {
                console.log('参数集绑定成功');
            }
        } catch (error) {
            console.error('Failed to bind parameter set:', error);
            alert('绑定失败: ' + error.message);
            
            // 恢复选择状态
            const select = document.querySelector(`.parameter-select[data-item-id="${itemId}"]`);
            const item = this.testItems.find(t => t.id === itemId);
            if (select && item) {
                select.value = item.associated_parameter_set_id || '';
            }
        }
    }

    static async updateParameterDisplay(itemId, parameterSetId) {
        const display = document.querySelector(`.parameter-display[data-item-id="${itemId}"] span`);
        if (!display) return;
        
        if (!parameterSetId) {
            display.textContent = '默认参数';
            display.title = '默认参数';
            return;
        }
        
        try {
            const response = await API.getParameterSets();
            const parameterSets = response.data || [];
            const selectedParam = parameterSets.find(p => p.id === parseInt(parameterSetId));
            
            if (selectedParam) {
                const displayName = selectedParam.name + (selectedParam.description ? ` - ${selectedParam.description}` : '');
                display.textContent = displayName;
                display.title = displayName;
            } else {
                display.textContent = '默认参数';
                display.title = '默认参数';
            }
        } catch (error) {
            console.error('Failed to update parameter display:', error);
            display.textContent = '默认参数';
            display.title = '默认参数';
        }
    }

    static toggleItemExpansion(itemId) {
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
        
        // Save expanded state
        this.saveExpandedState();
    }

    static async loadTestHistory(itemId) {
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



    static async triggerTest(itemId) {
        const button = document.querySelector(`.trigger-btn[data-item-id="${itemId}"]`);
        
        // 防止重复点击
        if (button && button.disabled) {
            console.log(`Button for test ${itemId} is already disabled, ignoring click`);
            return;
        }

        const item = this.testItems.find(t => t.id === itemId);
        if (!item) {
            alert('测试项不存在');
            return;
        }

        // Use job-specific selected version
        const itemVersion = this.getItemVersion(item);
        if (!itemVersion) {
            alert(`请先在构建信息页面为 ${item.associated_job_name || '此测试项'} 选择一个版本`);
            return;
        }

        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>触发中...';
            
            // 获取选中的参数集ID
            const paramSelect = document.querySelector(`.parameter-select[data-item-id="${itemId}"]`);
            const parameterSetId = paramSelect && paramSelect.value ? parseInt(paramSelect.value) : null;
            
            // 直接调用后端API，让后端处理阻塞逻辑
            const response = await API.triggerDeployTest(itemId, itemVersion.id, parameterSetId);
            
            // 检查后端返回的状态
            if (response.data && response.data.queued) {
                // 测试被加入队列
                button.innerHTML = '<i class="fas fa-hourglass-half mr-2"></i>已排队';
                button.disabled = true;
                
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess(`测试已加入队列 (排队位置: ${response.data.queue_position})，等待前面的测试完成`);
                } else {
                    alert(`测试已加入队列 (排队位置: ${response.data.queue_position})，等待前面的测试完成`);
                }
            } else {
                // 测试立即执行
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess(`测试已触发 (使用版本: ${itemVersion.job_name} #${itemVersion.build_number})，请查看执行历史`);
                } else {
                    alert(`测试已触发 (使用版本: ${itemVersion.job_name} #${itemVersion.build_number})，请查看执行历史`);
                }
                
                // 恢复按钮状态
                button.disabled = false;
                button.innerHTML = originalText;
            }
            
            // 更新处理计数
            await this.loadProcessingCount();
            this.updateProcessingIndicator();
            
            // 如果历史记录是展开的，刷新它
            if (this.expandedItems.has(itemId)) {
                this.loadDeployTestHistory(itemId);
            }
        } catch (error) {
            console.error('Trigger test failed:', error);
            alert('触发失败: ' + error.message);
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

        // 获取参数集选择
        const paramSelect = document.querySelector(`.parameter-select[data-item-id="${itemId}"]`);
        const parameterSetId = paramSelect && paramSelect.value ? parseInt(paramSelect.value) : null;

        if (!confirm('确定要触发部署测试吗？这会下载包文件并执行完整的部署测试流程。')) {
            return;
        }

        const button = document.querySelector(`.deploy-test-btn[data-item-id="${itemId}"]`);
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>部署中...';
            
            await API.triggerDeployTest(itemId, parseInt(buildInfoId), parameterSetId);
            
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
                document.removeEventListener('keydown', handleEscKey);
            };

            // ESC键处理函数
            const handleEscKey = (event) => {
                if (event.key === 'Escape') {
                    closeModal();
                }
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            // 绑定ESC键事件
            document.addEventListener('keydown', handleEscKey);
            
            // 点击背景关闭
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
            
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

    static showEditDescriptionDialog(itemId) {
        const item = this.testItems.find(t => t.id === itemId);
        if (!item) return;

        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="edit-description-modal">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold">编辑描述</h3>
                        <button class="close-modal text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">测试项名称</label>
                        <div class="text-sm text-gray-900 bg-gray-50 p-2 rounded-lg">${item.name}</div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                        <textarea class="description-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                                  rows="3" 
                                  placeholder="请输入测试项描述...">${item.description || ''}</textarea>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button class="cancel-btn px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                            取消
                        </button>
                        <button class="confirm-btn px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            保存
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('edit-description-modal');
        const descriptionInput = modal.querySelector('.description-input');
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const closeBtn = modal.querySelector('.close-modal');
        
        // 聚焦到输入框并选中文本
        descriptionInput.focus();
        descriptionInput.select();
        
        // 关闭模态框
        const closeModal = () => {
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        };

        // ESC键处理函数
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // 绑定ESC键事件
        document.addEventListener('keydown', handleEscKey);
        
        // 点击背景关闭
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        
        // 确认保存
        confirmBtn.addEventListener('click', async () => {
            const newDescription = descriptionInput.value.trim();
            
            try {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...';
                
                await this.updateTestItem(itemId, { description: newDescription });
                closeModal();
                
                if (window.app) {
                    window.app.showSuccess('描述已更新');
                }
            } catch (error) {
                alert('保存失败: ' + error.message);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '保存';
                document.removeEventListener('keydown', handleKeyDown);
            }
        });
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
        
        if (!historyContent) {
            console.warn(`History content element not found for item ${itemId}`);
            return;
        }
        
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
                            ${run.report_url && run.status !== 'DEPLOY_COMPLETE' ? `
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
            'DEPLOY_COMPLETE': 'fa-rocket',
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
            'DEPLOY_COMPLETE': 'text-emerald-600 bg-emerald-50',
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
                            <button class="close-modal text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 text-xl">
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
            const modals = document.querySelectorAll('.fixed.inset-0');
            const modal = modals[modals.length - 1]; // 获取最新插入的modal
            const closeModal = () => {
                modal.remove();
                document.removeEventListener('keydown', handleEscKey);
            };

            // ESC键处理函数
            const handleEscKey = (event) => {
                if (event.key === 'Escape') {
                    closeModal();
                }
            };
            
            // 点击关闭按钮
            modal.querySelector('.close-modal').addEventListener('click', closeModal);
            
            // 绑定ESC键事件
            document.addEventListener('keydown', handleEscKey);
            
            // 点击遮罩层关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

        } catch (error) {
            alert('加载详情失败: ' + error.message);
        }
    }

    static generateMultiColorPieChart(statistic) {
        const { passed, failed, broken, skipped, unknown, total } = statistic;
        
        if (total === 0) {
            return `<svg class="w-40 h-40" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.5" fill="transparent" stroke="#e5e7eb" stroke-width="3"/>
                <text x="21" y="21" text-anchor="middle" dy="0.3em" class="text-sm fill-gray-500">无数据</text>
            </svg>`;
        }
        
        // 计算各部分的角度
        const passedAngle = (passed / total) * 360;
        const failedAngle = (failed / total) * 360;
        const brokenAngle = (broken / total) * 360;
        const skippedAngle = (skipped / total) * 360;
        const unknownAngle = (unknown / total) * 360;
        
        // 累积角度
        let currentAngle = 0;
        const segments = [];
        
        // 添加各个分段
        if (passed > 0) {
            segments.push({
                startAngle: currentAngle,
                endAngle: currentAngle + passedAngle,
                color: '#10b981' // green-500
            });
            currentAngle += passedAngle;
        }
        
        if (failed > 0) {
            segments.push({
                startAngle: currentAngle,
                endAngle: currentAngle + failedAngle,
                color: '#ef4444' // red-500
            });
            currentAngle += failedAngle;
        }
        
        if (broken > 0) {
            segments.push({
                startAngle: currentAngle,
                endAngle: currentAngle + brokenAngle,
                color: '#f97316' // orange-500
            });
            currentAngle += brokenAngle;
        }
        
        if (skipped > 0) {
            segments.push({
                startAngle: currentAngle,
                endAngle: currentAngle + skippedAngle,
                color: '#eab308' // yellow-500
            });
            currentAngle += skippedAngle;
        }
        
        if (unknown > 0) {
            segments.push({
                startAngle: currentAngle,
                endAngle: currentAngle + unknownAngle,
                color: '#6b7280' // gray-500
            });
        }
        
        // 生成SVG路径
        const radius = 15.5;
        const centerX = 21;
        const centerY = 21;
        
        const pathData = segments.map(segment => {
            const startAngleRad = (segment.startAngle - 90) * Math.PI / 180;
            const endAngleRad = (segment.endAngle - 90) * Math.PI / 180;
            
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            
            const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;
            
            return `
                <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z"
                      fill="${segment.color}" stroke="white" stroke-width="1"/>
            `;
        }).join('');
        
        return `
            <svg class="w-40 h-40" viewBox="0 0 42 42">
                ${pathData}
            </svg>
        `;
    }

    static generateSummaryHTML(summaryData) {
        const { reportName, statistic, time } = summaryData;
        
        // 计算测试通过率
        const passRate = statistic.total > 0 ? ((statistic.passed / statistic.total) * 100).toFixed(1) : 0;
        
        // 格式化时间
        const formatDuration = (ms) => {
            if (ms < 1000) return `${ms}ms`;
            if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
            if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
            return `${(ms / 3600000).toFixed(1)}h`;
        };

        const startTime = new Date(time.start).toLocaleString('zh-CN');
        const stopTime = new Date(time.stop).toLocaleString('zh-CN');
        const duration = formatDuration(time.duration);

        return `
            <div class="space-y-6">
                <!-- 报告标题 -->
                <div class="text-center border-b pb-4">
                    <h2 class="text-2xl font-bold text-gray-800">${reportName}</h2>
                </div>

                <!-- 总体统计圆环图和关键指标 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 圆环图区域 -->
                    <div class="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
                        <div class="relative w-40 h-40 mb-4">
                            ${this.generateMultiColorPieChart(statistic)}
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-gray-800">${passRate}%</div>
                                    <div class="text-xs text-gray-600">通过率</div>
                                </div>
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-semibold text-gray-800">${statistic.total}</div>
                            <div class="text-sm text-gray-600">总测试数</div>
                        </div>
                        <!-- 图例 -->
                        <div class="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                <span>通过 (${statistic.passed})</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                <span>失败 (${statistic.failed})</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                                <span>中断 (${statistic.broken})</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                                <span>跳过 (${statistic.skipped})</span>
                            </div>
                            ${statistic.unknown > 0 ? `
                            <div class="flex items-center">
                                <div class="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
                                <span>未知 (${statistic.unknown})</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 详细统计 -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-green-600">${statistic.passed}</div>
                            <div class="text-sm text-green-700 flex items-center justify-center mt-1">
                                <i class="fas fa-check-circle mr-1"></i>通过
                            </div>
                        </div>
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-red-600">${statistic.failed}</div>
                            <div class="text-sm text-red-700 flex items-center justify-center mt-1">
                                <i class="fas fa-times-circle mr-1"></i>失败
                            </div>
                        </div>
                        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-orange-600">${statistic.broken}</div>
                            <div class="text-sm text-orange-700 flex items-center justify-center mt-1">
                                <i class="fas fa-exclamation-triangle mr-1"></i>中断
                            </div>
                        </div>
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-yellow-600">${statistic.skipped}</div>
                            <div class="text-sm text-yellow-700 flex items-center justify-center mt-1">
                                <i class="fas fa-forward mr-1"></i>跳过
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 执行时间信息 -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-800 mb-3 flex items-center">
                        <i class="fas fa-clock mr-2"></i>执行时间信息
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span class="text-blue-700 font-medium">开始时间:</span>
                            <div class="text-blue-900">${startTime}</div>
                        </div>
                        <div>
                            <span class="text-blue-700 font-medium">结束时间:</span>
                            <div class="text-blue-900">${stopTime}</div>
                        </div>
                        <div>
                            <span class="text-blue-700 font-medium">总耗时:</span>
                            <div class="text-blue-900">${duration}</div>
                        </div>
                    </div>
                </div>

                <!-- 性能指标 -->
                ${time.minDuration !== undefined ? `
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 class="font-semibold text-purple-800 mb-3 flex items-center">
                        <i class="fas fa-tachometer-alt mr-2"></i>性能指标
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span class="text-purple-700 font-medium">最短耗时:</span>
                            <div class="text-purple-900">${formatDuration(time.minDuration)}</div>
                        </div>
                        <div>
                            <span class="text-purple-700 font-medium">最长耗时:</span>
                            <div class="text-purple-900">${formatDuration(time.maxDuration)}</div>
                        </div>
                        <div>
                            <span class="text-purple-700 font-medium">累计耗时:</span>
                            <div class="text-purple-900">${formatDuration(time.sumDuration)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    // 测试ESC键功能的简化版本
    static testEscKey() {
        const testModalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="test-esc-modal">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-lg font-bold mb-4">ESC键测试</h3>
                    <p class="mb-4">按ESC键或点击关闭按钮来关闭这个弹窗</p>
                    <button class="close-modal bg-blue-500 text-white px-4 py-2 rounded">关闭</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', testModalHtml);
        
        const modal = document.getElementById('test-esc-modal');
        const closeModal = () => {
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        };
        
        const handleEscKey = (event) => {
            console.log('Key pressed:', event.key); // 调试用
            if (event.key === 'Escape') {
                closeModal();
            }
        };
        
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        document.addEventListener('keydown', handleEscKey);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    static async showReportPreview(reportUrl) {
        // 定义ESC键处理函数（在函数顶层，确保作用域正确）
        let currentEscHandler = null;

        // 通用的关闭模态框函数
        const closeModal = () => {
            const modal = document.getElementById('report-preview-modal');
            if (modal) {
                modal.remove();
            }
            if (currentEscHandler) {
                document.removeEventListener('keydown', currentEscHandler);
                currentEscHandler = null;
            }
        };

        // ESC键处理函数
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };

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

            // 获取模态框元素并绑定事件
            let modal = document.getElementById('report-preview-modal');
            
            // 设置当前的ESC处理函数
            currentEscHandler = handleEscKey;
            
            // 绑定事件
            modal.querySelector('.close-modal').addEventListener('click', closeModal);
            document.addEventListener('keydown', currentEscHandler);
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            // 构建summary.json的URL
            const summaryUrl = reportUrl.endsWith('/') ? reportUrl + 'widgets/summary.json' : reportUrl + '/widgets/summary.json';
            
            // 获取summary数据
            const response = await fetch(summaryUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const summaryData = await response.json();
            
            // 生成统计数据的HTML
            const summaryContent = this.generateSummaryHTML(summaryData);

            // 更新模态框内容
            modal = document.getElementById('report-preview-modal');
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

            // 重新绑定关闭按钮事件（ESC键事件已经在上面绑定了）
            modal.querySelector('.close-modal').addEventListener('click', closeModal);

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

                // 重新绑定关闭按钮事件（ESC键事件已经在上面绑定了）
                modal.querySelector('.close-modal').addEventListener('click', closeModal);
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
