// Importa a tabela de preços 
const tabelaHappyVidaPJ = require('./tableHappyVidaPJ');
// Importa o mód. PF
const cotacaoPF = require('./cotacaoPF')

class MenuCotacao {
    static async execute(userInput, state) {
        // Inicializa o objeto de cliente no estado se não existir
        if (!state.cliente) {
            state.cliente = {};
        }

        let cliente = state.cliente;
        const lowerCaseUserInput = userInput.toLowerCase();

        // Voltar ao menu principal se digitar 'q'
        if (lowerCaseUserInput === 'q') {
            this.resetState(state);
            return null;
        }

        // Se for primeira interação, exibe menu principal de cotação
        if (!cliente.lastQuestion) {
            cliente.lastQuestion = 'peopleType'; // Definir a próxima pergunta imediatamente
            return this.getMenu();
        }

        if (cliente.lastQuestion === 'peopleType') {
            switch (userInput) {
                case '1':
                    cliente.peopleType = 'PF';
                    break
                case '2':
                    cliente.peopleType = 'PJ';
                    break
            }
        }

        //* SE FOR PJ, MANTEM O FLUXO DE COTAÇÃO AQUI
        // Processa as respostas baseado na última pergunta feita
        if (cliente.peopleType === 'PJ') {
            switch (cliente.lastQuestion) {
                case 'peopleType':
                    cliente.lastQuestion = 'cidade';
                    return "Para qual cidade deseja a cotação?\n\n 1 - Belo Horizonte\n 2 - Triângulo Mineiro";
                case 'cidade':
                    return this.processarCidade(lowerCaseUserInput, state);
                case 'qtdBeneficiario':
                    return this.processarQuantidadeBeneficiarios(lowerCaseUserInput, state);
                case 'tipoPlano':
                    return this.processarTipoPlano(lowerCaseUserInput, state);
                case 'coparticipacao':
                    return this.processarCoparticipacao(lowerCaseUserInput, state);
                case 'segmentacao':
                    return this.processarSegmentacao(lowerCaseUserInput, state);
                case 'acomodacao':
                    return this.processarAcomodacao(lowerCaseUserInput, state);
                case 'assistencia':
                    return this.processarAssistencia(lowerCaseUserInput, state);
                case 'idades':
                    return this.processarIdades(lowerCaseUserInput, state);
                case 'confirmar':
                    return this.processarConfirmacao(lowerCaseUserInput, state);
                default:
                    return "⚠️ menuCotacao.js:62 -> Ocorreu um erro. Por favor, digite 'Q' para reiniciar.";
            }
        } else if (cliente.peopleType === 'PF') {
            //! SE O CLIENTE É PF, MANDA PARA O MÓDULO DE COTAÇÃO PF
            return cotacaoPF.execute(userInput, state);
        } else {
            // Se o tipo de pessoa não for PF ou PJ, retorna mensagem de erro
            return "⚠️ menuCotacao.js:69 -> Ocorreu um erro. Por favor, digite 'Q' para reiniciar.";
        }
    }

    // Processa a escolha da cidade
    static processarCidade(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1':
                cliente.cidade = 'Belo Horizonte';
                cliente.lastQuestion = 'qtdBeneficiario';
                return this.perguntarQuantidadeBeneficiarios(cliente);
            case '2':
                cliente.cidade = 'Triângulo Mineiro';
                cliente.lastQuestion = 'qtdBeneficiario';
                return this.perguntarQuantidadeBeneficiarios(cliente);
            default:
                return "⚠️ menuCotacao.js:108 -> Opção inválida. Por favor, escolha 1 para Belo Horizonte ou 2 para Triângulo Mineiro.";
        }
    }

    // Formulário para quantidade de beneficiários baseado no tipo de pessoa
    static perguntarQuantidadeBeneficiarios(cliente) {
        if (cliente.peopleType === 'PJ') {
            return "Qual a quantidade de beneficiários?\n\n 1 - 2 a 29 pessoas\n 2 - 30 a 99 pessoas";
        } else {
            // Para PF, vamos direto para o tipo de plano
            cliente.qtdBeneficiario = '1';
            cliente.lastQuestion = 'tipoPlano';
            return "Qual plano deseja contratar?\n\n 1 - Nosso Plano\n 2 - Nosso Médico";
        }
    }

    // Processa a quantidade de beneficiários
    static processarQuantidadeBeneficiarios(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1':
                cliente.qtdBeneficiario = '2-29';
                cliente.lastQuestion = 'tipoPlano';
                return "Qual plano deseja contratar?\n\n 1 - Nosso Plano\n 2 - Nosso Médico";
            case '2':
                cliente.qtdBeneficiario = '30-99';
                cliente.lastQuestion = 'tipoPlano';
                return "Qual plano deseja contratar?\n\n 1 - Nosso Plano\n 2 - Nosso Médico";
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para 2-29 pessoas ou 2 para 30-99 pessoas.";
        }
    }

    // Processa o tipo de plano
    static processarTipoPlano(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1':
                cliente.tipoPlano = 'Nosso Plano';
                cliente.lastQuestion = 'coparticipacao';
                return "Qual tipo de coparticipação?\n\n 1 - Com Coparticipação (Total)\n 2 - Com Coparticipação Parcial";
            case '2':
                cliente.tipoPlano = 'Nosso Médico';
                cliente.lastQuestion = 'coparticipacao';
                return "Qual tipo de coparticipação?\n\n 1 - Com Coparticipação (Total)\n 2 - Com Coparticipação Parcial";
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Nosso Plano ou 2 para Nosso Médico.";
        }
    }

    // Processa a coparticipação
    static processarCoparticipacao(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1':
                cliente.coparticipacao = 'Total';
                cliente.lastQuestion = 'segmentacao';
                return this.perguntarSegmentacao(cliente);
            case '2':
                cliente.coparticipacao = 'Parcial';
                cliente.lastQuestion = 'segmentacao';
                return this.perguntarSegmentacao(cliente);
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Coparticipação Total ou 2 para Coparticipação Parcial.";
        }
    }

    // Pergunta sobre a segmentação com base no tipo de plano
    static perguntarSegmentacao(cliente) {
        if (cliente.tipoPlano === 'Nosso Médico') {
            // Nosso Médico só tem uma opção de segmentação
            cliente.segmentacao = 'AMB+HOSP+OBST';
            cliente.lastQuestion = 'acomodacao';
            return "Qual acomodação deseja?\n\n 1 - Enfermaria\n 2 - Apartamento";
        } else if (cliente.tipoPlano === 'Nosso Plano') {
            // Nosso Plano tem duas opções
            return "Qual segmentação deseja?\n\n 1 - AMB (Ambulatorial)\n 2 - AMB+HOSP+OBST (Ambulatorial+Hospitalar+Obstetrícia)";
        }
    }

    // Processa a segmentação
    static processarSegmentacao(userInput, state) {
        const cliente = state.cliente;

        if (cliente.tipoPlano === 'Nosso Plano') {
            switch (userInput) {
                case '1':
                    cliente.segmentacao = 'AMB';
                    cliente.lastQuestion = 'acomodacao';
                    // Para AMB, só existe S/ACOM
                    cliente.acomodacao = 'S/ACOM';
                    
                    // Verifica se precisa perguntar assistência
                    if (cliente.cidade === 'Triângulo Mineiro' && 
                        cliente.qtdBeneficiario === '30-99' && 
                        cliente.coparticipacao === 'Total') {
                        cliente.lastQuestion = 'assistencia';
                        return "Qual a assistência desejada?\n\n 1 - Médico 1\n 2 - Médico 2";
                    } else {
                        cliente.lastQuestion = 'idades';
                        return "Informe as idades dos beneficiários separando por vírgula (exemplo: 18, 25, 30):";
                    }
                    
                case '2':
                    cliente.segmentacao = 'AMB+HOSP+OBST';
                    cliente.lastQuestion = 'acomodacao';
                    return "Qual acomodação deseja?\n\n 1 - Enfermaria\n 2 - Apartamento";
                default:
                    return "⚠️ Opção inválida. Por favor, escolha 1 para AMB ou 2 para AMB+HOSP+OBST.";
            }
        }
    }

    // Processa a acomodação
    static processarAcomodacao(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1':
                cliente.acomodacao = 'ENFERM';
                break;
            case '2':
                cliente.acomodacao = 'APART';
                break;
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Enfermaria ou 2 para Apartamento.";
        }

        // Verifica se precisa perguntar assistência
        if (this.devePerguntarAssistencia(cliente)) {
            cliente.lastQuestion = 'assistencia';
            return "Qual a assistência desejada?\n\n 1 - Médico 1\n 2 - Médico 2";
        } else {
            cliente.lastQuestion = 'idades';
            return "Informe as idades dos beneficiários separando por vírgula (exemplo: 18, 25, 30):";
        }
    }

    // Verifica se deve perguntar sobre assistência
    static devePerguntarAssistencia(cliente) {
        // Belo Horizonte, 30-99 vidas, após acomodação
        if (cliente.cidade === 'Belo Horizonte' && cliente.qtdBeneficiario === '30-99') {
            return true;
        }
        
        // Triângulo Mineiro, 30-99 vidas, Nosso Médico, após acomodação
        if (cliente.cidade === 'Triângulo Mineiro' && 
            cliente.qtdBeneficiario === '30-99' && 
            cliente.tipoPlano === 'Nosso Médico') {
            return true;
        }
        
        // Triângulo Mineiro, 30-99 vidas, Nosso Plano, COM COPARTICIPAÇÃO, AMB+HOSP+OBST
        if (cliente.cidade === 'Triângulo Mineiro' && 
            cliente.qtdBeneficiario === '30-99' && 
            cliente.tipoPlano === 'Nosso Plano' && 
            cliente.coparticipacao === 'Total' && 
            cliente.segmentacao === 'AMB+HOSP+OBST') {
            return true;
        }
        
        return false;
    }

    // Processa a assistência
    static processarAssistencia(userInput, state) {
        const cliente = state.cliente;
        
        switch (userInput) {
            case '1':
                cliente.assistencia = 'medico 1';
                break;
            case '2':
                cliente.assistencia = 'medico 2';
                break;
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Médico 1 ou 2 para Médico 2.";
        }
        
        cliente.lastQuestion = 'idades';
        return "Informe as idades dos beneficiários separando por vírgula (exemplo: 18, 25, 30):";
    }

    // Processa as idades e calcula o valor total
    static processarIdades(userInput, state) {
        const cliente = state.cliente;

        // Remove espaços e divide por vírgulas
        const idades = userInput.split(',').map(idade => idade.trim());

        // Verifica se todas as entradas são números válidos
        for (const idade of idades) {
            if (isNaN(idade) || idade === '') {
                return "⚠️ Por favor, informe apenas números separados por vírgula.";
            }
        }

        cliente.idades = idades;

        try {
            // Adiciona logs para depuração
            console.log("Processando cotação para:", JSON.stringify(cliente));

            // Calcula o valor da cotação
            const resultado = this.calcularCotacao(cliente);
            cliente.valorTotal = resultado.valorTotal;
            cliente.detalhamento = resultado.detalhamento;
            cliente.lastQuestion = 'confirmar';

            // Formata o resultado para exibição
            let mensagem = "*📊 RESULTADO DA COTAÇÃO:*\n\n";
            mensagem += `*Tipo de Pessoa:* ${cliente.peopleType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}\n`;
            mensagem += `*Cidade:* ${cliente.cidade}\n`;
            if (cliente.peopleType === 'PJ') {
                mensagem += `*Quantidade:* ${cliente.qtdBeneficiario} pessoas\n`;
            }
            mensagem += `*Plano:* ${cliente.tipoPlano}\n`;
            mensagem += `*Coparticipação:* ${cliente.coparticipacao}\n`;
            mensagem += `*Segmentação:* ${cliente.segmentacao}\n`;
            mensagem += `*Acomodação:* ${cliente.acomodacao}\n`;
            
            // Adiciona assistência se existir
            if (cliente.assistencia) {
                mensagem += `*Assistência:* ${cliente.assistencia === 'medico 1' ? 'Médico 1' : 'Médico 2'}\n`;
            }
            
            mensagem += "\n*Detalhamento por idade:*\n";
            cliente.detalhamento.forEach(item => {
                mensagem += `${item.idade} anos: R$ ${item.valor.toFixed(2)}\n`;
            });

            mensagem += `\n*Valor Total:* R$ ${cliente.valorTotal.toFixed(2)}\n\n`;
            mensagem += "Deseja confirmar esta cotação? (S/N)";

            return mensagem;
        } catch (error) {
            console.error("Erro ao processar idades:", error);
            return "⚠️ Ocorreu um erro ao calcular a cotação. Por favor, tente novamente ou digite 'Q' para voltar ao menu principal.";
        }
    }

    // Processa a confirmação da cotação
    static processarConfirmacao(userInput, state) {
        const cliente = state.cliente;

        if (userInput.toLowerCase() === 's') {
            // Lógica para salvar a cotação poderia ser implementada aqui
            const mensagem = "*✅ COTAÇÃO FINALIZADA COM SUCESSO!*\n\n" +
                `Cotação para ${cliente.peopleType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}\n` +
                `Plano ${cliente.tipoPlano} - ${cliente.segmentacao}\n` +
                `Valor Total: R$ ${cliente.valorTotal.toFixed(2)}\n\n` +
                "Um de nossos consultores entrará em contato em breve!\n\n" +
                "Digite 'Q' para voltar ao menu principal.";

            return mensagem;
        } else if (userInput.toLowerCase() === 'n') {
            // Volta para o início do processo de cotação
            return "Cotação cancelada. Digite 'Q' para voltar ao menu principal ou qualquer tecla para iniciar uma nova cotação.";
        } else {
            return "⚠️ Opção inválida. Por favor, responda com 'S' para confirmar ou 'N' para cancelar.";
        }
    }

    // Função que calcula o valor da cotação com base nas regras estabelecidas
    static calcularCotacao(cliente) {
        const detalhamento = [];
        let valorTotal = 0;

        try {
            // Log para depuração
            console.log(`Calculando cotação para: ${JSON.stringify(cliente)}`);

            // Determina a tabela de preços com base nas opções selecionadas
            const tabela = this.obterTabelaPrecos(cliente);

            if (!tabela) {
                throw new Error("Não foi possível obter a tabela de preços");
            }

            // Verifica se a tabela foi obtida corretamente
            console.log("Tabela obtida:", JSON.stringify(tabela));

            // Calcula o valor para cada idade
            for (const idadeStr of cliente.idades) {
                const idade = parseInt(idadeStr);
                let valorIdade = 0;
                let faixaEtaria = '';

                // Encontra a faixa etária correspondente e obtém o valor
                if (idade <= 18) {
                    valorIdade = tabela['0-18'];
                    faixaEtaria = '0-18';
                } else if (idade <= 23) {
                    valorIdade = tabela['19-23'];
                    faixaEtaria = '19-23';
                } else if (idade <= 28) {
                    valorIdade = tabela['24-28'];
                    faixaEtaria = '24-28';
                } else if (idade <= 33) {
                    valorIdade = tabela['29-33'];
                    faixaEtaria = '29-33';
                } else if (idade <= 38) {
                    valorIdade = tabela['34-38'];
                    faixaEtaria = '34-38';
                } else if (idade <= 43) {
                    valorIdade = tabela['39-43'];
                    faixaEtaria = '39-43';
                } else if (idade <= 48) {
                    valorIdade = tabela['44-48'];
                    faixaEtaria = '44-48';
                } else if (idade <= 53) {
                    valorIdade = tabela['49-53'];
                    faixaEtaria = '49-53';
                } else if (idade <= 58) {
                    valorIdade = tabela['54-58'];
                    faixaEtaria = '54-58';
                } else {
                    valorIdade = tabela['59+'];
                    faixaEtaria = '59+';
                }

                console.log(`Idade ${idade} anos - Faixa ${faixaEtaria} - Valor: R$ ${valorIdade}`);

                // Verificação para garantir que o valor é um número válido
                if (isNaN(valorIdade) || valorIdade === undefined) {
                    console.error(`Valor inválido para idade ${idade}, faixa ${faixaEtaria}`);
                    valorIdade = 0;
                }

                detalhamento.push({
                    idade,
                    valor: valorIdade
                });
                valorTotal += valorIdade;
            }

            return {
                valorTotal,
                detalhamento
            };
        } catch (error) {
            console.error("Erro ao calcular cotação:", error);
            // Retorna um resultado padrão para evitar quebrar o fluxo
            return {
                valorTotal: 0,
                detalhamento: cliente.idades.map(idade => ({
                    idade,
                    valor: 0
                }))
            };
        }
    }

    // Obtém a tabela de preços com base nas opções selecionadas pelo cliente
    static obterTabelaPrecos(cliente) {
        try {
            // Para PJ, o caminho é diferente
            // Caso tenha assistência médica, precisamos adicionar isso ao caminho
            if (cliente.assistencia && cliente.qtdBeneficiario === '30-99') {
                // Para casos com assistência médica
                // Belo Horizonte ou Triângulo Mineiro, 30-99 vidas
                if (cliente.tipoPlano === 'Nosso Médico') {
                    // Para Nosso Médico - a estrutura já tem médico 1 e médico 2
                    const tabela = tabelaHappyVidaPJ.PJ[cliente.cidade][cliente.qtdBeneficiario][cliente.tipoPlano][cliente.coparticipacao][cliente.segmentacao][cliente.acomodacao][cliente.assistencia];
                    return tabela;
                } else if (cliente.tipoPlano === 'Nosso Plano') {
                    // Para Nosso Plano
                    const tabela = tabelaHappyVidaPJ.PJ[cliente.cidade][cliente.qtdBeneficiario][cliente.tipoPlano][cliente.coparticipacao][cliente.segmentacao][cliente.acomodacao][cliente.assistencia];
                    return tabela;
                }
            }
            
            // Caso padrão sem assistência médica
            const tabela = tabelaHappyVidaPJ.PJ[cliente.cidade][cliente.qtdBeneficiario][cliente.tipoPlano][cliente.coparticipacao][cliente.segmentacao][cliente.acomodacao];
            
            if (!tabela) {
                console.error('Tabela não encontrada para:', {
                    cidade: cliente.cidade,
                    qtdBeneficiario: cliente.qtdBeneficiario,
                    tipoPlano: cliente.tipoPlano,
                    coparticipacao: cliente.coparticipacao,
                    segmentacao: cliente.segmentacao,
                    acomodacao: cliente.acomodacao,
                    assistencia: cliente.assistencia
                });
                return this.getTabelaFallback();
            }
            
            return tabela;
        } catch (error) {
            console.error('Erro ao obter tabela de preços:', error);
            return this.getTabelaFallback();
        }
    }

    // Retorna uma tabela de preços padrão para casos de erro
    static getTabelaFallback() {
        return {
            '0-18': 100.00,
            '19-23': 120.00,
            '24-28': 140.00,
            '29-33': 160.00,
            '34-38': 180.00,
            '39-43': 200.00,
            '44-48': 250.00,
            '49-53': 300.00,
            '54-58': 400.00,
            '59+': 500.00
        };
    }

    // Reset do estado para voltar ao menu principal
    static resetState(state) {
        Object.assign(state, {
            currentMenu: 'main',
            hasShownWelcome: true,
            selectedCity: null,
            previousInput: null,
            cliente: {} // Reset do objeto cliente
        });
    }

    // Menu inicial de cotação
    static getMenu(state) {
        state.cliente = {}; // Limpa o objeto cliente
        state.cliente.lastQuestion = 'peopleType'
        return "📈 *_Iniciando Cotação: Responda as perguntas a seguir_*\n _Digite *'Q'* a qualquer momento para voltar ao menu principal_ \n\nPara qual tipo de pessoa deseja a cotação?\n\n 1 - Pessoa Física (PF)\n 2 - Pessoa Jurídica (PJ/PME)";
    }
}

module.exports = MenuCotacao;