import telebot
import firebase_admin
from firebase_admin import firestore
from firebase_admin import credentials
import os
import logging

cred = credentials.Certificate("private/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

logger = telebot.logger
telebot.logger.setLevel(logging.DEBUG)  # Outputs debug messages to console.

bot = telebot.TeleBot(os.getenv("JOURNAL_BOT_TOKEN"), parse_mode=None)


@bot.message_handler(commands=['start'])
def start_handler(message):
    if is_registered(message.from_user.id):
        bot.send_message(message.chat.id, "You are already registered")
    else:
        bot.send_message(
            message.chat.id,
            f"You need to register. Your id is: {message.from_user.id}")


@bot.message_handler(commands=['get_id'])
def get_id_handler(message):
    bot.send_message(message.chat.id, message.from_user.id)


@bot.message_handler()
def question_handler(message):
    if is_registered(message.from_user.id):
        bot.reply_to(message, commit_task(message))
    else:
        bot.reply_to(message, "You need to register first")


def is_registered(user_id):
    return db.collection('users').where(u'tg_id', u'==', str(user_id)).get()


def commit_task(message):
    batch = db.batch()
    tasks_ref = db.collection('tasks')
    task_id = tasks_ref.document().id
    task = create_task(message, task_id)
    # set task
    task_ref = tasks_ref.document(task_id)
    batch.set(task_ref, task)
    # set question
    question_ref, question = create_question(message, tasks_ref, task_id)
    batch.set(question_ref, question)
    # set user editable collection
    user_editable_ref = task_ref\
        .collection('user_editable')\
        .document('user_editable')
    batch.set(user_editable_ref, {'status': 'open'})
    # commint atomically
    batch.commit()
    return 'task created'


def create_task(message, task_id):
    return {
        'title': 'FAQ',
        'description': '',
        'type': '',
        'assigned_users': [],
        'prefered_authors': [],
        'is_complete': False,
        'available': True,
        'case_id': task_id,
        'case_stage_id': 'answer_the_question',
        'case_type': 'FAQ'
    }


def create_question(message, tasks_ref, task_id):
    question = {'title': message.text,
                'type': 'input',
                'chat_id': message.from_user.id,
                'required': True}
    questions_ref = tasks_ref.document(task_id).collection('questions')
    question_id = questions_ref.document().id
    question_ref = questions_ref.document(question_id)
    return question_ref, question


bot.polling()
