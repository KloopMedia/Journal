from google.cloud import firestore
import requests
import os

client = firestore.Client()


def send_answer(event, context):
    path_parts = context.resource.split('/documents/')[1].split('/')
    collection_path = path_parts[0]
    document_path = '/'.join(path_parts[1:])

    response_ref = client.collection(collection_path).document(document_path)
    task_ref = client.collection(collection_path).document(path_parts[1])
    question_ref = task_ref.collection('questions').document(path_parts[-1])

    question_doc = question_ref.get().to_dict()
    if question_doc:
        chat_id = question_doc.get('chat_id')
        # check if it's response for a bot
        if chat_id:
            response_doc = response_ref.get().to_dict()
            message = get_message(question_doc, response_doc)
            send_text = f'https://journaltgbot.kloop.io'\
                        f'/bot{os.environ.get("TG_BOT_TOKEN")}'\
                        f'/sendMessage?chat_id={chat_id}'\
                        f'&text={message}'
            response = requests.get(send_text)
            print('response: ', response)
        else:
            pass
    else:
        print('no such question')


def get_message(question_doc, response_doc):
    return f'{question_doc.get("title")}\n{response_doc.get("answer")}'
