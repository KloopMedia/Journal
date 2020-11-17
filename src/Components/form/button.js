import React from 'react';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root:{
    marginTop:'2ch'
  },
}))

export default function Next() {
  const classes = useStyles()
  return (
    <Button className={classes.root} variant="contained" disableElevation >
      Next
    </Button>
  );
}