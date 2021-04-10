deploy:
	gcloud functions deploy completion \
		--entry-point completion \
		--runtime python38  \
		--trigger-event=providers/cloud.firestore/eventTypes/document.update \
		--trigger-resource="projects/journal-bb5e3/databases/(default)/documents/tasks/{taskId}/user_editable/user_editable" \
		--set-env-vars ALGOLIA_INDEX_TITLE="${ALGOLIA_INDEX_TITLE}",ALGOLIA_PROJECT_ID="${ALGOLIA_PROJECT_ID}",ALGOLIA_API_TOKEN="${ALGOLIA_API_TOKEN}",MONGODB_USER="${MONGODB_USER}",MONGODB_PASS="${MONGODB_PASS}",MONGODB_CLUSTER="${MONGODB_CLUSTER}"

		
logs:
	gcloud functions logs read completion
