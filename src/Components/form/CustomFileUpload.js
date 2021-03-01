import firebase from "../../util/Firebase";
import Loader from "./Loader";
import React, { useState } from "react";
import CircularProgress from '@material-ui/core/CircularProgress';

const CustomFileUpload = props => {
	console.log("All props: ", props)
	console.log("ID: ", props.taskID)
	console.log("Question ID: ", props.name)
	console.log("User UID: ", props.currentUserUid)

	const [connectingTelegram, setConnectingTelegram] = useState(false)
	const [telegramConnected, setTelegramConnected] = useState(false)

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
				.set({fileUpload: props.taskID + "/" + props.name }, {merge: true})
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

	console.log("Props formData: ", props.formData)

	return (
		<div>
			{props.schema.title ? <div>{props.schema.title}</div> : <div></div>}
			{props.schema.description ? <div>{props.schema.description}</div> : <div></div>}
			{props.disabled ? null :
				<div>
					<Loader storageRef={pathToFolder}
							allowMultipleFiles={props.stage && props.stage.allowMultipleFiles ? props.stage.allowMultipleFiles : false}
							secure={props.stage && props.stage.cleanFileLink ? props.stage.cleanFileLink : false}
							filesLinks={linksToFiles}/>
					{connectingTelegram ?
						<CircularProgress/>
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
			{props.formData ?
				<div>
					{Object.keys(props.formData).map(path =>
						<div key={path}>
							<a href={props.formData[path].url}>{props.formData[path].name}</a>
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

