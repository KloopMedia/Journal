from google.cloud import firestore

client = firestore.Client()


def eligibility_check(event, context):
    path_parts = context.resource.split('/documents/')[1].split('/')
    collection_path = path_parts[0]
    document_path = '/'.join(path_parts[1:])
    doc_ref = client.collection(collection_path).document(document_path)
    doc = doc_ref.get()

    user_id = doc.reference.path.split('/')[1]
    doc = doc.to_dict()
    if not has_tasks(user_id):
        approve_request(user_id, doc.get('taskType'))
    else:
        print(f'user {user_id} already has tasks')


def has_tasks(user_id):
    tasks = client.collection('tasks').where(u'assigned_users',
                                             u'array_contains', user_id).where(
                                                 u'is_complete', u'!=',
                                                 True).get()

    return len(tasks)


def approve_request(user_id, task_type):
    tasks = client.collection('tasks').where(u'type', u'==', task_type).where(
        u'assigned_users', '==', []).limit(1).stream()
    # there is only 1 task
    for task in tasks:
        task_ref = client.collection('tasks').document(task.id)
        task_ref.update({'assigned_users': [user_id]})
        break
