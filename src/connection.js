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
    static maxReconnectAttempts = 5;
    static isConnected = false;
    static messageCache = new NodeCache({ stdTTL: 300 });
    static reconnectTimeout = null;
    static pingInterval = null;
    static consecutivePingFailures = 0;
    static maxPingFailures = 3;
    static isReconnecting = false;
    static connectionLock = false;
    static reconnectDelay = 3000;
    static lastConnectionTime = 0;
    static minReconnectInterval = 10000; // 10s minimum between reconnects

    static RealTime() {
        let RT = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        return `[${RT}] `;
    }

    static async initialize() {
        // Prevent multiple simultaneous connection attempts
        if (this.isReconnecting || this.connectionLock) {
            console.log(this.RealTime() + "⚠️ Conexão já em andamento, ignorando...");
            return;
        }

        // Rate limiting for reconnections
        const now = Date.now();
        if (now - this.lastConnectionTime < this.minReconnectInterval) {
            const waitTime = this.minReconnectInterval - (now - this.lastConnectionTime);
            console.log(this.RealTime() + `⏳ Aguardando ${Math.round(waitTime/1000)}s antes da próxima tentativa...`);
            this.scheduleReconnect(waitTime);
            return;
        }

        this.isReconnecting = true;
        this.connectionLock = true;
        this.lastConnectionTime = now;
        
        try {
            // Clear all existing intervals and timeouts
            this.clearAllIntervals();
            
            // Destroy existing socket properly
            if (this.sock) {
                try {
                    this.sock.ev.removeAllListeners();
                    if (this.sock.ws && this.sock.ws.readyState === 1) {
                        this.sock.ws.close();
                    }
                } catch (error) {
                    console.log(this.RealTime() + "⚠️ Erro ao fechar socket anterior:", error.message);
                }
                this.sock = null;
            }
            
            const { version, isLatest } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState('./assets/auth/baileys');
            
            const logger = P({ 
                level: 'silent', // Reduce log noise
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        ignore: 'hostname,pid'
                    }
                }
            });

            // Enhanced socket configuration based on takeshi-bot
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
                keepAliveIntervalMs: 30000,
                emitOwnEvents: true,
                fireInitQueries: true,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                markOnlineOnConnect: false,
                retryRequestDelayMs: 1000,
                maxMsgRetryCount: 3,
                qrTimeout: 60000,
                // Critical: Prevent conflicts by handling multiple device scenarios
                shouldIgnoreJid: jid => jid === 'status@broadcast',
                shouldSyncHistoryMessage: () => false,
                // Enhanced message retry configuration
                msgRetryCounterMap: {},
                getMessage: async (key) => {
                    if (this.messageCache.has(key.id)) {
                        return this.messageCache.get(key.id);
                    }
                    return { conversation: 'placeholder' };
                },
                // Patch for better compatibility
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
            this.connectionLock = false;
            this.scheduleReconnect(5000);
        }
    }

    static setupConnectionHandlers(sock, saveCreds) {
        // Connection update handler with enhanced conflict detection
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

        // Enhanced creds update with error handling
        sock.ev.on('creds.update', async () => {
            try {
                await saveCreds();
            } catch (error) {
                console.error(this.RealTime() + "❌ Erro ao salvar credenciais:", error);
            }
        });
        
        // Message caching
        sock.ev.on('messages.sent', (msg) => {
            const m = msg.messages[0];
            if (m && m.key) {
                this.messageCache.set(m.key.id, m);
            }
        });

        // Enhanced error handling for stream conflicts
        sock.ev.on('error', (error) => {
            console.error(this.RealTime() + "❌ Erro do socket:", error);
            Scout.recordFailure();
            
            // Handle specific conflict errors
            if (error.message?.includes('conflict') || error.data?.type === 'replaced') {
                console.log(this.RealTime() + "⚠️ Conflito detectado - limpando sessão e reconectando...");
                this.handleConflictError();
                return;
            }
            
            // Handle stream errors
            if (error.output?.statusCode >= 500 || error.message?.includes('stream')) {
                this.handleStreamError();
            }
        });

        // Call rejection to prevent issues
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

        // Periodic cache cleanup
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
        this.connectionLock = false;
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
        this.connectionLock = false;
        this.clearAllIntervals();
        this.consecutivePingFailures = 0;
        Scout.recordFailure();
        
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || '';
        
        // Handle conflict errors specifically
        if (errorMessage.includes('conflict') || errorMessage.includes('replaced')) {
            console.log(this.RealTime() + '⚠️ Conflito de sessão detectado - limpando...');
            this.handleConflictError();
            return;
        }
        
        // Handle different error codes with appropriate delays
        if (reason === 503) {
            console.log(this.RealTime() + '⚠️ Servidor indisponível (503), aguardando 20s...');
            this.scheduleReconnect(20000);
            return;
        }

        if (reason === 408 || reason === 502 || reason === 504) {
            console.log(this.RealTime() + `⚠️ Timeout/Gateway error (${reason}), aguardando 15s...`);
            this.scheduleReconnect(15000);
            return;
        }

        if (reason === 429) {
            console.log(this.RealTime() + '⚠️ Rate limit (429), aguardando 30s...');
            this.scheduleReconnect(30000);
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
            
            // Exponential backoff with jitter
            const baseDelay = Math.min(3000 * Math.pow(1.8, this.reconnectAttempts), 60000);
            const jitter = Math.random() * 3000;
            const delay = baseDelay + jitter;
            
            console.log(this.RealTime() + `🔄 Reconectando (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${Math.round(delay/1000)}s...`);
            this.scheduleReconnect(delay);
        } else if (reason === DisconnectReason.loggedOut) {
            console.log(this.RealTime() + "🚫 Desconectado permanentemente.");
            this.clearSession();
        } else {
            console.log(this.RealTime() + `🚫 Máximo de tentativas de reconexão excedido. Motivo: ${reason}`);
        }
    }

    static handleConflictError() {
        console.log(this.RealTime() + '🔄 Tratando erro de conflito...');
        this.isConnected = false;
        this.clearAllIntervals();
        
        // Clear session to prevent further conflicts
        setTimeout(async () => {
            await this.clearSession();
            this.scheduleReconnect(10000); // Wait 10s before reconnecting
        }, 2000);
    }

    static startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(async () => {
            if (!this.isConnected || !this.sock) return;
            
            try {
                await this.sock.sendPresenceUpdate('available');
            } catch (error) {
                console.log(this.RealTime() + '⚠️ Heartbeat falhou:', error.message);
            }
        }, 30000);
    }

    static startPingMonitor() {
        this.stopPingMonitor();
        
        this.pingInterval = setInterval(async () => {
            if (!this.isConnected || !this.sock || this.isReconnecting) return;
            
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
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 15000))
                ]);
                
                const latency = Date.now() - start;
                this.consecutivePingFailures = 0;
                
                if (latency > 8000) {
                    console.log(this.RealTime() + `⚠️ Latência alta: ${latency}ms`);
                }
                
            } catch (error) {
                this.handlePingFailure();
            }
        }, 120000); // Increased to 2 minutes
    }

    static handlePingFailure() {
        this.consecutivePingFailures++;
        
        if (this.consecutivePingFailures >= this.maxPingFailures) {
            console.log(this.RealTime() + `⚠️ ${this.consecutivePingFailures} pings consecutivos falharam, reconectando...`);
            this.consecutivePingFailures = 0;
            this.scheduleReconnect(5000);
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
                    this.scheduleReconnect(3000);
                }
            } catch (error) {
                console.log(this.RealTime() + '⚠️ Erro no monitor de conexão:', error.message);
            }
        }, 45000); // Increased interval
    }

    static handleStreamError() {
        console.log(this.RealTime() + '⚠️ Stream error detectado, reconectando...');
        this.isConnected = false;
        this.clearAllIntervals();
        this.scheduleReconnect(5000);
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
            // Reset connection state
            this.reconnectAttempts = 0;
            this.consecutivePingFailures = 0;
        } catch (error) {
            console.error(this.RealTime() + '❌ Erro ao limpar sessão:', error);
        }
    }

    static async disconnect() {
        this.isConnected = false;
        this.isReconnecting = false;
        this.connectionLock = false;
        this.clearAllIntervals();
        
        if (this.sock) {
            try {
                this.sock.ev.removeAllListeners();
                await this.sock.logout();
            } catch (error) {
                console.error('Erro no logout:', error);
            }
            this.sock = null;
        }
    }
}

module.exports = WhatsAppConnection;