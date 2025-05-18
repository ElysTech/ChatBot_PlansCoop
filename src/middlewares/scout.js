let startTime = "";
let calculatedQuotations = 0;

class Scout {
    /**
     * Inicia o Scout e processa o estado
     * @param {Array} state - O estado da aplicação
     * @returns {Array} - Resposta processada
     */
    static async getMenu(state) {
        let response = "";

        //* Cálcula o tempo de atividade
        let upTime = this.getUptime();
        if (upTime.error) {
            response += (`*Uptime:* ` + upTime.message + `\n`);
        } else {
            response += (`*Uptime:* ` + upTime.formatted + `\n`);
        }

        //* Calcula o número de cotações
        response += (`*Calculated quotations:* ` + calculatedQuotations + `\n`);
        

        //*apaga o estado para voltar ao menu principal
        Object.assign(state, {
            currentMenu: 'main',
            hasShownWelcome: false,
            selectedCity: null,
            previousInput: null,
            cliente: null
        });

        //* Retorna a resposta
        return response;
    }
    
    /**
     * Define o tempo de início da aplicação
     * @param {string} time - Horário de início no formato de string
     */
    static setStartedTime(time) {
        startTime = time;
    }

    /**
     * Incrementa o contador de quotations
     */
    static addQuotation() {
        calculatedQuotations = calculatedQuotations + 1;
    }

    /**
     * Reseta o contador de quotations
     */
    static resetQuotation() {
        calculatedQuotations = 0;
    }


    /**
     * Calcula o tempo de atividade desde o início
     * @returns {Object} - Objeto contendo o tempo de atividade em vários formatos
     */
    static getUptime() {
        if (!startTime) {
            return { 
                error: true, 
                message: "An error occurred while getting aplication uptime."
            };
        }

        const startDate = new Date(startTime);
        const currentDate = new Date();
        
        // Calcula a diferença em milissegundos
        const diffMs = currentDate - startDate;
        
        // Converte para unidades de tempo
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

module.exports = Scout;