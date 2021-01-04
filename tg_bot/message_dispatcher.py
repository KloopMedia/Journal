import telebot
import redis
import time
from datetime import datetime
import json
import os

API_TOKEN = os.getenv('JOURNAL_BOT_TOKEN')
bot = telebot.TeleBot(API_TOKEN)
r = redis.Redis(host='localhost', port=6379)

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
                time.sleep(0.05)
            else:
                # remove chat if no messages left
                r.srem('chats', chat)
            print(f'{datetime.now()} sent {counter} messages to chat {chat}')
        else:
            time.sleep(0.5)
    except Exception as e:
        print(e)
