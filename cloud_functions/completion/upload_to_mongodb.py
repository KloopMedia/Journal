import os
from google.cloud.firestore_v1.document import DocumentReference
import pymongo
from pymongo.collection import ReturnDocument
import numpy as np

MONGODB_USER = os.environ.get("MONGODB_USER")
MONGODB_PASS = os.environ.get("MONGODB_PASS")
MONGODB_CLUSTER = os.environ.get("MONGODB_CLUSTER")


def upload_to_mongodb(db, task):
    client = pymongo.MongoClient(
        f"mongodb+srv://{MONGODB_USER}:{MONGODB_PASS}@{MONGODB_CLUSTER}/myFirstDatabase?retryWrites=true&w=majority"
    )
    mongo_db = client.Journal
    task = get_task_data(db, task)
    uploaded_task = upload(mongo_db, task)
    print(f"{uploaded_task.get('_id')} uploaded to mongodb")
    return uploaded_task


def upload(mongo_db, task):
    case_type = task.get("case_type")
    if case_type:
        return mongo_db[f'{case_type}'].find_one_and_replace(
            {"_id": task.get("_id")},
            task,
            upsert=True,
            return_document=ReturnDocument.AFTER)


def get_task_data(db, task):
    task_dict = get_dict_with_id(task)
    task_dict['responses'] = get_task_responses(db, task)
    return task_dict


# add objectID to the doc
def get_dict_with_id(doc):
    id = doc.id
    doc_dict = doc.to_dict()
    doc_clean_keys = change_keys(doc_dict, lambda x: x.replace('.', '-'))
    doc_dict = clean_dict(doc_clean_keys)
    doc_dict['_id'] = id
    return doc_dict


def get_task_responses(db, task):
    responses = db.collection(f'tasks/{task.id}/responses').get()
    return list(map(get_dict_with_id, responses))


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


def change_keys(obj, convert):
    """
    Recursively goes through the dictionary obj and replaces keys with the convert function.
    """
    if isinstance(obj, (str, int, float)):
        return obj
    if isinstance(obj, dict):
        new = obj.__class__()
        for k, v in obj.items():
            new[convert(k)] = change_keys(v, convert)
    elif isinstance(obj, (list, set, tuple)):
        new = obj.__class__(change_keys(v, convert) for v in obj)
    else:
        return obj
    return new
