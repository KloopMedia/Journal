import React, { useContext, useEffect, useState } from 'react'
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import JSchemaForm from "@rjsf/bootstrap-4";


const CustomUIKField = (props) => {

    const { formContext } = props
    const [JSchema, setJSchema] = useState({})
    const [ready, setReady] = useState(false)
    const { currentUser } = useContext(AuthContext);

    const taskRef = firebase
        .firestore()
        .collection("tasks")
        .doc(props.taskID)
        .collection("responses")
        .doc(props.name)

    useEffect(() => {
        if (formContext && formContext.conditional && formContext.role) {
            let uikRef = firebase.firestore().collection('UIKS')
            let unsubscribe = {}
            let locality = formContext.conditional
            console.log("DEBUG PROPS", props)
            if (formContext.role === 'Стационарный наблюдатель / стационардук байкоочу') {
                setReady(true)
            }
            else {
                setReady(false)
            }
            // TO DO: Fix Bishkek and Osh don't show any options if any subregion was selected
            if (locality.region) {
                uikRef = uikRef.where('region', '==', locality.region)
            }
            if (locality.subregion) {
                uikRef = uikRef.where('subregion', '==', locality.subregion)
            }
            if (locality.locality) {
                uikRef = uikRef.where('locality', '==', locality.locality)
            }
            if (locality.district) {
                uikRef = uikRef.where('district', '==', locality.district)
            }
            unsubscribe = uikRef.onSnapshot(snap => {
                let allUiks = {}
                snap.forEach(doc => {
                    allUiks[doc.id] = doc.data()
                })
                createUIKSelectorForm(allUiks)
            })
            return () => unsubscribe()
        }
    }, [formContext])

    const getAvailableUIKS = (allUiks) => {
        let disabled = []
        let available = Object.keys(allUiks)
        let customLabels = []
        Object.keys(allUiks).forEach(uik => {
            if (allUiks[uik].address) {
                customLabels.push(uik + " " + allUiks[uik].address)
            }
            else {
                customLabels.push(uik)
            }
            if (allUiks[uik].observers.length >= 2) {
                disabled.push(uik)
            }
        })
        console.log("DISABLED", disabled)
        return ({ available: available, customLabels: customLabels, disabled: disabled })
    }

    const uikChangeHandler = async (e) => {
        if (e.formData) {
            taskRef.set({ contents: e.formData })
            await firebase.firestore().collection('UIKS').where('observers', 'array-contains', currentUser.uid).get().then(async snap => {
                snap.forEach(async doc => {
                    await doc.ref.update({ observers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) })
                })
            })
            firebase.firestore().collection('UIKS').doc(e.formData).update({ observers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) })
        }
    }

    const createUIKSelectorForm = (allUiks) => {
        let schema = {
            title: props.schema.title,
            enum: [],
            type: "string",
            enumNames: []
        }

        let uiSchema = {
            "ui:enumDisabled": []
        }

        let uikTypes = getAvailableUIKS(allUiks)
        schema.enum = uikTypes.available
        schema.enumNames = uikTypes.customLabels
        uiSchema['ui:enumDisabled'] = uikTypes.disabled
        console.log('schema', schema)

        setJSchema({ schema: schema, uiSchema: uiSchema })
    }


    return (
        ready && <JSchemaForm
            schema={JSchema.schema ? JSchema.schema : {}}
            uiSchema={JSchema.uiSchema ? JSchema.uiSchema : {}}
            formData={props.formData}
            onChange={e => uikChangeHandler(e)} > </JSchemaForm>
    )
}

export default CustomUIKField