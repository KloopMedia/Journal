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
        print(e)


def get_user(tg_id):
    user = None
    tg_id = str(tg_id)
    print('tg_id: ', tg_id)
    try:
        user_private = db.collection_group(u'user_private')\
                         .where(u'tg_id', u'==', str(tg_id))\
                         .limit(1)\
                         .get()[0]
        # if user_private.exists:
        user_id = user_private.reference.path.split('/')[1]
        user = db.document(f'users/{user_id}').get()
    except Exception as e:
        print(e)
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
            bot.send_message(message.chat.id,
                             get_text(strings.YOU_ARE_ALREADY_REGISTERED, lang),
                             parse_mode='markdown')
    else:
        print(f'user {message.chat.id} is not registered')
        bot.send_message(message.chat.id, register_user(message))
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
    bot.send_message(message.chat.id,
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
            bot.send_message(call.message.chat.id,
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
        print(e)


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
            bot.send_message(message.chat.id,
                             get_string(lang, strings.CHOOSE_CATEGORY),
                             reply_markup=markup)
    else:
        bot.reply_to(message, get_string('ru', strings.YOU_NEED_TO_REGISTER))


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
                    bot.send_message(call.message.chat.id,
                                     get_text(cat, lang),
                                     reply_markup=markup,
                                     parse_mode='markdown')
                else:
                    print(f'no user {call.message.chat.id}')
                break
    except Exception as e:
        print(e)


@bot.callback_query_handler(
    func=lambda call: True
    if call.data == get_callback_data(strings.ASK_YOUR_OWN_QUESTION) else False
)
def question_handler(call):
    try:
        user = get_user(call.message.chat.id)
        lang = user.get('interface_lang')
        markup = types.ForceReply(selective=False)
        msg = bot.reply_to(call.message,
                           get_string(lang, strings.YOUR_QUESTION),
                           reply_markup=markup)
        bot.register_next_step_handler(msg, process_question_step)
    except Exception as e:
        print(e)
        bot.reply_to(call.message, get_string('ru', strings.SOMETHING_WENT_WRONG))


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
        bot.reply_to(message,
                     get_string(lang, strings.SEND_THIS_QUESTION),
                     reply_markup=markup)
    except Exception as e:
        print(e)
        bot.reply_to(message, get_string('ru', strings.SOMETHING_WENT_WRONG))


@bot.callback_query_handler(func=lambda call: True
                            if call.data in ['Ok', 'Cancel'] else False)
def query_handler(call):
    user = get_user(call.message.chat.id)
    lang = user.get('interface_lang')
    if call.data == 'Ok':
        bot.send_message(call.message.chat.id, commit_task(call.message, lang))
    else:
        bot.send_message(call.message.chat.id,
                         get_string(lang, strings.CANCELLED))
    # hide inline buttons
    bot.edit_message_reply_markup(call.message.chat.id,
                                  call.message.message_id)


@bot.message_handler(commands=['get_id'])
def get_id_handler(message):
    bot.send_message(message.chat.id, message.from_user.id)


@bot.message_handler(commands=['attach_files'])
def attach_file_handler(message):
    if len(message.text.split(' ')) != 3:  # no task_id or question_id
        print('no token')
    else:
        if is_registered(message.chat.id):
            bot.reply_to(message, 'registered')
            user = get_user(message.chat.id)
            task_id = message.text.split(' ')[1]
            question_id = message.text.split(' ')[2]
            user_tg_id = message.chat.id
            if can_attach_files(user, user_tg_id, task_id):
                bot.reply_to(message, 'can attach')
                bot.send_message(message.chat.id, 'attach files')
                bot.register_next_step_handler(message, process_attach_files,
                                               user.id, task_id, question_id)
            else:
                bot.send_message(message.chat.id, 'you can\'t attach files')
        else:
            bot.reply_to(message, 'not registered')


def process_attach_files(message, user_id, task_id, question_id):
    path = f'{task_id}/{question_id}/{user_id}'
    files, paths = get_files(message, path)
    urls = upload_files(list(zip(files, paths)))
    create_response(list(zip(urls, paths)), task_id, question_id)
    bot.reply_to(message, 'files uploaded')


def get_files(message, path):
    files = []
    paths = []
    if message.photo:
        for photo in message.photo:
            file_info = bot.get_file(photo.file_id)
            files.append(bot.download_file(file_info.file_path))
            paths.append(f'{path}/{file_info.file_unique_id}')
    if message.video:
        file_info = bot.get_file(message.video.file_id)
        files.append(bot.download_file(file_info.file_path))
        paths.append(f'{path}/{file_info.file_unique_id}')
    return files, paths


def upload_files(files):
    urls = []
    for user_file, file_path in files:
        blob = bucket.blob(file_path)
        blob.upload_from_string(user_file)
        urls.append(blob.public_url)
    return urls


def create_response(urls_with_paths, task_id, question_id):
    response = {
        'files': [{
            'public_url': url,
            'filename': path.split('/')[-1]
        } for url, path in urls_with_paths]
    }
    db.document(f'tasks/{task_id}/responses/{question_id}')\
        .set(response)


def can_attach_files(user, tg_id, task_id):
    result = False
    task = db.document(f'tasks/{task_id}').get()
    task = task.to_dict()
    user_private = db.document(user.reference.path + '/user_private/private').get()
    if user.id in task.get('assigned_users') or any([
            rank in task.get('ranks_write')
            for rank in user_private.to_dict().get('ranks')
    ]):
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


bot.remove_webhook()
time.sleep(0.1)
bot.set_webhook(url=WEBHOOK_URL_BASE + WEBHOOK_URL_PATH)

if __name__ == '__main__':
    app.run(host=WEBHOOK_LISTEN,
            port=WEBHOOK_PORT,
            ssl_context=(WEBHOOK_SSL_CERT, WEBHOOK_SSL_PRIV),
            debug=True)
