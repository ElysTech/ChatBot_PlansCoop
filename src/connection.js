const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const MessageHandler = require('./middlewares/messageHandler');
const qrcode = require('qrcode-terminal');
const Scout = require('./middlewares/scout');

class WhatsAppConnection {
    static sock = null;
    static heartbeatInterval = null;
    static reconnectAttempts = 0;
    static maxReconnectAttempts = 10;
    static isConnected = false;
    static messageCache = new NodeCache({ stdTTL: 600 });
    static reconnectTimeout = null;
    static pingInterval = null;

    static RealTime() {
        let RT = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        return `[${RT}] `;
    }

    static async initialize() {
        try {
            // Limpa timeouts pendentes
            this.clearAllIntervals();
            
            const { version, isLatest } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState('./assets/auth/baileys');
            
            const logger = P({ 
                level: 'error',
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        ignore: 'hostname,pid'
                    }
                }
            });

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger)
                },
                logger,
                printQRInTerminal: false,
                browser: ['Iris Bot', 'Safari', '4.0.0'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 0,
                keepAliveIntervalMs: 30000,
                emitOwnEvents: true,
                fireInitQueries: false,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
                qrTimeout: 60000,
                // Configurações do takeshi-bot
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(
                        message.buttonsMessage ||
                        message.templateMessage ||
                        message.listMessage
                    );
                    if (requiresPatch) {
                        message = {
                            viewOnceMessage: {
                                message: {
                                    messageContextInfo: {
                                        deviceListMetadataVersion: 2,
                                        deviceListMetadata: {},
                                    },
                                    ...message,
                                },
                            },
                        };
                    }
                    return message;
                },
                getMessage: async (key) => {
                    if (this.messageCache.has(key.id)) {
                        return this.messageCache.get(key.id);
                    }
                    return { conversation: 'placeholder' };
                },
                msgRetryCounterMap: {}
            });

            this.setupConnectionHandlers(this.sock, saveCreds);
            return this.sock;
        } catch (error) {
            console.error(this.RealTime() + "❌ Erro ao inicializar:", error);
            Scout.recordFailure();
            this.scheduleReconnect(5000);
        }
    }

    static setupConnectionHandlers(sock, saveCreds) {
        // Connection update handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(this.RealTime() + "📌 Escaneie o QR Code:");
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                this.handleDisconnection(lastDisconnect);
            }

            if (connection === 'open') {
                this.handleConnection();
            }

            if (connection === 'connecting') {
                console.log(this.RealTime() + "🔗 Conectando...");
            }
        });

        // Salva credenciais
        sock.ev.on('creds.update', saveCreds);
        
        // Cache de mensagens enviadas
        sock.ev.on('messages.sent', (msg) => {
            const m = msg.messages[0];
            if (m && m.key) {
                this.messageCache.set(m.key.id, m);
            }
        });

        // Tratamento robusto de erros
        sock.ev.on('error', (error) => {
            console.error(this.RealTime() + "❌ Erro do socket:", error);
            Scout.recordFailure();
            
            // Reconecta em erros críticos
            if (error.output?.statusCode >= 500) {
                this.scheduleReconnect(2000);
            }
        });

        // Handler para chamadas (evita travamentos)
        sock.ev.on('call', async (calls) => {
            for (const call of calls) {
                if (call.status === 'offer') {
                    await sock.rejectCall(call.id, call.from);
                    console.log(this.RealTime() + `📞 Chamada rejeitada de ${call.from}`);
                }
            }
        });

        // Limpa cache periodicamente
        setInterval(() => {
            const keys = this.messageCache.keys();
            if (keys.length > 1000) {
                keys.slice(0, 500).forEach(key => this.messageCache.del(key));
            }
        }, 300000); // 5 minutos

        const messageHandler = new MessageHandler(sock);
        messageHandler.initialize();
    }

    static handleConnection() {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.clearReconnectTimeout();
        
        console.log(this.RealTime() + "✅ Bot conectado!");
        Scout.resetQuotation();
        Scout.setStartedTime(new Date());
        
        this.startHeartbeat();
        this.startPingMonitor();
    }

    static handleDisconnection(lastDisconnect) {
        this.isConnected = false;
        this.clearAllIntervals();
        Scout.recordFailure();
        
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        
        // Decisão inteligente de reconexão
        const shouldReconnect = 
            reason !== DisconnectReason.loggedOut && 
            reason !== DisconnectReason.badSession &&
            this.reconnectAttempts < this.maxReconnectAttempts;
        
        if (reason === DisconnectReason.badSession) {
            console.log(this.RealTime() + '🔄 Sessão inválida, limpando...');
            this.clearSession();
            this.reconnectAttempts = 0;
        }
        
        if (shouldReconnect) {
            this.reconnectAttempts++;
            Scout.recordReconnection();
            
            // Backoff exponencial com jitter
            const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            
            console.log(this.RealTime() + `🔄 Reconectando (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${Math.round(delay/1000)}s...`);
            this.scheduleReconnect(delay);
        } else if (reason === DisconnectReason.loggedOut) {
            console.log(this.RealTime() + "🚫 Desconectado permanentemente.");
            this.clearSession();
        }
    }

    static startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(async () => {
            if (!this.isConnected || !this.sock) return;
            
            try {
                await this.sock.sendPresenceUpdate('available');
                await this.sock.readMessages([]);
            } catch (error) {
                // Silencia erros esperados
            }
        }, 30000);
    }

    static startPingMonitor() {
        this.stopPingMonitor();
        
        this.pingInterval = setInterval(async () => {
            if (!this.isConnected || !this.sock) return;
            
            try {
                const start = Date.now();
                await this.sock.query({
                    tag: 'iq',
                    attrs: {
                        to: '@s.whatsapp.net',
                        type: 'get',
                        xmlns: 'w:ping'
                    },
                    content: []
                });
                const latency = Date.now() - start;
                
                // Reconecta se latência muito alta
                if (latency > 10000) {
                    console.log(this.RealTime() + `⚠️ Latência alta: ${latency}ms`);
                    this.scheduleReconnect(1000);
                }
            } catch (error) {
                console.log(this.RealTime() + '⚠️ Ping falhou, verificando conexão...');
                this.scheduleReconnect(2000);
            }
        }, 60000); // A cada minuto
    }

    static scheduleReconnect(delay) {
        this.clearReconnectTimeout();
        this.reconnectTimeout = setTimeout(() => {
            this.initialize();
        }, delay);
    }

    static clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    static clearAllIntervals() {
        this.stopHeartbeat();
        this.stopPingMonitor();
        this.clearReconnectTimeout();
    }

    static stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    static stopPingMonitor() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    static async clearSession() {
        const fs = require('fs').promises;
        try {
            await fs.rm('./assets/auth/baileys', { recursive: true, force: true });
            console.log(this.RealTime() + '✅ Sessão limpa');
        } catch (error) {
            console.error(this.RealTime() + '❌ Erro ao limpar sessão:', error);
        }
    }

    static async disconnect() {
        this.isConnected = false;
        this.clearAllIntervals();
        if (this.sock) {
            await this.sock.logout();
            this.sock = null;
        }
    }
}

module.exports = WhatsAppConnection;