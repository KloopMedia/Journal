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

    response_doc = response_ref.get().to_dict()
    question_doc = question_ref.get().to_dict()
    print(response_doc)
    print(question_doc)

    chat_id = question_doc.get('chat_id')
    message = get_message(question_doc, response_doc)
    print(f'message: {message}')
    send_text = f'https://api.telegram.org'\
                f'/bot{os.environ.get("TG_BOT_TOKEN")}'\
                f'/sendMessage?chat_id={chat_id}'\
                f'&text={message}'
    print(f'send text: {send_text}')
    response = requests.get(send_text)
    print(response)


def get_message(question_doc, response_doc):
    return f'{question_doc.get("title")}\n{response_doc.get("answer")}'
