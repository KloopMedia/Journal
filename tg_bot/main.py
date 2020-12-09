import telebot
from telebot import types
import firebase_admin
from firebase_admin import firestore
from firebase_admin import credentials
import os
import logging
import strings

cred = credentials.Certificate("private/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

logger = telebot.logger
telebot.logger.setLevel(logging.DEBUG)  # Outputs debug messages to console.

bot = telebot.TeleBot(os.getenv("JOURNAL_BOT_TOKEN"), parse_mode=None)
question_dict = {}


def get_string(lang, string):
    return string[lang]


categories = [
    get_string('ru', strings.ORG_CAT),
    get_string('ru', strings.TECH_CAT),
    get_string('ru', strings.OTHER_CAT)
]


@bot.message_handler(commands=['start'])
def start_handler(message):
    if is_registered(message.from_user.id):
        bot.send_message(message.chat.id,
                         get_string('ru', strings.YOU_ARE_ALREADY_REGISTERED))
    else:
        bot.send_message(message.chat.id, register_user(message))


def register_user(message):
    try:
        transaction = db.transaction()
        if len(message.text.split(' ')) != 2:  # no token in /start
            result = False
        else:
            token = message.text.split(' ')[1]
            result = register_in_transaction(transaction,
                                             token,
                                             message.chat.id)
        if result:
            response = get_string('ru', strings.SUCCESSFULLY_REGISTERED)
        else:
            response = get_string('ru', strings.YOU_NEED_TO_REGISTER)
        return response
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
    transaction.update(private_ref, {'tg_id': str(chat_id)})
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
                         get_string('ru', strings.CHOOSE_CATEGORY),
                         reply_markup=markup)
        bot.register_next_step_handler(message, process_category_step)
    else:
        bot.reply_to(message, get_string('ru', strings.YOU_NEED_TO_REGISTER))


def process_category_step(message):
    try:
        category = message.text
        question_dict['category'] = category
        markup = types.ForceReply(selective=False)
        msg = bot.reply_to(message,
                           get_string('ru', strings.YOUR_QUESTION),
                           reply_markup=markup)
        bot.register_next_step_handler(msg, process_question_step)
    except Exception as e:
        print(e)
        bot.reply_to(message, get_string('ru', strings.SOMETHING_WENT_WRONG))


def process_question_step(message):
    try:
        markup = types.InlineKeyboardMarkup()
        accept_btn = telebot.types\
            .InlineKeyboardButton(text=get_string('ru', strings.OK),
                                  callback_data='Ok')
        cancel_btn = telebot.types\
            .InlineKeyboardButton(text=get_string('ru', strings.CANCEL),
                                  callback_data='Cancel')
        markup.add(accept_btn, cancel_btn)
        question_dict['question'] = message.text
        bot.reply_to(message,
                     get_string('ru', strings.SEND_THIS_QUESTION),
                     reply_markup=markup)
    except Exception as e:
        print(e)
        bot.reply_to(message, get_string('ru', strings.SOMETHING_WENT_WRONG))


@bot.callback_query_handler(func=lambda call: True)
def query_handler(call):
    if call.data == 'Ok':
        bot.send_message(call.message.chat.id, commit_task(call.message))
    else:
        bot.send_message(call.message.chat.id,
                         get_string('ru', strings.CANCELLED))
    # hide inline buttons
    bot.edit_message_reply_markup(call.message.chat.id,
                                  call.message.message_id)


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
    return get_string('ru', strings.TASK_CREATED)


def create_task(message, task_id):
    return {
        'title': 'FAQ',
        'description': '',
        'type': '',
        'assigned_users': [],
        'prefered_authors': [],
        'is_complete': False,
        'available': True,
        'selection_list': True,
        'case_id': task_id,
        'case_stage_id': 'answer_the_question',
        'case_type': 'FAQ'
    }


def create_question(message, tasks_ref, task_id):
    print('question: ', question_dict.get('question'))
    question = {
        'title': question_dict.get('question'),
        'type': 'input',
        'chat_id': message.chat.id,
        'question_category': get_category(question_dict.get('category')),
        'required': True
    }
    questions_ref = tasks_ref.document(task_id).collection('questions')
    question_id = questions_ref.document().id
    question_ref = questions_ref.document(question_id)
    return question_ref, question


def get_category(cat):
    return 'Other' if cat not in categories else cat




bot.polling(none_stop=True)
