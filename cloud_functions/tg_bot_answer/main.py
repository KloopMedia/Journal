from google.cloud import firestore
import requests
import os

client = firestore.Client()


def send_answer(event, context):
    path_parts = context.resource.split('/documents/')[1].split('/')
    collection_path = path_parts[0]
    document_path = '/'.join(path_parts[1:])

    task_ref = client.collection(collection_path).document(path_parts[1])
    response_ref = client.document(f'{task_ref.path}/responses/answer')
    doc_ref = client.document(f'{collection_path}/{document_path}')
    print(f'task_ref: {task_ref.path}\nresponse_ref: {response_ref.path}\ndoc_ref: {doc_ref.path}')
    if doc_ref.get()\
              .to_dict()\
              .get('status') == 'complete':
        question_ref = task_ref\
                .collection('questions')\
                .document('form_questions')
        question_doc = question_ref.get().to_dict()
        if question_doc:
            chat_id = question_doc.get('chat_id')
            # check if it's response for a bot
            if chat_id:
                print(f'Chat id: {chat_id}')
                response_doc = response_ref.get().to_dict()
                if response_doc:
                    message = get_message(question_doc, response_doc)
                    send_text = f'https://journaltgbot.kloop.io'\
                                f'/bot{os.environ.get("TG_BOT_TOKEN")}'\
                                f'/sendMessage?chat_id={chat_id}'\
                                f'&text={message}'
                    response = requests.get(send_text)
                    print('response: ', response)
                else:
                    print('No response yet')
            else:
                pass
        else:
            print('No question')
    else:
        print(f'Task {task_ref.path} is not completed yet')


def get_message(question_doc, response_doc):
    answer = ''
    if response_doc.get('answer'):
        answer = response_doc.get('answer')
    elif response_doc.get('contents'):
        answer = response_doc.get('contents')
    return f'{question_doc.get("title")}\n{answer}'
