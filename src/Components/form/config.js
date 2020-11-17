let form_config = {
    main_title: "OPENING PROCEDURES",
    questions: [
        {
            title: "Group number:",
            type: "select",
            answer: [
                "Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6", "Group 7", "Group 8", "Group 9", "Group 10"
            ]
        },
        {
            title: "PS ID:",
            type: "input"
        },
        {
            title: "Time of arrival:",
            type: "time"
        },
        {
            title: "PSO chairperson male/female:",
            type: "radio",
            answer: ["Male", "Female"]
        },
        {
            title: "Transparency:",
            type: "multiradio",
            subquestion: [
                "12a: Did observers present have a clear view of the opening procedures?",
                "13a: Were you in any way restricted in your observation of the opening procedures?",
                "14a: Did any authorized observers inform you of problems at this PS during opening?"
            ],
            answer: ["Yes", "No", "NA"]
        }
    ],
    gateway: "www.blablabla.kg"
}

export default form_config