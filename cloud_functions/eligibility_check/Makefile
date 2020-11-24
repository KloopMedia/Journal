deploy:
	gcloud functions deploy eligibility_check --entry-point eligibility_check --runtime python38  --trigger-event=providers/cloud.firestore/eventTypes/document.create --trigger-resource="projects/journal-bb5e3/databases/(default)/documents/task_requests/{userId}/requests/{requestId}"
logs:
	gcloud functions logs read eligibility_check
