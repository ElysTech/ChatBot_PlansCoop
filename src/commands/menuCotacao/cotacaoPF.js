// Importa a tabela de preços
const tabelaHappyVidaPF = require('./tableHappyVidaPF');

class CotacaoPF {
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

        //? A ordem de perguntas é:
            //? 1 - Tipo de pessoa
            //? 2 - Cidade
            //? 3 - Cobertura
            //? 4 - Plano
            //? 5 - Coparticipação
            //? 6 - Acomodação (apenas para cobertura Completa)
            //? 7 - [Assistência] (apenas para BH com cobertura Ambulatorial)
            //? 8 - Idades
            //? 9 - Cálculo

        // Processa as respostas baseado na última pergunta feita
        switch (cliente.lastQuestion) {
            case 'peopleType':
                return this.processarTipoPessoa(userInput, state);
            case 'cidade':
                return this.processarCidade(lowerCaseUserInput, state);
            case 'cobertura':
                return this.processarCobertura(lowerCaseUserInput, state);
            case 'plano':
                return this.processarPlano(lowerCaseUserInput, state);
            case 'coparticipacao':
                return this.processarCoparticipacao(lowerCaseUserInput, state);
            case 'assistencia':
                return this.processarAssistencia(lowerCaseUserInput, state);
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

    // Processa o tipo de pessoa
    static processarTipoPessoa(userInput, state) {
        const cliente = state.cliente;
        
        if (userInput === '1') {
            cliente.peopleType = 'PF';
            cliente.lastQuestion = 'cidade';
            return "Para qual cidade deseja a cotação?\n\n 1 - Belo Horizonte\n 2 - Triângulo Mineiro";
        } else if (userInput === '2') {
            cliente.peopleType = 'PJ';
            cliente.lastQuestion = 'cidade';
            return "Para qual cidade deseja a cotação?\n\n 1 - Belo Horizonte\n 2 - Triângulo Mineiro";
        } else {
            return "⚠️ Opção inválida. Por favor, escolha 1 para PF ou 2 para PJ.";
        }
    }

    // Processa a escolha da cidade e pergunta a cobertura
    static processarCidade(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1':
                cliente.cidade = 'Belo Horizonte';
                cliente.lastQuestion = 'cobertura';
                return "Qual cobertura deseja?\n\n 1 - Ambulatorial\n 2 - Completo";
            case '2':
                cliente.cidade = 'Triângulo Mineiro';
                cliente.lastQuestion = 'cobertura';
                return "Qual cobertura deseja?\n\n 1 - Ambulatorial\n 2 - Completo";
            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Belo Horizonte ou 2 para Triângulo Mineiro.";
        }
    }

    // Processa a escolha da cobertura e pergunta o plano
    static processarCobertura(userInput, state) {
        const cliente = state.cliente;

        switch (userInput) {
            case '1': // COBERTURA AMBULATORIAL
                cliente.cobertura = 'Ambulatorial';
                cliente.segmentacao = 'AMB'; // Define segmentação para tabela de preços
                cliente.acomodacao = 'S/ACOM'; // Define acomodação padrão para ambulatorial
                cliente.lastQuestion = 'plano';

                if (cliente.cidade === 'Belo Horizonte') {
                    return "Qual plano deseja?\n\n 1 - Nosso Plano\n 2 - Plano Odontológico";
                } else if (cliente.cidade === 'Triângulo Mineiro') {
                    return "Qual plano deseja?\n\n 1 - Nosso Plano";
                }
                break;

            case '2': // COBERTURA COMPLETO
                cliente.cobertura = 'Completo';
                cliente.segmentacao = 'AMB+HOSP+OBST'; // Define segmentação para tabela de preços
                cliente.lastQuestion = 'plano';

                if (cliente.cidade === 'Belo Horizonte') {
                    return "Qual plano deseja?\n\n 1 - Nosso Plano & Nosso Médico\n 2 - Plano Odontológico";
                } else if (cliente.cidade === 'Triângulo Mineiro') {
                    return "Qual plano deseja?\n\n 1 - Nosso Plano & Nosso Médico\n 2 - Plano Odontológico";
                }
                break;

            default:
                return "⚠️ Opção inválida. Por favor, escolha 1 para Ambulatorial ou 2 para Completo.";
        }
    }

    // Processa a escolha do plano e pergunta a coparticipação
    static processarPlano(userInput, state) {
        const cliente = state.cliente;
    
        // SE FOR PLANO ODONTOLÓGICO, RETORNA O VALOR E FINALIZA
        if (userInput === '2') {
            cliente.plano = 'Plano Odontológico';
            
            let valorPlano = 0;
            if (cliente.cidade === 'Belo Horizonte') {
                valorPlano = tabelaHappyVidaPF[cliente.cidade][cliente.cobertura]['Planos Odontológicos'];
            } else if (cliente.cidade === 'Triângulo Mineiro') {
                valorPlano = tabelaHappyVidaPF[cliente.cidade]['Completo']['Planos Odontológicos'];
            }
            
            this.resetState(state);
            return [
                {text: `O valor do plano odontológico, em ${cliente.cidade} com cobertura ${cliente.cobertura.toLowerCase()}, é de R$ ${valorPlano.toFixed(2)} ao mês por pessoa.`},
                {text: "Seu atendimento está sendo encerrado. Você pode enviar uma mensagem e iniciar um atendimento quando quiser.\n\n👋 Obrigado por utilizar nossos serviços. Até mais!"},
            ];
        }
    
        // PROCESSA ESCOLHA DE PLANO NORMAL
        if (userInput === '1') {
            if (cliente.cobertura === 'Ambulatorial') {
                cliente.plano = 'Nosso Plano';
                cliente.tipoPlano = 'Nosso Plano';
            } else if (cliente.cobertura === 'Completo') {
                cliente.plano = 'Nosso Plano & Nosso Médico';
                cliente.tipoPlano = 'Nosso Médico'; // Para a tabela de preços
            }
            
            // PERGUNTA A COPARTICIPAÇÃO
            cliente.lastQuestion = 'coparticipacao';
            return "Qual a coparticipação desejada?\n\n 1 - Total\n 2 - Parcial";
        } else {
            return "⚠️ Opção inválida. Por favor, escolha uma opção válida.";
        }
    }

    // Processa a coparticipação e determina próxima pergunta
    static processarCoparticipacao(userInput, state) {
        const cliente = state.cliente;
        
        // Processa a coparticipação
        if (userInput === '1') {
            cliente.coparticipacao = 'Total';
        } else if (userInput === '2') {
            cliente.coparticipacao = 'Parcial';
        } else {
            return "⚠️ Opção inválida. Por favor, escolha 1 para Total ou 2 para Parcial.";
        }

        // LÓGICA DE FLUXO: ASSISTÊNCIA OU ACOMODAÇÃO OU DIRETO PARA IDADES
        if (cliente.cidade === 'Belo Horizonte' && cliente.cobertura === 'Ambulatorial') {
            // Para BH com plano ambulatorial, pergunta sobre assistência
            cliente.lastQuestion = 'assistencia';
            return "Qual a assistência desejada?\n\n 1 - Médico 1\n 2 - Médico 2";
        } else if (cliente.cobertura === 'Completo') {
            // Para cobertura completa, pergunta sobre acomodação
            cliente.lastQuestion = 'acomodacao';
            return "Qual a acomodação?\n\n 1 - Enfermaria\n 2 - Apartamento";
        } else {
            // Para outros casos, pergunta direto as idades
            cliente.lastQuestion = 'idades';
            return "Digite as idades dos beneficiários separadas por vírgula (exemplo: 30,45,12):";
        }
    }
    
    // Processa a assistência e pergunta as idades
    static processarAssistencia(userInput, state) {
        const cliente = state.cliente;
        
        if (userInput === '1') {
            cliente.assistencia = 'Médico 1';
        } else if (userInput === '2') {
            cliente.assistencia = 'Médico 2';
        } else {
            return "⚠️ Opção inválida. Por favor, escolha 1 para Médico 1 ou 2 para Médico 2.";
        }
        
        // Próxima pergunta: idades
        cliente.lastQuestion = 'idades';
        return "Digite as idades dos beneficiários separadas por vírgula (exemplo: 30,45,12):";
    }
    
    // Processa a acomodação e pergunta as idades
    static processarAcomodacao(userInput, state) {
        const cliente = state.cliente;
        
        if (userInput === '1') {
            cliente.acomodacao = 'ENFERM';
        } else if (userInput === '2') {
            cliente.acomodacao = 'APART';
        } else {
            return "⚠️ Opção inválida. Por favor, escolha 1 para Enfermaria ou 2 para Apartamento.";
        }
        
        // Próxima pergunta: idades
        cliente.lastQuestion = 'idades';
        return "Digite as idades dos beneficiários separadas por vírgula (exemplo: 30,45,12):";
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
            mensagem += `*Plano:* ${cliente.plano}\n`;
            mensagem += `*Cobertura:* ${cliente.cobertura}\n`;
            mensagem += `*Coparticipação:* ${cliente.coparticipacao}\n`;
            
            if (cliente.cobertura === 'Completo') {
                mensagem += `*Acomodação:* ${cliente.acomodacao === 'ENFERM' ? 'Enfermaria' : 'Apartamento'}\n`;
            }
            
            if (cliente.cidade === 'Belo Horizonte' && cliente.cobertura === 'Ambulatorial') {
                mensagem += `*Assistência:* ${cliente.assistencia}\n`;
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
                            `Plano ${cliente.plano} - ${cliente.cobertura}\n` +
                            `Valor Total: R$ ${cliente.valorTotal.toFixed(2)}\n\n` +
                            "Um de nossos consultores entrará em contato em breve!\n\n" +
                            "Digite 'Q' para voltar ao menu principal.";
            
            return mensagem;
        } else if (userInput.toLowerCase() === 'n') {
            // Volta para o início do processo de cotação
            this.resetState(state);
            return "Cotação cancelada. Digite qualquer tecla para iniciar uma nova cotação.";
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
        try {
            // Mapeamento das strings de coparticipação
            const coparticipacaoMap = {
                'Total': 'COM COPARTICIPAÇÃO',
                'Parcial': 'COPARTICIPAÇÃO PARCIAL'
            };
            
            // Para Plano Odontológico, retornar diretamente o valor
            if (cliente.plano === 'Plano Odontológico') {
                const valorOdonto = tabelaHappyVidaPF[cliente.cidade][cliente.cobertura]['Planos Odontológicos'];
                return { valor: valorOdonto };
            }
            
            // Determinar qual médico usar (para BH Ambulatorial)
            let medico = '';
            if (cliente.cidade === 'Belo Horizonte' && cliente.cobertura === 'Ambulatorial') {
                medico = cliente.assistencia === 'Médico 1' ? 'medico 1' : 'medico 2';
            } else if (cliente.cobertura === 'Completo') {
                // Para Completo também tem médico 1 e 2
                medico = 'medico 1'; // Padrão se não houver assistência definida
            }
            
            // Construir o caminho para a tabela
            const coparticipacao = coparticipacaoMap[cliente.coparticipacao];
            let tabela;
            
            if (cliente.cidade === 'Triângulo Mineiro') {
                // Triângulo Mineiro tem estrutura diferente (sem médico 1/2)
                tabela = tabelaHappyVidaPF[cliente.cidade][cliente.cobertura][cliente.plano][coparticipacao];
            } else {
                // Belo Horizonte tem médico 1/2
                tabela = tabelaHappyVidaPF[cliente.cidade][cliente.cobertura][cliente.plano][coparticipacao][medico];
            }
            
            if (!tabela) {
                console.error('Tabela não encontrada para:', {
                    cidade: cliente.cidade,
                    cobertura: cliente.cobertura,
                    plano: cliente.plano,
                    coparticipacao: coparticipacao,
                    medico: medico
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
            hasShownWelcome: false,
            selectedCity: null,
            previousInput: null,
            cliente: {} // Reset do objeto cliente
        });
    }

    // Menu inicial de cotação
    static getMenu() {
        return "📈 *_Iniciando Cotação: Responda as perguntas a seguir_*\n _Digite *'Q'* a qualquer momento para voltar ao menu principal_ \n\nPara qual tipo de pessoa deseja a cotação?\n\n 1 - Pessoa Física (PF)\n 2 - Pessoa Jurídica (PJ/PME)";
    }
}

module.exports = CotacaoPF;