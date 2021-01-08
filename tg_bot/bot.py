import logging
import time
import flask
import telebot
import os
from telebot import types
import firebase_admin
from firebase_admin import firestore
from firebase_admin import storage
from firebase_admin import credentials
from pprint import pprint
import json
import redis
import strings


API_TOKEN = os.getenv('JOURNAL_BOT_TOKEN')

WEBHOOK_HOST = os.getenv('WEBHOOK_HOST')
WEBHOOK_PORT = 443
WEBHOOK_LISTEN = '0.0.0.0'
WEBHOOK_SSL_CERT = os.getenv('WEBHOOK_SSL_CERT')
WEBHOOK_SSL_PRIV = os.getenv('WEBHOOK_SSL_PRIV')
WEBHOOK_URL_BASE = "https://%s:%s" % (WEBHOOK_HOST, WEBHOOK_PORT)
WEBHOOK_URL_PATH = "/%s/" % (API_TOKEN)

logger = telebot.logger
telebot.logger.setLevel(logging.INFO)

redis_db = redis.Redis(host='localhost', port=6379)
bot = telebot.TeleBot(API_TOKEN, threaded=False)
app = flask.Flask(__name__)

cred = credentials.Certificate("private/serviceAccountKey.json")
firebase_admin.initialize_app(cred,
                              {'storageBucket': 'journal-bb5e3.appspot.com'})
global db
db = firestore.client()
global bucket
bucket = storage.bucket()

question_dict = {}
# lang = 'ru'
categories = [
    strings.PAYMENT, strings.SCHEDULE, strings.STUDY, strings.MY_SITE,
    strings.TECH_CAT
]

# Empty webserver index, return nothing, just http 200
@app.route('/', methods=['GET', 'HEAD'])
def index():
    return ''


@app.route(WEBHOOK_URL_PATH, methods=['POST'])
def webhook():
    try:
        if flask.request.headers.get('content-type') == 'application/json':
            json_string = flask.request.get_data().decode('utf-8')
            update = telebot.types.Update.de_json(json_string)
            bot.process_new_updates([update])
            return ''
        else:
            flask.abort(403)
    except Exception as e:
        print(e)
        flask.abort(403)


def get_string(lang, string):
    return string[lang]


def get_callback_data(category):
    return category.get('callback_data')


def get_text(category, lang='ru'):
    try:
        return db.document(f'faq_texts/{category.get("callback_data")}')\
                .get()\
                .get(lang).replace('\\n', '\n')
    except Exception as e:
        print('method: get_text()', e)


def get_user(tg_id):
    user = None
    tg_id = str(tg_id)
    print('get_user() tg_id: ', tg_id)
    try:
        user_private = db.collection_group(u'user_private')\
                         .where(u'tg_id', u'==', str(tg_id))\
                         .limit(1)\
                         .get()[0]
        # if user_private.exists:
        user_id = user_private.reference.path.split('/')[1]
        user = db.document(f'users/{user_id}').get()
    except Exception as e:
        print('method: get_user()', e)
    finally:
        return user


def update_language(tg_id, lang):
    user = get_user(tg_id)
    if user:
        user.reference.update({'interface_lang': lang})
        return True
    else:
        print(f'user {tg_id} doesn\'t exists')
        return False


@bot.message_handler(commands=['start'])
def start_handler(message):
    # try:
    if is_registered(message.from_user.id):
        print(f'user {message.chat.id} is already registered')
        user = get_user(message.from_user.id)
        lang = user.to_dict().get('interface_lang')
        if not lang:
            choose_lang_hadler(message)
        else:
            send_message(message,
                         get_text(strings.YOU_ARE_ALREADY_REGISTERED, lang),
                         parse_mode='markdown')
    else:
        print(f'user {message.chat.id} is not registered')
        send_message(message, register_user(message))
    # except Exception as e:
    # print(e)


@bot.message_handler(commands=['choose_language'])
def choose_lang_hadler(message):
    markup = types.InlineKeyboardMarkup(row_width=1)
    buttons = []
    for lang in strings.LANGUAGES:
        buttons.append(
            types.InlineKeyboardButton(text=get_string('ru', lang) + ' / ' +
                                       get_string('kg', lang),
                                       callback_data=get_callback_data(lang)))
    markup.add(*buttons)
    send_message(message,
                     text=get_string('ru', strings.CHOOSE_LANG) + ' / ' +
                     get_string('kg', strings.CHOOSE_LANG),
                     reply_markup=markup)


@bot.callback_query_handler(
    func=lambda call: True
    if call.data in [get_callback_data(lang)
                     for lang in strings.LANGUAGES] else False)
def language_handler(call):
    if is_registered(call.message.chat.id):
        result = update_language(call.message.chat.id, call.data)
        if result:
            send_message(call.message,
                         get_string(call.data, strings.LANGUAGE_CHANGED))


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
            print(f'user {message.chat.id} registered successfully')
        else:
            response = get_string('ru', strings.YOU_NEED_TO_REGISTER)\
                     + '\n\n'\
                     + get_string('kg', strings.YOU_NEED_TO_REGISTER)
        return response
    except Exception as e:
        print('method: register_user()', e)


@firestore.transactional
def register_in_transaction(transaction, token, chat_id):
    user = db.collection(u'users')\
            .where(u'tg_token', u'==', str(token))\
            .get(transaction=transaction)
    if not len(user):
        return False
    private_ref = db.document(f'users/{user[0].id}/user_private/private')
    transaction.update(user[0].reference, {'interface_lang': 'ru'})
    if private_ref.get().exists:
        transaction.update(private_ref, {'tg_id': str(chat_id)})
    else:
        transaction.set(private_ref, {'tg_id': str(chat_id)})
    return True


@bot.message_handler(commands=['ask_question'])
def ask_question(message):
    if is_registered(message.from_user.id):
        user = get_user(message.from_user.id)
        lang = user.to_dict().get('interface_lang')
        if not lang:
            choose_lang_hadler(message)
        else:
            markup = types.InlineKeyboardMarkup(row_width=2)
            buttons = get_buttons(categories, lang)
            markup.add(*buttons)
            send_message(message,
                         get_string(lang, strings.CHOOSE_CATEGORY),
                         reply_markup=markup)
    else:
        # bot.reply_to(message, get_string('ru', strings.YOU_NEED_TO_REGISTER))
        send_message(message,
                     get_string('ru', strings.YOU_NEED_TO_REGISTER),
                     reply=True)


@bot.callback_query_handler(
    func=lambda call: True
    if call.data in [get_callback_data(cat) for cat in categories] else False)
def categories_handler(call):
    try:
        for cat in categories:
            if call.data == get_callback_data(cat):
                user = get_user(call.message.chat.id)
                if user:
                    print(user.to_dict())
                    lang = user.get('interface_lang')
                    question_dict['category'] = call.data
                    markup = types.InlineKeyboardMarkup(row_width=2)
                    buttons = get_buttons(categories, lang)
                    ask_question_btn = types.InlineKeyboardButton(
                        text=get_string(lang, strings.ASK_YOUR_OWN_QUESTION),
                        callback_data=get_callback_data(
                            strings.ASK_YOUR_OWN_QUESTION))
                    buttons.append(ask_question_btn)
                    markup.add(*buttons)
                    send_message(call.message,
                                 get_text(cat, lang),
                                 reply_markup=markup,
                                 parse_mode='markdown')
                else:
                    print(f'no user {call.message.chat.id}')
                break
    except Exception as e:
        print('method: categories_handler()', e)


@bot.callback_query_handler(
    func=lambda call: True
    if call.data == get_callback_data(strings.ASK_YOUR_OWN_QUESTION) else False
)
def question_handler(call):
    try:
        user = get_user(call.message.chat.id)
        lang = user.get('interface_lang')
        markup = types.ForceReply(selective=False)
        msg = send_message(call.message,
                           get_string(lang, strings.YOUR_QUESTION),
                           reply_markup=markup,
                           reply=True)
        bot.register_next_step_handler(msg, process_question_step)
    except Exception as e:
        print(e)
        send_message(call.message,
                     get_string('ru', strings.SOMETHING_WENT_WRONG),
                     reply=True)


def process_question_step(message):
    try:
        user = get_user(message.from_user.id)
        lang = user.get('interface_lang')
        markup = types.InlineKeyboardMarkup()
        accept_btn = telebot.types\
            .InlineKeyboardButton(text=get_string(lang, strings.OK),
                                  callback_data='Ok')
        cancel_btn = telebot.types\
            .InlineKeyboardButton(text=get_string(lang, strings.CANCEL),
                                  callback_data='Cancel')
        markup.add(accept_btn, cancel_btn)
        question_dict['question'] = message.text
        send_message(message,
                     get_string(lang, strings.SEND_THIS_QUESTION),
                     reply_markup=markup,
                     reply=True)
    except Exception as e:
        print(e)
        send_message(message,
                     get_string('ru', strings.SOMETHING_WENT_WRONG),
                     reply=True)


@bot.callback_query_handler(func=lambda call: True
                            if call.data in ['Ok', 'Cancel'] else False)
def query_handler(call):
    user = get_user(call.message.chat.id)
    lang = user.get('interface_lang')
    if call.data == 'Ok':
        send_message(call.message, commit_task(call.message, lang))
    else:
        send_message(call.message, get_string(lang, strings.CANCELLED))
    # hide inline buttons
    bot.edit_message_reply_markup(call.message.chat.id,
                                  call.message.message_id)


@bot.message_handler(commands=['get_id'])
def get_id_handler(message):
    send_message(message, message.from_user.id)


@bot.message_handler(commands=['me'])
def get_me_handler(message):
    if is_registered(message.chat.id):
        user = get_user(message.chat.id).to_dict()
        tg_me_text = user.get("tg_me_text")
        show_info = f'{user.get("username")}\
                \n{user.get("email")}'
        if tg_me_text:
            show_info += f'\n{tg_me_text}'
        send_message(message, show_info)
    else:
        send_message(message,
                     get_string('ru', strings.YOU_NEED_TO_REGISTER))


@bot.message_handler(content_types=['photo', 'video'])
def attach_file_handler(message):
    try:
        if is_registered(message.chat.id):
            user = get_user(message.chat.id)
            upload_path = user.to_dict().get('fileUpload')
            if upload_path:
                task_id, question_id = upload_path.split('/')
                user_tg_id = message.chat.id
                if can_attach_files(user, user_tg_id, task_id):
                    process_attach_files(message, user.id, task_id,
                                         question_id)
                else:
                    send_message(
                        message, get_string('ru',
                                            strings.YOU_CANT_UPLOAD_FILES))
        else:
            send_message(message,
                         get_string('ru', strings.YOU_NEED_TO_REGISTER),
                         reply=True)
    except Exception as e:
        print('method attach_file_handler(): ', e)


def process_attach_files(message, user_id, task_id, question_id):
    path = f'{task_id}/{question_id}/{user_id}'
    file_bytes, path = get_files(message, path)
    url = upload_file(file_bytes, path)
    create_response(url, path, task_id, question_id)
    send_message(message, get_string('ru', strings.FILE_UPLOADED))


def get_files(message, path):
    if message.photo:
        file_id = message.photo[-1].file_id
    if message.video:
        file_id = message.video.file_id
    downloaded_file, file_path = _get_file(file_id, path)
    return downloaded_file, file_path


def _get_file(file_id, path):
    file_info = bot.get_file(file_id)
    file_path = '/'.join(file_info.file_path.split('/')[-2:])
    downloaded_file = bot.download_file(file_path)
    extension = file_path.split(".")[-1]
    file_path = f'{path}/{file_info.file_unique_id}.{extension}'
    return downloaded_file, file_path


def upload_file(file_bytes, path, public=True):
    blob = bucket.blob(path)
    blob.upload_from_string(file_bytes, content_type=path.split('.')[-1])
    if public:
        blob.make_public()
    return blob.public_url


def create_response(url, path, task_id, question_id):
    filename = path.split('/')[-1]
    key = filename.split('.')[0]
    response = {'contents': {key: {'name': filename, 'url': url}}}
    db.document(f'tasks/{task_id}/responses/{question_id}')\
        .set(response, merge=True)


def can_attach_files(user, tg_id, task_id):
    result = False
    task = db.document(f'tasks/{task_id}').get()
    task = task.to_dict()
    if user.id in task.get('assigned_users'):
        result = True
    return result


def is_registered(user_id):
    return db.collection_group('user_private')\
             .where(u'tg_id', u'==', str(user_id))\
             .get()


def commit_task(message, lang='ru'):
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
    return get_string(lang, strings.TASK_CREATED)


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
        'case_type': 'FAQ',
        'quick': True,
        'ranks_read': ['faq_moderator', 'election_observer'],
        'ranks_write': ['faq_moderator'],
        'created_date': firestore.SERVER_TIMESTAMP
    }


def create_question(message, tasks_ref, task_id):
    print('question: ', question_dict.get('question'))
    print('category: ', question_dict.get('category'))
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
    return 'Other' if cat not in [
        get_callback_data(cat) for cat in categories
    ] else cat


def get_buttons(categories, lang='ru'):
    buttons = []
    for cat in categories:
        buttons.append(
            types.InlineKeyboardButton(
                text=get_string(lang, cat),
                callback_data=get_callback_data(cat)))
    return buttons


def send_message(message,
                 text,
                 reply_markup=None,
                 parse_mode=None,
                 reply=False):
    m = json.dumps({
        'chat_id': message.chat.id,
        'text': text,
        'reply_markup': reply_markup.to_json() if reply_markup else None,
        'parse_mode': parse_mode,
        'reply_to_message_id': message.message_id if reply else None
    })
    redis_db.lpush(message.chat.id, m)
    redis_db.sadd('chats', message.chat.id)
    # TODO: probably needs to return sended message
    return message


bot.remove_webhook()
time.sleep(0.1)
bot.set_webhook(url=WEBHOOK_URL_BASE + WEBHOOK_URL_PATH)

if __name__ == '__main__':
    app.run(host=WEBHOOK_LISTEN,
            port=WEBHOOK_PORT,
            ssl_context=(WEBHOOK_SSL_CERT, WEBHOOK_SSL_PRIV),
            debug=True)