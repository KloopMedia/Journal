import React, {useEffect, useState} from "react";
import firebase from "firebase";
import LinearProgressWithLabel from "./LinearProgressWithLabel";
import {cloneDeep} from "lodash";


const Loader = props => {
    const [fileBeingUploaded, setFileBeingUploaded] = useState({})
    //const [storedFiles, setStoredFiles] = useState({})

    // useEffect(() => {
    //     props.filesLinks.onSnapshot(doc => {
    //         setStoredFiles(doc.data().contents)
    //     });
    // }, [props.filesLinks])

    const clear_url = (url) => {
        return url.replace('https://firebasestorage.googleapis.com/v0/b/journal-bb5e3.appspot.com/o', 'https://storage.cloud.google.com/journal-bb5e3.appspot.com') + '?authuser=1'
    }


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
                    snap.snapshot.ref.getDownloadURL().then(async downloadURL => {
                        let fileLink = downloadURL
                        if (props.secure) {
                            fileLink = clear_url(downloadURL.split('?')[0])
                        }
                        await props.filesLinks.set({contents: {[fileLink]: {name: file.name, url: fileLink}}},
					{merge: true})
                        setFileBeingUploaded(prevState => {
                            const newState = Object.assign({}, prevState)
                            delete newState[file.name]
                            return newState
                        })
                        console.log('File available at', fileLink);
                    });
                });

            // let url = await snap.ref.getDownloadURL()
            // let url_wo_token = url.split("?")[0]
            // console.log("File uploaded: ", url)
            // //await uploadFilesData(file.name, url_wo_token, key)
        }));
    }

    const handleChange = (event) => {
        console.log("Files selected: ", [...event.target.files,])
        upload([...event.target.files])
    };


    return (
        <div>
            <input
                type="file"
                onChange={handleChange}
                // multiple
            />
            {Object.keys(fileBeingUploaded).map(filename =>
                <div key={filename}>
                    <p>{filename}</p>
                    <LinearProgressWithLabel value={fileBeingUploaded[filename].progress}/>
                </div>

            )}
            {/*{storedFiles ? <p>Сохраненные файлы</p> : <p></p>}*/}
            {/*{Object.keys(storedFiles).map(fileUrl =>*/}
            {/*    <div key={fileUrl}>*/}
            {/*        <a href={fileUrl}>{storedFiles[fileUrl].name}</a>*/}
            {/*    </div>*/}
            {/*)}*/}
        </div>
    );
}

export default Loader