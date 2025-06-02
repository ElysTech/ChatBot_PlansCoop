const commands = require('../commands');
const Scout = require('./scout');
const fs = require('fs');
const path = require('path');

class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        this.userStates = new Map();
        this.userTimers = new Map();
        this.messageHistory = new Map();
        
        this.blockedNumbers = new Set([
            '553183353438@s.whatsapp.net',
        ]);
    }

    initialize() {
        this.sock.ev.on('messages.upsert', async (m) => {
            const startTime = Date.now();
            
            try {
                await this.handleMessage(m);
                const responseTime = Date.now() - startTime;
                Scout.recordMessage(true, responseTime);
            } catch (error) {
                console.error('Erro no handler de mensagens:', error);
                Scout.recordMessage(false);
            }
        });
    }

    async handleMessage({ messages }) {
        try {
            const msg = messages[0];
            
            if (!msg.message || msg.key.fromMe) return;
    
            const userMessage = msg.message.conversation || 
                              msg.message.extendedTextMessage?.text || '';
            const from = msg.key.remoteJid;
            const messageId = msg.key.id;
    
            if (this.isNumberBlocked(from)) {
                console.log(`Mensagem bloqueada do número: ${from}`);
                return;
            }
    
            if (this.messageHistory.has(messageId)) {
                return;
            }
    
            this.messageHistory.set(messageId, true);
    
            if (this.messageHistory.size > 100) {
                const oldestKey = this.messageHistory.keys().next().value;
                this.messageHistory.delete(oldestKey);
            }
    
            if (!this.userStates.has(from)) {
                this.initializeUserState(from);
            }
    
            try {
                const response = await commands.menu.execute(userMessage, this.userStates.get(from), from);
                
                if (response === null) {
                    const welcomeResponse = await commands.menu.execute('', this.userStates.get(from), from);
                    await this.sendResponse(from, welcomeResponse);
                } 
                else if (Array.isArray(response)) {
                    await this.sendMultipleResponses(from, response);
                }
                else if (typeof response === 'object' && response !== null) {
                    await this.sendResponse(from, response);
                }
                else {
                    await this.sendResponse(from, { text: response });
                }
            } catch (error) {
                console.error('Erro ao processar comando:', error);
                await this.sendResponse(from, { 
                    text: 'Desculpe, ocorreu um erro ao processar sua solicitação. Digite `Q` para voltar ao início. \n\n *Erro [mssgHdl_83-86]:* ' + error
                });
            }
        } catch (error) {
            console.error('Erro no processamento da mensagem:', error);
            throw error;
        }
    }

    async sendResponse(from, response) {
        try {
            if (response.image) {
                const processedResponse = await this.processImageMessage(response);
                await this.sock.sendMessage(from, processedResponse);
            } else if (response.document) {
                const processedResponse = await this.processDocumentMessage(response);
                await this.sock.sendMessage(from, processedResponse);
            } else {
                await this.sock.sendMessage(from, response);
            }
        } catch (error) {
            console.error('Erro ao enviar resposta:', error);
            throw error;
        }
    }

    async sendMultipleResponses(from, responses) {
        for (let i = 0; i < responses.length; i++) {
            try {
                await this.sendResponse(from, responses[i]);
                
                if (i < responses.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            } catch (error) {
                console.error(`Erro ao enviar resposta ${i + 1}:`, error);
            }
        }
    }

    async processImageMessage(response) {
        try {
            const imagePath = path.resolve(response.image.url);
            
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Imagem não encontrada: ${imagePath}`);
            }

            const imageBuffer = fs.readFileSync(imagePath);
            
            return {
                image: imageBuffer,
                caption: response.caption || ''
            };
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
            throw error;
        }
    }

    async processDocumentMessage(response) {
        try {
            const documentPath = path.resolve(response.document.url);
            
            if (!fs.existsSync(documentPath)) {
                throw new Error(`Documento não encontrado: ${documentPath}`);
            }

            const documentBuffer = fs.readFileSync(documentPath);
            
            return {
                document: documentBuffer,
                mimetype: response.mimetype || 'application/pdf',
                fileName: response.fileName || path.basename(documentPath),
                caption: response.caption || ''
            };
        } catch (error) {
            console.error('Erro ao processar documento:', error);
            throw error;
        }
    }

    isNumberBlocked(number) {
        return this.blockedNumbers.has(number);
    }

    blockNumber(number) {
        const formattedNumber = number.includes('@s.whatsapp.net') 
            ? number 
            : `${number}@s.whatsapp.net`;
        this.blockedNumbers.add(formattedNumber);
    }

    unblockNumber(number) {
        const formattedNumber = number.includes('@s.whatsapp.net') 
            ? number 
            : `${number}@s.whatsapp.net`;
        this.blockedNumbers.delete(formattedNumber);
    }

    initializeUserState(userId) {
        this.userStates.set(userId, {
            currentMenu: 'main',
            hasShownWelcome: false,
            selectedCity: null,
            hasSeenTable: false
        });
    }
}

module.exports = MessageHandler;