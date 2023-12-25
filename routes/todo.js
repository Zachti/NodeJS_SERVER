const express = require('express')
const router = express.Router()

const validStatus = ["ALL" , "PENDING" , "LATE" , "DONE"]
const validSortBy = ["ID" , "DUE_DATE" , "TITLE"]
const lookupSortBy = {
    "ID": "id",
    "DUE_DATE": "dueDate",
    "TITLE": "title"
};

const { createLogger, transports, format } = require("winston");

const Verbs = {
    Get: "GET",
    Post: "POST",
    Put: "PUT",
    Delete: "DELETE",
};

const Levels = {
    Error: "error",
    Warning: "warn",
    Info: "info",
    Debug: "debug",
};

let logMessage;
let timeStart;
let reqCounter = 0;

const setLogMessage = (message) => {
    logMessage = message;
};

const startTimer = () => {
    timeStart = Date.now();
};

const customFormat = format.combine(
    format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSS" }),
    format.printf((info) => {
        return (`${info.timestamp} ${info.level.toUpperCase()}: ${info.message} | request #${reqCounter}`
        );
    }),
    );

const requestLogger = createLogger({
    format: customFormat,
    level: Levels.Info,
    label: "request-logger",
    transports: [
        new transports.Console(),
        new transports.File({
            filename: "./logs/requests.log",
            format: customFormat,
        }),
    ],
});

const todoLogger = createLogger({
    format: customFormat,
    level: Levels.Info,
    label: "todo-logger",
    transports: [
        new transports.File({
            filename: "./logs/todos.log",
        }),
    ],
});

const createRequestLog = (message, lv) => {
    setLogMessage(message);
    if (lv === Levels.Info) {
        requestLogger.info(logMessage);
    } else if (lv === Levels.Debug) {
        requestLogger.debug(logMessage);
    }
};

const createToDoLog = (message, lv) => {
    setLogMessage(message);
    if (lv === Levels.Info) {
        todoLogger.info(logMessage);
    } else if (lv === Levels.Debug) {
        todoLogger.debug(logMessage);
    } else if (lv === Levels.Error) {
        todoLogger.error(logMessage);
    }
};


todoList = []

function sumTodosByStatus(todoList, status) {
    let sum = 0

    todoList.forEach(todo => {
        if (status === 'ALL' || todo.status === status)
            sum += 1;
    });

    return sum;
}

router.get('/todo/health', (req , res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /todo/health | HTTP Verb ${Verbs.Get}`, Levels.Info)
    res.status(200).send("OK")
    createRequestLog(`request #${reqCounter} duration: ${Date.now() - timeStart}ms`, Levels.Debug)
})

router.post('/todo' , (req, res) =>     {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /todo | HTTP Verb ${Verbs.Post}`, Levels.Info)
    createToDoLog(`Creating new TODO with Title [${req.body.title}]`,Levels.Info,)
    createToDoLog(`Currently there are ${todoList.length} TODOs in the system. New TODO will be assigned with id ${todoList.length + 1}`, Levels.Debug)
    let newTodo = req.body
    if (todoList.some(todo=> todo.title === newTodo.title)) {
        createToDoLog(`Error: TODO with the title [${req.body.title}] already exists in the system`, Levels.Error)
        res.status(409).json({errorMessage: `Error: TODO with the title "${newTodo.title}" already exists in the system`})
    }
    else if (newTodo.dueDate < new Date().getTime()) {
        createToDoLog(`Error: Can’t create new TODO that its due date is in the past`, Levels.Error)
        res.status(409).json({errorMessage: "Error: Can't create new TODO that its due date is in the past"})
    }
    newTodo.id = todoList.length + 1
    newTodo.status = "PENDING"
    todoList.push(newTodo)
    res.status(200).json({result:newTodo.id})
    createRequestLog(`request #${reqCounter} , duration: ${Date.now() - timeStart}ms`, Levels.Debug)
})

router.get('/todo/size' , (req , res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /todo/size | HTTP Verb ${Verbs.Get}`, Levels.Info)
    const status = req.query.status
    if (!validStatus.includes(status)) {
        res.status(400).json({errorMessage:"Error: invalid status!"})
    } else {
        const count = sumTodosByStatus(todoList, status)
        res.status(200).json({result: count})
        createToDoLog(`Total TODOs count for state ${req.query.status} is ${count}`, Levels.Info)
        createRequestLog(`request #${reqCounter} , duration: ${Date.now() - timeStart}ms`, Levels.Debug)
    }
})

router.get('/todo/content' , (req , res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /todo/content | HTTP Verb ${Verbs.Get}`, Levels.Info);
    const status = req.query.status
    const filteredTodos = todoList.filter(todo => todo.status === status)
    if (!validStatus.includes(status) || (req.query.hasOwnProperty("sortBy") && !validSortBy.includes(req.query.sortBy))){
        res.status(400).json({errorMessage:"Error: invalid input!"})
        return
    }
    if (req.query.hasOwnProperty("sortBy")) {
        const sortBy = lookupSortBy[req.query.sortBy]
        filteredTodos.sort((a,b)=>{
            if (a[sortBy] < b[sortBy])
                return -1
            else if (a[sortBy] > b[sortBy])
                return 1
            else
                return 0
        })
    }
    else {
        filteredTodos.sort((a, b) => {
            if (a.id < b.id)
                return -1
            else if (a.id > b.id)
                return 1
            else
                return 0
        })
    }
    res.status(200).json({result: filteredTodos})
    createToDoLog(`Extracting todos content. Filter: ${req.query.status} | Sorting by: ${req.query.sortBy ? req.query.sortBy : "ID"}`, Levels.Info)
    createToDoLog(`There are a total of ${todoList.length} todos in the system. The result holds ${filteredTodos.length} todos`, Levels.Debug)
    createRequestLog(`request #${reqCounter} duration: ${Date.now() - timeStart}ms`, Levels.Debug,);
})

router.put('/todo', (req, res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /todo | HTTP Verb ${Verbs.Put}`, Levels.Info)
    const Id = parseInt(req.query.id)
    const status = req.query.status
    if (!validStatus.includes(status) || status === "ALL") {
        res.status(400).json({errorMessage:`Error: invalid status: "${status}"`})
        return
    }
    const Todo = todoList.find(todo => todo.id === Id)
    createToDoLog(`Update TODO id [${req.query.id}] state to ${req.query.status}`, Levels.Info)
    if (Todo !== undefined) {
        const oldStatus = Todo.status
        Todo.status = status
        createToDoLog(`TODO id [${req.query.id}] state change: ${oldStatus} --> ${status}`, Levels.Debug)
        res.status(200).json({result: oldStatus})
    } else {
        createToDoLog(`Error: no such TODO with id ${req.query.id}`, Levels.Error);
        res.status(404).json({errorMessage: `Error: no such TODO with id: "${Id}"`})
    }
    createRequestLog(`request #${reqCounter} , duration: ${Date.now() - timeStart}ms`, Levels.Debug)
})

router.delete('/todo', (req, res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /todo | HTTP Verb ${Verbs.Delete}`, Levels.Info)
    const Id = parseInt(req.query.id)
    const index = todoList.findIndex(todo => todo.id === Id)
    createToDoLog(`Removing todo id ${req.query.id}`, Levels.Info)
    if (index !== -1) {
        todoList.splice(index , 1)
        createToDoLog(`After removing todo id - [${req.query.id}] there are ${todoList.length} TODOs in the system`, Levels.Debug)
        res.status(200).json({result: todoList.length})
        createRequestLog(`request #${reqCounter} , duration: ${Date.now() - timeStart}ms`, Levels.Debug)
    } else {
        createToDoLog(`Error: no such TODO with id ${Id}`, Levels.Error)
        res.status(404).json({errorMessage: `Error: no such TODO with id - "${Id}"`})
    }
})

router.get("/logs/level", (req, res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /logs/level | HTTP Verb ${Verbs.Get}`, Levels.Info,);
    const name = req.query["logger-name"];
    if (name === "request-logger") {
        res.status(200).send(`Success: ${requestLogger.level.toUpperCase()}`)
        createRequestLog(`request #${reqCounter} , duration: ${Date.now() - timeStart}ms`, Levels.Debug,);
    }else if (name === "todo-logger") {
        res.status(200).send(`Success: ${todoLogger.level.toUpperCase()}`)
        createRequestLog(`request #${reqCounter} , duration: ${Date.now() - timeStart}ms`, Levels.Debug,);

    }else
        res.status(404).send(`Failure: no such logger with name '${name}'`);
});

router.put("/logs/level", (req, res) => {
    startTimer();
    reqCounter++;
    createRequestLog(`Incoming request | #${reqCounter} | resource: /logs/level | HTTP Verb ${Verbs.Put}`, Levels.Info,);
    const name = req.query["logger-name"];
    if (!req.query["logger-level"])
        res.status(404).send(`Failure: no logger level provided`)
    else {
        const wantedLevel = req.query["logger-level"].toLowerCase();
        if (
            wantedLevel !== Levels.Debug &&
            wantedLevel !== Levels.Error &&
            wantedLevel !== Levels.Info
        )
            res.status(404).send(`Failure: logger level '${wantedLevel}' is not allowed`)
        else {
            if (name === "request-logger") {
                requestLogger.level = wantedLevel;
                res.status(200).send(`Success: ${requestLogger.level.toUpperCase()}`)
                createRequestLog(`request #${reqCounter} ,duration: ${Date.now() - timeStart}ms`, Levels.Debug,);
            } else if (name === "todo-logger") {
                todoLogger.level = wantedLevel;
                res.status(200).send(`Success: ${todoLogger.level.toUpperCase()}`)
                createRequestLog(`request #${reqCounter} ,duration: ${Date.now() - timeStart}ms`, Levels.Debug,);
            } else
                res.status(404).send(`Failure: no such logger with name '${name}'`)
        }
    }
});

module.exports = router