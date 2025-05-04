// menuCotacao.js
// Módulo para cotação de planos de saúde

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
            console.log('INICIANDO COTAÇÃO');
            
            return this.getMenu();
        }

        // Processa as respostas baseado na última pergunta feita
        switch (cliente.lastQuestion) {
            case 'peopleType':
                return this.processarTipoPessoa(lowerCaseUserInput, state);
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
            case 'idades':
                return this.processarIdades(lowerCaseUserInput, state);
            case 'confirmar':
                return this.processarConfirmacao(lowerCaseUserInput, state);
            default:
                return "⚠️ Ocorreu um erro. Por favor, digite 'Q' para reiniciar.";
        }
    }

    // Removido o método iniciarCotacao que estava causando a duplicação

    // Processa a escolha do tipo de pessoa (PF ou PJ)
    static processarTipoPessoa(userInput, state) {
        const cliente = state.cliente;
        
        switch (userInput) {
            case '1':
                cliente.peopleType = 'PF';
                cliente.lastQuestion = 'cidade';
                return "Para qual cidade deseja a cotação?\n\n 1 - Belo Horizonte\n 2 - Triângulo Mineiro";
            case '2':
                cliente.peopleType = 'PJ';
                cliente.lastQuestion = 'cidade';
                return "Para qual cidade deseja a cotação?\n\n 1 - Belo Horizonte\n 2 - Triângulo Mineiro";
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Pessoa Física ou 2 para Pessoa Jurídica.";
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
                return "⚠️ Opção inválida. Por favor, escolha 1 para Belo Horizonte ou 2 para Triângulo Mineiro.";
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
                    cliente.lastQuestion = 'idades';
                    return "Informe as idades dos beneficiários separando por vírgula (exemplo: 18, 25, 30):";
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
                cliente.lastQuestion = 'idades';
                return "Informe as idades dos beneficiários separando por vírgula (exemplo: 18, 25, 30):";
            case '2':
                cliente.acomodacao = 'APART';
                cliente.lastQuestion = 'idades';
                return "Informe as idades dos beneficiários separando por vírgula (exemplo: 18, 25, 30):";
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Enfermaria ou 2 para Apartamento.";
        }
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
            mensagem += `*Acomodação:* ${cliente.acomodacao}\n\n`;
            
            mensagem += "*Detalhamento por idade:*\n";
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
                
                detalhamento.push({ idade, valor: valorIdade });
                valorTotal += valorIdade;
            }
            
            return { valorTotal, detalhamento };
        } catch (error) {
            console.error("Erro ao calcular cotação:", error);
            // Retorna um resultado padrão para evitar quebrar o fluxo
            return { 
                valorTotal: 0, 
                detalhamento: cliente.idades.map(idade => ({ idade, valor: 0 })) 
            };
        }
    }

    // Obtém a tabela de preços com base nas opções selecionadas pelo cliente
    static obterTabelaPrecos(cliente) {
        // Esta função emula a consulta à tabela de preços conforme mostrada na imagem
        // Na implementação real, esses valores poderiam vir de um banco de dados ou arquivo de configuração
        
        // Tabela de preços baseada na imagem fornecida
        const tabelaPrecos = {
            'Nosso Plano': {
                'Total': {
                    'AMB': {
                        'S/ACOM': {
                            '0-18': 77.81,
                            '19-23': 81.55,
                            '24-28': 91.34,
                            '29-33': 105.04,
                            '34-38': 120.80,
                            '39-43': 143.75,
                            '44-48': 179.69,
                            '49-53': 224.61,
                            '54-58': 381.84,
                            '59+': 427.66
                        }
                    },
                    'AMB+HOSP+OBST': {
                        'ENFERM': {
                            '0-18': 148.90,
                            '19-23': 166.77,
                            '24-28': 186.78,
                            '29-33': 214.80,
                            '34-38': 247.02,
                            '39-43': 293.95,
                            '44-48': 367.44,
                            '49-53': 459.30,
                            '54-58': 780.81,
                            '59+': 874.51
                        },
                        'APART': {
                            '0-18': 154.89,
                            '19-23': 173.47,
                            '24-28': 194.28,
                            '29-33': 223.43,
                            '34-38': 256.94,
                            '39-43': 305.76,
                            '44-48': 382.19,
                            '49-53': 477.75,
                            '54-58': 812.17,
                            '59+': 909.03
                        }
                    }
                },
                'Parcial': {
                    'AMB': {
                        'S/ACOM': {
                            '0-18': 114.85,
                            '19-23': 128.63,
                            '24-28': 144.07,
                            '29-33': 165.68,
                            '34-38': 190.53,
                            '39-43': 226.73,
                            '44-48': 283.41,
                            '49-53': 354.26,
                            '54-58': 602.24,
                            '59+': 674.51
                        }
                    },
                    'AMB+HOSP+OBST': {
                        'ENFERM': {
                            '0-18': 172.09,
                            '19-23': 192.74,
                            '24-28': 215.87,
                            '29-33': 248.25,
                            '34-38': 285.49,
                            '39-43': 339.73,
                            '44-48': 424.66,
                            '49-53': 530.83,
                            '54-58': 902.41,
                            '59+': 1010.70
                        },
                        'APART': {
                            '0-18': 223.32,
                            '19-23': 250.12,
                            '24-28': 280.13,
                            '29-33': 322.15,
                            '34-38': 370.47,
                            '39-43': 440.86,
                            '44-48': 551.06,
                            '49-53': 688.85,
                            '54-58': 1171.05,
                            '59+': 1311.58
                        }
                    }
                }
            },
            'Nosso Médico': {
                'Total': {
                    'AMB+HOSP+OBST': {
                        'ENFERM': {
                            '0-18': 200.99,
                            '19-23': 225.11,
                            '24-28': 252.12,
                            '29-33': 289.94,
                            '34-38': 333.42,
                            '39-43': 396.77,
                            '44-48': 495.97,
                            '49-53': 619.97,
                            '54-58': 1053.95,
                            '59+': 1180.42
                        },
                        'APART': {
                            '0-18': 251.24,
                            '19-23': 281.39,
                            '24-28': 315.14,
                            '29-33': 362.43,
                            '34-38': 416.77,
                            '39-43': 495.97,
                            '44-48': 619.97,
                            '49-53': 774.96,
                            '54-58': 1317.44,
                            '59+': 1475.53
                        }
                    }
                },
                'Parcial': {
                    'AMB+HOSP+OBST': {
                        'ENFERM': {
                            '0-18': 103.37,
                            '19-23': 115.77,
                            '24-28': 129.66,
                            '29-33': 149.11,
                            '34-38': 171.48,
                            '39-43': 204.06,
                            '44-48': 255.07,
                            '49-53': 318.83,
                            '54-58': 542.02,
                            '59+': 607.06
                        },
                        'APART': {
                            '0-18': 134.01,
                            '19-23': 150.09,
                            '24-28': 168.10,
                            '29-33': 193.32,
                            '34-38': 222.32,
                            '39-43': 264.96,
                            '44-48': 330.70,
                            '49-53': 413.54,
                            '54-58': 702.73,
                            '59+': 787.06
                        }
                    }
                }
            }
        };
        
        try {
            // Verificação de segurança para garantir que todos os dados necessários estão presentes
            console.log(`DEBUG: Acessando tabela com - Plano: ${cliente.tipoPlano}, Copart: ${cliente.coparticipacao}, Segm: ${cliente.segmentacao}, Acom: ${cliente.acomodacao}`);
            
            // Verifica se o plano existe na tabela
            if (!tabelaPrecos[cliente.tipoPlano]) {
                console.error(`Plano "${cliente.tipoPlano}" não encontrado na tabela de preços`);
                return this.getTabelaFallback();
            }
            
            // Verifica se a coparticipação existe para o plano
            if (!tabelaPrecos[cliente.tipoPlano][cliente.coparticipacao]) {
                console.error(`Coparticipação "${cliente.coparticipacao}" não encontrada para o plano "${cliente.tipoPlano}"`);
                return this.getTabelaFallback();
            }
            
            // Verifica se a segmentação existe para o plano e coparticipação
            if (!tabelaPrecos[cliente.tipoPlano][cliente.coparticipacao][cliente.segmentacao]) {
                console.error(`Segmentação "${cliente.segmentacao}" não encontrada para o plano "${cliente.tipoPlano}" e coparticipação "${cliente.coparticipacao}"`);
                return this.getTabelaFallback();
            }
            
            // Verifica se a acomodação existe para a combinação anterior
            if (!tabelaPrecos[cliente.tipoPlano][cliente.coparticipacao][cliente.segmentacao][cliente.acomodacao]) {
                console.error(`Acomodação "${cliente.acomodacao}" não encontrada para a combinação de plano, coparticipação e segmentação especificada`);
                return this.getTabelaFallback();
            }
            
            // Retorna a tabela correspondente
            return tabelaPrecos[cliente.tipoPlano][cliente.coparticipacao][cliente.segmentacao][cliente.acomodacao];
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