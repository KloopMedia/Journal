import React from 'react'

import TextInput from "../form/textInput";
import SelectBox from "../form/selectBox";
import RadioButton from "../form/radiobutton";
import TimePickers from "../form/timePickers";
import Checkbox from "../form/checkbox"
import Text from "../form/text"

const Form = (props) => {

    const {question, index, response, returnAnswer, locked, askFeedback} = props 

    if (question.type === 'input') {
        return <TextInput key={index} index={index} title={question.title} response={response} returnAnswer={returnAnswer} required={question.required} locked={locked} askFeedback={askFeedback} />
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
        return <Text key={index} title={question.title}/>
    }
    else {
        return null
    }

}


export default Form
