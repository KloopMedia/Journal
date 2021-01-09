import telebot
import redis
import time
from datetime import datetime
import json
import os
import logging

API_TOKEN = os.getenv('JOURNAL_BOT_TOKEN')
bot = telebot.TeleBot(API_TOKEN)
r = redis.Redis(host='localhost', port=6379)
logging.basicConfig(
    filename='tg_messages.log',
    # encoding='utf-8',
    level=logging.DEBUG,
    format='%(asctime)s:%(levelname)s:%(message)s')

while True:
    try:
        # get random chat
        chat = r.srandmember('chats', 1)
        if chat:
            chat = chat[0]
            # send all messages from this chat
            counter = 0
            while r.lrange(chat, 0, -1):
                message = json.loads(r.rpop(chat))
                bot.send_message(**message)
                counter += 1
                # sleep to avoid ban
                time.sleep(0.04)
            else:
                # remove chat if no messages left
                r.srem('chats', chat)
            logging.debug(f'sent {counter} messages to {chat}')
        # send notification if no messages left
        elif r.llen('notifications'):
            notification = json.loads(r.rpop('notifications'))
            bot.send_message(**notification)
            logging.debug(
                f'sent notification to {notification.get("chat_id")}')
            time.sleep(0.04)
        else:
            time.sleep(0.5)

    except Exception as e:
        logging.warning(e)
