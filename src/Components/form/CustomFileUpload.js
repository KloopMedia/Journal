import firebase from "../../util/Firebase";
import Loader from "./Loader";
import React from "react";

const CustomFileUpload = props => {
	console.log("All props: ", props)
	console.log("ID: ", props.taskID)
	console.log("Question ID: ", props.name)
	console.log("User UID: ", props.currentUserUid)

	let pathToFolder = null
	if (!props.disabled) {
		pathToFolder = firebase
			.storage()
			.ref(props.taskID)
			.child(props.name)
			.child(props.currentUserUid)
	}
	const linksToFiles = firebase
		.firestore()
		.collection("tasks")
		.doc(props.taskID)
		.collection("responses")
		.doc(props.name)

	return (
		<div>
			{props.schema.title ? <div>{props.schema.title}</div> : <div></div>}
			{props.schema.description ? <div>{props.schema.description}</div> : <div></div>}
			{props.disabled ? null : <Loader storageRef={pathToFolder}
					filesLinks={linksToFiles}/>}

			{props.formData ? <p>Сохраненные файлы</p> : <p></p>}
			{Object.keys(props.formData).map(fileUrl =>
				<div key={fileUrl}>
					<a href={fileUrl}>{props.formData[fileUrl].name}</a>
				</div>
			)}

		</div>
	);
}

export default CustomFileUpload

