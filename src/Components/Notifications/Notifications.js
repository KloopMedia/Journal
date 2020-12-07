import { Button, Grid, Typography } from '@material-ui/core';
import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../../util/Auth';
import firebase from '../../util/Firebase'

import Notification from './Notification'


const Notifications = () => {

    const { currentUser } = useContext(AuthContext);
    const [cards, setCards] = useState([])

    const updateFirestoreStatus = (id) => {
        firebase.firestore().collection('notifications').doc(id).update({ shown: true })
    }

    useEffect(() => {
        if (currentUser) {
            const unsubscribe = firebase.firestore().collection('notifications').where('user_id', '==', currentUser.uid).onSnapshot(async snap => {
                let messages = []
                snap.forEach((doc, i) => {
                    messages.push({ id: doc.id, ...doc.data() })
                })
                setCards(messages)
            })
            return () => unsubscribe()
        }
    }, [currentUser])

    return (
        <div>
            <Typography variant="h5" align="center">Уведомления</Typography>
            {cards.map((doc, i) => <Notification key={i} id={doc.id} index={i} title={doc.title} setShown={updateFirestoreStatus} shown={doc.shown} description={doc.description} />)}
        </div>
    )

}

export default Notifications