const premiacoes_Vcard = (
    'BEGIN:VCARD\n' // metadata of the contact card
    + 'VERSION:3.0\n' 
    + 'FN:PlansCoop\n' // full name
    + 'ORG:PlansCoop\n' // the organization of the contact
    + 'TEL;type=CELL;type=VOICE;waid=5531993661077:+55 31993661077\n' // WhatsApp ID + phone number
    + 'END:VCARD'
);

class MenuPremiações {
    static async execute(userInput, state) {
        if (userInput && userInput.toLowerCase() === 'q') {
            return this.resetAndReturnToMain(state);
        }
    }

    static resetAndReturnToMain(state) {
        this.resetState(state);
        return null; // Retorna null para que o MessageHandler reinicie o menu principal
    }

    static resetState(state) {
        Object.assign(state, {
            currentMenu: 'main',
            hasShownWelcome: true,
            selectedCity: null,
            previousInput: null
        });
        return null;
    }

    static getMenu() {
        return [
            {
                contacts: { 
                    displayName: 'PlansCoop',
                    contacts: [{vcard: premiacoes_Vcard}]
                }
            },
            {
                text: `🏆 Aqui estão as premiações disponíveis:\n\n _Digite "*Q*" para voltar ao menu principal_`
            }
        ];
    }

    static formatMenu(menuData) {
        let response = `${menuData.title}\n\n`;
        Object.entries(menuData.options).forEach(([key, value]) => {
            response += `*${key}* - ${value}\n`;
        });
        return response;
    }
}

module.exports = MenuPremiações;