import { API } from '../api.js';

export class ParameterSets {
    static parameterSets = [];
    static currentEditingId = null;

    static async loadParameterSets() {
        try {
            const response = await API.getParameterSets();
            this.parameterSets = (response.data || []).sort((a, b) => a.name.localeCompare(b.name));
            this.renderParameterSets();
        } catch (error) {
            console.error('Failed to load parameter sets:', error);
            throw error;
        }
    }

    static renderParameterSets() {
        const container = document.getElementById('parameterSetsList');
        if (!container) return;

        if (this.parameterSets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>暂无参数集配置</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.parameterSets.map(paramSet => `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="text-lg font-medium text-gray-900">${paramSet.name}</h3>
                        <p class="text-sm text-gray-500 mt-1">${paramSet.description || '无描述'}</p>
                        <div class="mt-3">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                ${this.renderParameters(paramSet.parameters)}
                            </div>
                        </div>
                    </div>
                    <div class="ml-4 flex space-x-2" ${window.app?.isAdmin ? '' : 'style="display: none;"'}>
                        <button 
                            onclick="ParameterSets.editParameterSet(${paramSet.id})"
                            class="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                            编辑
                        </button>
                        <button 
                            onclick="ParameterSets.deleteParameterSet(${paramSet.id})"
                            class="text-red-600 hover:text-red-900 text-sm font-medium"
                            ${paramSet.name === 'default' ? 'disabled class="text-gray-400 cursor-not-allowed"' : ''}
                        >
                            删除
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    static renderParameters(parametersJson) {
        if (!parametersJson) return '<p class="text-gray-500 col-span-2">无参数配置</p>';
        
        let parameters;
        try {
            parameters = typeof parametersJson === 'string' ? JSON.parse(parametersJson) : parametersJson;
        } catch (e) {
            return '<p class="text-red-500 col-span-2">参数格式错误</p>';
        }

        return Object.entries(parameters).map(([key, value]) => `
            <div>
                <span class="font-medium text-gray-700">${this.getParameterLabel(key)}:</span>
                <span class="text-gray-600">${value || '(空)'}</span>
            </div>
        `).join('');
    }

    static getParameterLabel(key) {
        const labels = {
            service_name: '服务名称',
            install_dir: '安装目录',
            upgrade_type: '升级类型',
            test_path: '测试用例路径',
            base_url: '报告基础URL',
            report_keyword: '测试报告前缀(默认服务名称)'
        };
        return labels[key] || key;
    }

    static showCreateForm() {
        this.currentEditingId = null;
        document.getElementById('parameterSetForm').reset();
        document.getElementById('parameterSetModalTitle').textContent = '创建参数集';
        document.getElementById('parameterSetModal').classList.remove('hidden');
    }

    static async editParameterSet(id) {
        try {
            const response = await API.getParameterSet(id);
            const paramSet = response.data;
            
            this.currentEditingId = id;
            document.getElementById('parameterSetModalTitle').textContent = '编辑参数集';
            
            // 填充表单
            document.getElementById('paramSetName').value = paramSet.name;
            document.getElementById('paramSetDescription').value = paramSet.description || '';
            
            // 解析并填充参数
            let parameters;
            try {
                parameters = typeof paramSet.parameters === 'string' ? 
                    JSON.parse(paramSet.parameters) : paramSet.parameters;
            } catch (e) {
                parameters = {};
            }
            
            document.getElementById('serviceName').value = parameters.service_name || '';
            document.getElementById('installDir').value = parameters.install_dir || '';
            document.getElementById('upgradeType').value = parameters.upgrade_type || 'full';
            document.getElementById('testPath').value = parameters.test_path || '';
            document.getElementById('baseUrl').value = parameters.base_url || '';
            document.getElementById('reportKeyword').value = parameters.report_keyword || '';
            
            document.getElementById('parameterSetModal').classList.remove('hidden');
        } catch (error) {
            alert('加载参数集失败: ' + error.message);
        }
    }

    static async saveParameterSet(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const parameterSet = {
            name: formData.get('name'),
            description: formData.get('description'),
            parameters: {
                service_name: formData.get('service_name'),
                install_dir: formData.get('install_dir'),
                upgrade_type: formData.get('upgrade_type'),
                test_path: formData.get('test_path'),
                base_url: formData.get('base_url'),
                report_keyword: formData.get('report_keyword')
            }
        };

        try {
            if (this.currentEditingId) {
                await API.updateParameterSet(this.currentEditingId, parameterSet);
            } else {
                await API.createParameterSet(parameterSet);
            }
            
            this.hideModal();
            await this.loadParameterSets();
            alert(this.currentEditingId ? '参数集更新成功' : '参数集创建成功');
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    }

    static async deleteParameterSet(id) {
        const paramSet = this.parameterSets.find(p => p.id === id);
        if (!paramSet) return;

        if (paramSet.name === 'default') {
            alert('不能删除默认参数集');
            return;
        }

        if (!confirm(`确定要删除参数集 "${paramSet.name}" 吗？`)) {
            return;
        }

        try {
            await API.deleteParameterSet(id);
            await this.loadParameterSets();
            alert('参数集删除成功');
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    static hideModal() {
        document.getElementById('parameterSetModal').classList.add('hidden');
        this.currentEditingId = null;
    }

    static init() {
        // 设置事件监听器
        const form = document.getElementById('parameterSetForm');
        if (form) {
            form.addEventListener('submit', (e) => this.saveParameterSet(e));
        }

        const createBtn = document.getElementById('createParameterSetBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateForm());
        }

        const cancelBtn = document.getElementById('cancelParameterSetBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        // 点击模态框外部关闭
        const modal = document.getElementById('parameterSetModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }
}

// 暴露到全局供HTML调用
window.ParameterSets = ParameterSets;