import React, { useState, useEffect, useContext, useRef } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import Form from "../form/form"
import Dialog from "../Dialog/Dialog"
import DialogFeedback from "../Dialog/FeedbackDialog"
import Feedback from "../form/feedback"

import { Button, Divider, Grid, Typography } from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import CircularProgress from '@material-ui/core/CircularProgress';

import { Redirect, useParams, useHistory } from 'react-router';
import { Link } from "react-router-dom";


const Tasks = () => {
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
	const history = useHistory();

	const handleCloseSnackbar = (event, reason) => {
		if (reason === 'clickaway') {
			return;
		}

		setOpenSnackbar(false);
	};

	// const uploadsRef = useRef();

	useEffect(() => {
		const getQuestions = async (taskID) => {
			let q = []

			await firebase.firestore().collection("tasks").doc(taskID).collection("questions").get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						q.push({ questionId: doc.id, data: doc.data() })
					});
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});

			return q
		}


		const getResponses = async (taskID) => {
			let r = []

			await firebase.firestore().collection("tasks").doc(taskID).collection("responses").get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						r.push({ responseId: doc.id, data: doc.data() })
					});
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});

			return r
		}


		const getSameCaseTasks = async () => {
			let sameCaseTasks = []

			await firebase.firestore().collection("tasks").doc(id).get().then(doc => {
				return doc.data()
			}).then(async data => {
				await firebase.firestore().collection("tasks").where("case_id", "==", data.case_id).get().then(snap => {
					snap.forEach(doc => {
						if (doc.id !== id) {
							sameCaseTasks.push({ id: doc.id, ...doc.data() })
						}
					})
				})
			})
			return sameCaseTasks
		}

		const getForms = async () => {
			let f = []
			let locked = true

			setForms(null)

			await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").get().then(doc => {
				if (doc.data().status === 'complete') {
					locked = true
					setLock(true)
				}
				else {
					locked = false
				}
			})

			let sq = []
			let sr = []

			let sameCaseTasks = await getSameCaseTasks()
			setCaseTasks(sameCaseTasks)
			if (sameCaseTasks.length > 0) {
				let ques = sameCaseTasks.map(t => {
					return getQuestions(t.id)
				})
				let resp = sameCaseTasks.map(t => {
					return getResponses(t.id)
				})
				console.log(ques)
				await Promise.all(ques).then(data => data.forEach(d => sq.push(...d)))
				await Promise.all(resp).then(data => data.forEach(d => sr.push(...d)))

				console.log(sq)
				console.log(sr)
			}

			let sf = sq.map((el, i) => {
				let response = null
				sr.forEach((res) => {
					if (el.questionId === res.responseId) {
						response = res.data.answer
						returnAnswer(res.data.answer, i)
					}
				})
				return <Form key={el.questionId + '_' + i} question={el.data} index={i} response={response} returnAnswer={returnAnswer} locked={true} askFeedback={true} saveQuestionFeedback={saveQuestionFeedback} id={el.questionId} prevTaskId={sameCaseTasks[0].id} />
			})

			sf.push(<div key={"div_divider_stripped"} style={{ height: 25, margin: '20px 0', background: 'repeating-linear-gradient( 45deg, white, white 10px, grey 10px, grey 25px)' }}><br /></div>)


			let q = await getQuestions(id)
			let r = await getResponses(id)


			setQuestions(q)
			setResponses(r)


			// let newQ = sq.concat(q)
			// let newR = sr.concat(r)

			f = q.map((el, i) => {
				let response = null
				r.forEach((res) => {
					if (el.questionId === res.responseId) {
						response = res.data.answer
						returnAnswer(res.data.answer, i)
					}
				})
				return (
					<Form
						key={el.questionId + '_' + i}
						question={el.data}
						index={i}
						response={response}
						returnFile={returnFile}
						returnAnswer={returnAnswer}
						id={el.questionId}
						locked={locked}
						// ref={uploadsRef}
						uploadFilesData={uploadFilesData} />
				)
			})

			let newF = sf.concat(f)
			setForms(newF)
		}
		if (currentUser) {
			getForms()
		}
	}, [currentUser, id, lockButton])


	const returnAnswer = (answer, index) => {
		const tmp = answers
		tmp[index] = answer
		setAnswers(tmp)
	}

	const returnFile = (file, questionId) => {
		let arr = [...file]
		let tmp = files
		tmp[questionId] = arr
		setFiles(tmp)
		console.log([...file], questionId)
	}

	const upload = async () => {
		// uploadsRef.current.startUpload()
		if (Object.keys(files).length > 0) {
			console.log('files')
			setUploading(true)
			for (const [key, value] of Object.entries(files)) {
				let ref = firebase.storage().ref(id).child(key).child(currentUser.uid)
				await Promise.all(value.map(async v => {
					let snap = await ref.child(v.name).put(v)
					let url = await snap.ref.getDownloadURL()
					let url_wo_token = url.split("?")[0]
					await uploadFilesData(v.name, url_wo_token, key)
				}));
			}
			setUploaded(true)
			setUploading(false)
		}
	}

	const saveQuestionFeedback = (data, questionId, previousTaskId) => {
		if (previousTaskId) {
			firebase.firestore().collection('tasks').doc(previousTaskId).collection('feedbacks').doc(questionId).collection('messages')
				.add({
					answer: data.reason,
					text: data.text,
					user_id: currentUser.uid,
					timestamp: firebase.firestore.FieldValue.serverTimestamp()
				})
				.then(() => setOpenSnackbar(true))
		}
		else {
			alert('Ошибка: Что-то пошло не так при сохранении фидбека. Сообщите программисту!')
		}
	}

	const saveToFirebase = async (lock) => {
		await upload()
		questions.forEach(async (q, i) => {
			if (answers[i] || answers[i] === "") {
				await firebase.firestore().collection("tasks").doc(id).collection("responses").doc(q.questionId).set({ answer: answers[i] }, { merge: true })
			}
		})

		if (lock) {
			await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'complete' })
			setLock(true)
			console.log("Task Locked")
			setDialog(false)
		}
	}

	const uploadFilesData = async (filename, url, questionId) => {
		let rootRef = firebase.firestore().collection("tasks").doc(id).collection("responses").doc(questionId)
		console.log("Файл отправлен")
		if (filename && url) {
			rootRef.set(
				{
					files: firebase.firestore.FieldValue.arrayUnion({ public_url: url, filename: filename })
				}, { merge: true }
			).then(() => console.log('super'))
		}
	};

	const handleDialogClose = () => {
		setDialog(false);
		setFeedback({})
	};

	const handleDialogOpen = (type) => {
		if (type === 'send') {
			setDialogType('send')
			setDialog(true)
		}
		if (type === 'release') {
			setDialogType('release')
			setDialog(true)
		}

	}

	useEffect(() => {
		firebase.firestore().collection("schema").doc("structure").collection("feedbacks").doc("release").get().then(doc => {
			setReleaseFeedbackData(doc.data())
		})
	}, [])

	const releaseTask = () => {
		firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'open' })
			.then(() => firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'released', release_status: feedbackValue.reason, release_description: feedbackValue.text })
				.then(() => {
					setDialog(false)
					setLock(true)
				}))
		// alert(feedbackValue)
	}

	const handleFeedbackSave = (value) => {
		setFeedback(value)
	}

	return (
		currentUser ?
			<Grid style={{ padding: 30 }}>
				{dialogType === 'send' && <Dialog
					state={dialogState}
					handleClose={handleDialogClose}
					hideActions={uploading || uploaded}
					title={uploading ? "Загрузка файлов" : uploaded ? "Файлы загружены" : "Отправить задание?"}
					content={uploading ? <CircularProgress /> : uploaded ? "Спасибо" : "Вы собираетесь отправить задание. Это значит, что вы больше не сможете изменять ответы."}
					dialogFunction={() => saveToFirebase(true)} />}
				{dialogType === 'release' && <DialogFeedback
					state={dialogState}
					feedbackValue={feedbackValue}
					handleClose={handleDialogClose}
					title={releaseFeedbackData.title}
					dialogFunction={releaseTask}
					answers={releaseFeedbackData.answers}
					description={releaseFeedbackData.description}
					returnFeedback={handleFeedbackSave} />}
				{redirect && <Redirect to="/tasks" />}
				<Snackbar
					anchorOrigin={{
						vertical: 'bottom',
						horizontal: 'left',
					}}
					open={openSnackbar}
					autoHideDuration={6000}
					onClose={handleCloseSnackbar}
					message="Фидбек отправлен"
					action={
						<React.Fragment>
							<IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</React.Fragment>
					}
				/>
				{/* Предыдущие задания{caseTasks.map((t, i) => <Button key={"case_button_"+i} component={ Link } to={"/tasks/" + t.id}>{t.title}</Button>)} */}
				{forms}
				<Grid container style={{ padding: 20 }} justify="center">
					<Button variant="outlined" style={{ borderWidth: 2, borderColor: "grey", color: 'grey', margin: 5 }} onClick={() => history.goBack()}>Назад</Button>
					{!lockButton &&
						<div>
							<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "#003366", color: '#003366', margin: 5 }} onClick={() => saveToFirebase(false)}>Сохранить</Button>
							<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('send')}>Отправить</Button>
							<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('release')}>Освободить</Button>
						</div>}
				</Grid>

			</Grid>
			:
			<Grid container direction="column" style={{ padding: 20 }} justify="center">
				<Typography align="center" variant="h3">авторизируйтесь</Typography>
				<br />
				<Button variant="contained" onClick={signInWithGoogle}>Войти с помощью аккаунта Google</Button>
			</Grid>
	)

}

export default Tasks