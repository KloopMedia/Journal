import React, {useState} from "react";
import firebase from "firebase";
import LinearProgressWithLabel from "./LinearProgressWithLabel";


const Loader = props => {

    // const [filenames, setFilenames] = useState([])
    // const [downloadURLs, setDownloadURLs] = useState([])
    // const [isUploading, setIsUploading] = useState(false)
    // const [uploadProgress, setUploadProgress] = useState(0)

    const [fileBeingUploaded, setFileBeingUploaded] = useState({})


    const upload = async files => {
        await Promise.all(files.map(async file => {
            const snap = props.storageRef.child(file.name).put(file)
            setFileBeingUploaded(prevState => {
                const update = {[file.name]: {status: "loading", progress: 0}}
                return prevState ? {...prevState, ...update} : update
            })

            // Listen for state changes, errors, and completion of the upload.
            snap.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
                snapshot => {
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setFileBeingUploaded(prevState => {
                        const update = {[file.name]: {status: "loading", progress: progress}}
                        return prevState ? {...prevState, ...update} : update
                    })
                    console.log('Upload is ' + progress + '% done');

                    switch (snapshot.state) {
                        case firebase.storage.TaskState.PAUSED: // or 'paused'
                            console.log('Upload is paused');
                            break;
                        case firebase.storage.TaskState.RUNNING: // or 'running'
                            console.log('Upload is running');
                            break;
                    }
                }, error => {

                    // A full list of error codes is available at
                    // https://firebase.google.com/docs/storage/web/handle-errors
                    switch (error.code) {
                        case 'storage/unauthorized':
                            // User doesn't have permission to access the object
                            break;

                        case 'storage/canceled':
                            // User canceled the upload
                            break;

                        default:
                            // Unknown error occurred, inspect error.serverResponse
                            break;
                    }
                }, () => {
                    // Upload completed successfully, now we can get the download URL
                    snap.snapshot.ref.getDownloadURL().then(downloadURL => {
                        console.log('File available at', downloadURL);
                    });
                });

            // let url = await snap.ref.getDownloadURL()
            // let url_wo_token = url.split("?")[0]
            // console.log("File uploaded: ", url)
            // //await uploadFilesData(file.name, url_wo_token, key)
        }));
    }

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

    const handleChange = (event) => {
        console.log("Files selected: ", [...event.target.files,])
        upload([...event.target.files])
    };


    return (
        <div>
            <input
                type="file"
                onChange={handleChange}
                multiple
            />
            {Object.keys(fileBeingUploaded).map(filename =>
                <LinearProgressWithLabel value={fileBeingUploaded[filename].progress}
                                         key={filename}/>
            )}

            {/*<p>Progress: {uploadProgress}</p>*/}

            {/*<p>Filenames: {filenames.join(", ")}</p>*/}

            {/*<div>*/}
            {/*    {downloadURLs.map((downloadURL, i) => {*/}
            {/*        return <img key={i} src={downloadURL}/>;*/}
            {/*    })}*/}
            {/*</div>*/}
        </div>
    );
}

export default Loader