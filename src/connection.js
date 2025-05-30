const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const MessageHandler = require('./middlewares/messageHandler');
const qrcode = require('qrcode-terminal'); // 🔹 Biblioteca para exibir QR code no terminal
const Scout = require('./middlewares/scout');

class WhatsAppConnection {
    /**
     * @returns {string} Retorna a data e hora atual no formato brasileiro
     */
    static RealTime() {
        let RT = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        let RTstring = (`[` + RT +`] `);
        return RTstring; //retorna a data e hora atual
    }

    static async initialize() {
        const { state, saveCreds } = await useMultiFileAuthState('./assets/auth/baileys');
        
        const sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Iris Bot', 'Chrome', '120.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            fireInitQueries: false,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            markOnlineOnConnect: true
        });

        this.setupConnectionHandlers(sock, saveCreds);
        return sock;
    }

    static setupConnectionHandlers(sock, saveCreds) {
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // ✅ Exibir QR Code manualmente quando necessário
            if (qr) {
                console.log(this.RealTime() + "📌 Escaneie o QR Code abaixo para conectar:");
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = reason !== DisconnectReason.loggedOut && 
                                    reason !== DisconnectReason.badSession;
                
                if (reason === DisconnectReason.badSession) {
                    console.log('Sessão corrompida, limpando...');
                    const fs = require('fs').promises;
                    await fs.rm('./assets/auth/baileys', { recursive: true, force: true });
                }
                
                if (shouldReconnect) {
                    console.log(this.RealTime() + `🔄 Reconectando... (${reason})`);
                    setTimeout(() => this.initialize(), 3000);
                }
            }

            if (connection === 'open') {
                console.log(this.RealTime() + "✅ Bot conectado com sucesso!");
                Scout.resetQuotation();
                Scout.setStartedTime(new Date());
                this.startHeartbeat(sock);
            }
        });

        sock.ev.on('creds.update', saveCreds);
        
        // Inicializa o handler de mensagens
        const messageHandler = new MessageHandler(sock);
        messageHandler.initialize();
    }

    static startHeartbeat(sock) {
    setInterval(async () => {
        try {
            await sock.sendPresenceUpdate('available');
        } catch (error) {
            console.log('Heartbeat falhou:', error.message);
        }
    }, 30000);
    }
}

module.exports = WhatsAppConnection;
