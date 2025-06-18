// API 调用封装
export class API {
    static baseURL = '/api/v1';

    static async request(method, endpoint, data = null) {
        const token = localStorage.getItem('crat_token');
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            
            // 处理401错误 - 令牌过期
            if (response.status === 401) {
                // 简化处理：直接跳转到登录页面而不尝试刷新
                localStorage.removeItem('crat_token');
                localStorage.removeItem('crat_user_email');
                localStorage.removeItem('crat_is_admin');
                window.location.href = '/login';
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API ${method} ${endpoint} failed:`, error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request('GET', endpoint);
    }

    static async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    static async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    static async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    // 构建信息相关API
    static async getBuildInfo(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/builds?${queryString}` : '/builds';
        return this.get(endpoint);
    }

    static async getJobNames() {
        return this.get('/builds/job-names');
    }

    static async getBuildsByJobName(jobName) {
        return this.get(`/builds/job/${encodeURIComponent(jobName)}`);
    }

    static async getLatestBuildByJobName(jobName) {
        return this.get(`/builds/job/${encodeURIComponent(jobName)}/latest`);
    }

    static async deleteBuildInfo(buildId) {
        console.log(`API: 正在调用删除构建信息接口 - ID: ${buildId}`);
        try {
            const result = await this.delete(`/builds/${buildId}`);
            console.log(`API: 删除构建信息成功 - ID: ${buildId}`, result);
            return result;
        } catch (error) {
            console.error(`API: 删除构建信息失败 - ID: ${buildId}`, error);
            throw error;
        }
    }

    static async addJobName(jobName) {
        console.log(`API: 正在添加Job名称: ${jobName}`);
        try {
            const result = await this.post('/builds/job-names', { job_name: jobName });
            console.log(`API: 添加Job名称成功: ${jobName}`, result);
            return result;
        } catch (error) {
            console.error(`API: 添加Job名称失败: ${jobName}`, error);
            throw error;
        }
    }

    static async deleteJobName(jobName) {
        console.log(`API: 正在删除Job名称: ${jobName}`);
        try {
            const result = await this.delete(`/builds/job-names/${encodeURIComponent(jobName)}`);
            console.log(`API: 删除Job名称成功: ${jobName}`, result);
            return result;
        } catch (error) {
            console.error(`API: 删除Job名称失败: ${jobName}`, error);
            throw error;
        }
    }

    // 测试项相关API
    static async getTestItems() {
        return this.get('/test-items');
    }

    static async createTestItem(testItem) {
        return this.post('/test-items', testItem);
    }

    static async updateTestItem(id, updates) {
        return this.put(`/test-items/${id}`, updates);
    }

    static async deleteTestItem(id) {
        return this.delete(`/test-items/${id}`);
    }    static async triggerTest(testItemId, buildInfoId) {
        return this.post(`/test-items/${testItemId}/deploy-test`, {
            build_info_id: buildInfoId
        });
    }

    static async triggerDeployTest(testItemId, buildInfoId) {
        return this.post(`/test-items/${testItemId}/deploy-test`, {
            build_info_id: buildInfoId
        });
    }

    static async getTestRuns(testItemId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/test-items/${testItemId}/deploy-runs?${queryString}` : `/test-items/${testItemId}/deploy-runs`;
        return this.get(endpoint);
    }

    static async getDeployTestRuns(testItemId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/test-items/${testItemId}/deploy-runs?${queryString}` : `/test-items/${testItemId}/deploy-runs`;
        return this.get(endpoint);
    }

    static async getTestRun(runId) {
        return this.get(`/deploy-test-runs/${runId}`);
    }

    static async getDeployTestRun(runId) {
        return this.get(`/deploy-test-runs/${runId}`);
    }

    static async clearDeployTestHistory(testItemId) {
        return this.delete(`/test-items/${testItemId}/deploy-history`);
    }

    // 系统设置相关API
    static async getSystemSettings() {
        return this.get('/settings');
    }

    static async updateSystemSettings(settings) {
        return this.put('/settings', settings);
    }

    static async getSystemSetting(key) {
        return this.get(`/settings/${key}`);
    }

    static async updateSystemSetting(key, value, description = '') {
        return this.put(`/settings/${key}`, { value, description });
    }
}
