from google.cloud import firestore

client = firestore.Client()


def completion(event, context):
    path_parts = context.resource.split('/documents/')[1].split('/')
    collection_path = path_parts[0]
    document_path = '/'.join(path_parts[1:])
    doc_ref = client.collection(collection_path).document(document_path)
    task_ref = client.collection(collection_path).document(path_parts[1])
    doc = doc_ref.get().to_dict()

    if doc.get('status') == 'complete':
        task_ref.update({'is_complete': True})
    else:
        print('task is not complete yet')
