process.env.TZ = "America/Sao_Paulo"

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require("baileys")
const P = require("pino")
const { Boom } = require("@hapi/boom")
const MessageHandler = require("./middlewares/messageHandler")
const readline = require("readline")
const Scout = require("./middlewares/scout")

class WhatsAppConnection {
  static RealTime() {
    let RT = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    let RTstring = `[` + RT + `] `
    return RTstring
  }

  static async requestPhoneNumber() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise(resolve => {
      rl.question("Digite seu número de telefone (exemplo: 553199838235): ", phoneNumber => {
        rl.close()

        // Remove caracteres não numéricos
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, "")

        // Validação básica do número
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
          console.log(this.RealTime() + "❌ Número inválido! Deve ter entre 10 e 15 dígitos.")
          resolve(null)
          return
        }

        // Formata o número no padrão internacional (sem o +)
        let formattedNumber = cleanNumber
        if (!formattedNumber.startsWith("55") && formattedNumber.length === 11) {
          // Se for um número brasileiro sem código do país, adiciona 55
          formattedNumber = "55" + cleanNumber
        }

        resolve(formattedNumber)
      })
    })
  }

  static async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState("./assets/auth/baileys")

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: "silent" })
    })

    this.setupConnectionHandlers(sock, saveCreds)
    return sock
  }

  static setupConnectionHandlers(sock, saveCreds) {
    sock.ev.on("connection.update", async update => {
      const { connection, lastDisconnect, qr } = update

      if (qr && !sock.authState?.creds?.registered) {
        console.log(this.RealTime() + "🔗 Iniciando processo de pareamento...")

        try {
          const phoneNumber = await this.requestPhoneNumber()

          if (!phoneNumber) {
            console.log(this.RealTime() + "❌ Falha ao obter número de telefone. Reiniciando...")
            setTimeout(() => this.initialize(), 3000)
            return
          }

          console.log(this.RealTime() + "⏳ Solicitando código de pareamento...")

          const pairingCode = await sock.requestPairingCode(phoneNumber)

          console.log(this.RealTime() + `🔢 CÓDIGO DE PAREAMENTO: ${pairingCode}`)
        } catch (error) {
          console.log(this.RealTime() + "❌ Erro ao solicitar código de pareamento:", error.message)

          // Se der erro específico de número inválido, tenta novamente
          if (error.message.includes("Invalid phone number") || error.message.includes("invalid")) {
            console.log(this.RealTime() + "🔄 Tentando novamente em 3 segundos...")
            setTimeout(() => this.initialize(), 3000)
            return
          }

          // Para outros erros, espera mais tempo antes de tentar novamente
          setTimeout(() => this.initialize(), 10000)
        }
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          console.log(this.RealTime() + "🔄 Conexão perdida. Tentando reconectar...")
          Scout.recordReconnection()
          Scout.recordFailure()

          // Aguarda um pouco antes de reconectar
          setTimeout(() => this.initialize(), 5000)
        } else {
          console.log(this.RealTime() + "🚫 Desconectado permanentemente.")
          console.log(this.RealTime() + "💡 Para reconectar, delete a pasta './assets/auth/baileys' e reinicie o bot.")
          Scout.recordFailure()
        }
      }

      if (connection === "open") {
        console.log(this.RealTime() + "🤖 Sistema pronto para receber mensagens...")

        Scout.resetQuotation()
        Scout.setStartedTime(new Date())

        // Inicia monitoramento de recursos
        Scout.startResourceMonitoring()

        // Salva informações da conexão
        const connInfo = sock.user
        if (connInfo) {
          console.log(this.RealTime() + `📱 Número: ${connInfo.id || "N/A"}`)
        }
      }

      if (connection === "connecting") {
        console.log(this.RealTime() + "🔄 Conectando ao WhatsApp...")
      }
    })

    // Tracking de erros de envio
    const originalSendMessage = sock.sendMessage
    sock.sendMessage = async (...args) => {
      try {
        const result = await originalSendMessage.apply(sock, args)
        return result
      } catch (error) {
        console.log(this.RealTime() + "❌ Erro ao enviar mensagem:", error.message)
        Scout.recordFailure()
        throw error
      }
    }

    // Listener para salvar credenciais
    sock.ev.on("creds.update", saveCreds)

    // Inicializa o handler de mensagens apenas quando conectado
    sock.ev.on("connection.update", update => {
      if (update.connection === "open" && !sock.messageHandlerInitialized) {
        const messageHandler = new MessageHandler(sock)
        messageHandler.initialize()
        sock.messageHandlerInitialized = true
      }
    })

    // Tratamento de erros não capturados
    sock.ev.on("CB:call", call => {
      console.log(this.RealTime() + "📞 Chamada recebida:", call)
    })

    // Log de eventos importantes para debug
    sock.ev.on("CB:receipt", receipt => {
      // Opcional: log de confirmações de entrega
      if (receipt.receipt?.type === "delivery") {
        console.log(this.RealTime() + `✓ Mensagem entregue para ${receipt.key.remoteJid}`)
      }
    })
  }

  // Método utilitário para validar número de telefone
  static validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/[^0-9]/g, "")

    // Verifica se é um número brasileiro válido
    if (cleaned.startsWith("55")) {
      const withoutCountryCode = cleaned.substring(2)
      return withoutCountryCode.length === 10 || withoutCountryCode.length === 11
    }

    // Para outros países, aceita números entre 10 e 15 dígitos
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  // Método para limpar autenticação (útil para reconectar)
  static async clearAuth() {
    try {
      const fs = require("fs").promises
      const path = require("path")
      const authPath = path.join(__dirname, "..", "assets", "auth", "baileys")

      await fs.rmdir(authPath, { recursive: true })
      console.log(this.RealTime() + "🗑️ Autenticação limpa. Reinicie o bot para nova conexão.")
      return true
    } catch (error) {
      console.log(this.RealTime() + "❌ Erro ao limpar autenticação:", error.message)
      return false
    }
  }
}

module.exports = WhatsAppConnection
