import React, { useState, useEffect, useContext } from 'react'
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import Case from './Case'


const Cases = () => {

    const { currentUser } = useContext(AuthContext);
    const [allCases, setCases] = useState([])
    const [ready, setReady] = useState(false)

    useEffect(() => {
		if (currentUser) {
			let cases = []
			console.log("Fired")
            firebase.firestore().collection("schema").doc("structure").collection("cases").get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
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
	}, [currentUser])

    return (
        <div>
            {ready && allCases.map((c,i) => (
                <Case key={i} title={c.title} description={c.description} caseId={c.id} />
            ))}
        </div>
    )
}

export default Cases