import React, { useContext, useEffect, useState } from 'react'
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import JSchemaForm from "@rjsf/fluent-ui";


const NewCustomUIKField = (props) => {

    const { formContext } = props
    const [JSchema, setJSchema] = useState({})
    const [ready, setReady] = useState(false)
    const [UIKS, setUIKS] = useState({})
    const { currentUser } = useContext(AuthContext);

    const uiksRef = firebase.firestore().collection('UIKS1')

    console.log("CUSTOM UIK FIELD", props)

    const taskRef = firebase
        .firestore()
        .collection("tasks")
        .doc(props.taskID)
        .collection("responses")
        .doc(props.name)

    const uikDataRef = firebase
        .firestore()
        .collection("tasks")
        .doc(props.taskID)
        .collection("responses")
        .doc("uikData")

    useEffect(() => {
        if (formContext) {
            let uikRef = firebase.firestore().collection('UIKS1')
            let unsubscribe = {}
            let locality = formContext.place
            console.log("DEBUG PROPS", props)
            if (props.prevResp.place && !props.metadata.is_complete) {
                if (props.prevResp.place.region !== locality.region
                    || props.prevResp.place.subregion !== locality.subregion
                    || props.prevResp.place.locality !== locality.locality
                    || props.prevResp.place.district !== locality.district) {
                    taskRef.set({ contents: "" })
                }
            }

            if (locality) {
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
            }

            unsubscribe = uikRef.onSnapshot(snap => {
                let allUiks = {}
                snap.forEach(doc => {
                    allUiks[doc.id] = doc.data()
                })
                setUIKS(allUiks)
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
            // if (allUiks[uik].observers.length >= 2) {
            //     disabled.push(uik)
            // }
        })
        console.log("DISABLED", disabled)
        return ({ available: available, customLabels: customLabels, disabled: disabled })
    }

    const uikChangeHandler = async (e) => {
        console.log("DEBUG FORMDATA", e.formData)
        if (e.formData === "" || e.formData === undefined || e.formData === null) {
            if (!props.metadata.is_complete) {
                taskRef.set({ contents: "" })
                // uikDataRef.set({})
                // await uiksRef.where('observers', 'array-contains', currentUser.uid).get().then(async snap => {
                //     snap.forEach(async doc => {
                //         await doc.ref.update({ observers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) })
                //     })
                // })
            }
        }
        else {
            if (!props.metadata.is_complete) {
                taskRef.set({ contents: e.formData })
                // uikDataRef.set({ ...UIKS[e.formData], uikNumber: e.formData })
                // await uiksRef.where('observers', 'array-contains', currentUser.uid).get().then(async snap => {
                //     snap.forEach(async doc => {
                //         await doc.ref.update({ observers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) })
                //     })
                // })
                // uiksRef.doc(e.formData).update({ observers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) })
            }
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

    let data = {}
    if (props.formData) {
        data = props.formData
    }
    else if (props.initResp && props.name && props.initResp[props.name] && props.initResp[props.name].contents) {
        data = props.initResp[props.name].contents
    }


    return (
        <JSchemaForm
            schema={JSchema.schema ? JSchema.schema : {}}
            uiSchema={JSchema.uiSchema ? JSchema.uiSchema : {}}
            formData={data}
            disabled={props.metadata.is_complete}
            noHtml5Validate
            onChange={e => uikChangeHandler(e)} > </JSchemaForm>
    )
}

export default NewCustomUIKField