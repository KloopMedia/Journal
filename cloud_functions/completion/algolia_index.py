import os
import numpy as np

from algoliasearch.search_client import SearchClient
from google.cloud.firestore_v1.document import DocumentReference

ALGOLIA_INDEX_TITLE = os.environ.get('ALGOLIA_INDEX_TITLE')
ALGOLIA_PROJECT_ID = os.environ.get('ALGOLIA_PROJECT_ID')
ALGOLIA_API_TOKEN = os.environ.get('ALGOLIA_API_TOKEN')


def add_to_algolia_index(db, task_ref):
    task = task_ref.get()

    algolia_client = SearchClient.create(ALGOLIA_PROJECT_ID, ALGOLIA_API_TOKEN)
    index = algolia_client.init_index(ALGOLIA_INDEX_TITLE)

    task_dict = get_task_data(db, task)
    records_uploaded = upload_to_algolia_index(index, [task_dict])
    if records_uploaded:
        task_ref.update({'is_in_aloglia_index': True})


def get_task_data(db, task):
    task_dict = get_dict_with_id(task)
    task_dict['responses'] = get_task_responses(db, task)
    return task_dict


def get_task_responses(db, task):
    responses = db.collection(f'tasks/{task.id}/responses').get()
    return list(map(get_dict_with_id, responses))


def upload_to_algolia_index(index, data):
    response = index.save_objects([doc for doc in data], {
        'autoGenerateObjectIDIfNotExist': True
    })
    # There should be only one raw response
    records_uploaded = response.raw_responses[0].get("objectIDs")[0]
    print(f'{records_uploaded} uploaded to algolia')
    return len(records_uploaded)


# add objectID to the doc
def get_dict_with_id(doc):
    id = doc.id
    doc_dict = doc.to_dict()
    doc_dict = clean_dict(doc_dict)
    doc_dict['objectID'] = id
    return doc_dict


# remove all bugged data in docs and responses
def clean_dict(doc_dict):
    keys_to_del = []
    for k, v in doc_dict.items():
        # DocumentReference is not JSON serializable
        if type(v) == DocumentReference:
            keys_to_del.append(k)
        # NaN throws "lexical error: invalid char in json text"
        if type(v) == float and np.isnan(v):
            doc_dict[k] = None
    for key in keys_to_del:
        removed = doc_dict.pop(key, None)
        print(f'removed {key} -> {removed}')
    return doc_dict
