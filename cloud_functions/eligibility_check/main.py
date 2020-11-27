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
        task = approve_request(user_id, doc.get('case_type'), doc.get('case_stage_id'))
        if task:
            add_as_reader(task, user_id)
    else:
        print(f'user {user_id} already has tasks')


def has_tasks(user_id):
    tasks = client.collection('tasks')\
        .where(u'assigned_users', u'array_contains', user_id)\
        .where(u'is_complete', u'!=', True).get()
    return len(tasks)


def approve_request(user_id, case_type, case_stage_id):
    tasks = client.collection('tasks') \
        .where(u'case_type', u'==', case_type) \
        .where(u'case_stage_id', u'==', case_stage_id) \
        .where(u'assigned_users', '==', []) \
        .where(u'is_complete', u'!=', True).limit(1).stream()
    # there is only 1 task
    for task in tasks:
        task_ref = client.collection('tasks').document(task.id)
        task_ref.update({'assigned_users': [user_id]})
        return task.to_dict()


def add_as_reader(task, user_id):
    case_tasks = client.collection('tasks').where(u'case_id', u'==', task.get('case_id')).stream()
    for task in case_tasks:
        task_ref = client.collection('tasks').document(task.id)
        task_ref.update({'readers': firestore.ArrayUnion([user_id])})
