import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { Typography, Box, Button, Grid } from '@material-ui/core';

import firebase from '../../util/Firebase'

const useStyles = makeStyles((theme) => ({
    root: {
        border: '2px grey solid',
        padding: '0px 10px',
        margin: 10,
        background: 'yellow',
		width: 700,
        [theme.breakpoints.down("sm")]: {
            maxWidth: 300
        }
    },
    button: {
        background: 'orange',
        margin: '10px 0'
    }

}));


const BasicTextFields = forwardRef((props, ref) => {
    const classes = useStyles();
    const [value, setValue] = React.useState('');

    const { title, index } = props

    const handleChange = (event) => {
        setValue(event.target.value)
    };

    return (
        <div className={classes.root}>
            <Box display="flex" style={{ marginBottom: 10, marginTop: 10 }}>
                <Typography variant="h6" style={{ paddingRight: 8 }}>{title}</Typography>
            </Box>
            <TextField
                id={"inputBox" + index}
                label="Мой ответ"
                value={value}
                style={{ background: 'white' }}
                onChange={handleChange}
                multiline
                rows={5}
                variant="outlined"
                fullWidth
            />
            <Grid container justify="flex-end">
                <Button className={classes.button}>Отправить</Button>
            </Grid>

        </div>
    );
})

export default BasicTextFields