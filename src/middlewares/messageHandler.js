const commands = require('../commands');
const Scout = require('./scout');

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
            try {
                await this.handleMessage(m);
            } catch (error) {
                console.error('Erro no handler de mensagens:', error);
                Scout.recordMessage(false);
                Scout.recordFailure();
            }
        });
    }

    async handleMessage({ messages }) {
        const startTime = Date.now();
        let success = false;
        
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
                    await this.sock.sendMessage(from, { text: welcomeResponse });
                } else if (Array.isArray(response)) {
                    for (const item of response) {
                        await this.sock.sendMessage(from, item);
                    }
                } else if (typeof response === 'object' && response !== null) {
                    await this.sock.sendMessage(from, response);
                } else {
                    await this.sock.sendMessage(from, { text: response });
                }
                
                success = true;
            } catch (error) {
                console.error('Erro ao processar comando:', error);
                await this.sock.sendMessage(from, { 
                    text: 'Desculpe, ocorreu um erro ao processar sua solicitação. Digite `Q` para voltar ao início. \n\n *Erro [mssgHdl_83-86]:* ' + error
                });
                Scout.recordFailure();
            }
        } catch (error) {
            console.error('Erro no processamento da mensagem:', error);
            Scout.recordFailure();
            throw error;
        } finally {
            const responseTime = Date.now() - startTime;
            Scout.recordMessage(success, responseTime);
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