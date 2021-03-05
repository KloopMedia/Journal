import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
});

export default function UserCard(props) {
  const classes = useStyles();

  console.log('TEST CARD')
  console.log(props)

  if (props.userInfo == {}) {
    return (<div></div>)
  }

  return (
    <Card className={classes.root} variant="outlined">
      <CardContent>
        <Typography className={classes.title} color="textSecondary" gutterBottom>
          id: {props.userInfo.id}
        </Typography>
        <Typography variant="h5" component="h2">
          {props.userInfo.surname + " " + props.userInfo.name}
        </Typography>
        <Typography className={classes.pos} color="textSecondary">
          username: {props.userInfo.username}
        </Typography>
        <Typography className={classes.pos} color="textSecondary">
          Регион: {props.userInfo.district}
        </Typography>
        <Typography variant="body2" component="p">
          {props.userInfo.phone}
        </Typography>
        <Typography variant="body2" component="p">
          {props.userInfo.email}
        </Typography>
      </CardContent>
    </Card>
  );
}