import React, { useContext } from 'react'
import { signInWithGoogle } from '../../util/Firebase'
import { Button, Grid, Typography } from '@material-ui/core'
import { AuthContext } from '../../util/Auth';
import { Redirect } from 'react-router';


const Signin = () => {
    const { currentUser } = useContext(AuthContext);
    if (currentUser) {
        return <Redirect to={'/'} />;
    }
    return (
        <Grid container direction="column" style={{ padding: 20 }} justify="center">
            <Typography align="center" variant="h4">Регистрация</Typography>
            <Typography variant="body1" align="center">Нажмите на кнопку (Вход или Регистрация).</Typography>
            <Typography variant="body1" align="center">Если у вас нет аккаунта Google, то создайте его.</Typography>
            <br />
            <Button size="large" color="primary" variant="contained" onClick={signInWithGoogle}>Регистрация</Button>
        </Grid>
    )
}

export default Signin