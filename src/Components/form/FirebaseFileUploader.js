import React, {useContext, useState, forwardRef, useImperativeHandle} from 'react'

import CircularProgress from '@material-ui/core/CircularProgress'
import FileUploader from "react-firebase-file-uploader";
import Typography from '@material-ui/core/Typography'
import { Grid, Box } from '@material-ui/core';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';

import firebase from '../../util/Firebase';
import LinearProgressWithLabel from './LinearProgressWithLabel'
import { AuthContext } from "../../util/Auth";

const FirebaseFileUploader = forwardRef((props, ref) => {

    const {title} = props
    const { currentUser } = useContext(AuthContext);

    const [filesToUpload, setFilesToUpload] = useState(null)
    const [progress, setProgress] = useState(0)
    const [isUploading, setUploading] = useState(false)
    const [success, setSuccess] = useState(false)

    let uploader = null;

    const customOnChangeHandler = (event) => {
        let files = event.target.files
        const filesToStore = [];
     
        Array.from(files).forEach(file => filesToStore.push(file));

        setFilesToUpload(filesToStore)
    }

    const handleProgress = (value) => {
        setProgress(value)
    }

    // useImperativeHandle(ref, () => ({

    //     startUpload() {
    //         if (filesToUpload) {
    //             filesToUpload.forEach(file => {
    //                 console.log(file)
    //                 uploader.startUpload(file)
    //             });
    //         }
    //     }
    
    // }));


    const handleUploadStart = () => {
        setProgress(0)
        setUploading(true)
        setSuccess(false)
    }

    const handleUploadError = error => {
        setUploading(false)
        alert(error)
        console.error(error);
    };

    const handleUploadSuccess = async filename => {
        const downloadURL = await firebase
          .storage()
          .ref(currentUser.uid)
          .child(filename)
          .getDownloadURL();
     
        setProgress(100)
        setUploading(false)
        setSuccess(true)
        props.uploadFilesData(filename, downloadURL)
      };
    
    

    return (
        <div>
        <Typography variant="body1" style={{fontSize: 16, fontWeight: 'bolder'}}>{title}</Typography>
        <Grid container display="flex" style={{paddingTop: 10}}>
          <Typography variant="body1" style={{paddingRight: 20}}>выберите файлы</Typography>
          {/* <FileUploader 
            name={"image-uploader-multiple"}
            storageRef={firebase.storage().ref().child(currentUser.uid)} 
            onUploadStart={handleUploadStart}
            onUploadError={handleUploadError}
            onUploadSuccess={handleUploadSuccess}
            onProgress={handleProgress}
            multiple 
            onChange={customOnChangeHandler}
          /> */}
          <FileUploader
            accept="image/*"
            name="avatar"
            randomizeFilename
            storageRef={firebase.storage().ref("images")}
            onUploadStart={handleUploadStart}
            onUploadError={handleUploadError}
            onUploadSuccess={handleUploadSuccess}
            onProgress={handleProgress}
          />
        </Grid>
        <Grid style={{paddingTop: 5}}>
            {isUploading ? <CircularProgress /> : null}
            <Grid container display="flex" alignItems="center">
                <Box flexGrow={1} alignItems="center"><LinearProgressWithLabel value={progress} /></Box>
                {success ? <CheckCircleOutlineIcon fontSize="large" style={{ color: 'green' }} /> : null}
            </Grid>
        </Grid>
      </div>
    )
})

export default FirebaseFileUploader