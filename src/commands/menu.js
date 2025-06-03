const path = require('path');
const Scout = require('../middlewares/scout.js');

const MENU_MODULES = {
    1: { path: './quotation/menuCotacao', name: 'cotacao' },
    2: { path: './menuTables', name: 'tabelas' },
    3: { path: './menuSupport', name: 'suporte' },
    4: { path: './menuTraining', name: 'treinamento' },
    5: { path: './menuPartnerRegistration', name: 'parceiro' },
    6: { path: './menuAwards', name: 'premiacoes' },
    8068: { path: '../middlewares/scout.js', name: 'scout' },
};

class Menu {
    static async execute(userInput, state) {
        if (userInput.from && userInput.from.endsWith('@g.us')) {
            return;
        }
        if (state.from && state.from.endsWith('@g.us')) {
            return;
        }
        
        if (!state.hasShownWelcome) {
            state.hasShownWelcome = true;
            return {
                image: { url: path.resolve('./docs/images/Hapminas.jpeg') },
                caption: "Oi, sou a Íris, assistente virtual Hapminas 🤖💜\n\n" + this.getMainMenu()
            };
        }

        if (state.currentMenu !== 'main' && userInput.toLowerCase() === 'q') {
            this.resetState(state);
            return {
                image: { url: path.resolve('./docs/images/Hapminas.jpeg') },
                caption: "Oi, sou a Íris, assistente virtual Hapminas 🤖💜\n\n" + this.getMainMenu()
            };
        }

        if (state.currentMenu !== 'main') {
            try {
                const currentModule = Object.values(MENU_MODULES).find(m => 
                    state.currentMenu.startsWith(m.name)
                );

                if (currentModule) {
                    const menuModule = require(currentModule.path);
                    const response = await menuModule.execute(userInput, state);
                    
                    if (response === null) {
                        this.resetState(state);
                        
                        return {
                            image: { url: path.resolve('./docs/images/Hapminas.jpeg') },
                            caption: "Oi, sou a Íris, assistente virtual Hapminas 🤖💜\n\n" + this.getMainMenu()
                        };
                    }
                    return response;
                }
            } catch (error) {
                Scout.recordFailure('error_in_menu_module');
                console.error('Erro ao executar módulo:', error);
                return "⚠️ Desculpe, ocorreu um erro ao processar sua solicitação. Digite `Q` para voltar ao início. \n *Erro [menu_57-59]*";
            }
        }

        return this.handleMainMenu(userInput, state);
    }

    static resetState(state) {
        Object.assign(state, {
            currentMenu: 'main',
            hasShownWelcome: true,
            selectedCity: null,
            previousInput: null
        });
    }

    static handleMainMenu(userInput, state) {
        const option = parseInt(userInput);

        if (isNaN(option) || option < 1) {
            return "⚠️ Opção inválida. Por favor, escolha uma opção válida:\n\n" + this.getMainMenu();
        }

        if (option === 7) {
            this.resetState(state);
            state.hasShownWelcome = false;
            return "👋 Obrigado por usar nossos serviços. Até logo!";
        }

        const menuModule = MENU_MODULES[option];
        if (menuModule) {
            try {
                const module = require(menuModule.path);
                state.currentMenu = menuModule.name;
                return module.getMenu(state);
            } catch (error) {
                Scout.recordFailure('error_in_menu_module');
                console.error('Erro ao carregar módulo:', error);
                return "⚠️ Desculpe, esta opção não está indisponível ainda.";
            }
        }

        return "Esta funcionalidade será implementada em breve.";
    }

    static getMainMenu() {
        return this.formatMenu({
            title: "Como posso te ajudar? Verifique as opções abaixo!",
            options: {
                1: "Cotação",
                2: "Tabelas",
                3: "Suporte",
                4: "Treinamento",
                5: "Cadastre-se",
                6: "Consultar Premiação",
                7: "Sair"
            }
        });
    }

    static formatMenu(menuData) {
        let response = `${menuData.title}\n\n`;
        Object.entries(menuData.options).forEach(([key, value]) => {
            response += `${key} - ${value}\n`;
        });
        return response;
    }
}

module.exports = Menu;