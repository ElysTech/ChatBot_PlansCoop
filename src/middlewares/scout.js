let startTime = "";
let calculatedQuotations = 0;
let metrics = {
    totalMessages: 0,
    failedMessages: 0,
    reconnections: 0,
    lastFailure: null,
    failures: [],
    messagesByHour: {},
    peakUsage: { hour: null, count: 0 },
    avgResponseTime: [],
    systemResources: { cpu: 0, memory: 0 }
};

class Scout {
    static async getMenu(state) {
        let response = "*📊 MÉTRICAS DO SISTEMA*\n\n";

        // Uptime
        let upTime = this.getUptime();
        if (upTime.error) {
            response += `*⏱️ Uptime:* ${upTime.message}\n`;
        } else {
            response += `*⏱️ Uptime:* ${upTime.formatted}\n`;
        }

        // Métricas de uso
        response += `\n*📈 MÉTRICAS DE USO*\n`;
        response += `*Mensagens processadas:* ${metrics.totalMessages}\n`;
        response += `*Cotações calculadas:* ${calculatedQuotations}\n`;
        response += `*Taxa de sucesso:* ${this.getSuccessRate()}%\n`;
        response += `*Horário de pico:* ${metrics.peakUsage.hour || 'N/A'} (${metrics.peakUsage.count} msgs)\n`;

        // Métricas de conexão
        response += `\n*🔌 MÉTRICAS DE CONEXÃO*\n`;
        response += `*Reconexões:* ${metrics.reconnections}\n`;
        response += `*Taxa de mensagens perdidas:* ${this.getFailureRate()}%\n`;
        response += `*Tempo médio entre falhas:* ${this.getMTBF()}\n`;
        response += `*Última falha:* ${this.getLastFailure()}\n`;

        // Performance
        response += `\n*⚡ PERFORMANCE*\n`;
        response += `*Tempo médio de resposta:* ${this.getAvgResponseTime()}ms\n`;
        response += `*CPU:* ${metrics.systemResources.cpu.toFixed(1)}%\n`;
        response += `*Memória:* ${metrics.systemResources.memory.toFixed(1)}MB\n`;

        // Reset estado
        Object.assign(state, {
            currentMenu: 'main',
            hasShownWelcome: false,
            selectedCity: null,
            previousInput: null,
            cliente: null
        });

        return response;
    }
    
    static setStartedTime(time) {
        startTime = time;
    }

    static addQuotation() {
        calculatedQuotations++;
    }

    static resetQuotation() {
        calculatedQuotations = 0;
    }

    // Novas funções de métricas
    static recordMessage(success = true, responseTime = null) {
        metrics.totalMessages++;
        if (!success) metrics.failedMessages++;
        
        const hour = new Date().getHours();
        metrics.messagesByHour[hour] = (metrics.messagesByHour[hour] || 0) + 1;
        
        // Atualiza horário de pico
        if (metrics.messagesByHour[hour] > metrics.peakUsage.count) {
            metrics.peakUsage.hour = `${hour}:00`;
            metrics.peakUsage.count = metrics.messagesByHour[hour];
        }
        
        if (responseTime) {
            metrics.avgResponseTime.push(responseTime);
            if (metrics.avgResponseTime.length > 100) {
                metrics.avgResponseTime.shift();
            }
        }
    }

    static recordReconnection() {
        metrics.reconnections++;
    }

    static recordFailure() {
        const now = new Date();
        metrics.lastFailure = now;
        metrics.failures.push(now);
        
        // Mantém apenas últimas 10 falhas
        if (metrics.failures.length > 10) {
            metrics.failures.shift();
        }
    }

    static updateSystemResources() {
        const used = process.memoryUsage();
        metrics.systemResources.memory = used.heapUsed / 1024 / 1024;
        
        // CPU real usando process
        const usage = process.cpuUsage();
        const totalUsage = usage.user + usage.system;
        const elapsedTime = process.uptime() * 1000000; // Convert to microseconds
        metrics.systemResources.cpu = (totalUsage / elapsedTime) * 100;
    }

    static getSuccessRate() {
        if (metrics.totalMessages === 0) return 100;
        return ((metrics.totalMessages - metrics.failedMessages) / metrics.totalMessages * 100).toFixed(2);
    }

    static getFailureRate() {
        if (metrics.totalMessages === 0) return 0;
        return (metrics.failedMessages / metrics.totalMessages * 100).toFixed(2);
    }

    static getMTBF() {
        if (metrics.failures.length < 2) return "N/A";
        
        let totalTime = 0;
        for (let i = 1; i < metrics.failures.length; i++) {
            totalTime += metrics.failures[i] - metrics.failures[i-1];
        }
        
        const avgMs = totalTime / (metrics.failures.length - 1);
        const hours = Math.floor(avgMs / 3600000);
        const minutes = Math.floor((avgMs % 3600000) / 60000);
        
        return `${hours}h ${minutes}m`;
    }

    static getLastFailure() {
        if (!metrics.lastFailure) return "Nenhuma";
        
        const diff = new Date() - metrics.lastFailure;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        
        return `Há ${hours}h ${minutes}m`;
    }

    static getAvgResponseTime() {
        if (metrics.avgResponseTime.length === 0) return 0;
        const sum = metrics.avgResponseTime.reduce((a, b) => a + b, 0);
        return (sum / metrics.avgResponseTime.length).toFixed(0);
    }

    static getUptime() {
        if (!startTime) {
            return { 
                error: true, 
                message: "Erro ao obter uptime"
            };
        }

        const startDate = new Date(startTime);
        const currentDate = new Date();
        const diffMs = currentDate - startDate;
        
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        return {
            error: false,
            milliseconds: diffMs,
            seconds: seconds,
            minutes: minutes,
            hours: hours,
            days: days,
            formatted: `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`,
        };
    }
}

// Atualiza recursos a cada 5 segundos
setInterval(() => Scout.updateSystemResources(), 5000);

module.exports = Scout;