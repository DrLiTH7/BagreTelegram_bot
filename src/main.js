const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path'); 
const {path_ytdlp, token} = require('./exports')

// Instância do bot
const bot = new TelegramBot(token, { polling: true, request: {
  agentOptions: {
      keepAlive: true,
      family: 4
  }
}});

// Sanitizar o nome do arquivo (somente para thumbnail)
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
             .replace(/\s+/g, '_');
}

// Função pra pegar o título do vídeo
async function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const command = `${path_ytdlp.replace(/ /g, '\\ ')} --print title ${url}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao obter informações do vídeo: ${error}`);
        return reject(error);
      }
      const rawTitle = stdout.trim();
      resolve(rawTitle);
    });
  });
}

// Função para baixar a thumbnail
async function downloadThumbnail(url, outputPath) {
  return new Promise((resolve, reject) => {
    const command = `${path_ytdlp} --skip-download --write-thumbnail --convert-thumbnails jpg -o "${outputPath}" ${url}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao baixar a thumbnail: ${error}`);
        return reject(error);
      }
      resolve();
    });
  });
}

// Função para baixar o áudio do video
function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    const command = `${path_ytdlp} -x --audio-format mp3 -o "${outputPath}" ${url}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao baixar o áudio: ${error}`);
        return reject(error);
      }
      resolve();
    });
  });
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Me manda o link da próxima pedrada pro grupo 😎👉');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && (text.includes('https') || text.includes('.'))) {
    bot.sendMessage(chatId, 'Guenta aí meu fi que eu to baixando').then((sentMessage) => {
      setTimeout(() => {
        bot.deleteMessage(chatId, sentMessage.message_id)
          .catch((err) => {
            console.error("Erro ao apagar a mensagem:", err);
          });
      }, 21000);  // 21 segundos
    })
    .catch((err) => {
      console.error("Erro ao enviar a mensagem:", err);
    });

    try {
       const rawTitle = await getVideoInfo(text);
      const videoTitle = sanitizeFileName(rawTitle);
      const audioOutputPath = path.resolve(__dirname, `${rawTitle}.mp3`);
      const thumbnailOutputPathD = path.resolve(__dirname, `${videoTitle}`);
      const thumbnailOutputPath = path.resolve(__dirname, `${videoTitle}.jpg`);

      // Baixando a thumbnail
      await downloadThumbnail(text, thumbnailOutputPathD);
      
      // Baixando o áudio
      await downloadAudio(text, audioOutputPath);

      bot.sendMessage(chatId, 'Mandando aqui ...').then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(chatId, sentMessage.message_id)
            .catch((err) => {
              console.error("Erro ao apagar a mensagem:", err);
            });
        }, 10000);  // 10 segundos
      })
      .catch((err) => {
        console.error("Erro ao enviar a mensagem:", err);
      });
      // Enviar o arquivo de áudio com a thumbnail como art cover
      bot.sendAudio(chatId, audioOutputPath, {
        thumb: thumbnailOutputPath,
        caption: `[${rawTitle}](${text})`,
        parse_mode: 'Markdown'
      }).then(() => {
        fs.unlinkSync(audioOutputPath); //apaga a musica
        fs.unlinkSync(thumbnailOutputPath); //apaga a thumbnail
      });
    } catch (err) {
      bot.sendMessage(chatId, 'Deu um problema aqui no código k').then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(chatId, sentMessage.message_id)
            .catch((err) => {
              console.error("Erro ao apagar a mensagem:", err);
            });
        }, 30000);  // 30 segundos
      })
      .catch((err) => {
        console.error("Erro ao enviar a mensagem:", err);
      });
      console.error('Erro:', err);
    }
  } else {
    bot.sendMessage(chatId, 'Isso é um link msm? k').then((sentMessage) => {
      setTimeout(() => {
        bot.deleteMessage(chatId, sentMessage.message_id)
          .catch((err) => {
            console.error("Erro ao apagar a mensagem:", err);
          });
      }, 5000);  // 5 segundos
    })
    .catch((err) => {
      console.error("Erro ao enviar a mensagem:", err);
    });
  }
});
