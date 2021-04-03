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
	# document_path = '/'.join(path_parts[1:])
	print("path_parts", path_parts)
	document_path = '/'.join(str(part) for part in path_parts[1:])
	print("collection path", collection_path)
	print("document path", document_path)
	doc_ref = client.collection(collection_path).document(document_path)
	task_ref = client.collection(collection_path).document(path_parts[1])
	doc = doc_ref.get().to_dict()
	task = task_ref.get().to_dict()

	# get schema data
	case_ref = client.collection('schema').document(
		'structure').collection('cases').document(task['case_type'])
	case = case_ref.get().to_dict()

	stage_ref = client.collection('schema').document('structure').collection('cases').document(
		task['case_type']).collection('stages').document(task['case_stage_id'])
	stage = stage_ref.get().to_dict()

	starter_task_ref = client.collection('tasks').document(str(task['case_id']))
	starter_task = starter_task_ref.get().to_dict()

	if doc.get('status') == 'complete':

		# NEXT TASK (ATAI) ARRAY LOGICS!!!
		if stage.get('logicArray') and stage['logicArray'] != '':
			# create big object
			responses_generator = client.collection(collection_path) \
				.document(path_parts[1]) \
				.collection("responses").stream()
			responses = dict()
			for res in responses_generator:
				# make a clean responses dict
				content = res.to_dict()['contents'] if res.to_dict().get(
					"contents") else res.to_dict()
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

			if (path_parts[1] == task['case_id']):
				big_object['source']['responses'] = responses

			print("BIG OBJECT", big_object)

			# Evaluate (apply) every rule, if true create new task
			nextData = big_object
			logics = stage.get('logicArray')

			for logic in logics:
				rules = logic.get('nextRule')
				for rule in rules:
					nextRule = eval(rule)

					# logic_output returs boolean value
					logic_output = jsonLogic(nextRule, nextData)
					if logic_output:
						print('Rule: {}, Output: {}'.format(nextRule, logic_output))
						if logic.get('send_to_starter'):
							assigned_users = starter_task.get('assigned_users')
							if len(assigned_users) > 0:
								starter_user = assigned_users
							else:
								starter_user = ''
							print('starter user', starter_user)
							nextTask = {'nextTask': logic.get('nextTask'), 'user': starter_user}
						elif logic.get('return_to_same_user'):
							assigned_users = task.get('assigned_users')
							if len(assigned_users) > 0:
								current_user = assigned_users
							else:
								current_user = ''
							print('starter user', current_user)
							nextTask = {'nextTask': logic.get('nextTask'), 'user': current_user}
						else:
							nextTask = {'nextTask': logic.get('nextTask')}
							print("no send_to_starter")
						
						if logic.get('send_to_starter') and logic.get('open_starter'):
							starter_task_ref.collection(u"user_editable").document(u"user_editable").set({"status": "open"})
							starter_task_ref.update({"is_complete": False})
							print("returned to starter")
						elif nextTask is not None:
							print("created task")
							create_task(nextTask, big_object, task,
										stage, collection_path)
						else:
							print("ERROR! No nextTask in next tasks list!!!")
						break

	else:
		print('task is not complete yet')


def delete_as_reader(task, user_id):
	case_tasks = client.collection('tasks').where(
		u'case_id', u'==', task.get('case_id')).stream()
	for task in case_tasks:
		task_ref = client.collection('tasks').document(task.id)
		task_ref.update({'readers': firestore.ArrayRemove([user_id])})


def get_card_data(stage, collection_path, task):
	if stage.get('cardData') and stage['cardData'] != '':
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
					content = response_data['contents'] if response_data.get(
						"contents") else response_data
					stage_responses[res.id] = content
			card_data[stage_name] = stage_responses
		return card_data
		
	else:
		return dict()


def create_task(variant, big_object, task, stage, collection_path):
	next_stage_name = variant['nextTask']
	next_stage_ref = client.collection('schema') \
		.document('structure') \
		.collection('cases') \
		.document(task['case_type']) \
		.collection('stages') \
		.document(next_stage_name)

	next_stage_doc = next_stage_ref.get().to_dict()

	if task.get("source"):
		source = task.get("source")
	else:
		source = big_object.get("source")

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
		"source": {"stage": task.get("case_stage_id"),
				   "userId": task.get("assigned_users"),
				   "source": source
				   }
	}

	print("variant: ", variant)

	if variant.get("user") is not None and variant.get("user") != "":
		# user = variant['user'].strip()  # turn str into list
		# user = json.loads(user)
		user = variant.get("user")
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

		print(source)
		# bigobject
		# {'stage': 'emergency_form_filling', 'userId': ['HKLIN7RndPenfvsrbg6MawmtnU73'], 'source': {'stage': 'emergency_form_filling', 'userId': ['HKLIN7RndPenfvsrbg6MawmtnU73'], 'region': {'Talas': 'г. Талас/ Талас ш.'}}, 'attachedFiles': {'contents': {}}, 'details': 'dfddfdf', 'end': {}, 'name': '333', 'region': {'Talas': 'г. Талас/ Талас ш.'}, 'start': {}, 'telephone': 3333, 'uikNum': '3434', 'violationTime': {'end': '2021-01-12T19:19:00.000Z', 'start': '2021-01-02T19:19:00.000Z'}, 'violationType': 'Массовый подвоз избирателей'}

		# '''

		# данные можно подгрузить из файла
		# fileName = "/content/drive/MyDrive/Colab Notebooks/form responces data/emergency_form_filling_data.json"
		# with open(fileName, "r") as read_file:
		#    sampleData = json.load(read_file)

		response = requests.post(URI, json=source)
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
