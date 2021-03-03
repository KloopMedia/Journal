import React, { useState, useEffect, useContext, useRef } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import CustomFileUpload from "../form/CustomFileUpload";
import { Button, Grid, Typography } from '@material-ui/core';

import JSchemaForm from "@rjsf/bootstrap-4";
import { cloneDeep } from 'lodash'


const JSchemaTask = (props) => {
	const [formResponses, setFormResponses] = useState({})
	const [taskForm, setTaskForm] = useState({})
	const [mergedForm, setMergedForm] = useState({})
	const [taskMetadata, setTaskMetadata] = useState({})
	const [caseStages, setCaseStages] = useState({})
	const [gRef, setGRef] = useState(null)
	const [formStatus, setFormStatus] = useState("loading")

	const { currentUser } = useContext(AuthContext);
	const id = props.id


	useEffect(() => {
		if (currentUser && id) {

			const ref = firebase
				.firestore()
				.collection("tasks")
				.doc(id)

			setGRef(ref)

			ref.onSnapshot(doc => {
				setTaskMetadata(doc.data())
				if (doc.data().is_complete) {
					setFormStatus("sent")
				}

				if (!doc.data().assigned_users.includes(currentUser.uid)) {
					setFormStatus("released")
				}
				console.log("Task Metadata: ", doc.data());
			});

			ref.collection("responses")
				.onSnapshot(snapshot => {
					const changes = {}
					const deletes = []
					let modifyResponses = false
					snapshot.docChanges().forEach(change => {
						if (change.type === "added" || change.type === "modified") {
							const contents = change.doc.data().contents
							changes[change.doc.id] = contents
							modifyResponses = true
							//}
						}
						if (change.type === "removed") {
							//if (formResponses.hasOwnProperty(change.doc.id)) {
							console.log("Response Removed: ", change.doc.data());
							deletes.push(change.doc.id)
							modifyResponses = true
							//}
						}
					});
					if (modifyResponses) {
						setFormResponses(prevState => {
							const newState = cloneDeep(prevState)
							deletes.forEach(d => delete newState[d])
							Object.keys(changes).forEach(key => newState[key] = changes[key])
							return newState
						})
					}
				});

			ref.collection("questions")
				.onSnapshot(snapshot => {
					snapshot.docChanges().forEach(change => {
						if (change.type === "added" || change.type === "modified") {
							setTaskForm(prevState => {
								return { ...prevState, [change.doc.id]: change.doc.data() }
							})
						}
					})
				})
		}

	}, [id, currentUser])

	useEffect(() => {
		if (Object.entries(taskMetadata).length > 0) {
			console.log("Task metadata: ", taskMetadata)
			firebase.firestore()
				.collection("schema")
				.doc("structure")
				.collection("cases")
				.doc(taskMetadata.case_type)
				.collection("stages")
				.onSnapshot(snapshot => {
					snapshot.docChanges().forEach(change => {
						if (change.type === "added" || change.type === "modified") {
							console.log("Case stage: ", change.doc.data())
							setCaseStages(prevState => {
								return { ...prevState, [change.doc.id]: change.doc.data() }
							})
						}
						if (change.type === "removed") {
							setCaseStages(prevState => {
								const newState = Object.assign({}, prevState)
								delete newState[change.doc.id]
								return newState
							})
						}
					});
				});

		}
	}, [taskMetadata])

	useEffect(() => {
		setMergedForm(mergeForm(taskForm, caseStages[taskMetadata.case_stage_id]))
	}, [taskForm, taskMetadata, caseStages])

	const handleFormChange = e => {
		setFormResponses(e.formData)
	};

	const mergeForm = (taskForm, caseForms) => {
		const tForm = Object.assign({}, taskForm)
		const cForms = Object.assign({}, caseForms)

		cForms.start = cForms.start ? cForms.start : {}
		cForms.end = cForms.end ? cForms.end : {}
		cForms.start_ui_schema = cForms.start_ui_schema ? cForms.start_ui_schema : {}
		cForms.end_ui_schema = cForms.end_ui_schema ? cForms.end_ui_schema : {}

		tForm.form_questions = tForm.form_questions ? tForm.form_questions : {}
		tForm.ui_schema = tForm.ui_schema ? tForm.ui_schema : {}


		const properties = {
			...(cForms.start.properties ? cForms.start.properties : {}),
			...(cForms.end.properties ? cForms.end.properties : {}),
			...(tForm.form_questions.properties ? tForm.form_questions.properties : {})
		}

		const definitions = {
			...(cForms.start.definitions ? cForms.start.definitions : {}),
			...(cForms.end.definitions ? cForms.end.definitions : {}),
			...(tForm.form_questions.definitions ? tForm.form_questions.definitions : {})
		}

		let title = ""
		if (tForm.form_questions.title) {
			title = tForm.form_questions.title
		} else if (cForms.end.title) {
			title = cForms.end.title
		} else if (cForms.start.title) {
			title = cForms.start.title
		}

		let description = ""
		if (tForm.form_questions.description) {
			description = tForm.form_questions.description
		} else if (cForms.end.description) {
			description = cForms.end.description
		} else if (cForms.start.description) {
			description = cForms.start.description
		}

		const required = [...new Set([
			...(cForms.start.required ? cForms.start.required : []),
			...(tForm.form_questions.required ? tForm.form_questions.required : []),
			...(cForms.end.required ? cForms.end.required : [])
		])]

		const uiOrder = [...new Set([
			...(cForms.start_ui_schema["ui:order"] ? cForms.start_ui_schema["ui:order"] : []),
			...(tForm.ui_schema["ui:order"] ? tForm.ui_schema["ui:order"] : []),
			...(cForms.end_ui_schema["ui:order"] ? cForms.end_ui_schema["ui:order"] : [])
		])]

		let uiSchema = {
			...(cForms.start_ui_schema ? cForms.start_ui_schema : {}),
			...(cForms.end_ui_schema ? cForms.end_ui_schema : {}),
			...(tForm.ui_schema ? tForm.ui_schema : {})
		}

		uiSchema = { ...uiSchema, ...{ "ui:order": uiOrder } }

		const form = {
			properties: properties,
			definitions: definitions,
			title: title,
			description: description,
			required: required
		}
		return { form_questions: form, ui_schema: uiSchema }

	}

	const customImageWidget = (props) => {
		console.log("PROPS", props)
		return (
			<img src={props.value} alt={props.schema.title}
				style={{
					maxWidth: "100%",
					height: "auto"
				}}></img>
		);
	};

	const customVideoWidget = (props) => {
		console.log("PROPS", props)
		return (
			<video title={props.schema.title}
				style={{
					maxWidth: "100%",
					height: "auto"
				}}
				controls
			>
				<source src={props.value} type="video/mp4"></source>
			</video>
		)
	}

	const customIframeWidget = (props) => {
		console.log("PROPS", props)
		return (
			<iframe
				title={props.schema.title}
				src={props.value}
				frameBorder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen></iframe>
		)
	}

	const widgets = {
		customImageWidget: customImageWidget,
		customVideoWidget: customVideoWidget,
		customIframeWidget: customIframeWidget
	};

	return (
		currentUser ?
			<Grid style={{ padding: 30 }}>
				{mergedForm && gRef && caseStages && taskMetadata && taskMetadata.case_stage_id && caseStages[taskMetadata.case_stage_id] ?
					<JSchemaForm
						schema={mergedForm.form_questions}
						uiSchema={mergedForm.ui_schema}
						formData={formResponses}
						fields={{ customFileUpload: a => CustomFileUpload({ ...a, ...{ taskID: id }, ...{ "currentUserUid": currentUser.uid }, ...{stage: caseStages[taskMetadata.case_stage_id]} }) }}
						disabled={formStatus === "loading" || formStatus === "sent" || formStatus === "released"}
						widgets={widgets}
						noHtml5Validate 
						onChange={e => {
							handleFormChange(e)
						}}><></>
					</JSchemaForm>
					:
					null}

			</Grid>
			:
			<Grid container direction="column" style={{ padding: 20 }} justify="center">
				<Typography align="center" variant="h3">авторизируйтесь</Typography>
				<br />
				<Button variant="contained" onClick={signInWithGoogle}>Войти с помощью аккаунта Google</Button>
			</Grid>
	)

}

export default JSchemaTask