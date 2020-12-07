import React, { forwardRef } from 'react'

import TextInput from "./textInput";
import SelectBox from "./selectBox";
import RadioButton from "./radiobutton";
import TimePickers from "./timePickers";
import Checkbox from "./checkbox"
import Text from "./text"
import File from "./file"

const Form = forwardRef((props, ref) => {

    const { question, index, response, uploadsRef, returnAnswer, locked, askFeedback, saveQuestionFeedback, id, prevTaskId, returnFile, uploadFilesData } = props

    if (question.type === 'input') {
        return <TextInput
            key={index}
            // ref={ref}
            index={index}
            title={question.title}
            response={response}
            returnAnswer={returnAnswer}
            required={question.required}
            locked={locked}
            askFeedback={askFeedback}
            feedbackType={question.feedback_type}
            saveQuestionFeedback={saveQuestionFeedback}
            id={id}
            prevTaskId={prevTaskId}
            uploadFilesData={uploadFilesData}
            uploadsRef={uploadsRef}
            returnFile={returnFile}
        />
    }
    else if (question.type === 'select') {
        return <SelectBox key={index} index={index} title={question.title} response={response} answers={question.answers} returnAnswer={returnAnswer} required={question.required} locked={locked} />
    }
    else if (question.type === 'radio') {
        return <RadioButton key={index} index={index} title={question.title} response={response} answers={question.answers} returnAnswer={returnAnswer} required={question.required} locked={locked} />
    }
    else if (question.type === 'time') {
        return <TimePickers key={index} index={index} title={question.title} response={response} returnAnswer={returnAnswer} required={question.required} locked={locked} />
    }
    else if (question.type === 'checkbox') {
        return <Checkbox key={index} index={index} title={question.title} response={response} answers={question.answers} returnAnswer={returnAnswer} required={question.required} locked={locked} />
    }
    else if (question.type === 'text') {
        return <Text key={index} title={question.title} />
    }
    else if (question.type === 'file') {
        return <File key={index} index={index} id={id} title={question.title} returnFile={returnFile} locked={locked} askFeedback={askFeedback} feedbackType={question.feedback_type} saveQuestionFeedback={saveQuestionFeedback} prevTaskId={prevTaskId} />
    }
    else {
        return null
    }

})


export default Form
