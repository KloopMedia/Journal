import firebase from "../../util/Firebase";
import Loader from "./Loader";
import React, { useState } from "react";
import CircularProgress from '@material-ui/core/CircularProgress';
import ClearIcon from '@material-ui/icons/Clear';
import VisibilityIcon from '@material-ui/icons/Visibility';
import IconButton from '@material-ui/core/IconButton';
import { Dialog, Typography } from "@material-ui/core";

const CustomFileUpload = props => {

	const [connectingTelegram, setConnectingTelegram] = useState(false)
	const [telegramConnected, setTelegramConnected] = useState(false)
	const [open, setOpen] = useState(false)
	const [currentFile, setCurrentFile] = useState(null)

	let pathToFolder = null
	let handleTgConnectClick = null
	if (!props.disabled) {
		pathToFolder = firebase
			.storage()
			.ref(props.taskID)
			.child(props.name)
			.child(props.currentUserUid)

		handleTgConnectClick = async () => {
			setConnectingTelegram(true)
			await firebase
				.firestore()
				.collection("users")
				.doc(props.currentUserUid)
				.set({ fileUpload: props.taskID + "/" + props.name }, { merge: true })
			setConnectingTelegram(false)
			setTelegramConnected(true)

		}
	}
	const linksToFiles = firebase
		.firestore()
		.collection("tasks")
		.doc(props.taskID)
		.collection("responses")
		.doc(props.name)

	// console.log("Props formData: ", props.formData)

	const removeFile = (path) => {
		console.log(path)
		linksToFiles.set({
			contents: { [path]: firebase.firestore.FieldValue.delete() }
		}, { merge: true })
			.then(() => console.log("file removed"))
			.then(() => props.onChange())
			.catch(error => console.log(error))
	}

	let files = {}
	if (props.formData && Object.keys(props.formData).length > 0) {
		files = props.formData
		console.log('files formdata', files)
	}
	else if (props.initResp && props.name && props.initResp[props.name] && props.initResp[props.name].contents && Object.keys(props.initResp[props.name].contents).length > 0) {
		files = props.initResp[props.name].contents
		console.log('files initresp', files)
	}

	const handleClose = () => {
		setOpen(false)
	};

	const openDialog = (file) => {
		let comp = getComponent(file)
		setCurrentFile(comp)
		setOpen(true)
	}

	const getComponent = (file) => {
		console.log("debug file viewer", file)
		if (file) {
			const extension = file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length).toLowerCase() || ''
			console.log("debug file extension", extension)
			if (extension === 'jpeg' || extension === 'jpg' || extension === 'png') {
				return <img src={file.url} style={{height: '100%', width: 'auto'}} alt={file.name}></img>
			}
			else if (extension === 'mp4' || extension === 'ogg' || extension === 'webm' || extension === 'mov') {
				return (
					<video controls="controls" style={{maxHeight: '100%', width: 'auto'}}>
						<source src={file.url}></source>
					</video>
				)
			}
			else {
				return <Typography>Файл не является фото или видео</Typography>
			}
		}
		else {
			return null
		}
	}

	return (
		<div>
			<Dialog onClose={handleClose} open={open}>
				{currentFile}
			</Dialog>
			{props.schema.title ? <div>{props.schema.title}</div> : <div></div>}
			{props.schema.description ? <div>{props.schema.description}</div> : <div></div>}
			{props.disabled ? null :
				<div>
					<Loader storageRef={pathToFolder}
						allowMultipleFiles={props.stage && props.stage.allowMultipleFiles ? props.stage.allowMultipleFiles : false}
						secure={props.stage && props.stage.cleanFileLink ? props.stage.cleanFileLink : false}
						filesLinks={linksToFiles} />
					{connectingTelegram ?
						<CircularProgress />
						:
						telegramConnected ?
							<div>Вы можете начать загрузку файлов через бота. Все файлы, отправляемые боту, будут сохраняться здесь. После загрузки файлов через бот, не забудьте вернуться сюда и нажать "ОТПРАВИТЬ". <a href="https://t.me/journal_tg_bot">Перейти в бот.</a></div>
							:
							<div>
								<p>Вы так же можете загрузить сюда файлы через Телеграм-бота. Для этого нажмите кнопку ниже: </p>
								<button onClick={handleTgConnectClick}>Загрузка через бот</button>
							</div>
					}
				</div>
			}
			{files ?
				<div>
					{Object.keys(files).map(path =>
						<div key={path}>
							<a href={files[path].url} target="_blank" rel="noreferrer">{files[path].name}</a>
							{props.metadata && !props.metadata.is_complete && <IconButton onClick={() => removeFile(path)} size="small"><ClearIcon /></IconButton>}
							<IconButton onClick={() => openDialog(files[path])} size="small"><VisibilityIcon /></IconButton>
						</div>
					)}
				</div>
				:
				<div></div>
			}

		</div>
	);
}

export default CustomFileUpload

