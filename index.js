const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Ошибка: TELEGRAM_BOT_TOKEN не найден в секретах GitHub.');
  process.exit(1);
}
// Создаем бота, используем polling для получения сообщений
const bot = new TelegramBot(token, { polling: true });
const dataPath = path.join(__dirname, 'data.json');

// Инициализация файла данных, если его нет
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify({ joined: [], left: [] }, null, 2));
}

// Вспомогательная функция для чтения данных
function readData() {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(rawData);
}

// Вспомогательная функция для записи данных
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// Обработка новых участников (кто зашел)
bot.on('new_chat_members', (msg) => {
  const data = readData();
  
  msg.new_chat_members.forEach((user) => {
    // Игнорируем самого бота
    if (user.is_bot) return;
    
    const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    const entry = {
      id: user.id,
      name: name,
      username: user.username,
      date: new Date().toLocaleString('ru-RU')
    };
    
    // Добавляем, если его еще нет в списке (чтобы избежать дублей)
    if (!data.joined.some(u => u.id === user.id)) {
      data.joined.push(entry);
    }
  });
  
  writeData(data);
});

// Обработка покинувших участников (кто вышел)
bot.on('left_chat_member', (msg) => {
  const user = msg.left_chat_member;
  if (user.is_bot) return;

  const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
  const entry = {
    id: user.id,
    name: name,
    username: user.username,
    date: new Date().toLocaleString('ru-RU')
  };

  const data = readData();
  if (!data.left.some(u => u.id === user.id)) {
    data.left.push(entry);
  }
  writeData(data);
});

// Обработка обычных сообщений с запросами
bot.on('message', (msg) => {
  // Пропускаем системные сообщения, чтобы бот реагировал только на текст
  if (!msg.text) return;
  
  const text = msg.text.toLowerCase();
  
  // Реакция на фразу "кто зашел"
  if (text.includes('кто зашел')) {
    const data = readData();
    if (data.joined.length === 0) {
      bot.sendMessage(msg.chat.id, 'Пока никто не зашел.');
      return;
    }
    
    let response = '📥 Список зашедших:\n';
    data.joined.forEach((u, i) => {
      response += `${i + 1}. ${u.name} ${u.username ? `(@${u.username})` : ''} - ${u.date}\n`;
    });
    bot.sendMessage(msg.chat.id, response);
  }
  
  // Реакция на фразу "кто вышел"
  if (text.includes('кто вышел')) {
    const data = readData();
    if (data.left.length === 0) {
      bot.sendMessage(msg.chat.id, 'Пока никто не вышел.');
      return;
    }
    
    let response = '📤 Список вышедших:\n';
    data.left.forEach((u, i) => {
      response += `${i + 1}. ${u.name} ${u.username ? `(@${u.username})` : ''} - ${u.date}\n`;
    });
    bot.sendMessage(msg.chat.id, response);
  }
});

console.log('Бот успешно запущен и ожидает сообщений...');
