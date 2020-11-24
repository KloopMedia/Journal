deploy:
	gcloud functions deploy completion --entry-point completion --runtime python38  --trigger-event=providers/cloud.firestore/eventTypes/document.update --trigger-resource="projects/journal-bb5e3/databases/(default)/documents/tasks/{taskId}/user_editable/user_editable"
logs:
	gcloud functions logs read completion
