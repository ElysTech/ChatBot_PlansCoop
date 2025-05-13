const suport_Vcard = (
    'BEGIN:VCARD\n' // metadata of the contact card
    + 'VERSION:3.0\n' 
    + 'FN:PlansCoop\n' // full name
    + 'ORG:PlansCoop\n' // the organization of the contact
    + 'TEL;type=CELL;type=VOICE;waid=5531993661077:+55 31993661077\n' // WhatsApp ID + phone number
    + 'END:VCARD'
);

class MenuSuporte {
    static async execute(userInput, state) {
        if (userInput && userInput.toLowerCase() === 'q') {
            return this.resetAndReturnToMain(state);
        }

        if (userInput && state.currentMenu === 'suporte') {
            switch(userInput) {
                case '1':
                    this.resetState(state)
                    return [
                        {
                            contacts: { 
                                displayName: 'PlansCoop',
                                contacts: [{vcard: suport_Vcard}]
                            }
                        },
                        {
                            text: `💼 Aqui está o contato para suporte comercial.\nLigue para nós ou envie uma mensagem!`
                        },
                        {text: '_Atendimento Encerrado_ \n👋 Obrigado por usar nossos serviços. Até logo!'}
                    ];
                    
                case '2':
                    this.resetState(state)
                    return [
                        {
                            contacts: { 
                                displayName: 'PlansCoop',
                                contacts: [{vcard: suport_Vcard}]
                            }
                        },
                        {
                            text: '💼 Aqui está o contato para suporte financeiro.\nLigue para nós ou envie uma mensagem! \n\n'
                        },
                        {text: '_Atendimento Encerrado_ \n👋 Obrigado por usar nossos serviços. Até logo!'}

                    ];

                case '3':
                    this.resetState(state)
                    state.hasShownWelcome = false;
                    return [
                        {
                            contacts: { 
                                displayName: 'PlansCoop',
                                contacts: [{vcard: suport_Vcard}]
                            }
                        },
                        {
                            text: `💼 Aqui está o contato para suporte de cadastro.\nLigue para nós ou envie uma mensagem! \n\n`
                        },
                        {text: '_Atendimento Encerrado_ \n👋 Obrigado por usar nossos serviços. Até logo!'}

                    ];

                default:
                    return "⚠️ Opção inválida. Por favor, escolha uma opção válida:\n\n" + this.getMenu();
            }
        }
        
        // Se chegou até aqui, exibe o menu principal de suporte
        state.currentMenu = 'suporte';
        return this.getMenu();
    }

    static resetAndReturnToMain(state) {
        this.resetState(state);
        return null; // Retorna null para que o MessageHandler reinicie o menu principal
    }

    static resetState(state) {
        Object.assign(state, {
            currentMenu: 'main',
            hasShownWelcome: false,
            selectedCity: null,
            previousInput: null
        });
        return null;
    }

    static getMenu() {
        return this.formatMenu({
            title: "🎧 Menu de Suporte",
            options: {
                '1': "Suporte Comercial",
                '2': "Suporte Financeiro",
                '3': "Suporte de Cadastro",
                'Q': "_Voltar ao Menu Principal_"
            }
        });
    }

    static formatMenu(menuData) {
        let response = `${menuData.title}\n\n`;
        Object.entries(menuData.options).forEach(([key, value]) => {
            response += `*${key}* - ${value}\n`;
        });
        return response;
    }
}

module.exports = MenuSuporte;