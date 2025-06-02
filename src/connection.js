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
    static messageCache = new NodeCache({ stdTTL: 300 });
    static reconnectTimeout = null;
    static pingInterval = null;
    static consecutivePingFailures = 0;
    static maxPingFailures = 3;
    static connectionLockTimeout = null;
    static isReconnecting = false;

    static RealTime() {
        let RT = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        return `[${RT}] `;
    }

    static async initialize() {
        if (this.isReconnecting) {
            console.log(this.RealTime() + "🔄 Reconexão já em andamento, ignorando...");
            return;
        }

        this.isReconnecting = true;
        
        try {
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
                defaultQueryTimeoutMs: 30000,
                keepAliveIntervalMs: 25000,
                emitOwnEvents: true,
                fireInitQueries: true,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                markOnlineOnConnect: false,
                retryRequestDelayMs: 1000,
                maxMsgRetryCount: 3,
                qrTimeout: 60000,
                shouldIgnoreJid: jid => jid === 'status@broadcast',
                shouldSyncHistoryMessage: () => false,
                getMessage: async (key) => {
                    if (this.messageCache.has(key.id)) {
                        return this.messageCache.get(key.id);
                    }
                    return { conversation: 'placeholder' };
                },
                msgRetryCounterMap: {},
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
                }
            });

            this.setupConnectionHandlers(this.sock, saveCreds);
            return this.sock;
        } catch (error) {
            console.error(this.RealTime() + "❌ Erro ao inicializar:", error);
            Scout.recordFailure();
            this.isReconnecting = false;
            this.scheduleReconnect(5000);
        }
    }

    static setupConnectionHandlers(sock, saveCreds) {
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

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('messages.sent', (msg) => {
            const m = msg.messages[0];
            if (m && m.key) {
                this.messageCache.set(m.key.id, m);
            }
        });

        sock.ev.on('error', (error) => {
            console.error(this.RealTime() + "❌ Erro do socket:", error);
            Scout.recordFailure();
            
            if (error.output?.statusCode >= 500 || error.message?.includes('stream')) {
                this.handleStreamError();
            }
        });

        sock.ev.on('call', async (calls) => {
            for (const call of calls) {
                if (call.status === 'offer') {
                    try {
                        await sock.rejectCall(call.id, call.from);
                        console.log(this.RealTime() + `📞 Chamada rejeitada de ${call.from}`);
                    } catch (error) {
                        console.error('Erro ao rejeitar chamada:', error);
                    }
                }
            }
        });

        setInterval(() => {
            const keys = this.messageCache.keys();
            if (keys.length > 500) {
                keys.slice(0, 250).forEach(key => this.messageCache.del(key));
            }
        }, 300000);

        const messageHandler = new MessageHandler(sock);
        messageHandler.initialize();
    }

    static handleConnection() {
        this.isConnected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.consecutivePingFailures = 0;
        this.clearReconnectTimeout();
        
        console.log(this.RealTime() + "✅ Bot conectado!");
        Scout.resetQuotation();
        Scout.setStartedTime(new Date());
        
        this.startHeartbeat();
        this.startPingMonitor();
        this.startConnectionMonitor();
    }

    static handleDisconnection(lastDisconnect) {
        this.isConnected = false;
        this.clearAllIntervals();
        this.consecutivePingFailures = 0;
        Scout.recordFailure();
        
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        
        if (reason === 503) {
            console.log(this.RealTime() + '⚠️ Servidor indisponível (503), aguardando 15s...');
            this.scheduleReconnect(15000);
            return;
        }

        if (reason === 408 || reason === 502 || reason === 504) {
            console.log(this.RealTime() + `⚠️ Timeout/Gateway error (${reason}), aguardando 8s...`);
            this.scheduleReconnect(8000);
            return;
        }
        
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
            
            const baseDelay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 30000);
            const jitter = Math.random() * 2000;
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
            } catch (error) {
                console.log(this.RealTime() + '⚠️ Heartbeat falhou');
            }
        }, 25000);
    }

    static startPingMonitor() {
        this.stopPingMonitor();
        
        this.pingInterval = setInterval(async () => {
            if (!this.isConnected || !this.sock) return;
            
            try {
                const start = Date.now();
                await Promise.race([
                    this.sock.query({
                        tag: 'iq',
                        attrs: {
                            to: '@s.whatsapp.net',
                            type: 'get',
                            xmlns: 'w:ping'
                        },
                        content: []
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 10000))
                ]);
                
                const latency = Date.now() - start;
                this.consecutivePingFailures = 0;
                
                if (latency > 5000) {
                    console.log(this.RealTime() + `⚠️ Latência alta: ${latency}ms`);
                }
                
            } catch (error) {
                this.handlePingFailure();
            }
        }, 90000);
    }

    static handlePingFailure() {
        this.consecutivePingFailures++;
        
        if (this.consecutivePingFailures >= this.maxPingFailures) {
            console.log(this.RealTime() + `⚠️ ${this.consecutivePingFailures} pings consecutivos falharam, reconectando...`);
            this.consecutivePingFailures = 0;
            this.scheduleReconnect(3000);
        } else {
            console.log(this.RealTime() + `⚠️ Ping falhou (${this.consecutivePingFailures}/${this.maxPingFailures})`);
        }
    }

    static startConnectionMonitor() {
        setInterval(() => {
            if (!this.isConnected || !this.sock || this.isReconnecting) return;
            
            try {
                if (this.sock.ws && this.sock.ws.readyState !== 1) {
                    console.log(this.RealTime() + '⚠️ WebSocket desconectado, reconectando...');
                    this.scheduleReconnect(2000);
                }
            } catch (error) {
                console.log(this.RealTime() + '⚠️ Erro no monitor de conexão:', error.message);
            }
        }, 30000);
    }

    static handleStreamError() {
        console.log(this.RealTime() + '⚠️ Stream error detectado, reconectando imediatamente...');
        this.isConnected = false;
        this.clearAllIntervals();
        this.scheduleReconnect(1000);
    }

    static scheduleReconnect(delay) {
        if (this.isReconnecting) return;
        
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
        this.isReconnecting = false;
        this.clearAllIntervals();
        if (this.sock) {
            try {
                await this.sock.logout();
            } catch (error) {
                console.error('Erro no logout:', error);
            }
            this.sock = null;
        }
    }
}

module.exports = WhatsAppConnection;