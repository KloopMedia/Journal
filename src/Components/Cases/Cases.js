import React, { useState, useEffect, useContext } from 'react'
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import Case from './Case'


const Cases = () => {

    const { currentUser } = useContext(AuthContext);
    const [allCases, setCases] = useState([])
    const [ready, setReady] = useState(false)
    const [userRanks, setRanks] = useState([])

    // New
    useEffect(() => {
        if (currentUser) {
            firebase.firestore().collection('users').doc(currentUser.uid).collection('user_private').doc('private').get().then(doc => {

                if (doc && doc.exists) {

                    let ranks = doc.data().ranks
                    console.log(ranks)
                    setRanks(ranks)
                    getCasesFromFirebase(ranks)
                }
            })
        }
    }, [currentUser])


    // /////// Old ////////
    // useEffect(() => {
    //     if (currentUser) {
    //         let cases = []
    //         console.log("Fired")
    //         firebase.firestore().collection("schema").doc("structure").collection("cases").get()
    //             .then((querySnapshot) => {
    //                 querySnapshot.forEach((doc) => {
    //                     cases.push({ id: doc.id, ...doc.data() })
    //                 });
    //             })
    //             .then(() => {
    //                 setCases(cases)
    //                 setReady(true)
    //             })
    //             .catch((error) => {
    //                 console.log("Error getting documents: ", error);
    //             });
    //     }
    // }, [currentUser])
    // //////////////

    const getCasesFromFirebase = (ranks) => {
        let cases = []
        console.log("Fired")
        firebase.firestore().collection("schema").doc("structure").collection("cases").where('ranks', 'array-contains-any', ranks).get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    console.log(doc.data())
                    cases.push({ id: doc.id, ...doc.data() })
                });
            })
            .then(() => {
                setCases(cases)
                setReady(true)
            })
            .catch((error) => {
                console.log("Error getting documents: ", error);
            });
    }

    return (
        <div>
            {ready && allCases.map((c, i) => {
                if (c.hide) {
                    return null
                }
                else {
                    return (
                        <Case key={i} title={c.title} description={c.description} caseId={c.id} userRanks={userRanks} />
                    )
                }
            })}
        </div>
    )
}

export default Cases