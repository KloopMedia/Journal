const complexStateFirebaseUpdate = (snapshot, setFunction, subState) => {
    snapshot.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
            setFunction(prevState => {
                const newState = Object.assign({}, prevState)
                if (!newState[subState]) {
                    newState[subState] = {}
                }
                newState[subState][change.doc.id] = change.doc.data()
                // console.log("User stages: ", newState)
                return newState
            })
        }
        if (change.type === "removed") {
            setFunction(prevState => {
                const newState = Object.assign({}, prevState)
                delete newState[subState][change.doc.id]
                return newState
            })
        }
    })
}

const simpleStateFirebaseUpdate = (snapshot, setFunction) => {
    snapshot.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
            setFunction(prevState => (
                {...prevState, [change.doc.id]: change.doc.data()}
            ))
        }
        if (change.type === "removed") {
            setFunction(prevState => {
                const newState = Object.assign({}, prevState)
                delete newState[change.doc.id]
                return newState
            })
        }
    })
}



export {complexStateFirebaseUpdate, simpleStateFirebaseUpdate}