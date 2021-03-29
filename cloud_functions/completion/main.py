from google.cloud import firestore
import uuid

import requests

import re
import json
import uuid
from json_logic import jsonLogic

client = firestore.Client()


def completion(event, context):
    path_parts = context.resource.split('/documents/')[1].split('/')
    collection_path = path_parts[0]
    document_path = '/'.join(path_parts[1:])
    doc_ref = client.collection(collection_path).document(document_path)
    task_ref = client.collection(collection_path).document(path_parts[1])
    doc = doc_ref.get().to_dict()
    task = task_ref.get().to_dict()

    # get schema data
    case_ref = client.collection('schema').document('structure').collection('cases').document(task['case_type'])
    case = case_ref.get().to_dict()

    stage_ref = client.collection('schema').document('structure').collection('cases').document(
        task['case_type']).collection('stages').document(task['case_stage_id'])
    stage = stage_ref.get().to_dict()

    if doc.get('status') == 'complete':
        task_ref.update({'is_complete': True, 'completionTime': firestore.SERVER_TIMESTAMP})

        # NEXT TASK
        if stage.get('next_task') and stage['next_task'] != '':
            next_stage_ref = client.collection('schema').document('structure').collection('cases').document(
                task['case_type']).collection('stages').document(stage['next_task'])
            next_stage = next_stage_ref.get().to_dict()

            # --------
            # new task
            # --------
            new_task_id = uuid.uuid1().__str__()

            new_task_doc = {
                'title': next_stage['title'],
                'description': next_stage['description'],
                'type': 'interview',
                'assigned_users': [],
                'prefered_authors': [],
                'is_complete': False,
                'available': True,

                'case_id': task['case_id'],
                'case_stage_id': stage['next_task'],
                'case_type': task['case_type'],

                'debug_prev_task_id': path_parts[1],
                'debug_prev_stage_id': task['case_stage_id'],
                'debug_auto_created': True
            }
            client.collection('tasks').document(new_task_id).set(new_task_doc)

            # ----------
            # prototasks
            # ----------

            # start queestions
            start_questions_docs = client.collection('schema').document('structure').collection('prototasks').document(
                next_stage['proto_task']).collection(u'start').stream()

            for start_question_doc in start_questions_docs:
                question_id = start_question_doc.id
                question_info = start_question_doc.to_dict()

                client.collection('tasks').document(new_task_id).collection('questions').document(question_id).set(
                    question_info)

            # stage questions
            stage_questions_docs = client.collection('schema').document('structure').collection('cases').document(
                task['case_type']).collection('stages').document(stage['next_task']).collection(u'questions').stream()

            for stage_question_doc in stage_questions_docs:
                question_id = stage_question_doc.id
                question_info = stage_question_doc.to_dict()

                client.collection('tasks').document(new_task_id).collection('questions').document(question_id).set(
                    question_info)

            # end questions
            end_questions_docs = client.collection('schema').document('structure').collection('prototasks').document(
                next_stage['proto_task']).collection(u'end').stream()

            for end_question_doc in end_questions_docs:
                question_id = end_question_doc.id
                question_info = end_question_doc.to_dict()

                client.collection('tasks').document(new_task_id).collection('questions').document(question_id).set(
                    question_info)

            # user_editable
            client.collection('tasks').document(new_task_id).collection('user_editable').document('user_editable').set(
                {'status': 'open'})

            # responses
            response_id = uuid.uuid1().__str__()
            client.collection('tasks').document(new_task_id).collection('responses').document(response_id).set(
                {'test': 123})

        # NEXT TASK (ANN and KATE) NEW LOGIC!!!
        if stage.get('nextLogic') and stage['nextLogic'] != '':
            # create big object
            responses_generator = client.collection(collection_path) \
                .document(path_parts[1]) \
                .collection("responses").stream()
            responses = dict()
            for res in responses_generator:
                # make a clean responses dict
                content = res.to_dict()['contents'] if res.to_dict().get("contents") else res.to_dict()
                responses[res.id] = content

            big_object = {
                "stage": stage_ref.id,
                "userId": task['assigned_users'],
                "source": {"stage": stage_ref.id,
                           "userId": task['assigned_users'],
                           "region": responses.get('region')
                           }
            }
            big_object.update(responses)

            print("BIG OBJECT", big_object)

            # apply nextLogic and create new task
            nextRule = eval(stage['nextLogic'])
            print("nextRule: ", nextRule)
            nextData = big_object
            logic_output = jsonLogic(nextRule, nextData)
            print(task['case_stage_id'])
            print("output: ", logic_output)

            # if task['case_stage_id'] == 'emergency_form_filling':
            #     nextTaskString = re.sub("}", "},", logic_output[1:][:-1], 1)
            #     nextTaskList = json.loads(nextTaskString)
            #     for variant in nextTaskList:
            #         create_task(variant, big_object, task, stage)
            # elif (task['case_stage_id'] == 'emergency_form_complaint_submit' or
            #     task['case_stage_id'] == 'emergency_form_publication'):
            #     pass
            # else:
            #     create_task(json.loads(logic_output), big_object, task, stage)

            # put logic output item inside a list
            if logic_output[0] != "[":
                logic_output = f"[{logic_output}]"

            """ 
            OLD
            if task['case_stage_id'] == 'emergency_form_filling':
                nextTaskString = re.sub("}", "},", logic_output[1:][:-1], 1)
                nextTaskList = json.loads(nextTaskString)
                for variant in nextTaskList:
                    create_task(variant, big_object, task, stage)
                    pass
            else:
                create_task(json.loads(logic_output), variant, big_object, task, stage)"""
            nextTaskList = json.loads(logic_output)
            for variant in nextTaskList:
                if variant is not None:
                    create_task(variant, big_object, task, stage, collection_path)
                else: print("ERROR! No variant in next tasks list!!!")


    else:
        print('task is not complete yet')

    if doc.get('status') == 'released':
        user_id = task['assigned_users'][0]

        # print(event)
        # print('USER_ID: ' + user_id)
        # print('PATH: ' + doc_ref.get().reference.path)
        task_ref.update({'is_complete': False, 'assigned_users': firestore.ArrayRemove([user_id])})

        if doc.get('release_status') == 'Задание выполнить невозможно, так как не хватает исходных данных':
            task_ref.update({'available': False})

        delete_as_reader(task, user_id)


def delete_as_reader(task, user_id):
    case_tasks = client.collection('tasks').where(u'case_id', u'==', task.get('case_id')).stream()
    for task in case_tasks:
        task_ref = client.collection('tasks').document(task.id)
        task_ref.update({'readers': firestore.ArrayRemove([user_id])})


def get_card_data(stage, collection_path, task):
    fields = stage['cardData']
    stage_names = fields.keys()
    card_data = dict()
    for stage_name in stage_names:

        responses_needed = fields[stage_name]
        source_task_generator = client.collection(collection_path) \
            .where(u"case_id", u'==', task['case_id']) \
            .where(u"case_stage_id", u'==', stage_name) \
            .stream()
        # there must be only ONE source task
        # we get it from the generator
        responses_gen = client.collection(collection_path) \
            .document(next(source_task_generator).id) \
            .collection(u"responses").stream()

        stage_responses = dict()
        for res in responses_gen:
            response_data = res.to_dict()
            # make a clean responses dict
            if res.id in responses_needed:
                content = response_data['contents'] if response_data.get("contents") else response_data
                stage_responses[res.id] = content
        card_data[stage_name] = stage_responses
    return card_data


def create_task(variant, big_object, task, stage, collection_path):
    next_stage_name = variant['nextTask']
    next_stage_ref = client.collection('schema') \
        .document('structure') \
        .collection('cases') \
        .document(task['case_type']) \
        .collection('stages') \
        .document(next_stage_name)

    next_stage_doc = next_stage_ref.get().to_dict()
    print("case id: ", task['case_id'])
    next_task_doc = {
        "case_id": task['case_id'],
        "available": True,
        "title": next_stage_doc['title'],
        "description": next_stage_doc['description'],
        "is_complete": False,
        "assigned_users": [],
        "prefered_authors": [],
        "ranks_read": next_stage_doc['ranks_read'],
        "ranks_write": next_stage_doc['ranks_write'],
        "created_date": firestore.SERVER_TIMESTAMP,
        "case_type": task['case_type'],
        "case_stage_id": next_stage_name,
        "cardData": get_card_data(next_stage_doc, collection_path, task),
        "source": { "stage" : task.get("case_stage_id"),
                  "userId" : task.get("assigned_users"),
                  "source": task.get("source")
                  }
    }

    print("variant: ", variant)


    if variant.get("user") is not None and variant.get("user") != "":
      user = variant['user'].replace("'", '"').strip()  # turn str into list
      user = json.loads(user)
      if user:
        next_task_doc['assigned_users'].extend(user)

    new_task_id = uuid.uuid1().__str__()
    print("new task id: ", new_task_id)
    print("new task doc: ", next_task_doc)

    # create new task
    client.collection('tasks').document(new_task_id).set(next_task_doc)
    # add questions to task
    # client.collection('tasks').document(new_task_id) \
    #                             .collection(u"questions") \
    #                             .document(u"form_questions") \
    #                             .set(next_stage_doc['end'])
    # # add ui to task
    # client.collection('tasks').document(new_task_id) \
    #                             .collection(u"questions") \
    #                             .document(u"end_ui_schema") \
    #                             .set(next_stage_doc['end_ui_schema'])
    # make task open
    client.collection('tasks').document(new_task_id) \
        .collection(u"user_editable") \
        .document(u"user_editable") \
        .set({"status": "open"})

    # apply responseLogic
    # Khakim code
    if next_stage_doc.get('responseWebHook') and next_stage_doc['responseWebHook'] != '':

        print('WEBHOOK')

        URI = next_stage_doc['responseWebHook']

        # пример данных: результат заполнения emergency form
        # для полного тестирования next_task_resolving нужны json'ы более высокого уровня
        # ниже - загрузка из файла
        # '''
        sampleData = {
            "stage": next_stage_name,
            "userId": "",
            "region": {
                "Batken": "г. Сулюкта/ Сүлүктү ш."
            },
            "violationTime": {
                "start": "2020-12-29T11:59:00.000Z",
                "end": "2020-12-15T11:59:00.000Z"
            },
            "firstName": "Chuck",
            "lastName": "Norris",
            "age": 75,
            "bio": "Roundhouse kicking asses since 1940",
            "password": "noneed",
            "name": "Kate",
            "uikNum": "1345",
            "violationType": "Давление на наблюдателя",
            "telephone": 96556578,
            "details": "Видимо, что-то случилось",
            "source": {"stage": "registration",
                       "userId": "Kate"}
        }

        print(big_object)
        print(sampleData)
        # bigobject
        # {'stage': 'emergency_form_filling', 'userId': ['HKLIN7RndPenfvsrbg6MawmtnU73'], 'source': {'stage': 'emergency_form_filling', 'userId': ['HKLIN7RndPenfvsrbg6MawmtnU73'], 'region': {'Talas': 'г. Талас/ Талас ш.'}}, 'attachedFiles': {'contents': {}}, 'details': 'dfddfdf', 'end': {}, 'name': '333', 'region': {'Talas': 'г. Талас/ Талас ш.'}, 'start': {}, 'telephone': 3333, 'uikNum': '3434', 'violationTime': {'end': '2021-01-12T19:19:00.000Z', 'start': '2021-01-02T19:19:00.000Z'}, 'violationType': 'Массовый подвоз избирателей'}

        # '''

        # данные можно подгрузить из файла
        # fileName = "/content/drive/MyDrive/Colab Notebooks/form responces data/emergency_form_filling_data.json"
        # with open(fileName, "r") as read_file:
        #    sampleData = json.load(read_file)

        response = requests.post(URI, json=big_object)
        print("Status code: ", response.status_code)
        print("Printing Entire Post Request")
        print(json.loads(response.content))
        print('END CALL WEBHOOK')

        # fill responses
        responsesDict = json.loads(response.content)
        for response_name in responsesDict.keys():
            client.collection('tasks').document(new_task_id) \
                .collection(u"responses") \
                .document(response_name) \
                .set({'contents': responsesDict[response_name]})
    # Ann code
    elif next_stage_doc.get('responseLogic') is not None:

        responseRule = eval(next_stage_doc['responseLogic'])
        responseData = big_object
        logic_output = jsonLogic(responseRule, responseData)
        responsesDict = json.loads(logic_output)

        # fill responses
        for response_name in responsesDict.keys():
            client.collection('tasks').document(new_task_id) \
                .collection(u"responses") \
                .document(response_name) \
                .set({'contents': responsesDict[response_name]})