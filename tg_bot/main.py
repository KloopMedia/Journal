import telebot
from telebot import types
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
categories = ['Org', 'Tech', 'Other']
question_dict = {}


@bot.message_handler(commands=['start'])
def start_handler(message):
    if is_registered(message.from_user.id):
        bot.send_message(message.chat.id, "You are already registered")
    else:
        bot.send_message(
            message.chat.id,
            f"You need to register. Your id is: {message.from_user.id}")


class Question:
    def __init__(self, text=None, category=None):
        self.text = text
        self.category = category


@bot.message_handler(commands=['ask_question'])
def ask_question(message):
    if is_registered(message.from_user.id):
        markup = types.ReplyKeyboardMarkup(row_width=3, one_time_keyboard=True)
        buttons = [types.KeyboardButton(cat) for cat in categories]
        markup.add(*buttons)
        bot.send_message(message.chat.id,
                         "Choose question category",
                         reply_markup=markup)
        bot.register_next_step_handler(message, process_category_step)
    else:
        bot.reply_to(message, "You need to register first")


def process_category_step(message):
    try:
        category = message.text
        question_dict['category'] = category
        markup = types.ForceReply(selective=False)
        msg = bot.reply_to(message, 'Your question:', reply_markup=markup)
        bot.register_next_step_handler(msg, process_question_step)
    except Exception as e:
        bot.reply_to(message, 'Something went wrong')


def process_question_step(message):
    try:
        bot.reply_to(message, commit_task(message))
    except Exception as e:
        bot.reply_to(message, 'Something went wrong')


@bot.message_handler(commands=['get_id'])
def get_id_handler(message):
    bot.send_message(message.chat.id, message.from_user.id)


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
    question = {
        'title': message.text,
        'type': 'input',
        'chat_id': message.from_user.id,
        'question_category': question_dict.get('category'),
        'required': True
    }
    questions_ref = tasks_ref.document(task_id).collection('questions')
    question_id = questions_ref.document().id
    question_ref = questions_ref.document(question_id)
    return question_ref, question


bot.polling()
