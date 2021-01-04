import React, { useState, useEffect, useContext, useRef } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

//import Form from "../form/form"
import Dialog from "../Dialog/Dialog"
import DialogFeedback from "../Dialog/FeedbackDialog"
import Feedback from "../form/feedback"

import Loader from "../form/Loader"
import CustomFileUpload from "../form/CustomFileUpload";
import { Button, Divider, Grid, Typography } from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import CircularProgress from '@material-ui/core/CircularProgress';

import JSchemaForm from "@rjsf/material-ui";
import { cloneDeep, isEqual } from 'lodash'


import { Redirect, useParams } from 'react-router';
import { Link } from "react-router-dom";


const JSchemaTask = () => {
	const [formResponses, setFormResponses] = useState({})
	const [taskForm, setTaskForm] = useState({})
	const [mergedForm, setMergedForm] = useState({})
	const [fields, setFields] = useState({})
	const [taskMetadata, setTaskMetadata] = useState({})
	const [caseStages, setCaseStages] = useState({})
	const [backgroundTasks, setBackgroundTasks] = useState({})
	const [backgroundTaskForms, setBackgroundTaskForms] = useState({})
	const [mergedBackgroundForms, setMergedBackgroundForms] = useState({})
	const [backgroundResponses, setBackgroundResponses] = useState({})
	const [currentFocus, setCurrentFocus] = useState("")
	const [gRef, setGRef] = useState(null)
	const [formLocked, setFormLocked] = useState(true)

	const [questions, setQuestions] = useState([])
	const [responses, setResponses] = useState([])
	const [answers, setAnswers] = useState({})
	const [forms, setForms] = useState([])
	const [uploaded, setUploaded] = useState(false)
	const [redirect, setRedirect] = useState(false)
	const [userData, setUserData] = useState({})
	const [lockButton, setLock] = useState(false)
	const [caseTasks, setCaseTasks] = useState([])
	const [dialogState, setDialog] = useState(false)
	const [dialogType, setDialogType] = useState(null)
	const [feedbackValue, setFeedback] = useState({})
	const [releaseFeedbackData, setReleaseFeedbackData] = useState({})
	const [openSnackbar, setOpenSnackbar] = useState(false);
	const [files, setFiles] = useState({})
	const [uploading, setUploading] = useState(false)

	const { currentUser } = useContext(AuthContext);
	const { id } = useParams();

	const handleCloseSnackbar = (event, reason) => {
		if (reason === 'clickaway') {
			return;
		}

		setOpenSnackbar(false);
	};

	// const uploadsRef = useRef();

	useEffect(() => {
		if (currentUser && id) {

			const ref = firebase
				.firestore()
				.collection("tasks")
				.doc(id)

			setGRef(ref)

			ref.onSnapshot(doc => {
					setTaskMetadata(doc.data())
					setFormLocked(doc.data().is_complete)
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
								return {...prevState, [change.doc.id]: change.doc.data()}
							})
						}
					})
				})
		}

	}, [id, currentUser])

	useEffect( () => {
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
								return {...prevState, [change.doc.id]: change.doc.data()}
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
	}, [taskMetadata.case_type])

	useEffect(() => {
		const mergedBgForms = {}
		console.log("Bg tasks: ", backgroundTasks)
		Object.keys(backgroundTasks).map(taskId => {
			const stage = backgroundTasks[taskId].case_stage_id
			if (! mergedBgForms[stage]) {
				mergedBgForms[stage] = {}
			}
			mergedBgForms[stage][taskId] = mergeForm(backgroundTaskForms[taskId],
				caseStages[stage])
		})
		console.log("Merged bg forms: ", mergedBgForms)
		setMergedBackgroundForms(mergedBgForms)
	}, [backgroundTasks, backgroundTaskForms, caseStages])

	useEffect(() => {
		setMergedForm(mergeForm(taskForm, caseStages[taskMetadata.case_stage_id]))
	}, [taskForm, taskMetadata, caseStages])

	useEffect(() => {

		if (Object.keys(caseStages).length > 0 && Object.keys(taskMetadata).length > 0 && caseStages[taskMetadata.case_stage_id]) {
			console.log("caseStages: ", caseStages)
			console.log("taskMetadata: ", taskMetadata)
			const backgroundTasksList = caseStages[taskMetadata.case_stage_id].backgroundStages
			if (backgroundTasksList && backgroundTasksList.length > 0) {
				firebase.firestore()
					.collection("tasks")
					.where("case_id", "==", taskMetadata.case_id)
					.where("case_stage_id", "in", backgroundTasksList)
					.onSnapshot(snapshot => {
						snapshot.docChanges().forEach(change => {
							if (change.type === "added" || change.type === "modified") {
								console.log("Background task: ", change.doc.data())
								setBackgroundTasks(prevState => {
									return {...prevState, [change.doc.id]: change.doc.data()}
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
						snapshot.docChanges().forEach(change => {
							if (change.type === "added" || change.type === "modified") {
								setBackgroundTaskForms(prevState => {
									const newState = Object.assign({}, prevState)
									newState[key][change.doc.id] = change.doc.data()
									return newState
								})
							}
						})
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
									if (! newState[key]) {
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

	// useEffect( () => {
	// 	setMergedQuestions(mergeQuestions([caseStages[taskMetadata.case_stage_id]]))
	// }, [caseStages, taskQuestions])

	// useEffect(() => {
	// 	const timer = setTimeout(() => {
	// 		if (formResponsesChanged) {
	// 			firebase
	// 				.firestore()
	// 				.collection("tasks")
	// 				.doc(id)
	// 				.collection("responses")
	// 				.doc("form_responses")
	// 				.set(formResponses)
	// 				.then(docRef => {
	// 					setFormResponsesChanged(false);
	// 					console.log("Document written with ID: ", docRef.id);
	// 				})
	// 				.catch(error => console.error("Error setting document: ", error));
	// 		}
	// 	}, AUTOSAVE_INTERVAL);
	// 	return () => clearTimeout(timer);
	// }, [formResponsesChanged, formResponses]);


	const handleFormChange = e => {
		setFormResponses(e.formData)
	};

	// const handleBlur = e => {
	// 	if (gRef) {
	// 		console.log("Responses: ", formResponses)
	// 		console.log("That is what was blured", e)
	// 		if (e === "root") {
	// 			console.log("e from first option when trigger is root", e)
	// 			Object.keys(formResponses).map(k => {
	// 				gRef.collection("responses")
	// 					.doc(k)
	// 					.set({contents: formResponses[k] ? formResponses[k] : firebase.firestore.FieldValue.delete()},
	// 						{merge: true})
	// 			})
	// 		} else {
	// 			console.log("e from second option when trigger is not root", e)
	// 			const docID = e.split("_")[1]
	// 			gRef.collection("responses")
	// 				.doc(docID)
	// 				.set({contents: formResponses[docID] ? formResponses[docID] : firebase.firestore.FieldValue.delete()},
	// 					{merge: true})
	// 		}
	// 	}
	// }

	const handleBlur = e => {
		if (gRef) {
			console.log("Responses: ", formResponses)
			console.log("That is what was blured", e)

			Object.keys(formResponses).map(k => {
				gRef.collection("responses")
					.doc(k)
					.set({contents: formResponses[k] ? formResponses[k] : firebase.firestore.FieldValue.delete()},
						{merge: true})
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
			title = cForms.start.title}

		let description = ""
		if (tForm.form_questions.description) {
			description = tForm.form_questions.description
		} else if (cForms.end.description) {
			description = cForms.end.description
		} else if (cForms.start.description) {
			description = cForms.start.description}

		const required = [...new Set([
			...(cForms.start.required ? cForms.start.required : []),
			...(tForm.form_questions.required ? tForm.form_questions.required : []),
			...(cForms.start.required ? cForms.start.required : [])
		])]

		const uiOrder = [...new Set([
			...(cForms.start_ui_schema["ui:order"] ? cForms.start_ui_schema["ui:order"] : []),
			...(tForm.ui_schema["ui:order"]	 ? tForm.ui_schema["ui:order"] : []),
			...(cForms.end_ui_schema["ui:order"] ? cForms.end_ui_schema["ui:order"] : [])
		])]

		let uiSchema = {
			...(cForms.start_ui_schema ? cForms.start_ui_schema : {}),
			...(cForms.end_ui_schema ? cForms.end_ui_schema : {}),
			...(tForm.ui_schema ? tForm.ui_schema : {})
		}

		uiSchema = {...uiSchema, ...{"ui:order": uiOrder}}

		const form = {
			properties: properties,
			definitions: definitions,
			title: title,
			description: description,
			required: required
		}
		return {form_questions: form, ui_schema: uiSchema}

	}


	// useEffect(() => {
	// 	const getQuestions = async (taskID) => {
	// 		let q = []
	//
	// 		await firebase.firestore().collection("tasks").doc(taskID).collection("questions").get()
	// 			.then((querySnapshot) => {
	// 				querySnapshot.forEach((doc) => {
	// 					q.push({ questionId: doc.id, data: doc.data() })
	// 				});
	// 			})
	// 			.catch((error) => {
	// 				console.log("Error getting documents: ", error);
	// 			});
	//
	// 		return q
	// 	}
	//
	//
	// 	const getResponses = async (taskID) => {
	// 		let r = []
	//
	// 		await firebase.firestore().collection("tasks").doc(taskID).collection("responses").get()
	// 			.then((querySnapshot) => {
	// 				querySnapshot.forEach((doc) => {
	// 					r.push({ responseId: doc.id, data: doc.data() })
	// 				});
	// 			})
	// 			.catch((error) => {
	// 				console.log("Error getting documents: ", error);
	// 			});
	//
	// 		return r
	// 	}
	//
	//
	// 	const getSameCaseTasks = async () => {
	// 		let sameCaseTasks = []
	//
	// 		await firebase.firestore().collection("tasks").doc(id).get().then(doc => {
	// 			return doc.data()
	// 		}).then(async data => {
	// 			await firebase.firestore().collection("tasks").where("case_id", "==", data.case_id).get().then(snap => {
	// 				snap.forEach(doc => {
	// 					if (doc.id !== id) {
	// 						sameCaseTasks.push({ id: doc.id, ...doc.data() })
	// 					}
	// 				})
	// 			})
	// 		})
	// 		return sameCaseTasks
	// 	}
	//
	// 	const getForms = async () => {
	// 		let f = []
	// 		let locked = true
	//
	// 		setForms(null)
	//
	// 		await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").get().then(doc => {
	// 			if (doc.data().status === 'complete') {
	// 				locked = true
	// 				setLock(true)
	// 			}
	// 			else {
	// 				locked = false
	// 			}
	// 		})
	//
	// 		let sq = []
	// 		let sr = []
	//
	// 		let sameCaseTasks = await getSameCaseTasks()
	// 		setCaseTasks(sameCaseTasks)
	// 		if (sameCaseTasks.length > 0) {
	// 			let ques = sameCaseTasks.map(t => {
	// 				return getQuestions(t.id)
	// 			})
	// 			let resp = sameCaseTasks.map(t => {
	// 				return getResponses(t.id)
	// 			})
	// 			console.log(ques)
	// 			await Promise.all(ques).then(data => data.forEach(d => sq.push(...d)))
	// 			await Promise.all(resp).then(data => data.forEach(d => sr.push(...d)))
	//
	// 			console.log(sq)
	// 			console.log(sr)
	// 		}
	//
	// 		let sf = sq.map((el, i) => {
	// 			let response = null
	// 			sr.forEach((res) => {
	// 				if (el.questionId === res.responseId) {
	// 					response = res.data.answer
	// 					returnAnswer(res.data.answer, i)
	// 				}
	// 			})
	// 			return <Form key={el.questionId + '_' + i} question={el.data} index={i} response={response} returnAnswer={returnAnswer} locked={true} askFeedback={true} saveQuestionFeedback={saveQuestionFeedback} id={el.questionId} prevTaskId={sameCaseTasks[0].id} />
	// 		})
	//
	// 		sf.push(<div key={"div_divider_stripped"} style={{ height: 25, margin: '20px 0', background: 'repeating-linear-gradient( 45deg, white, white 10px, grey 10px, grey 25px)' }}><br /></div>)
	//
	//
	// 		let q = await getQuestions(id)
	// 		let r = await getResponses(id)
	//
	//
	// 		setQuestions(q)
	// 		setResponses(r)
	//
	//
	// 		// let newQ = sq.concat(q)
	// 		// let newR = sr.concat(r)
	//
	// 		f = q.map((el, i) => {
	// 			let response = null
	// 			r.forEach((res) => {
	// 				if (el.questionId === res.responseId) {
	// 					response = res.data.answer
	// 					returnAnswer(res.data.answer, i)
	// 				}
	// 			})
	// 			return (
	// 				<Form
	// 					key={el.questionId + '_' + i}
	// 					question={el.data}
	// 					index={i}
	// 					response={response}
	// 					returnFile={returnFile}
	// 					returnAnswer={returnAnswer}
	// 					id={el.questionId}
	// 					locked={locked}
	// 					// ref={uploadsRef}
	// 					uploadFilesData={uploadFilesData} />
	// 			)
	// 		})
	//
	// 		let newF = sf.concat(f)
	// 		setForms(newF)
	// 	}
	// 	if (currentUser) {
	// 		getForms()
	// 	}
	// }, [currentUser, id, lockButton])
	//
	//
	// const returnAnswer = (answer, index) => {
	// 	const tmp = answers
	// 	tmp[index] = answer
	// 	setAnswers(tmp)
	// }
	//
	// const returnFile = (file, questionId) => {
	// 	let arr = [...file]
	// 	let tmp = files
	// 	tmp[questionId] = arr
	// 	setFiles(tmp)
	// 	console.log([...file], questionId)
	// }
	//
	// const upload = async () => {
	// 	// uploadsRef.current.startUpload()
	// 	if (Object.keys(files).length > 0) {
	// 		console.log('files')
	// 		setUploading(true)
	// 		for (const [key, value] of Object.entries(files)) {
	// 			let ref = firebase.storage().ref(id).child(key).child(currentUser.uid)
	// 			await Promise.all(value.map(async v => {
	// 				let snap = await ref.child(v.name).put(v)
	// 				let url = await snap.ref.getDownloadURL()
	// 				let url_wo_token = url.split("?")[0]
	// 				await uploadFilesData(v.name, url_wo_token, key)
	// 			}));
	// 		}
	// 		setUploaded(true)
	// 		setUploading(false)
	// 	}
	// }
	//
	// const saveQuestionFeedback = (data, questionId, previousTaskId) => {
	// 	if (previousTaskId) {
	// 		firebase.firestore().collection('tasks').doc(previousTaskId).collection('feedbacks').doc(questionId).collection('messages')
	// 			.add({
	// 				answer: data.reason,
	// 				text: data.text,
	// 				user_id: currentUser.uid,
	// 				timestamp: firebase.firestore.FieldValue.serverTimestamp()
	// 			})
	// 			.then(() => setOpenSnackbar(true))
	// 	}
	// 	else {
	// 		alert('Ошибка: Что-то пошло не так при сохранении фидбека. Сообщите программисту!')
	// 	}
	// }
	//
	// const saveToFirebase = async (lock) => {
	// 	await upload()
	// 	questions.forEach(async (q, i) => {
	// 		if (answers[i] || answers[i] === "") {
	// 			await firebase.firestore().collection("tasks").doc(id).collection("responses").doc(q.questionId).set({ answer: answers[i] }, { merge: true })
	// 		}
	// 	})
	//
	// 	if (lock) {
	// 		await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'complete' })
	// 		setLock(true)
	// 		console.log("Task Locked")
	// 		setDialog(false)
	// 	}
	// }
	//
	// const uploadFilesData = async (filename, url, questionId) => {
	// 	let rootRef = firebase.firestore().collection("tasks").doc(id).collection("responses").doc(questionId)
	// 	console.log("Файл отправлен")
	// 	if (filename && url) {
	// 		rootRef.set(
	// 			{
	// 				files: firebase.firestore.FieldValue.arrayUnion({ public_url: url, filename: filename })
	// 			}, { merge: true }
	// 		).then(() => console.log('super'))
	// 	}
	// };
	//
	const handleDialogClose = () => {
		setDialog(false);
		//setFeedback({})
	};

	const handleDialogOpen = (type) => {
		console.log("Dialog open")
		if (type === 'send') {
			setDialogType('send')
			setDialog(true)
		}
		// if (type === 'release') {
		// 	setDialogType('release')
		// 	setDialog(true)
		// }
	}

	// useEffect(() => {
	// 	firebase.firestore().collection("schema").doc("structure").collection("feedbacks").doc("release").get().then(doc => {
	// 		setReleaseFeedbackData(doc.data())
	// 	})
	// }, [])
	//
	// const releaseTask = () => {
	// 	firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'open' })
	// 		.then(() => firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'released', release_status: feedbackValue.reason, release_description: feedbackValue.text })
	// 			.then(() => {
	// 				setDialog(false)
	// 				setLock(true)
	// 			}))
	// 	// alert(feedbackValue)
	// }
	//
	// const handleFeedbackSave = (value) => {
	// 	setFeedback(value)
	// }

	const lockForm = () => {
		firebase.firestore()
			.collection("tasks")
			.doc(id)
			.collection("user_editable")
			.doc("user_editable")
			.update({ status: 'complete' })
		setDialog(false)
	}

	return (
		currentUser ?
			<Grid style={{ padding: 30 }}>
				{dialogType === 'send' && <Dialog
					state={dialogState}
					handleClose={handleDialogClose}
					//hideActions={uploading || uploaded}
					title={uploading ? "Загрузка файлов" : uploaded ? "Файлы загружены" : "Отправить задание?"}
					content={uploading ? <CircularProgress /> : uploaded ? "Спасибо" : "Вы собираетесь отправить форму. Это значит, что вы больше не сможете изменять ответы."}
					dialogFunction={lockForm} />}
				{/*{dialogType === 'release' && <DialogFeedback*/}
				{/*	state={dialogState}*/}
				{/*	feedbackValue={feedbackValue}*/}
				{/*	handleClose={handleDialogClose}*/}
				{/*	title={releaseFeedbackData.title}*/}
				{/*	dialogFunction={releaseTask}*/}
				{/*	answers={releaseFeedbackData.answers}*/}
				{/*	description={releaseFeedbackData.description}*/}
				{/*	returnFeedback={handleFeedbackSave} />}*/}
				{/*{redirect && <Redirect to="/tasks" />}*/}
				{/*<Snackbar*/}
				{/*	anchorOrigin={{*/}
				{/*		vertical: 'bottom',*/}
				{/*		horizontal: 'left',*/}
				{/*	}}*/}
				{/*	open={openSnackbar}*/}
				{/*	autoHideDuration={6000}*/}
				{/*	onClose={handleCloseSnackbar}*/}
				{/*	message="Фидбек отправлен"*/}
				{/*	action={*/}
				{/*		<React.Fragment>*/}
				{/*			<IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>*/}
				{/*				<CloseIcon fontSize="small" />*/}
				{/*			</IconButton>*/}
				{/*		</React.Fragment>*/}
				{/*	}*/}
				{/*/>*/}
				{/*/!* Предыдущие задания{caseTasks.map((t, i) => <Button key={"case_button_"+i} component={ Link } to={"/tasks/" + t.id}>{t.title}</Button>)} *!/*/}
				{/*{forms}*/}
				{/*<Grid container style={{ padding: 20 }} justify="center">*/}
				{/*	<Button variant="outlined" style={{ borderWidth: 2, borderColor: "grey", color: 'grey', margin: 5 }} onClick={() => setRedirect(true)}>Назад</Button>*/}
				{/*	{!lockButton &&*/}
				{/*		<div>*/}
				{/*			<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "#003366", color: '#003366', margin: 5 }} onClick={() => saveToFirebase(false)}>Сохранить</Button>*/}
				{/*			<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('send')}>Отправить</Button>*/}
				{/*			<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('release')}>Освободить</Button>*/}
				{/*		</div>}*/}
				{/*</Grid>*/}

				{/*{console.log("Case stages::: ", caseStages)}*/}
				{/*{console.log("Task metadata::: ", taskMetadata)}*/}
				{/*{console.log("Merged background forms::: ", mergedBackgroundForms)}*/}

				{(Object.keys(caseStages).length > 0 &&
					Object.keys(taskMetadata).length > 0 &&
					caseStages[taskMetadata.case_stage_id] &&
					caseStages[taskMetadata.case_stage_id].backgroundStages &&
					caseStages[taskMetadata.case_stage_id].backgroundStages.length > 0 &&
					Object.keys(mergedBackgroundForms).length > 0) ?
					<Grid style={{padding: 30}}>
					{caseStages[taskMetadata.case_stage_id].backgroundStages.map(stage => {
						return <div key={stage}>
							{Object.keys(mergedBackgroundForms[stage]).map(taskId => {
								return <Grid style={{padding: 30}} key={taskId}>
									<JSchemaForm
										schema={mergedBackgroundForms[stage][taskId].form_questions}
										uiSchema={mergedBackgroundForms[stage][taskId].ui_schema}
										formData={backgroundResponses[taskId]}
										fields={{customFileUpload: a => CustomFileUpload({...a, ...{taskID: taskId}, ...{"currentUserUid": currentUser.uid}})}}
										disabled={true}
									> </JSchemaForm>
								</Grid>

							})}
						</div>
					})}
					</Grid>
					:
					null
				}

				{mergedForm && gRef ?
					<JSchemaForm
						schema={mergedForm.form_questions}
						uiSchema={mergedForm.ui_schema}
						formData={formResponses}
						fields={{customFileUpload: a => CustomFileUpload({...a, ...{taskID: id}, ...{"currentUserUid": currentUser.uid}})}}
						disabled={formLocked}
						onChange={e => {
							handleFormChange(e)
						}}
						onFocus={e => {
							console.log("That is what was focused", e)
							setCurrentFocus(e.split("_")[1])
						}}
						onBlur={e => {
							handleBlur(e)
						}}>
						<Button variant="outlined" disabled={formLocked} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('send')}>Отправить</Button>
					</JSchemaForm>
						:
					<p></p>}

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