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
        bot.send_message(message.chat.id, register_user(message))


def register_user(message):
    try:
        transaction = db.transaction()
        if len(message.text.split(' ')) != 2:  # no token in /start
            result = False
        else:
            token = message.text.split(' ')[1]
            result = register_in_transaction(transaction, token, message.chat.id)
        return 'You are succesfully registered' if result else 'You need to register first'
    except Exception as e:
        print(e)


@firestore.transactional
def register_in_transaction(transaction, token, chat_id):
    user = db.collection(u'users')\
            .where(u'tg_token', u'==', str(token))\
            .get(transaction=transaction)
    if not len(user):
        return False
    private_ref = db.document(f'users/{user[0].id}/user_private/private')
    transaction.set(private_ref, {'tg_id': str(chat_id)})
    return True


@bot.message_handler(commands=['ask_question'])
def ask_question(message):
    if is_registered(message.from_user.id):
        markup = types.ReplyKeyboardMarkup(row_width=3,
                                           resize_keyboard=True,
                                           one_time_keyboard=True)
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
        markup = types.InlineKeyboardMarkup()
        accept_btn = telebot.types.InlineKeyboardButton(text='Ok', callback_data='Ok')
        cancel_btn = telebot.types.InlineKeyboardButton(text='Cancel', callback_data='Cancel')
        markup.add(accept_btn, cancel_btn)
        bot.reply_to(message, 'Send this question?', reply_markup=markup)
    except Exception as e:
        bot.reply_to(message, 'Something went wrong')


@bot.callback_query_handler(func=lambda call: True)
def query_handler(call):
    if call.data == 'Ok':
        bot.reply_to(call.message, commit_task(call.message))
    else:
        bot.send_message(call.message.chat.id, 'Cancelled')
    # hide inline buttons
    bot.edit_message_reply_markup(call.message.chat.id, call.message.message_id)


@bot.message_handler(commands=['get_id'])
def get_id_handler(message):
    bot.send_message(message.chat.id, message.from_user.id)


def is_registered(user_id):
    return db.collection_group('user_private')\
            .where(u'tg_id', u'==', str(user_id))\
            .get()


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
        'question_category': get_category(question_dict.get('category')),
        'required': True
    }
    questions_ref = tasks_ref.document(task_id).collection('questions')
    question_id = questions_ref.document().id
    question_ref = questions_ref.document(question_id)
    return question_ref, question


def get_category(cat):
    return 'Other' if cat not in categories else cat


bot.polling()
