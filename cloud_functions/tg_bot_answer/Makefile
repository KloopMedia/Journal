deploy:
	gcloud functions deploy tg_bot_answer --entry-point send_answer --set-env-vars TG_BOT_TOKEN="${TG_BOT_TOKEN}" --runtime python38  --trigger-event=providers/cloud.firestore/eventTypes/document.update --trigger-resource="projects/journal-bb5e3/databases/(default)/documents/tasks/{taskId}"
logs:
	gcloud functions logs read tg_bot_answer
