import React, { useState, useEffect, useContext } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

//import Form from "../form/form"
import Dialog from "../Dialog/Dialog"
import DefaultDialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import { complexStateFirebaseUpdate, simpleStateFirebaseUpdate } from "../../util/Utilities"

import CustomFileUpload from "../form/CustomFileUpload";
import CustomUIKField from "../form/CustomUIKField"
import NewCustomUIKField from "../form/NewСustomUIKField"
import { Button, DialogContentText, DialogTitle, Grid, Typography } from '@material-ui/core';

import JSchemaForm from "@rjsf/fluent-ui";
import { cloneDeep, isEqual } from 'lodash'
import ReactMarkdown from 'react-markdown'

import { Redirect, useParams, useHistory } from 'react-router';

// import 'semantic-ui-css/semantic.min.css'
var breaks = require('remark-breaks')

const JSchemaTask = () => {
	const [formResponses, setFormResponses] = useState({})
	const [taskForm, setTaskForm] = useState({})
	const [mergedForm, setMergedForm] = useState({})
	const [taskMetadata, setTaskMetadata] = useState({})
	const [caseStages, setCaseStages] = useState({})
	const [backgroundTasks, setBackgroundTasks] = useState({})
	const [backgroundTaskForms, setBackgroundTaskForms] = useState({})
	const [mergedBackgroundForms, setMergedBackgroundForms] = useState({})
	const [backgroundResponses, setBackgroundResponses] = useState({})
	const [currentFocus, setCurrentFocus] = useState("")
	const [gRef, setGRef] = useState(null)
	const [formStatus, setFormStatus] = useState("loading")
	const [focusedField, setFocusedField] = useState(null)

	const [prevFormResponses, setPrevResponses] = useState({})
	const [initialResponses, setInitialResponses] = useState({})

	const [dialogState, setDialog] = useState(false)
	const [dialogType, setDialogType] = useState(null)
	const [feedbackValue, setFeedback] = useState({})
	const [enableButton, setEnableButton] = useState(false)

	const { currentUser } = useContext(AuthContext);
	const { id } = useParams();
	const history = useHistory();

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
							setPrevResponses(newState)
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
		const unsubscribe = firebase.firestore().collection('tasks').doc(id).collection('responses').onSnapshot(snap => {
			let initState = {}
			snap.forEach(doc => {
				initState[doc.id] = doc.data()
			})
			setInitialResponses(initState)
		})
		return () => unsubscribe()
	}, [])

	useEffect(() => {
		if (Object.entries(taskMetadata).length > 0 && taskMetadata.case_type) {
			firebase.firestore()
				.collection("schema")
				.doc("structure")
				.collection("cases")
				.doc(taskMetadata.case_type)
				.collection("stages")
				.onSnapshot(snapshot => {
					snapshot.docChanges().forEach(change => {
						if (change.type === "added" || change.type === "modified") {
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
		const mergedBgForms = {}
		Object.keys(backgroundTasks).map(taskId => {
			if (taskId !== id) {
				const stage = backgroundTasks[taskId].case_stage_id
				if (!mergedBgForms[stage]) {
					mergedBgForms[stage] = {}
				}
				mergedBgForms[stage][taskId] = mergeForm(backgroundTaskForms[taskId],
					caseStages[stage])
			}

		})
		setMergedBackgroundForms(mergedBgForms)
	}, [backgroundTasks, backgroundTaskForms, caseStages])

	useEffect(() => {
		if (Object.keys(mergedForm).length > 0 && formStatus === "loading") {
			setFormStatus("ready")
		}
		if (mergedForm && mergedForm.form_questions && mergedForm.form_questions.required && formResponses) {
			let requirementsSatisfied = mergedForm.form_questions.required.every(checker)
			setEnableButton(requirementsSatisfied)
		}

	}, [formResponses, mergedForm])

	useEffect(() => {
		setMergedForm(mergeForm(taskForm, caseStages[taskMetadata.case_stage_id]))
	}, [taskForm, taskMetadata, caseStages])

	useEffect(() => {

		if (Object.keys(caseStages).length > 0 && Object.keys(taskMetadata).length > 0 && caseStages[taskMetadata.case_stage_id]) {
			const backgroundTasksList = caseStages[taskMetadata.case_stage_id].backgroundStages
			if (backgroundTasksList && backgroundTasksList.length > 0) {
				firebase.firestore()
					.collection("tasks")
					.where("case_id", "==", taskMetadata.case_id)
					.where("case_stage_id", "in", backgroundTasksList)
					.orderBy("created_date")
					.onSnapshot(snapshot => {
						snapshot.docChanges().forEach(change => {
							if (change.type === "added" || change.type === "modified") {
								setBackgroundTasks(prevState => {
									return { ...prevState, [change.doc.id]: change.doc.data() }
								})
							}
							if (change.type === "removed") {
								setBackgroundTasks(prevState => {
									const newState = Object.assign({}, prevState)
									delete newState[change.doc.id]
									return newState
								})
							}
						});
					});
			}
		}
	}, [caseStages, taskMetadata])

	useEffect(() => {
		if (Object.entries(backgroundTasks).length > 0) {
			Object.keys(backgroundTasks).map(key => {
				firebase.firestore()
					.collection("tasks")
					.doc(key)
					.collection("questions")
					.onSnapshot(snapshot => {
						complexStateFirebaseUpdate(snapshot, setBackgroundTaskForms, key)
					})
				firebase.firestore()
					.collection("tasks")
					.doc(key)
					.collection("responses")
					.onSnapshot(snapshot => {
						snapshot.docChanges().forEach(change => {
							if (change.type === "added" || change.type === "modified") {
								setBackgroundResponses(prevState => {
									const newState = Object.assign({}, prevState)
									if (!newState[key]) {
										newState[key] = {}
									}
									newState[key][change.doc.id] = change.doc.data().contents
									return newState
								})
							}
							if (change.type === "removed") {
								setBackgroundResponses(prevState => {
									const newState = Object.assign({}, prevState)
									delete newState[key][change.doc.id]
									return newState
								})
							}
						})
					})
			})
		}
	}, [backgroundTasks])

	const handleFormChange = e => {
		Object.keys(e.formData).forEach(k => {
			let changedValues = {}
			if (!isEqual(e.formData[k], formResponses[k])) {
				changedValues = e.formData[k]
				setFocusedField(k)
				setFormResponses(prevState => ({ ...prevState, [k]: changedValues }))
				if (formResponses.hasOwnProperty(k) && typeof changedValues === 'object' && changedValues !== null) {
					Object.keys(changedValues).forEach(key => {
						if (!isEqual(e.formData[k][key], formResponses[k][key])) {
							if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty(key) && mergedForm.ui_schema[k][key].hasOwnProperty("ui:field") && mergedForm.ui_schema[k][key]["ui:field"] === "customFileUpload") {
								// pass
							}
							else if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty(key) && mergedForm.ui_schema[k][key].hasOwnProperty("sendOnBlur") && mergedForm.ui_schema[k][key].sendOnBlur) {
								// pass
							}
							else {
								gRef.collection("responses")
									.doc(k)
									.set({ contents: changedValues }).then(() => console.log("changed value object k: ", k, " response:", { [key]: changedValues[key] }))
							}
						}
					})
				}
				else {
					if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty("ui:field") && mergedForm.ui_schema[k]["ui:field"] === "customFileUpload") {
						// pass
					}
					else if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty("sendOnBlur") && mergedForm.ui_schema[k].sendOnBlur) {
						// pass
					}
					else {
						gRef.collection("responses")
							.doc(k)
							.set({ contents: changedValues }).then(() => console.log("changed value k: ", k, " response:", changedValues))
					}
				}
			}
		})
	};

	const handleBlur = (e, v) => {
		if (gRef) {
			console.log("Responses: ", formResponses)
			console.log("That is what was blured", e)

			Object.keys(formResponses).forEach(k => {
				if (typeof formResponses[k] === 'object' && formResponses[k] !== null) {
					Object.keys(formResponses[k]).forEach(key => {
						if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty(key) && mergedForm.ui_schema[k][key].hasOwnProperty("sendOnBlur") && mergedForm.ui_schema[k][key].sendOnBlur && k === focusedField) {
							gRef.collection("responses")
								.doc(k)
								.set({ contents: { [key]: formResponses[k][key] } }, { merge: true }).then(() => console.log("changed value object k: ", k, " response:", { [key]: formResponses[k][key] }))
						}
					})
				}
				else {
					if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty("sendOnBlur") && mergedForm.ui_schema[k].sendOnBlur && k === focusedField) {
						gRef.collection("responses")
							.doc(k)
							.set({ contents: formResponses[k] }).then(() => console.log("changed value k: ", k, " response:", formResponses[k]))
					}
				}
			})
		}
	}

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

		if (taskMetadata.case_type === 'FAQ' && taskMetadata.case_stage_id === 'answer_the_question') {
			uiSchema['answer'] = { ...uiSchema['answer'], sendOnBlur: true }
		}

		const form = {
			properties: properties,
			definitions: definitions,
			title: title,
			description: description,
			required: required
		}
		return { form_questions: form, ui_schema: uiSchema }

	}

	const handleDialogClose = () => {
		setDialog(false);
		//setFeedback({})
	};

	const handleOk = () => {
		setDialog(false)
		history.goBack()
	};

	const checker = (q) => {
		if (typeof formResponses[q] === 'object' && formResponses[q] !== null && Object.values(formResponses[q]).length > 0) {
			// console.log(q, "object not empty")
			return true
		}
		else if (typeof formResponses[q] !== 'object' && formResponses[q] !== null && formResponses[q] !== "" && formResponses[q] !== {} && formResponses[q] !== undefined) {
			// console.log(q, "primitive not empty")
			return true
		}
		else if (mergedForm.ui_schema.hasOwnProperty(q) && mergedForm.ui_schema[q].hasOwnProperty("ui:field") && mergedForm.ui_schema[q]["ui:field"] === "customFileUpload") {
			if (initialResponses[q] && initialResponses[q].contents && Object.keys(initialResponses[q].contents).length > 0) {
				// console.log(q, "file not empty", initialResponses[q])
				return true
			}
			else {
				return false
			}
		}
		else {
			// console.log(q, "empty")
			return false
		}
	}

	const handleSubmit = () => {
		Object.keys(formResponses).forEach(k => {
			if (mergedForm.ui_schema.hasOwnProperty(k) && mergedForm.ui_schema[k].hasOwnProperty("ui:field") && mergedForm.ui_schema[k]["ui:field"] === "customFileUpload") {

			}
			else {
				gRef.collection("responses")
					.doc(k)
					.set({ contents: formResponses[k] ? formResponses[k] : "" })
			}
		})
	}

	const handleDialogOpen = (type) => {
		console.log("Dialog open")
		if (type === 'send') {
			setDialogType('send')
			setDialog(true)
			handleSubmit()
		}
		if (type === 'release') {
			setDialogType('release')
			setDialog(true)
		}
	}

	const handleFeedbackSave = (event) => {
		setFeedback(event.formData)
		console.log('event', event.formData)
	}

	const changeTaskStatus = (status) => {
		let root = firebase.firestore()
			.collection("tasks")
			.doc(id)
			.collection("user_editable")
			.doc("user_editable")

		root.set({ status: status })
		if (status === 'released') {
			if (feedbackValue.reasons) {
				if (feedbackValue.extra) {
					root.update({ status: status, release_status: feedbackValue.reasons, release_description: feedbackValue.extra })
				}
				else {
					root.update({ status: status, release_status: feedbackValue.reasons, release_description: "" })
				}
			}
		}
	}

	const customImageWidget = (props) => {
		return (
			<img src={props.value} alt={props.schema.title}
				style={{
					maxWidth: "100%",
					height: "auto"
				}}></img>
		);
	};

	const customVideoWidget = (props) => {
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
			<Grid style={{ wordBreak: 'break-word' }}>
				{dialogType === 'send' && <Dialog
					state={dialogState}
					handleClose={handleDialogClose}
					handleOk={handleOk}
					showOk={formStatus === "sent"}
					// title={formStatus === "sent" ? caseStages[taskMetadata.case_stage_id].releaseTitle ? <ReactMarkdown allowDangerousHtml plugins={[breaks]} children={caseStages[taskMetadata.case_stage_id].releaseTitle} /> : "Форма успешно отправлена." : "Отправить форму?"}
					// content={formStatus === "sent" ? caseStages[taskMetadata.case_stage_id].releaseMessage ? <ReactMarkdown allowDangerousHtml plugins={[breaks]} children={caseStages[taskMetadata.case_stage_id].releaseMessage} /> : "Спасибо" : "Вы собираетесь отправить форму. Это значит, что вы больше не сможете изменять ответы."}
					title={formStatus === "sent" ? "Форма успешно отправлена." : "Отправить форму?"}
					content={formStatus === "sent" ? "Спасибо" : "Вы собираетесь отправить форму. Это значит, что вы больше не сможете изменять ответы."}
					dialogFunction={() => { changeTaskStatus('complete') }} />}

				{dialogType === 'release' && <DefaultDialog
					open={dialogState}
					onClose={handleDialogClose}
				>
					{formStatus === "released" &&
						<DialogTitle id="alert-dialog-title">Форма успешно освобождена. Теперь ею сможет заняться кто-то еще.</DialogTitle>
					}
					<DialogContent>
						{formStatus === "released" ?
							<DialogContentText>Спасибо</DialogContentText>
							: <JSchemaForm
								schema={caseStages[taskMetadata.case_stage_id].releaseFeedback_schema}
								uiSchema={caseStages[taskMetadata.case_stage_id].releaseFeedback_ui}
								formData={feedbackValue}
								widgets={widgets}
								onChange={e => {
									handleFeedbackSave(e)
								}}
								onSubmit={() => changeTaskStatus('released')}
							>
								<DialogActions>
									<Button onClick={handleDialogClose} color="primary">
										Отмена
                      				</Button>
									<Button type="submit" color="primary" autoFocus>
										Подтвердить
                      				</Button>
								</DialogActions>
							</JSchemaForm>
						}
					</DialogContent>
					{formStatus === "released" && <DialogActions>
						<Button onClick={handleOk} color="primary">
							Ok
						</Button>
					</DialogActions>}
				</DefaultDialog>}

				{(Object.keys(caseStages).length > 0 &&
					Object.keys(taskMetadata).length > 0 &&
					caseStages[taskMetadata.case_stage_id] &&
					caseStages[taskMetadata.case_stage_id].backgroundStages &&
					caseStages[taskMetadata.case_stage_id].backgroundStages.length > 0 &&
					Object.keys(mergedBackgroundForms).length > 0) ?
					<Grid style={{ paddingBottom: 30 }}>
						{caseStages[taskMetadata.case_stage_id].backgroundStages.map(stage => {
							return <div key={stage}>
								{
									mergedBackgroundForms[stage] ?
										(Object.keys(mergedBackgroundForms[stage]).map(taskId => (
											<Grid style={{ paddingBottom: 30 }} key={taskId}>
												<JSchemaForm
													schema={mergedBackgroundForms[stage][taskId].form_questions}
													uiSchema={mergedBackgroundForms[stage][taskId].ui_schema}
													formData={backgroundResponses[taskId]}
													widgets={widgets}
													fields={{ customFileUpload: a => CustomFileUpload({ ...a, ...{ taskID: taskId }, ...{ "currentUserUid": currentUser.uid } }) }}
													disabled={true}
												> </JSchemaForm>
											</Grid>
										)))
										:
										null
								}
							</div>
						})}
					</Grid>
					:
					null
				}
				{mergedForm && gRef && caseStages && taskMetadata && taskMetadata.case_stage_id && caseStages[taskMetadata.case_stage_id] ?
					<JSchemaForm
						schema={mergedForm.form_questions}
						uiSchema={mergedForm.ui_schema}
						formData={formResponses}
						fields={{
							CustomUIKField: a => CustomUIKField({ ...a, ...{ metadata: taskMetadata }, ...{ initResp: initialResponses }, ...{ prevResp: prevFormResponses }, ...{ taskID: id } }),
							NewCustomUIKField: a => NewCustomUIKField({ ...a, ...{ metadata: taskMetadata }, ...{ initResp: initialResponses }, ...{ prevResp: prevFormResponses }, ...{ taskID: id } }),
							customFileUpload: a => CustomFileUpload({ ...a, ...{ taskID: id }, ...{ initResp: initialResponses }, ...{ "currentUserUid": currentUser.uid }, ...{ metadata: taskMetadata }, ...{ stage: caseStages[taskMetadata.case_stage_id] } })
						}}
						disabled={formStatus === "loading" || formStatus === "sent" || formStatus === "released"}
						widgets={widgets}
						omitExtraData={true}
						liveOmit={true}
						formContext={formResponses}
						noHtml5Validate
						onChange={e => {
							handleFormChange(e)
						}}
						onFocus={e => {
							console.log("That is what was focused", e)
							setCurrentFocus(e.split("_")[1])
						}}
						onSubmit={() => handleDialogOpen('send')}
						onBlur={(e, v) => {
							handleBlur(e, v)
						}}>
						{formStatus === "sent" ?
							<div>Форма отправлена успешно</div>
							:
							null}

						{formStatus === "ready" ? <div>
							{caseStages[taskMetadata.case_stage_id].additionalButtons && caseStages[taskMetadata.case_stage_id].additionalButtons.includes("release") ?
								<Button variant="outlined" disabled={formStatus === "loading" || formStatus === "sent" || formStatus === "released"} style={{
									borderWidth: 2,
									borderColor: "#003366",
									color: "#003366",
									margin: 5
								}} onClick={() => handleDialogOpen('release')}>Освободить</Button>
								:
								null}
							{!enableButton && <Typography color="error">Вы не можете отправить, пока не заполните все поля</Typography>}
							<Button type="submit" variant="outlined" disabled={formStatus === "loading" || formStatus === "sent" || formStatus === "released" || !enableButton}
								style={enableButton ? {
									borderWidth: 2,
									borderColor: "red",
									color: "red",
									margin: 5
								} : null}
							>Отправить</Button>


						</div>
							:
							null
						}
						{formStatus === "released" ?
							<div>Вы освободили эту форму и больше не можете ее заполнять.</div>
							:
							null}
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